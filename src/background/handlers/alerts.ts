import { MessageHandlerMap } from '@/shared/messages';
import {
  MessageType,
  WatchAlert,
  CreateWatchAlertRequest,
  DeleteWatchAlertRequest,
  UpdateWatchAlertRequest,
} from '@/shared/types';
import {
  putWatchAlert,
  getAllWatchAlerts,
  deleteWatchAlert,
  isValidWatchAlert,
} from '../storage';

export const alertHandlers: MessageHandlerMap = {
  [MessageType.CREATE_WATCH_ALERT]: async (payload) => {
    const req = payload as CreateWatchAlertRequest;
    const isBook = req.type === 'book';
    const alert: WatchAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: req.name.trim(),
      type: req.type ?? 'both',
      // TMDb chips only apply to screen alerts
      genres: !isBook && req.genres?.length ? req.genres : undefined,
      platforms: !isBook && req.platforms?.length ? req.platforms : undefined,
      keyword: req.keyword?.trim() || undefined,
      authorKeyword: isBook
        ? req.authorKeyword?.trim() || undefined
        : undefined,
      createdAt: Date.now(),
      enabled: req.enabled ?? true,
      lastNotifiedMediaIds: [],
    };
    await putWatchAlert(alert);
    return alert;
  },

  [MessageType.GET_WATCH_ALERTS]: async () => {
    return getAllWatchAlerts();
  },

  [MessageType.DELETE_WATCH_ALERT]: async (payload) => {
    const req = payload as DeleteWatchAlertRequest;
    await deleteWatchAlert(req.id);
    return { deleted: true };
  },

  [MessageType.UPDATE_WATCH_ALERT]: async (payload) => {
    const req = payload as UpdateWatchAlertRequest;
    if (!isValidWatchAlert(req.alert)) {
      throw new Error('Invalid watch alert payload');
    }
    await putWatchAlert(req.alert);
    return req.alert;
  },
};
