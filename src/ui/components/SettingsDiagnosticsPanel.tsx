import { h } from 'preact';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import {
  clearDiagnosticLogs,
  formatDiagnosticLogs,
  getDiagnosticLogs,
  type DiagnosticEntry,
  type DiagnosticLevel,
} from '@/shared/diagnosticLog';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_OAUTH_REDIRECT_URI_REGISTERED,
} from '@/shared/googleDriveOAuth';
import type { SystemLog } from '@/shared/types';

const PAGE_SIZE = 20;

const LEVEL_LABEL: Record<DiagnosticLevel, string> = {
  debug: 'Technical detail',
  info: 'Information',
  warn: 'Warning',
  error: 'Error',
};

const SOURCE_LABEL: Record<string, string> = {
  'bg.startup': 'Extension startup',
  'drive.connect': 'Google Drive',
  'drive.oauth': 'Google sign-in',
  'settings.drive': 'Settings',
  'ui.sendMessage': 'App messaging',
  'bg.handler': 'Background task',
  system: 'System',
};

function categoryLabel(source: string): string {
  return SOURCE_LABEL[source] ?? source.replace(/\./g, ' · ');
}

function formatLocalTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function systemLogToEntry(log: SystemLog, index: number): DiagnosticEntry {
  const detail =
    log.details !== undefined
      ? typeof log.details === 'string'
        ? log.details
        : JSON.stringify(log.details, null, 2)
      : undefined;
  return {
    id: `sys-${log.timestamp}-${index}`,
    at: new Date(log.timestamp).toISOString(),
    level: log.level,
    source: 'system',
    message: log.message,
    detail,
  };
}

async function loadAllEntries(): Promise<DiagnosticEntry[]> {
  const [diag, storage] = await Promise.all([
    getDiagnosticLogs(),
    new Promise<SystemLog[]>((resolve) => {
      chrome.storage.local.get('system_logs', (result) => {
        resolve((result.system_logs as SystemLog[]) || []);
      });
    }),
  ]);
  const fromSystem = storage.map(systemLogToEntry);
  const merged = [...fromSystem, ...diag];
  merged.sort((a, b) => a.at.localeCompare(b.at));
  return merged.slice(-500);
}

async function clearAllLogs(): Promise<void> {
  await clearDiagnosticLogs();
  await chrome.storage.local.set({ system_logs: [] });
}

export function SettingsDiagnosticsPanel() {
  const [entries, setEntries] = useState<DiagnosticEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<DiagnosticLevel | 'all'>('all');
  const [search, setSearch] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const logs = await loadAllEntries();
      setEntries(logs);
      if (logs.length) {
        setSelectedId((prev) => prev ?? logs[logs.length - 1].id);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onStorage = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === 'local' && (changes.subsumeDiagnosticLog || changes.system_logs)) {
        void refresh();
      }
    };
    chrome.storage.onChanged.addListener(onStorage);
    const interval = setInterval(() => void refresh(), 3000);
    return () => {
      chrome.storage.onChanged.removeListener(onStorage);
      clearInterval(interval);
    };
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...entries]
      .reverse()
      .filter((e) => (levelFilter === 'all' ? true : e.level === levelFilter))
      .filter(
        (e) =>
          !q ||
          e.message.toLowerCase().includes(q) ||
          e.source.toLowerCase().includes(q) ||
          categoryLabel(e.source).toLowerCase().includes(q) ||
          (e.detail?.toLowerCase().includes(q) ?? false)
      );
  }, [entries, levelFilter, search]);

  useEffect(() => {
    setPage(0);
  }, [levelFilter, search, entries.length]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageSlice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const selected =
    filtered.find((e) => e.id === selectedId) ?? pageSlice[0] ?? filtered[0] ?? null;

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(`${label} copied`);
      setTimeout(() => setCopyFeedback(null), 2500);
    } catch {
      setCopyFeedback('Copy failed. Use Select all in the detail area');
    }
  };

  const handleCopyAll = () => {
    void copyText(formatDiagnosticLogs([...entries], chrome.runtime.id), 'Full log');
  };

  const handleCopySelected = () => {
    if (!selected) return;
    void copyText(formatDiagnosticLogs([selected], chrome.runtime.id), 'Selected entry');
  };

  const handleClear = async () => {
    await clearAllLogs();
    setSelectedId(null);
    await refresh();
    setCopyFeedback('Log cleared');
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const levelFilterOptions: { value: DiagnosticLevel | 'all'; label: string }[] = [
    { value: 'all', label: 'All severities' },
    { value: 'error', label: 'Errors only' },
    { value: 'warn', label: 'Warnings only' },
    { value: 'info', label: 'Information only' },
    { value: 'debug', label: 'Technical detail' },
  ];

  return (
    <div id="settings-diagnostics" className="settings-panel diagnostics-panel">
      <h3 className="settings-panel-heading">Diagnostics</h3>
      <p className="settings-panel-description">
        A readable activity log for Google Drive sign-in, sync, and background errors. Copy the full log when you need
        help troubleshooting.
      </p>

      <div className="diagnostics-toolbar">
        <input
          type="search"
          className="settings-input diagnostics-search"
          placeholder="Search message or category…"
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          aria-label="Search log messages"
        />
        <label className="diagnostics-filter-label">
          <span className="diagnostics-filter-label-text">Severity</span>
          <select
            className="settings-input diagnostics-severity-select"
            value={levelFilter}
            onChange={(e) => setLevelFilter((e.target as HTMLSelectElement).value as DiagnosticLevel | 'all')}
            aria-label="Filter by severity"
          >
            {levelFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="diagnostics-actions">
        <button type="button" className="btn-sanctuary-restraint" onClick={() => void refresh()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
        <button type="button" className="btn-sanctuary-restraint" onClick={handleCopyAll} disabled={!entries.length}>
          Copy full log
        </button>
        <button type="button" className="btn-sanctuary-restraint" onClick={handleCopySelected} disabled={!selected}>
          Copy selected row
        </button>
        <button
          type="button"
          className="btn-sanctuary-restraint diagnostics-clear-btn"
          onClick={() => setClearConfirmOpen(true)}
          disabled={clearConfirmOpen}
        >
          Clear log
        </button>
        {clearConfirmOpen && (
          <div
            className="diagnostics-clear-confirm"
            role="alertdialog"
            aria-labelledby="diagnostics-clear-confirm-title"
            aria-describedby="diagnostics-clear-confirm-desc"
          >
            <p id="diagnostics-clear-confirm-title" className="diagnostics-clear-confirm-title">
              Clear all diagnostic logs?
            </p>
            <p id="diagnostics-clear-confirm-desc" className="diagnostics-clear-confirm-desc">
              This cannot be undone.
            </p>
            <div className="diagnostics-clear-confirm-actions">
              <button type="button" className="btn-sanctuary-restraint" onClick={() => setClearConfirmOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-sanctuary-restraint diagnostics-clear-btn diagnostics-clear-confirm-btn"
                onClick={() => {
                  setClearConfirmOpen(false);
                  void handleClear();
                }}
              >
                Clear log
              </button>
            </div>
          </div>
        )}
        {copyFeedback && (
          <span className="diagnostics-copy-feedback" role="status">
            {copyFeedback}
          </span>
        )}
      </div>

      <p className="settings-panel-hint diagnostics-meta">
        Extension ID: <code className="diagnostics-code">{chrome.runtime.id}</code> · {entries.length} stored (max 500)
      </p>

      <div className="diagnostics-table-wrap" role="region" aria-label="Log table">
        <table className="diagnostics-table">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Severity</th>
              <th scope="col">Category</th>
              <th scope="col">What happened</th>
            </tr>
          </thead>
          <tbody>
            {pageSlice.length === 0 && (
              <tr>
                <td colSpan={4} className="diagnostics-table-empty">
                  {loading ? 'Loading log…' : 'No entries yet. Try Google Drive connect or reproduce an issue.'}
                </td>
              </tr>
            )}
            {pageSlice.map((e) => {
              const isSelected = selected?.id === e.id;
              return (
                <tr
                  key={e.id}
                  className={`diagnostics-table-row level-${e.level} ${isSelected ? 'is-selected' : ''}`}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(e.id)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault();
                      setSelectedId(e.id);
                    }
                  }}
                >
                  <td className="diagnostics-cell-time">{formatLocalTime(e.at)}</td>
                  <td className="diagnostics-cell-severity">
                    <span className={`diagnostics-severity-pill level-${e.level}`}>{LEVEL_LABEL[e.level]}</span>
                  </td>
                  <td className="diagnostics-cell-category">{categoryLabel(e.source)}</td>
                  <td className="diagnostics-cell-summary" title={e.message}>
                    {e.message}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="diagnostics-pagination">
          <button
            type="button"
            className="btn-sanctuary-restraint"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span className="diagnostics-page-label">
            Page {safePage + 1} of {pageCount} ({filtered.length} entries)
          </span>
          <button
            type="button"
            className="btn-sanctuary-restraint"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </button>
        </div>
      )}

      <section className="diagnostics-detail-panel" aria-labelledby="diagnostics-detail-heading">
        <h4 id="diagnostics-detail-heading" className="diagnostics-detail-heading">
          Selected entry · full text
        </h4>
        {selected ? (
          <dl className="diagnostics-detail-dl">
            <div className="diagnostics-detail-row">
              <dt>Time</dt>
              <dd>{formatLocalTime(selected.at)}</dd>
            </div>
            <div className="diagnostics-detail-row">
              <dt>Severity</dt>
              <dd>
                <span className={`diagnostics-severity-pill level-${selected.level}`}>
                  {LEVEL_LABEL[selected.level]}
                </span>
              </dd>
            </div>
            <div className="diagnostics-detail-row">
              <dt>Category</dt>
              <dd>{categoryLabel(selected.source)}</dd>
            </div>
            <div className="diagnostics-detail-row diagnostics-detail-row-block">
              <dt>Message</dt>
              <dd>
                <pre className="diagnostics-detail-pre">{selected.message}</pre>
              </dd>
            </div>
            {selected.detail && (
              <div className="diagnostics-detail-row diagnostics-detail-row-block">
                <dt>Extra detail</dt>
                <dd>
                  <pre className="diagnostics-detail-pre diagnostics-detail-pre-scroll">{selected.detail}</pre>
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="diagnostics-detail-empty">Select a row above to read the full message.</p>
        )}
      </section>

      <aside className="diagnostics-oauth-hint">
        <details className="diagnostics-oauth-details">
          <summary className="diagnostics-oauth-hint-title">Google Drive sign-in help</summary>
          <div className="diagnostics-oauth-body">
            <p>
              Sign-in uses <strong>launchWebAuthFlow</strong> with a <strong>Web application</strong> OAuth client
              (Chrome and Brave). Scopes: Drive app data and your account email for the “Connected as …” line.
            </p>
            <ul className="diagnostics-oauth-list">
              <li>
                <span className="diagnostics-oauth-k">Client ID</span>
                <code className="diagnostics-code">{GOOGLE_CLIENT_ID}</code>
              </li>
              <li>
                <span className="diagnostics-oauth-k">Redirect URI (GCP)</span>
                <code className="diagnostics-code">{GOOGLE_OAUTH_REDIRECT_URI_REGISTERED}</code>
              </li>
              <li>
                <span className="diagnostics-oauth-k">Runtime redirect</span>
                <code className="diagnostics-code">{chrome.identity.getRedirectURL()}</code>
              </li>
            </ul>
            <p className="diagnostics-oauth-foot">
              After code changes: <code>npm run build</code>, then remove and reload the extension from{' '}
              <code>dist/</code>.
            </p>
          </div>
        </details>
      </aside>
    </div>
  );
}