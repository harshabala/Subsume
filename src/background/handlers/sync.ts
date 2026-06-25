import { MessageHandlerMap } from '@/shared/messages';
import { MessageType, ImportLibraryData } from '@/shared/types';
import { exportLibraryData, importLibraryData } from '../storage';

export const syncHandlers: MessageHandlerMap = {
  [MessageType.EXPORT_LIBRARY]: async () => {
    return exportLibraryData();
  },

  [MessageType.IMPORT_LIBRARY]: async (payload) => {
    const data = payload as ImportLibraryData;
    await importLibraryData(data);
    return { updated: true };
  },
};
