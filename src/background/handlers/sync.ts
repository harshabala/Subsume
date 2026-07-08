import { MessageHandlerMap } from '@/shared/messages';
import { MessageType } from '@/shared/types';
import { validateImportData } from '@/shared/validation';
import { exportLibraryData, importLibraryData } from '../storage';
import { invalidateProfileCache } from '../context';
import {
  connectGoogleDrive,
  uploadDatabaseBackup,
  downloadDatabaseBackup,
} from '../drive-sync';
import { clearNotificationBadge } from '../notifications';

export const syncHandlers: MessageHandlerMap = {
  [MessageType.EXPORT_LIBRARY]: async () => {
    return exportLibraryData();
  },

  [MessageType.IMPORT_LIBRARY]: async (payload) => {
    const data = validateImportData(payload);
    await importLibraryData(data);
    invalidateProfileCache();
    return { updated: true };
  },

  [MessageType.CONNECT_GOOGLE_DRIVE]: async () => {
    const result = await connectGoogleDrive();
    return { connected: true, email: result.email };
  },

  [MessageType.BACKUP_TO_DRIVE]: async () => {
    const data = await exportLibraryData();
    await uploadDatabaseBackup(JSON.stringify(data));
    return { success: true };
  },

  [MessageType.RESTORE_FROM_DRIVE]: async () => {
    const jsonString = await downloadDatabaseBackup();
    const raw = JSON.parse(jsonString);
    const data = validateImportData(raw);
    await importLibraryData(data);
    invalidateProfileCache();
    return { success: true };
  },

  [MessageType.CLEAR_NOTIFICATION_BADGE]: async () => {
    clearNotificationBadge();
    return { cleared: true };
  },
};
