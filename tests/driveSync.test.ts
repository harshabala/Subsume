import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  uploadDatabaseBackup,
  downloadDatabaseBackup,
  connectGoogleDrive,
  parseImplicitGrantResponseUrl,
} from '@/background/drive-sync';

describe('parseImplicitGrantResponseUrl', () => {
  it('parses access_token and expires_in from hash', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const url =
      'https://abc.chromiumapp.org/#access_token=at-123&token_type=Bearer&expires_in=3600';
    const parsed = parseImplicitGrantResponseUrl(url);
    expect(parsed.accessToken).toBe('at-123');
    expect(parsed.expiresAt).toBeGreaterThan(now);
    vi.useRealTimers();
  });

  it('throws on error in hash', () => {
    expect(() =>
      parseImplicitGrantResponseUrl('https://x.chromiumapp.org/#error=access_denied')
    ).toThrow(/access_denied/i);
  });
});

describe('drive-sync (launchWebAuthFlow)', () => {
  let launchWebAuthFlowMock: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;
  const storage: Record<string, unknown> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.keys(storage).forEach((k) => delete storage[k]);

    launchWebAuthFlowMock = vi.fn(
      (details: { url: string; interactive: boolean }, callback: (url?: string) => void) => {
        expect(details.url).toContain('response_type=token');
        expect(details.url).toContain('drive.appdata');
        chrome.runtime.lastError = undefined;
        callback(
          'https://test-ext.chromiumapp.org/#access_token=fresh-token&expires_in=3600'
        );
      }
    );

    (global.chrome as any).identity = {
      getRedirectURL: () => 'https://test-ext.chromiumapp.org/',
      launchWebAuthFlow: launchWebAuthFlowMock,
    };
    (global.chrome as any).runtime = {
      id: 'test-ext',
      getManifest: () => ({}),
      lastError: undefined,
    };
    (global.chrome as any).storage = {
      local: {
        get: (keys: string | string[] | Record<string, unknown>, cb: (r: Record<string, unknown>) => void) => {
          const key = typeof keys === 'string' ? keys : TOKEN_KEY_FROM_GET(keys);
          const out: Record<string, unknown> = {};
          if (typeof keys === 'string') {
            out[keys] = storage[keys];
          } else if (Array.isArray(keys)) {
            keys.forEach((k) => {
              out[k] = storage[k];
            });
          } else {
            Object.keys(keys).forEach((k) => {
              out[k] = storage[k];
            });
          }
          cb(out);
        },
        set: (obj: Record<string, unknown>, cb?: () => void) => {
          Object.assign(storage, obj);
          cb?.();
        },
        remove: (keys: string | string[], cb?: () => void) => {
          const list = Array.isArray(keys) ? keys : [keys];
          list.forEach((k) => delete storage[k]);
          cb?.();
        },
      },
    };
  });

  function TOKEN_KEY_FROM_GET(keys: string[] | Record<string, unknown>): string {
    if (Array.isArray(keys)) return keys[0];
    return 'subsume_google_drive_token';
  }

  it('connectGoogleDrive uses launchWebAuthFlow interactive', async () => {
    await connectGoogleDrive();
    expect(launchWebAuthFlowMock).toHaveBeenCalledWith(
      expect.objectContaining({ interactive: true }),
      expect.any(Function)
    );
  });

  it('retries Google Drive API requests once on 401 Unauthorized during upload', async () => {
    storage.subsume_google_drive_token = {
      accessToken: 'old-token',
      expiresAt: Date.now() + 999_999,
    };

    fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ files: [{ id: 'file-123' }] }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => 'ok' });

    vi.stubGlobal('fetch', fetchMock);

    await uploadDatabaseBackup('{"test":true}');

    expect(launchWebAuthFlowMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries Google Drive API requests once on 401 Unauthorized during download', async () => {
    storage.subsume_google_drive_token = {
      accessToken: 'old-token',
      expiresAt: Date.now() + 999_999,
    };

    fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ files: [{ id: 'file-123' }] }),
      })
      .mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '{"backup":data}',
      });

    vi.stubGlobal('fetch', fetchMock);

    const data = await downloadDatabaseBackup();

    expect(data).toBe('{"backup":data}');
    expect(launchWebAuthFlowMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws an explicit network exception on non-2xx in backup file lookup queries', async () => {
    storage.subsume_google_drive_token = {
      accessToken: 'tok',
      expiresAt: Date.now() + 999_999,
    };

    fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(uploadDatabaseBackup('{"test":true}')).rejects.toThrow(/Could not reach Google Drive|500/i);
  });
});