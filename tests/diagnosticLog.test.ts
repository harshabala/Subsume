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
});