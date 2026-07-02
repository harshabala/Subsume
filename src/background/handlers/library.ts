import { MessageHandlerMap } from '@/shared/messages';
import { logger } from '@/shared/logger';
import {
  MessageType,
  AddToListRequest,
  SetUserRatingRequest,
  SetUserTagsRequest,
  RemoveFromLibraryRequest,
  GetLibraryRequest,
  GetLibraryPageRequest,
  CheckLibraryStatusRequest,
  CheckLibraryStatusResponse,
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
  intentForStatus,
  isValidMediaItem,
  seedDemoLibraryIfEmpty,
} from '../storage';
import { isSafeNavMediaId } from '@/shared/mediaIds';
import { invalidateProfileCache } from '../context';
import { mergeMediaItems } from '../mediaMerge';
import { broadcastMessage, parseSetUserNotesRequest, parseUpdateStatusRequest } from './utils';

export const libraryHandlers: MessageHandlerMap = {
  [MessageType.ADD_TO_LIST]: async (payload) => {
    const req = payload as AddToListRequest;
    if (!isValidMediaItem(req.mediaItem)) {
      throw new Error('Invalid media item payload');
    }
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
    const req = parseUpdateStatusRequest(payload);
    if (!req) {
      return { updated: false };
    }
    logger.log('[Subsume] UPDATE_STATUS:', req.mediaId, '→', req.status);
    const existing = await getLibraryItem(req.mediaId);
    if (!existing) {
      return { updated: false };
    }
    existing.status = req.status;
    existing.sanctuaryIntent = intentForStatus(req.status);
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
    const req = parseSetUserNotesRequest(payload);
    if (!req) {
      return { updated: false };
    }
    const existing = await getLibraryItem(req.mediaId);
    if (!existing) {
      return { updated: false };
    }
    existing.emotionalRecall = req.emotionalRecall?.trim() || undefined;
    existing.notes = req.notes?.trim() || undefined;
    existing.atmosphere = req.atmosphere?.trim() || undefined;
    existing.lingeringThought = req.lingeringThought?.trim() || undefined;
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

  [MessageType.CHECK_LIBRARY_STATUS]: async (payload) => {
    const req = payload as CheckLibraryStatusRequest;
    if (!req?.mediaId || !isSafeNavMediaId(req.mediaId)) {
      return { inLibrary: false } satisfies CheckLibraryStatusResponse;
    }
    const libraryItem = await getLibraryItem(req.mediaId);
    if (!libraryItem) {
      return { inLibrary: false } satisfies CheckLibraryStatusResponse;
    }
    return {
      inLibrary: true,
      status: libraryItem.status,
      userRating: libraryItem.userRating,
    } satisfies CheckLibraryStatusResponse;
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

    let joined = filtered
      .filter((item) => mediaMap[item.mediaId])
      .map((item) => ({
        library: item,
        media: mediaMap[item.mediaId],
      }));

    if (req?.genre) {
      joined = joined.filter(({ media }) => media.genres?.includes(req.genre!));
    }

    if (req?.yearRange) {
      const { min, max } = req.yearRange;
      joined = joined.filter(({ media }) => {
        const year = media.year;
        return Number.isFinite(year) && year >= min && year <= max;
      });
    }

    const sortBy = req?.sortBy ?? 'addedAt';
    joined.sort((a, b) => {
      switch (sortBy) {
        case 'year':
          return (b.media?.year ?? 0) - (a.media?.year ?? 0);
        case 'rating': {
          const scoreA = a.media?.ratings?.[0]?.score ?? 0;
          const scoreB = b.media?.ratings?.[0]?.score ?? 0;
          return scoreB - scoreA;
        }
        case 'userRating':
          return (b.library.userRating ?? 0) - (a.library.userRating ?? 0);
        case 'addedAt':
        default:
          return b.library.addedAt - a.library.addedAt;
      }
    });

    return joined;
  },

  [MessageType.GET_LIBRARY_PAGE]: async (payload) => {
    const req = payload as GetLibraryPageRequest;
    const limit = Math.min(100, Math.max(1, req.limit));
    const offset = Math.max(0, req.offset);
    logger.log('[Subsume] GET_LIBRARY_PAGE limit:', limit, 'offset:', offset);
    const libraryItems = await getLibraryPage(limit, offset, req.type);
    const mediaIds = libraryItems.map((item) => item.mediaId);
    const mediaMap = await getAllMediaMap(mediaIds);
    return libraryItems
      .filter((item) => mediaMap[item.mediaId])
      .map((item) => ({
        library: item,
        media: mediaMap[item.mediaId],
      }));
  },

  [MessageType.RESTORE_DEMO_LIBRARY]: async () => {
    const seeded = await seedDemoLibraryIfEmpty();
    return { seeded };
  },
};
