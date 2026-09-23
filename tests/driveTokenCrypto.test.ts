import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isEncryptedKey, encryptKey } from '@/shared/keyCrypto';
import { getStoredDriveAccountEmail, clearStoredDriveToken } from '@/background/drive-sync';
import { logDiagnostic, getDiagnosticLogs, clearDiagnosticLogs } from '@/shared/diagnosticLog';

describe('driveTokenCrypto & diagnostic privacy', () => {
  let storage: Record<string, unknown> = {};

  beforeEach(async () => {
    storage = {};
    (globalThis as { chrome?: unknown }).chrome = {
      runtime: {
        id: 'test-ext-id',
        getURL: () => 'chrome-extension://test-ext-id/',
      },
      identity: {
        getRedirectURL: () => 'https://test-ext-id.chromiumapp.org/',
        launchWebAuthFlow: vi.fn(),
      },
      storage: {
        local: {
          get: vi.fn((keys: string | string[], cb?: (res: Record<string, unknown>) => void) => {
            const list = Array.isArray(keys) ? keys : [keys];
            const out: Record<string, unknown> = {};
            for (const k of list) out[k] = storage[k];
            if (cb) cb(out);
            return Promise.resolve(out);
          }),
          set: vi.fn((items: Record<string, unknown>, cb?: () => void) => {
            Object.assign(storage, items);
            if (cb) cb();
            return Promise.resolve();
          }),
          remove: vi.fn((keys: string | string[], cb?: () => void) => {
            const list = Array.isArray(keys) ? keys : [keys];
            for (const k of list) delete storage[k];
            if (cb) cb();
            return Promise.resolve();
          }),
        },
      },
    };
    await clearDiagnosticLogs();
  });

  it('transparently migrates plaintext token to encrypted ciphertext on read', async () => {
    // Legacy plaintext token stored
    const plainToken = 'ya29.a0AfH6SMB_plaintext_oauth_token';
    const expiresAt = Date.now() + 3600_000;
    storage['subsume_google_drive_token'] = {
      accessToken: plainToken,
      expiresAt,
    };

    // Trigger drive-sync read via dynamic import to use freshly mocked storage
    const driveSync = await import('@/background/drive-sync');
    
    // Check downloadDatabaseBackup or internal getAccessToken
    // downloadDatabaseBackup attempts to read stored token first
    let fetchAuthHeader: string | undefined;
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('drive/v3/files')) {
        fetchAuthHeader = new Headers(init?.headers).get('Authorization') ?? undefined;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'file-123' }] }),
          text: async () => '{"backup":true}',
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    }));

    const content = await driveSync.downloadDatabaseBackup();
    expect(content).toBe('{"backup":true}');
    expect(fetchAuthHeader).toBe(`Bearer ${plainToken}`);

    // Storage token must now be migrated to encrypted format enc:v1:...
    const updated = storage['subsume_google_drive_token'] as { accessToken: string; expiresAt: number };
    expect(isEncryptedKey(updated.accessToken)).toBe(true);
    expect(updated.accessToken).not.toBe(plainToken);
    expect(updated.accessToken).toContain('enc:v1:');
  });

  it('decrypts stored encrypted token correctly', async () => {
    const rawToken = 'ya29.sample-token-12345';
    const encrypted = await encryptKey(rawToken);

    storage['subsume_google_drive_token'] = {
      accessToken: encrypted,
      expiresAt: Date.now() + 3600_000,
    };

    let fetchAuthHeader: string | undefined;
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('drive/v3/files')) {
        fetchAuthHeader = new Headers(init?.headers).get('Authorization') ?? undefined;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'file-123' }] }),
          text: async () => '{"backup":true}',
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    }));

    const driveSync = await import('@/background/drive-sync');
    await driveSync.downloadDatabaseBackup();

    expect(fetchAuthHeader).toBe(`Bearer ${rawToken}`);
  });

  it('redacts email in drive connect diagnostic logs', async () => {
    const rawEmail = 'alice.smith@subsume.org';
    const { redactEmail } = await import('@/shared/diagnosticLog');

    const redacted = redactEmail(rawEmail);
    expect(redacted).not.toBe(rawEmail);
    expect(redacted).toBe('a***h@subsume.org');

    logDiagnostic('info', 'drive.connect', 'Google Drive connect succeeded', `email=${redacted}`);

    const logs = await getDiagnosticLogs();
    const entry = logs.find((l) => l.source === 'drive.connect');
    expect(entry).toBeDefined();
    expect(entry?.detail).toContain('email=a***h@subsume.org');
    expect(entry?.detail).not.toContain('alice.smith@subsume.org');
  });
});
