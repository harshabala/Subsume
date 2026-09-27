import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageType, WatchAlert } from '@/shared/types';

vi.mock('@/background/storage', () => ({
  exportLibraryData: vi.fn(),
  importLibraryData: vi.fn(),
  putWatchAlert: vi.fn(),
  getAllWatchAlerts: vi.fn(),
  deleteWatchAlert: vi.fn(),
  isValidWatchAlert: vi.fn(),
}));
vi.mock('@/background/context', () => ({ invalidateProfileCache: vi.fn() }));
vi.mock('@/background/notifications', () => ({ clearNotificationBadge: vi.fn() }));
vi.mock('@/background/drive-sync', () => ({
  connectGoogleDrive: vi.fn(),
  disconnectGoogleDrive: vi.fn(),
  getDriveConnectionStatus: vi.fn(),
  uploadDatabaseBackup: vi.fn(),
  downloadDatabaseBackup: vi.fn(),
}));
vi.mock('@/shared/validation', () => ({ validateImportData: vi.fn((d) => ({ ...d, validated: true })) }));

import { syncHandlers } from '@/background/handlers/sync';
import { alertHandlers } from '@/background/handlers/alerts';
import * as storage from '@/background/storage';
import * as drive from '@/background/drive-sync';
import { invalidateProfileCache } from '@/background/context';
import { clearNotificationBadge } from '@/background/notifications';
import { validateImportData } from '@/shared/validation';

const sender = {} as chrome.runtime.MessageSender;
const call = (map: typeof syncHandlers, type: MessageType, payload: unknown = {}) =>
  map[type]!(payload, sender);

beforeEach(() => vi.clearAllMocks());

describe('syncHandlers', () => {
  it('EXPORT_LIBRARY returns the export', async () => {
    vi.mocked(storage.exportLibraryData).mockResolvedValue({ version: 2 } as never);
    await expect(call(syncHandlers, MessageType.EXPORT_LIBRARY)).resolves.toEqual({ version: 2 });
  });

  it('IMPORT_LIBRARY validates, imports and invalidates the profile cache', async () => {
    await expect(call(syncHandlers, MessageType.IMPORT_LIBRARY, { library: [] })).resolves.toEqual({ updated: true });
    expect(validateImportData).toHaveBeenCalledWith({ library: [] });
    expect(storage.importLibraryData).toHaveBeenCalledWith({ library: [], validated: true });
    expect(invalidateProfileCache).toHaveBeenCalled();
  });

  it('CONNECT / DISCONNECT / GET_DRIVE_STATUS delegate to drive-sync', async () => {
    vi.mocked(drive.connectGoogleDrive).mockResolvedValue({ email: 'a@b.c' });
    vi.mocked(drive.disconnectGoogleDrive).mockResolvedValue({ revoked: true });
    vi.mocked(drive.getDriveConnectionStatus).mockResolvedValue({ connected: true, email: 'a@b.c' });
    await expect(call(syncHandlers, MessageType.CONNECT_GOOGLE_DRIVE)).resolves.toEqual({ connected: true, email: 'a@b.c' });
    await expect(call(syncHandlers, MessageType.DISCONNECT_GOOGLE_DRIVE)).resolves.toEqual({ connected: false, revoked: true });
    await expect(call(syncHandlers, MessageType.GET_DRIVE_STATUS)).resolves.toEqual({ connected: true, email: 'a@b.c' });
  });

  it('BACKUP_TO_DRIVE uploads the JSON export', async () => {
    vi.mocked(storage.exportLibraryData).mockResolvedValue({ version: 2 } as never);
    await expect(call(syncHandlers, MessageType.BACKUP_TO_DRIVE)).resolves.toEqual({ success: true });
    expect(drive.uploadDatabaseBackup).toHaveBeenCalledWith('{"version":2}');
  });

  it('RESTORE_FROM_DRIVE downloads, validates and imports', async () => {
    vi.mocked(drive.downloadDatabaseBackup).mockResolvedValue('{"library":[1]}');
    await expect(call(syncHandlers, MessageType.RESTORE_FROM_DRIVE)).resolves.toEqual({ success: true });
    expect(storage.importLibraryData).toHaveBeenCalledWith({ library: [1], validated: true });
    expect(invalidateProfileCache).toHaveBeenCalled();
  });

  it('CLEAR_NOTIFICATION_BADGE clears the badge', async () => {
    await expect(call(syncHandlers, MessageType.CLEAR_NOTIFICATION_BADGE)).resolves.toEqual({ cleared: true });
    expect(clearNotificationBadge).toHaveBeenCalled();
  });
});

describe('alertHandlers', () => {
  it('CREATE_WATCH_ALERT builds a screen alert with deduped alert types', async () => {
    const alert = (await call(alertHandlers, MessageType.CREATE_WATCH_ALERT, {
      name: '  Sci-fi  ',
      genres: ['878'],
      platforms: ['8'],
      keyword: '  space ',
      authorKeyword: 'ignored for screen',
      alertTypes: ['new_release', 'new_release'],
    })) as WatchAlert;
    expect(alert).toMatchObject({
      name: 'Sci-fi',
      type: 'both',
      genres: ['878'],
      platforms: ['8'],
      keyword: 'space',
      authorKeyword: undefined,
      alertTypes: ['new_release'],
      enabled: true,
      lastNotifiedMediaIds: [],
    });
    expect(alert.id).toMatch(/^alert_\d+_/);
    expect(storage.putWatchAlert).toHaveBeenCalledWith(alert);
  });

  it('CREATE_WATCH_ALERT for books drops screen chips and keeps the author keyword', async () => {
    const alert = (await call(alertHandlers, MessageType.CREATE_WATCH_ALERT, {
      name: 'Le Guin',
      type: 'book',
      genres: ['878'],
      platforms: ['8'],
      keyword: '   ',
      authorKeyword: ' Ursula ',
      alertTypes: [],
      enabled: false,
    })) as WatchAlert;
    expect(alert).toMatchObject({
      type: 'book',
      genres: undefined,
      platforms: undefined,
      keyword: undefined,
      authorKeyword: 'Ursula',
      alertTypes: undefined,
      enabled: false,
    });
  });

  it('CREATE_WATCH_ALERT leaves empty chip lists and blank author keyword undefined', async () => {
    const alert = (await call(alertHandlers, MessageType.CREATE_WATCH_ALERT, {
      name: 'x',
      type: 'book',
      authorKeyword: '  ',
    })) as WatchAlert;
    expect(alert.authorKeyword).toBeUndefined();
    const screen = (await call(alertHandlers, MessageType.CREATE_WATCH_ALERT, {
      name: 'y',
      genres: [],
      platforms: [],
    })) as WatchAlert;
    expect(screen.genres).toBeUndefined();
    expect(screen.platforms).toBeUndefined();
  });

  it('GET / DELETE / UPDATE watch alerts', async () => {
    vi.mocked(storage.getAllWatchAlerts).mockResolvedValue([{ id: 'a' }] as WatchAlert[]);
    await expect(call(alertHandlers, MessageType.GET_WATCH_ALERTS)).resolves.toEqual([{ id: 'a' }]);
    await expect(call(alertHandlers, MessageType.DELETE_WATCH_ALERT, { id: 'a' })).resolves.toEqual({ deleted: true });
    expect(storage.deleteWatchAlert).toHaveBeenCalledWith('a');

    vi.mocked(storage.isValidWatchAlert).mockReturnValue(true);
    await expect(call(alertHandlers, MessageType.UPDATE_WATCH_ALERT, { alert: { id: 'a' } })).resolves.toEqual({ id: 'a' });
    vi.mocked(storage.isValidWatchAlert).mockReturnValue(false);
    await expect(call(alertHandlers, MessageType.UPDATE_WATCH_ALERT, { alert: {} })).rejects.toThrow(/Invalid watch alert/);
  });
});
