export type DiagnosticLevel = 'debug' | 'info' | 'warn' | 'error';

export interface DiagnosticEntry {
  id: string;
  at: string;
  level: DiagnosticLevel;
  source: string;
  message: string;
  detail?: string;
}

const STORAGE_KEY = 'subsumeDiagnosticLog';
const LEGACY_MIGRATED_KEY = 'subsumeSystemLogsMigrated';
const MAX_ENTRIES = 500;

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function readEntries(): Promise<DiagnosticEntry[]> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const raw = data[STORAGE_KEY];
  if (!Array.isArray(raw)) return [];
  return raw as DiagnosticEntry[];
}

async function writeEntries(entries: DiagnosticEntry[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: entries.slice(-MAX_ENTRIES) });
}

/** Append a log line (safe from UI, background, or content script). */
export async function appendDiagnosticLog(
  level: DiagnosticLevel,
  source: string,
  message: string,
  detail?: string
): Promise<void> {
  const cleanMessage = redactSecrets(message);
  const cleanDetail = detail ? redactSecrets(detail) : undefined;
  const entry: DiagnosticEntry = {
    id: newId(),
    at: new Date().toISOString(),
    level,
    source,
    message: cleanMessage,
    ...(cleanDetail ? { detail: cleanDetail } : {}),
  };
  try {
    const entries = await readEntries();
    entries.push(entry);
    await writeEntries(entries);
  } catch {
    console.warn('[Subsume diagnostic]', level, source, cleanMessage, cleanDetail);
  }
}

export function logDiagnostic(
  level: DiagnosticLevel,
  source: string,
  message: string,
  detail?: string
): void {
  void appendDiagnosticLog(level, source, message, detail);
}

export async function getDiagnosticLogs(): Promise<DiagnosticEntry[]> {
  await migrateLegacySystemLogsIfNeeded();
  return readEntries();
}

/** One-time import of legacy `system_logs` into the diagnostic log store. */
export async function migrateLegacySystemLogsIfNeeded(): Promise<void> {
  try {
    const data = await chrome.storage.local.get([LEGACY_MIGRATED_KEY, 'system_logs', STORAGE_KEY]);
    if (data[LEGACY_MIGRATED_KEY]) return;

    const legacy = data.system_logs;
    const existing = Array.isArray(data[STORAGE_KEY]) ? (data[STORAGE_KEY] as DiagnosticEntry[]) : [];

    if (!Array.isArray(legacy) || legacy.length === 0) {
      await chrome.storage.local.set({ [LEGACY_MIGRATED_KEY]: true });
      return;
    }

    const converted: DiagnosticEntry[] = legacy.map((row: { timestamp?: number; level?: string; message?: string; details?: unknown }) => {
      const level = row.level === 'warn' || row.level === 'error' || row.level === 'info' ? row.level : 'info';
      const detail =
        row.details !== undefined
          ? typeof row.details === 'string'
            ? redactSecrets(row.details)
            : redactSecrets(JSON.stringify(row.details, null, 2))
          : undefined;
      return {
        id: newId(),
        at: new Date(row.timestamp ?? Date.now()).toISOString(),
        level: level as DiagnosticLevel,
        source: 'legacy',
        message: redactSecrets(row.message ?? '(no message)'),
        ...(detail ? { detail } : {}),
      };
    });

    const merged = [...converted, ...existing].slice(-MAX_ENTRIES);
    await writeEntries(merged);
    await chrome.storage.local.set({ [LEGACY_MIGRATED_KEY]: true });
  } catch {
    // non-fatal
  }
}

export async function clearDiagnosticLogs(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}

export function formatDiagnosticLogs(entries: DiagnosticEntry[], extensionId?: string): string {
  const header = [
    'Subsume diagnostic log',
    extensionId ? `Extension ID: ${extensionId}` : '',
    `Exported: ${new Date().toISOString()}`,
    `Entries: ${entries.length}`,
    '---',
  ]
    .filter(Boolean)
    .join('\n');

  const body = entries
    .map((e) => {
      const cleanMessage = redactSecrets(e.message);
      const cleanDetail = e.detail ? redactSecrets(e.detail) : undefined;
      const line = `[${e.at}] ${e.level.toUpperCase()} ${e.source}: ${cleanMessage}`;
      return cleanDetail ? `${line}\n  ${cleanDetail.replace(/\n/g, '\n  ')}` : line;
    })
    .join('\n');

  return `${header}\n${body}\n`;
}

/**
 * Redact sensitive secrets from log strings:
 * - enc:v1: tokens (encrypted key material)
 * - Bearer tokens and Authorization headers
 * - JWT tokens (eyJ...)
 * - API keys (OpenAI sk-, Anthropic sk-ant-, Google AI, TMDb, OMDb, etc.)
 * - Generic API key / secret query parameters and JSON fields
 */
export function redactSecrets(text: string): string {
  if (!text || typeof text !== 'string') return text;

  return text
    // Encrypted token format (enc:v1:<iv>:<ciphertext>)
    .replace(/enc:v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+/g, '[REDACTED_ENCRYPTED_KEY]')
    .replace(/enc:v1:[^\s"',;`]+/g, '[REDACTED_ENCRYPTED_KEY]')
    // Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+/gi, 'Bearer [REDACTED]')
    // Standard JWT patterns
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]')
    // OpenAI / Anthropic key patterns
    .replace(/sk-(?:proj-|ant-)?[A-Za-z0-9_-]{15,}/g, '[REDACTED_API_KEY]')
    // Query parameter keys: ?apikey=... &key=... ?api_key=...
    .replace(/([?&](?:apikey|api_key|key|token|secret)=)[^&\s"'`]+/gi, '$1[REDACTED]')
    // Specific preference fields in JSON: "tmdbApiKey": "...", etc.
    .replace(/("(?:tmdbApiKey|omdbApiKey|llmApiKey|llmSecondaryApiKey|googleBooksApiKey)"\s*:\s*")[^"]*(")/gi, '$1[REDACTED]$2')
    // Key/value pairs: apiKey: "...", api_key = "..."
    .replace(/((?:api[_-]?key|client[_-]?secret|access[_-]?token|secret|password)["']?\s*[:=]\s*["']?)[^"'\s,;&`]+/gi, '$1[REDACTED]');
}