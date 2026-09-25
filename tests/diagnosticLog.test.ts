import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatDiagnosticLogs,
  getDiagnosticLogs,
  migrateLegacySystemLogsIfNeeded,
  type DiagnosticEntry,
} from '@/shared/diagnosticLog';

describe('diagnosticLog', () => {
  beforeEach(() => {
    const store: Record<string, unknown> = {};
    (globalThis as { chrome?: unknown }).chrome = {
      storage: {
        local: {
          get: vi.fn((keys: string | string[]) => {
            const list = Array.isArray(keys) ? keys : [keys];
            const out: Record<string, unknown> = {};
            for (const k of list) out[k] = store[k];
            return Promise.resolve(out);
          }),
          set: vi.fn((obj: Record<string, unknown>) => {
            Object.assign(store, obj);
            return Promise.resolve();
          }),
          remove: vi.fn((key: string) => {
            delete store[key];
            return Promise.resolve();
          }),
        },
      },
    };
  });

  it('formatDiagnosticLogs produces copy-friendly text', () => {
    const entries: DiagnosticEntry[] = [
      {
        id: '1',
        at: '2026-07-08T10:00:00.000Z',
        level: 'error',
        source: 'drive.connect',
        message: 'Sign-in failed',
        detail: 'interactive=true',
      },
    ];
    const text = formatDiagnosticLogs(entries, 'testextid');
    expect(text).toContain('Subsume diagnostic log');
    expect(text).toContain('testextid');
    expect(text).toContain('drive.connect');
    expect(text).toContain('Sign-in failed');
  });

  it('migrateLegacySystemLogsIfNeeded imports system_logs once', async () => {
    const chromeStorage = (globalThis as { chrome: { storage: { local: { set: ReturnType<typeof vi.fn> } } } }).chrome
      .storage.local;
    await chromeStorage.set({
      system_logs: [{ timestamp: 1_700_000_000_000, level: 'warn', message: 'legacy row' }],
    });

    await migrateLegacySystemLogsIfNeeded();
    const entries = await getDiagnosticLogs();
    expect(entries.some((e) => e.message === 'legacy row' && e.source === 'legacy')).toBe(true);

    await chromeStorage.set({ system_logs: [{ timestamp: 2, level: 'error', message: 'should not import again' }] });
    await migrateLegacySystemLogsIfNeeded();
    const again = await getDiagnosticLogs();
    expect(again.filter((e) => e.message === 'should not import again')).toHaveLength(0);
  });

  it('appendDiagnosticLog processes concurrent calls sequentially without losing entries', async () => {
    const { appendDiagnosticLog, getDiagnosticLogs } = await import('@/shared/diagnosticLog');

    // Launch 15 concurrent appends
    await Promise.all(
      Array.from({ length: 15 }, (_, i) =>
        appendDiagnosticLog('info', 'concurrent.test', `Message ${i}`)
      )
    );

    const logs = await getDiagnosticLogs();
    const testLogs = logs.filter((l) => l.source === 'concurrent.test');
    expect(testLogs).toHaveLength(15);
  });

  it('redacts email addresses and URL query parameters in diagnostics', async () => {
    const { appendDiagnosticLog, getDiagnosticLogs, redactEmail, redactSecrets } = await import(
      '@/shared/diagnosticLog'
    );

    expect(redactEmail('john.doe@example.com')).toBe('j***e@example.com');
    expect(redactEmail('me@subsume.org')).toBe('m***@subsume.org');

    const inputUrl = 'https://example.com/callback?code=oauth_code_123&state=state_secret&session=sess_abc';
    const cleanUrl = redactSecrets(inputUrl);
    expect(cleanUrl).toContain('code=[REDACTED]');
    expect(cleanUrl).toContain('state=[REDACTED]');
    expect(cleanUrl).toContain('session=[REDACTED]');
    expect(cleanUrl).not.toContain('oauth_code_123');

    await appendDiagnosticLog(
      'warn',
      'user.test',
      'User user.name@domain.com encountered error',
      'Request url was https://api.service.com/user?token=xyz987'
    );

    const logs = await getDiagnosticLogs();
    const entry = logs.find((l) => l.source === 'user.test');
    expect(entry).toBeDefined();
    expect(entry?.message).toContain('u***e@domain.com');
    expect(entry?.message).not.toContain('user.name@domain.com');
    expect(entry?.detail).toContain('token=[REDACTED]');
    expect(entry?.detail).not.toContain('xyz987');
  });
});