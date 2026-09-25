import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '@/shared/logger';
import {
  redactSecrets,
  appendDiagnosticLog,
  getDiagnosticLogs,
  formatDiagnosticLogs,
  clearDiagnosticLogs,
} from '@/shared/diagnosticLog';

describe('Logger and Diagnostic Redaction', () => {
  let store: Record<string, unknown> = {};

  beforeEach(async () => {
    store = {};
    delete (chrome.runtime as unknown as { lastError?: unknown }).lastError;

    (chrome as unknown as { storage: { local: unknown } }).storage = {
      local: {
        get: vi.fn(async (keys?: string | string[] | null) => {
          if (!keys) return { ...store };
          if (typeof keys === 'string') return { [keys]: store[keys] };
          if (Array.isArray(keys)) {
            const out: Record<string, unknown> = {};
            for (const k of keys) out[k] = store[k];
            return out;
          }
          return { ...store };
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.assign(store, items);
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          const list = Array.isArray(keys) ? keys : [keys];
          for (const k of list) delete store[k];
        }),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    };

    await clearDiagnosticLogs();
  });

  describe('redactSecrets function', () => {
    it('redacts encrypted tokens (enc:v1:...)', () => {
      const encToken = 'enc:v1:dGVzdEl2MTI=:dGVzdENpcGhlclRleHQxMjM0NTY3ODkw';
      const input = `Failed saving key with token ${encToken} to storage.`;
      const result = redactSecrets(input);

      expect(result).not.toContain(encToken);
      expect(result).toContain('[REDACTED_ENCRYPTED_KEY]');
    });

    it('redacts OpenAI and Anthropic API keys', () => {
      const openaiKey = 'sk-proj-abc1234567890abcdef1234567890';
      const anthropicKey = 'sk-ant-api03-abcdef1234567890abcdef1234567890';

      const log = `OpenAI key: ${openaiKey}, Anthropic: ${anthropicKey}`;
      const redacted = redactSecrets(log);

      expect(redacted).not.toContain(openaiKey);
      expect(redacted).not.toContain(anthropicKey);
      expect(redacted).toContain('[REDACTED_API_KEY]');
    });

    it('redacts Bearer tokens and Authorization headers', () => {
      const input = 'Request headers: Authorization: Bearer eyJhbGciOiJIUzI1Ni...';
      const result = redactSecrets(input);

      expect(result).toContain('Authorization: Bearer [REDACTED]');
    });

    it('redacts JWT tokens', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const input = `User token: ${jwt}`;
      const result = redactSecrets(input);

      expect(result).not.toContain(jwt);
      expect(result).toContain('[REDACTED_JWT]');
    });

    it('redacts API key query parameters in URLs', () => {
      const url = 'https://api.themoviedb.org/3/movie/550?api_key=superSecretTmdb123&language=en-US';
      const result = redactSecrets(url);

      expect(result).not.toContain('superSecretTmdb123');
      expect(result).toContain('api_key=[REDACTED]&language=en-US');
    });

    it('redacts sensitive JSON preference fields', () => {
      const json = JSON.stringify({
        tmdbApiKey: 'tmdb-secret-value-12345',
        omdbApiKey: 'omdb-secret-value-67890',
        theme: 'dark',
      });
      const result = redactSecrets(json);

      expect(result).not.toContain('tmdb-secret-value-12345');
      expect(result).not.toContain('omdb-secret-value-67890');
      expect(result).toContain('"tmdbApiKey":"[REDACTED]"');
      expect(result).toContain('"omdbApiKey":"[REDACTED]"');
      expect(result).toContain('"theme":"dark"');
    });
  });

  describe('logger never writes raw key material or enc:v1: tokens to system_logs', () => {
    it('redacts raw API keys passed in logger.error message', async () => {
      const secret = 'sk-proj-confidential-openai-key-9999999999';
      logger.error(`Error connecting with key: ${secret}`);

      await (logger as unknown as { _flushQueue: () => Promise<void> })._flushQueue();

      const logs = (store['system_logs'] as Array<{ message: string }>) || [];
      expect(logs.length).toBeGreaterThan(0);
      for (const entry of logs) {
        expect(entry.message).not.toContain(secret);
        expect(JSON.stringify(entry)).not.toContain(secret);
      }
    });

    it('redacts enc:v1: tokens passed to logger.warn', async () => {
      const encToken = 'enc:v1:YWJjZGVmZ2hpams=:MTIzNDU2Nzg5MGFiY2RlZg==';
      logger.warn(`Encrypted token check: ${encToken}`);

      await (logger as unknown as { _flushQueue: () => Promise<void> })._flushQueue();

      const logs = (store['system_logs'] as Array<{ message: string }>) || [];
      expect(logs.length).toBeGreaterThan(0);
      for (const entry of logs) {
        expect(entry.message).not.toContain(encToken);
        expect(JSON.stringify(entry)).not.toContain(encToken);
      }
    });

    it('redacts sensitive object fields passed in logger details', async () => {
      const sensitiveObj = {
        tmdbApiKey: 'raw-tmdb-key-value',
        url: 'https://api.themoviedb.org/3/movie?api_key=query-key-value',
        safeField: 'harmless',
      };

      logger.info('API call attempted', sensitiveObj);

      await (logger as unknown as { _flushQueue: () => Promise<void> })._flushQueue();

      const logs = (store['system_logs'] as Array<unknown>) || [];
      expect(logs.length).toBeGreaterThan(0);
      const rawStored = JSON.stringify(logs);
      expect(rawStored).not.toContain('raw-tmdb-key-value');
      expect(rawStored).not.toContain('query-key-value');
      expect(rawStored).toContain('harmless');
    });
  });

  describe('diagnosticLog never persists or exports key material', () => {
    it('redacts secrets in appendDiagnosticLog and formatDiagnosticLogs', async () => {
      const secretKey = 'sk-proj-confidential-llm-key-8888888888';
      const encToken = 'enc:v1:aXZfdGVzdA==:Y2lwaGVyX3Rlc3Q=';

      await appendDiagnosticLog(
        'error',
        'llm.provider',
        `Auth failed with key ${secretKey}`,
        `Stored token was ${encToken}`
      );

      // Verify chrome.storage.local does not have the raw secret or enc token
      const storedEntries = await getDiagnosticLogs();
      expect(storedEntries.length).toBe(1);

      const entry = storedEntries[0];
      expect(entry.message).not.toContain(secretKey);
      expect(entry.message).toContain('[REDACTED_API_KEY]');
      expect(entry.detail).not.toContain(encToken);
      expect(entry.detail).toContain('[REDACTED_ENCRYPTED_KEY]');

      // Verify export formatting also never exposes secrets
      const exported = formatDiagnosticLogs(storedEntries);
      expect(exported).not.toContain(secretKey);
      expect(exported).not.toContain(encToken);
    });
  });
});
