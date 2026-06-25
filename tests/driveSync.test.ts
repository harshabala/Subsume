import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadDatabaseBackup, downloadDatabaseBackup } from '@/background/drive-sync';

describe('drive-sync error recovery', () => {
  let getAuthTokenMock: any;
  let removeCachedAuthTokenMock: any;
  let fetchMock: any;
  let cachedToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    cachedToken = 'old-token';
    getAuthTokenMock = vi.fn((options: any, callback: any) => {
      if (options.interactive) cachedToken = 'new-token';
      callback(cachedToken);
    });
    removeCachedAuthTokenMock = vi.fn((_details: any, callback: any) => {
      cachedToken = '';
      if (callback) callback();
    });

    (global.chrome as any).identity = {
      getAuthToken: getAuthTokenMock,
      removeCachedAuthToken: removeCachedAuthTokenMock,
    };
  });

  it('retries Google Drive API requests once on 401 Unauthorized during upload', async () => {
    fetchMock = vi.fn()
      // First call (getBackupFileId): return 401
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })
      // Second call (retry getBackupFileId with new-token): return 200 OK with file
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ files: [{ id: 'file-123' }] }),
      })
      // Third call (PATCH upload): return 200 OK
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'ok',
      });

    vi.stubGlobal('fetch', fetchMock);

    await uploadDatabaseBackup('{"test":true}');

    expect(removeCachedAuthTokenMock).toHaveBeenCalledWith(
      { token: 'old-token' },
      expect.any(Function)
    );
    expect(getAuthTokenMock).toHaveBeenCalledWith(
      { interactive: true },
      expect.any(Function)
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries Google Drive API requests once on 401 Unauthorized during download', async () => {
    fetchMock = vi.fn()
      // First call (getBackupFileId): return 200 OK
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ files: [{ id: 'file-123' }] }),
      })
      // Second call (download media): return 401
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })
      // Third call (retry download media with new-token): return 200 OK
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '{"backup":data}',
      });

    vi.stubGlobal('fetch', fetchMock);

    const data = await downloadDatabaseBackup();

    expect(data).toBe('{"backup":data}');
    expect(removeCachedAuthTokenMock).toHaveBeenCalledWith(
      { token: 'old-token' },
      expect.any(Function)
    );
    expect(getAuthTokenMock).toHaveBeenCalledWith(
      { interactive: true },
      expect.any(Function)
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws an explicit network exception on non-2xx in backup file lookup queries', async () => {
    fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(uploadDatabaseBackup('{"test":true}')).rejects.toThrow(/failed|500/i);
  });
});
