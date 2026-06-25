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
} from '../storage';

export const alertHandlers: MessageHandlerMap = {
  [MessageType.CREATE_WATCH_ALERT]: async (payload) => {
    const req = payload as CreateWatchAlertRequest;
    const alert: WatchAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: req.name.trim(),
      type: req.type ?? 'both',
      genres: req.genres?.length ? req.genres : undefined,
      platforms: req.platforms?.length ? req.platforms : undefined,
      keyword: req.keyword?.trim() || undefined,
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
    await putWatchAlert(req.alert);
    return req.alert;
  },
};
