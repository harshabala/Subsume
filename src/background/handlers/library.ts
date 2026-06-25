import { MessageHandlerMap } from '@/shared/messages';
import { logger } from '@/shared/logger';
import {
  MessageType,
  AddToListRequest,
  UpdateStatusRequest,
  SetUserRatingRequest,
  SetUserTagsRequest,
  SetUserNotesRequest,
  RemoveFromLibraryRequest,
  GetLibraryRequest,
  GetLibraryPageRequest,
  LibraryItem,
} from '@/shared/types';
import {
  getMediaItem,
  putMediaItem,
  getLibraryItem,
  putLibraryItem,
  removeLibraryItem,
  getAllLibraryItems,
  getLibraryPage,
  getAllMediaMap,
} from '../storage';
import { invalidateProfileCache } from '../context';
import { mergeMediaItems } from '../mediaMerge';
import { broadcastMessage } from './utils';

export const libraryHandlers: MessageHandlerMap = {
  [MessageType.ADD_TO_LIST]: async (payload) => {
    const req = payload as AddToListRequest;
    logger.log('[Subsume] ADD_TO_LIST:', req.mediaItem.canonicalTitle);

    const existingMedia = await getMediaItem(req.mediaItem.id);
    const mediaToStore = existingMedia
      ? mergeMediaItems(req.mediaItem, existingMedia)
      : req.mediaItem;
    await putMediaItem(mediaToStore);

    const existing = await getLibraryItem(req.mediaItem.id);
    const libraryItem: LibraryItem = existing
      ? { ...existing, updatedAt: Date.now() }
      : {
          mediaId: req.mediaItem.id,
          status: 'to-watch',
          sanctuaryIntent: 'wishlist',
          addedAt: Date.now(),
          updatedAt: Date.now(),
        };

    await putLibraryItem(libraryItem);
    invalidateProfileCache();
    await broadcastMessage({
      type: 'LIBRARY_UPDATED',
      action: 'add',
      mediaId: libraryItem.mediaId,
      libraryItem,
    });
    return libraryItem;
  },

  [MessageType.UPDATE_STATUS]: async (payload) => {
    const req = payload as UpdateStatusRequest;
    logger.log('[Subsume] UPDATE_STATUS:', req.mediaId, '→', req.status);
    const validStatuses = new Set(['to-watch', 'watching', 'watched', 'abandoned']);
    if (!validStatuses.has(req.status)) {
      return { updated: false };
    }
    const existing = await getLibraryItem(req.mediaId);
    if (!existing) {
      return { updated: false };
    }
    existing.status = req.status;
    existing.updatedAt = Date.now();
    await putLibraryItem(existing);
    invalidateProfileCache();
    await broadcastMessage({
      type: 'LIBRARY_UPDATED',
      action: 'update',
      mediaId: existing.mediaId,
      libraryItem: existing,
    });
    return { updated: true };
  },

  [MessageType.SET_USER_RATING]: async (payload) => {
    const req = payload as SetUserRatingRequest;
    if (req.rating < 1 || req.rating > 10) {
      return { updated: false };
    }
    const existing = await getLibraryItem(req.mediaId);
    if (!existing) {
      return { updated: false };
    }
    existing.userRating = req.rating;
    existing.updatedAt = Date.now();
    await putLibraryItem(existing);
    invalidateProfileCache();
    await broadcastMessage({
      type: 'LIBRARY_UPDATED',
      action: 'update',
      mediaId: existing.mediaId,
      libraryItem: existing,
    });
    return { updated: true };
  },

  [MessageType.SET_USER_TAGS]: async (payload) => {
    const req = payload as SetUserTagsRequest;
    logger.log('[Subsume] SET_USER_TAGS:', req.mediaId, '→', req.tags);
    const existing = await getLibraryItem(req.mediaId);
    if (!existing) {
      return { updated: false };
    }
    existing.userTags = req.tags;
    existing.updatedAt = Date.now();
    await putLibraryItem(existing);
    invalidateProfileCache();
    await broadcastMessage({
      type: 'LIBRARY_UPDATED',
      action: 'update',
      mediaId: existing.mediaId,
      libraryItem: existing,
    });
    return { updated: true };
  },

  [MessageType.SET_USER_NOTES]: async (payload) => {
    const req = payload as SetUserNotesRequest;
    const existing = await getLibraryItem(req.mediaId);
    if (!existing) {
      return { updated: false };
    }
    existing.notes = req.notes.trim() || undefined;
    existing.updatedAt = Date.now();
    await putLibraryItem(existing);
    invalidateProfileCache();
    await broadcastMessage({
      type: 'LIBRARY_UPDATED',
      action: 'update',
      mediaId: existing.mediaId,
      libraryItem: existing,
    });
    return { updated: true };
  },

  [MessageType.REMOVE_FROM_LIBRARY]: async (payload) => {
    const req = payload as RemoveFromLibraryRequest;
    await removeLibraryItem(req.mediaId);
    invalidateProfileCache();
    await broadcastMessage({
      type: 'LIBRARY_UPDATED',
      action: 'remove',
      mediaId: req.mediaId,
    });
    return { removed: true };
  },

  [MessageType.GET_LIBRARY]: async (payload) => {
    const req = payload as GetLibraryRequest;
    logger.log('[Subsume] GET_LIBRARY with filters:', req);
    
    const items = await getAllLibraryItems();
    
    // Filter by status if requested
    let filtered = req?.status 
      ? items.filter((item) => item.status === req.status)
      : items;

    // Fetch full media details to return joined objects
    const mediaIds = filtered.map((item) => item.mediaId);
    const mediaMap = await getAllMediaMap(mediaIds);

    // Filter by type if requested
    if (req?.type) {
      filtered = filtered.filter((i) => mediaMap[i.mediaId]?.type === req.type);
    }

    // Sort by added date by default
    filtered.sort((a, b) => b.addedAt - a.addedAt);

    // Return joined result
    return filtered.map((item) => ({
      library: item,
      media: mediaMap[item.mediaId],
    }));
  },

  [MessageType.GET_LIBRARY_PAGE]: async (payload) => {
    const req = payload as GetLibraryPageRequest;
    logger.log('[Subsume] GET_LIBRARY_PAGE limit:', req.limit, 'offset:', req.offset);
    const libraryItems = await getLibraryPage(req.limit, req.offset, req.type);
    const mediaIds = libraryItems.map((item) => item.mediaId);
    const mediaMap = await getAllMediaMap(mediaIds);
    return libraryItems.map((item) => ({
      library: item,
      media: mediaMap[item.mediaId],
    }));
  },
};
