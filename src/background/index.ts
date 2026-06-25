import { createMessageRouter, MessageHandlerMap } from '@/shared/messages';
import { logger } from '@/shared/logger';
import {
  MessageType,
  MediaItem,
  GetTitleDetailsRequest,
  AddToListRequest,
  UpdateStatusRequest,
  SetUserRatingRequest,
  SetUserNotesRequest,
  SetUserTagsRequest,
  GetLibraryRequest,
  GetLibraryPageRequest,
  RemoveFromLibraryRequest,
  GetMediaItemsRequest,
  LibraryItem,
  GetRecommendationsRequest,
  GetLatestReleasesRequest,
  ImportLibraryData,
  UserPreferences,
  SearchTitlesRequest,
  CrewRole,
  PersonItem,
  PosterMatch,
  WeeklyDigest,
  WatchAlert,
  WatchAlertMatch,
  CreateWatchAlertRequest,
  DeleteWatchAlertRequest,
  UpdateWatchAlertRequest,
} from '@/shared/types';
import { searchTitle, searchTitles, getLatestReleases, setTmdbApiKey, enrichMediaWithOmdbRatings, enrichMediaWithStreaming, searchPerson, fetchPersonDetails, fetchPersonFilmography, makeBearerHeaders, fetchWithRetry, POSTER_BASE_URL } from './tmdb';
import { setOmdbApiKey } from './omdb';
import {
  findMediaByTitle,
  putMediaItem,
  getMediaItem,
  getLibraryItem,
  putLibraryItem,
  removeLibraryItem,
  getAllLibraryItems,
  getLibraryPage,
  getAllMediaMap,
  getPreferences,
  savePreferences,
  exportLibraryData,
  importLibraryData,
  getAllPeople,
  getPersonById,
  savePerson,
  deletePerson,
  updatePersonSync,
  getWeeklyDigest,
  saveWeeklyDigest,
  getAllWatchAlerts,
  putWatchAlert,
  deleteWatchAlert,
} from './storage';
import { checkWatchAlerts } from './alerts';
import { generateRuleBasedRecommendations } from './recommendations';
import { generateLLMRecommendations, getPersonalizedRecommendations } from './llm';
import { buildWatchProfile, invalidateProfileCache } from './context';
import { generateWeeklyDigest, isDigestStale } from './digest';
import { buildContentPrefs } from './contentPrefs';
import { mergeMediaItems } from './mediaMerge';

async function broadcastMessage(message: any) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {});
      }
    }
  } catch (err) {
    logger.error('[Subsume] Failed to query tabs for broadcast:', err);
  }
}

// In-memory poster-resolve result cache. Entries older than QUERY_CACHE_TTL
// are evicted on access. Total size is capped at QUERY_CACHE_MAX to prevent
// memory exhaustion via crafted DOM alt-text (DoS vector).
const QUERY_CACHE_MAX = 500;
const QUERY_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const QUERY_CACHE = new Map<string, { result: MediaItem | null; ts: number }>();

function queryCacheGet(key: string): MediaItem | null | undefined {
  const entry = QUERY_CACHE.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > QUERY_CACHE_TTL) {
    QUERY_CACHE.delete(key);
    return undefined;
  }
  return entry.result;
}

function queryCacheSet(key: string, result: MediaItem | null): void {
  // Evict the oldest entry when at capacity.
  if (QUERY_CACHE.size >= QUERY_CACHE_MAX) {
    const oldestKey = QUERY_CACHE.keys().next().value;
    if (oldestKey !== undefined) QUERY_CACHE.delete(oldestKey);
  }
  QUERY_CACHE.set(key, { result, ts: Date.now() });
}

async function fetchMediaDetails(tmdbId: string, mediaType: 'movie' | 'tv', apiKey: string): Promise<MediaItem> {
  const baseUrl = 'https://api.themoviedb.org/3';
  const url = `${baseUrl}/${mediaType}/${tmdbId}?language=en-US`;
  const res = await fetchWithRetry(url, 3, 500, makeBearerHeaders(apiKey));
  if (!res.ok) {
    throw new Error(`Failed to fetch TMDb details: ${res.status}`);
  }
  const data = await res.json();
  
  const title = (mediaType === 'movie' ? data.title : data.name) || 'Unknown Title';
  const releaseDate = (mediaType === 'movie' ? data.release_date : data.first_air_date) || '';
  const parsedYear = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : 0;
  const year = isNaN(parsedYear) ? 0 : parsedYear;
  
  const genres = Array.isArray(data.genres)
    ? data.genres.map((g: any) => g.name).filter(Boolean)
    : [];

  const item: MediaItem = {
    id: `tmdb_${mediaType}_${tmdbId}`,
    canonicalTitle: title,
    type: mediaType,
    year,
    genres,
    ratings: [
      {
        provider: 'tmdb',
        score: data.vote_average || 0,
        votes: data.vote_count || 0,
      },
    ],
    providers: [
      {
        provider: 'tmdb',
        externalId: tmdbId,
        url: `https://www.themoviedb.org/${mediaType}/${tmdbId}`,
      },
    ],
    posterUrl: data.poster_path ? `${POSTER_BASE_URL}${data.poster_path}` : '',
    backdropUrl: data.backdrop_path ? `${POSTER_BASE_URL}${data.backdrop_path}` : undefined,
    overview: data.overview || '',
    runtimeMinutes: data.runtime || (Array.isArray(data.episode_run_time) ? data.episode_run_time[0] : undefined),
  };

  const prefs = await getPreferences();
  const withRatings = await enrichMediaWithOmdbRatings(item);
  return enrichMediaWithStreaming(withRatings, prefs.region || 'US', releaseDate || undefined);
}

// ─── Message Handlers ─────────────────────────────────────────────────

/**
 * Returns a copy of UserPreferences with all sensitive API key fields removed.
 * Used by GET_PREFERENCES so that content scripts running on arbitrary web
 * pages cannot read the user's API credentials.
 */
function sanitizePreferencesForContentScript(
  prefs: UserPreferences
): Omit<UserPreferences, 'tmdbApiKey' | 'omdbApiKey' | 'llmApiKey' | 'llmSecondaryApiKey'> {
  const { tmdbApiKey: _tmdb, omdbApiKey: _omdb, llmApiKey: _llm, llmSecondaryApiKey: _llmSec, ...safe } = prefs;
  return safe;
}

function isValidUserPreferences(prefs: any): prefs is UserPreferences {
  if (!prefs || typeof prefs !== 'object') return false;
  if (!Array.isArray(prefs.favoriteGenres) || !prefs.favoriteGenres.every((g: any) => typeof g === 'string')) return false;
  if (!Array.isArray(prefs.platforms) || !prefs.platforms.every((p: any) => typeof p === 'string')) return false;
  if (typeof prefs.region !== 'string') return false;
  if (typeof prefs.llmEnabled !== 'boolean') return false;
  if (prefs.llmProvider !== undefined && !['openai', 'anthropic', 'gemini', 'local'].includes(prefs.llmProvider)) return false;
  if (prefs.llmApiKey !== undefined && typeof prefs.llmApiKey !== 'string') return false;
  if (prefs.llmSecondaryApiKey !== undefined && typeof prefs.llmSecondaryApiKey !== 'string') return false;
  if (prefs.tmdbApiKey !== undefined && typeof prefs.tmdbApiKey !== 'string') return false;
  if (prefs.omdbApiKey !== undefined && typeof prefs.omdbApiKey !== 'string') return false;
  if (typeof prefs.hoverCardsEnabled !== 'boolean') return false;
  if (typeof prefs.posterOverlaysEnabled !== 'boolean') return false;
  if (!Array.isArray(prefs.disabledDomains) || !prefs.disabledDomains.every((d: any) => typeof d === 'string')) return false;
  if (!['low', 'medium', 'high'].includes(prefs.detectionSensitivity)) return false;
  if (typeof prefs.onboardingComplete !== 'boolean') return false;
  return true;
}

const handlers: MessageHandlerMap = {
  [MessageType.GET_TITLE_DETAILS]: async (payload) => {
    const req = payload as GetTitleDetailsRequest;
    logger.log('[Subsume] GET_TITLE_DETAILS:', req.title);
    
    // 1. Check local DB first
    const cached = await findMediaByTitle(req.title, req.yearGuess);
    if (cached) {
      logger.log('[Subsume] Found in local cache:', cached.canonicalTitle);
      const prefs = await getPreferences();
      let result = cached;

      const missingOmdbRatings =
        !result.ratings.some((r) => r.provider === 'imdb') ||
        !result.ratings.some((r) => r.provider === 'rt');
      if (missingOmdbRatings && prefs.omdbApiKey) {
        result = await enrichMediaWithOmdbRatings(result);
        await putMediaItem(result);
      }

      if (!result.streamingAvailability || result.streamingAvailability.length === 0) {
        result = await enrichMediaWithStreaming(result, prefs.region || 'US');
        await putMediaItem(result);
      }
      return result;
    }

    // 2. Fetch from TMDb
    const result = await searchTitle(req.title, req.yearGuess, req.typeGuess);
    if (result) {
      // Save it locally to avoid future network hits
      await putMediaItem(result);
      return result;
    }

    throw new Error('Title not found on TMDb');
  },

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

  [MessageType.GET_MEDIA_ITEMS]: async (payload) => {
    const req = payload as GetMediaItemsRequest;
    const mediaMap = await getAllMediaMap(req.mediaIds);
    return Object.values(mediaMap);
  },

  [MessageType.SEARCH_TITLES]: async (payload) => {
    const req = payload as SearchTitlesRequest;
    const results = await searchTitles(req.query, req.type, req.year);
    return results;
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

  [MessageType.GET_RECOMMENDATIONS]: async (payload) => {
    const req = payload as GetRecommendationsRequest;
    logger.log('[Subsume] GET_RECOMMENDATIONS', req);
    
    // Check if LLM is enabled and has a key
    const prefs = await getPreferences();
    if (prefs.llmEnabled && prefs.llmApiKey) {
      try {
        logger.log('[Subsume] Using LLM for recommendations...');
        const llmRecs = await generateLLMRecommendations();
        if (llmRecs.length > 0) {
          return llmRecs;
        }
      } catch (err) {
        logger.error('[Subsume] LLM recommendations failed, falling back to rule-based', err);
      }
    }
    
    logger.log('[Subsume] Using rule-based recommendations fallback');
    return generateRuleBasedRecommendations(req?.basedOnMediaId);
  },

  [MessageType.GET_LATEST_RELEASES]: async (payload) => {
    const req = payload as GetLatestReleasesRequest;
    const type = req?.type || 'movie';
    logger.log(`[Subsume] GET_LATEST_RELEASES for ${type}`);
    
    chrome.action.setBadgeText({ text: '' });
    
    const prefs = await getPreferences();
    return getLatestReleases(type, prefs);
  },

  [MessageType.GET_PREFERENCES]: async () => {
    const prefs = await getPreferences();
    return sanitizePreferencesForContentScript(prefs);
  },

  [MessageType.GET_FULL_PREFERENCES]: async () => {
    // Returns the full unredacted preferences including API keys.
    // Only the Settings UI should call this message type.
    return getPreferences();
  },

  [MessageType.SET_PREFERENCES]: async (payload) => {
    const prefs = payload as UserPreferences;
    if (!isValidUserPreferences(prefs)) {
      throw new Error('Invalid preferences payload');
    }
    await savePreferences(prefs);
    setTmdbApiKey(prefs.tmdbApiKey ?? '');
    setOmdbApiKey(prefs.omdbApiKey ?? '');
    return { updated: true };
  },

  [MessageType.EXPORT_LIBRARY]: async () => {
    return exportLibraryData();
  },

  [MessageType.IMPORT_LIBRARY]: async (payload) => {
    const data = payload as ImportLibraryData;
    await importLibraryData(data);
    return { updated: true };
  },

  // ─── Filmmakers & Crew Handlers ─────────────────────────────────────

  [MessageType.SEARCH_PERSON]: async (payload) => {
    const req = payload as { query: string };
    const prefs = await getPreferences();
    if (!prefs.tmdbApiKey) {
      return { error: 'TMDb API key not set' };
    }
    const results = await searchPerson(req.query, prefs.tmdbApiKey);
    return { results };
  },

  [MessageType.FOLLOW_PERSON]: async (payload) => {
    const req = payload as {
      personId: string;
      name: string;
      knownForDepartment: string;
      profilePath: string | null;
      knownFor: Array<{ title: string; mediaType: 'movie' | 'tv' }>;
      role: CrewRole;
    };

    const prefs = await getPreferences();
    if (!prefs.tmdbApiKey) {
      throw new Error('TMDb API key not set');
    }

    const existing = await getPersonById(req.personId);
    if (existing) {
      return { alreadyFollowing: true };
    }

    const details = await fetchPersonDetails(req.personId, prefs.tmdbApiKey);
    const personItem: PersonItem = {
      id: req.personId,
      name: req.name,
      role: req.role,
      profileImageUrl: req.profilePath ?? undefined,
      biography: details.biography,
      knownFor: req.knownFor.map(k => k.title).slice(0, 3),
      filmographyIds: [],
      followedAt: Date.now(),
      lastSyncedAt: 0
    };

    await savePerson(personItem);

    // Fire and forget SYNC_FILMOGRAPHY logic (do not await)
    fetchPersonFilmography(req.personId, req.role, prefs.tmdbApiKey)
      .then(async (films) => {
        const tmdbIds = films.map(f => `tmdb_${f.mediaType}_${f.tmdbId}`);
        await updatePersonSync(req.personId, tmdbIds);
        broadcastMessage({
          type: 'FILMMAKERS_UPDATED',
          action: 'sync',
          personId: req.personId
        });
      })
      .catch(() => {});

    broadcastMessage({
      type: 'FILMMAKERS_UPDATED',
      action: 'follow',
      personId: personItem.id
    });

    return { success: true };
  },

  [MessageType.UNFOLLOW_PERSON]: async (payload) => {
    const req = payload as { personId: string };
    // Guard: only delete and broadcast if the person is actually followed.
    // Without this check a spurious FILMMAKERS_UPDATED event fires for unknown IDs.
    const existing = await getPersonById(req.personId);
    if (!existing) {
      return { success: true };
    }
    await deletePerson(req.personId);
    broadcastMessage({
      type: 'FILMMAKERS_UPDATED',
      action: 'unfollow',
      personId: req.personId
    });
    return { success: true };
  },

  [MessageType.GET_FILMOGRAPHY]: async (payload) => {
    const req = payload as { personId: string };
    const person = await getPersonById(req.personId);
    if (!person) {
      return { items: [], person: null };
    }

    const items = await Promise.all(person.filmographyIds.map(getMediaItem));
    const validItems = items.filter((item): item is MediaItem => !!item);

    return { items: validItems, person };
  },

  [MessageType.SYNC_FILMOGRAPHY]: async (payload) => {
    const req = payload as { personId: string };
    const prefs = await getPreferences();
    if (!prefs.tmdbApiKey) {
      return { error: 'TMDb API key not set' };
    }

    const person = await getPersonById(req.personId);
    if (!person) {
      return { synced: 0 };
    }

    const films = await fetchPersonFilmography(person.id, person.role, prefs.tmdbApiKey);
    const tmdbIds = films.map(f => `tmdb_${f.mediaType}_${f.tmdbId}`);
    await updatePersonSync(person.id, tmdbIds);

    return { synced: films.length };
  },

  [MessageType.GET_ALL_PEOPLE]: async () => {
    const people = await getAllPeople();
    return { people };
  },

  [MessageType.RESOLVE_POSTER]: async (payload) => {
    const req = payload as {
      strategy: 'tmdb-cdn' | 'alt-text' | 'ancestor-text';
      tmdbId?: string;
      mediaType?: 'movie' | 'tv';
      query?: string;
    };

    logger.log('[Subsume] RESOLVE_POSTER:', req.strategy, req.tmdbId || req.query);

    let media: MediaItem | null = null;

    if (req.strategy === 'tmdb-cdn' && req.tmdbId && req.mediaType) {
      const mediaId = `tmdb_${req.mediaType}_${req.tmdbId}`;
      const cached = await getMediaItem(mediaId);
      if (cached) {
        media = cached;
      } else {
        try {
          const prefs = await getPreferences();
          if (prefs.tmdbApiKey) {
            media = await fetchMediaDetails(req.tmdbId, req.mediaType, prefs.tmdbApiKey);
            await putMediaItem(media);
          }
        } catch (err) {
          logger.error('[Subsume] Failed to fetch tmdb-cdn details:', err);
        }
      }
    } else if ((req.strategy === 'alt-text' || req.strategy === 'ancestor-text') && req.query) {
      const cacheKey = req.query.trim().toLowerCase();
      const cached = queryCacheGet(cacheKey);
      if (cached !== undefined) {
        media = cached;
      } else {
        try {
          const prefs = await getPreferences();
          if (prefs.tmdbApiKey) {
            media = await searchTitle(req.query, undefined, undefined);
            queryCacheSet(cacheKey, media);
            if (media) {
              const cachedMedia = await getMediaItem(media.id);
              if (!cachedMedia) {
                await putMediaItem(media);
              } else {
                media = cachedMedia;
              }
            }
          }
        } catch (err) {
          logger.error('[Subsume] Failed to search/resolve title:', err);
        }
      }
    }

    if (!media) {
      return { match: null };
    }

    const prefs = await getPreferences();
    const missingOmdbRatings =
      !media.ratings.some((r) => r.provider === 'imdb') ||
      !media.ratings.some((r) => r.provider === 'rt');
    if (missingOmdbRatings && prefs.omdbApiKey) {
      media = await enrichMediaWithOmdbRatings(media);
      await putMediaItem(media);
    }

    const libraryItem = await getLibraryItem(media.id);
    
    // Parse raw tmdb numeric ID from media.id (which is tmdb_type_id)
    const tmdbIdPart = media.id.split('_').slice(2).join('_') || media.id;

    const match: PosterMatch = {
      tmdbId: tmdbIdPart,
      title: media.canonicalTitle,
      year: media.year,
      type: media.type,
      posterPath: media.posterUrl || null,
      ratings: media.ratings,
      inLibrary: libraryItem !== undefined,
      libraryStatus: libraryItem?.status,
      userRating: libraryItem?.userRating,
    };

    return { match };
  },

  [MessageType.GET_POSTER_PREFS]: async (payload) => {
    const req = payload as { hostname: string };
    const prefs = await getPreferences();
    const contentPrefs = buildContentPrefs(prefs, req.hostname);
    return {
      overlaysEnabled: contentPrefs.posterOverlaysEnabled,
      detectionSensitivity: contentPrefs.detectionSensitivity,
    };
  },

  [MessageType.GET_CONTENT_PREFS]: async (payload) => {
    const req = payload as { hostname: string };
    const prefs = await getPreferences();
    return buildContentPrefs(prefs, req.hostname);
  },

  [MessageType.OPEN_DETAIL]: async (payload) => {
    const req = payload as { mediaId: string };
    // Validate mediaId format to prevent query-string injection into the extension URL.
    if (!/^tmdb_(movie|tv)_\d+$/.test(req.mediaId)) {
      logger.warn('[Subsume] OPEN_DETAIL rejected invalid mediaId:', req.mediaId);
      return { success: false, error: 'Invalid mediaId format' };
    }
    chrome.tabs.create({
      url: chrome.runtime.getURL(`ui/index.html?mediaId=${req.mediaId}`)
    });
    return { success: true };
  },

  // ─── Phase 4: Personalized Discovery Handlers ──────────────────────

  [MessageType.BUILD_WATCH_PROFILE]: async () => {
    const profile = await buildWatchProfile();
    return { profile };
  },

  [MessageType.GET_PERSONALIZED_RECS]: async () => {
    const prefs = await getPreferences();

    if (!prefs.llmEnabled || !prefs.llmApiKey) {
      return { error: 'no_llm_key', flat: [], grouped: null };
    }

    try {
      const { flat, grouped } = await getPersonalizedRecommendations(prefs);
      return { flat, grouped };
    } catch (err) {
      logger.error('[Subsume] GET_PERSONALIZED_RECS failed:', err);
      return { error: 'llm_failed', flat: [], grouped: null };
    }
  },

  // ─── Weekly Digest Handlers ──────────────────────────────────────────

  [MessageType.GET_WEEKLY_DIGEST]: async () => {
    const cached = await getWeeklyDigest();
    if (cached && !isDigestStale(cached)) {
      return cached;
    }

    if (cached) {
      const prefs = await getPreferences();
      generateWeeklyDigest(prefs)
        .then(async (digest) => {
          await saveWeeklyDigest(digest);
        })
        .catch((err) => {
          logger.error('[Subsume] Background weekly digest regen failed:', err);
        });
      return cached;
    }

    const prefs = await getPreferences();
    const digest = await generateWeeklyDigest(prefs);
    await saveWeeklyDigest(digest);
    return digest;
  },

  [MessageType.REGENERATE_WEEKLY_DIGEST]: async () => {
    const prefs = await getPreferences();
    const digest = await generateWeeklyDigest(prefs);
    await saveWeeklyDigest(digest);
    return digest;
  },

  // ─── Watch Alert Handlers ───────────────────────────────────────────

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


// ─── Initialize ───────────────────────────────────────────────────────

export { handlers };

createMessageRouter(handlers);

getPreferences().then((prefs) => {
  if (prefs.tmdbApiKey) {
    setTmdbApiKey(prefs.tmdbApiKey);
  }
  if (prefs.omdbApiKey) {
    setOmdbApiKey(prefs.omdbApiKey);
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    logger.log('[Subsume] Extension installed — welcome!');
    chrome.tabs.create({ url: chrome.runtime.getURL('ui/index.html') });
  }
});

type NotificationBadgeKind = 'new-releases' | 'watch-alert' | 'weekly-digest';

const NOTIFICATION_BADGE_TEXT: Record<NotificationBadgeKind, string> = {
  'new-releases': 'NEW',
  'watch-alert': '!',
  'weekly-digest': '✦',
};

function setNotificationBadge(kind: NotificationBadgeKind) {
  chrome.action.setBadgeText({ text: NOTIFICATION_BADGE_TEXT[kind] });
  chrome.action.setBadgeBackgroundColor({ color: '#a78bfa' });
}

async function notifyWatchAlertMatches(
  matches: WatchAlertMatch[],
  options?: { updateBadge?: boolean }
) {
  if (matches.length === 0) return;

  const byAlert = new Map<string, WatchAlertMatch[]>();
  for (const match of matches) {
    const existing = byAlert.get(match.alert.id) || [];
    existing.push(match);
    byAlert.set(match.alert.id, existing);
  }

  for (const [alertId, alertMatches] of byAlert) {
    const alert = alertMatches[0].alert;
    const titles = alertMatches.slice(0, 3).map((match) => match.media.canonicalTitle);
    let message = titles.join(', ');
    if (alertMatches.length > 3) {
      message += ` and ${alertMatches.length - 3} more`;
    }

    chrome.notifications.create(`watch-alert-${alertId}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: `Alert: ${alert.name}`,
      message,
      priority: 1,
    });
  }

  if (options?.updateBadge !== false) {
    setNotificationBadge('watch-alert');
  }
}

async function notifyWeeklyDigestReady(digest: WeeklyDigest) {
  if (digest.items.length === 0) return;

  setNotificationBadge('weekly-digest');
  chrome.notifications.create('weekly-digest', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Your weekly watchlist is ready',
    message:
      digest.items.length +
      ' personalized pick' +
      (digest.items.length === 1 ? '' : 's') +
      ' curated for you',
    priority: 1,
  });
}

const DAILY_RELEASE_WINDOW_DAYS = 7;

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyRefresh') {
    logger.log('[Subsume] Daily refresh triggered.');
    const prefs = await getPreferences();

    const [movies, tv] = await Promise.all([
      getLatestReleases('movie', prefs, DAILY_RELEASE_WINDOW_DAYS),
      getLatestReleases('tv', prefs, DAILY_RELEASE_WINDOW_DAYS),
    ]);
    const allReleases = [...movies, ...tv];

    let dailyBadge: NotificationBadgeKind | null = null;

    if (
      (prefs.favoriteGenres.length > 0 || prefs.platforms.length > 0) &&
      allReleases.length > 0
    ) {
      chrome.notifications.create('daily-new-releases', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'New Releases Available',
        message:
          allReleases.length +
          ' new title' +
          (allReleases.length === 1 ? '' : 's') +
          ' matching your preferences',
        priority: 1,
      });
      dailyBadge = 'new-releases';
    }

    try {
      const alertMatches = await checkWatchAlerts(prefs, allReleases);
      await notifyWatchAlertMatches(alertMatches, { updateBadge: false });
      if (alertMatches.length > 0) {
        dailyBadge = dailyBadge ?? 'watch-alert';
      }
    } catch (err) {
      logger.error('[Subsume] Watch alert check failed:', err);
    }

    if (dailyBadge) {
      setNotificationBadge(dailyBadge);
    }
  }

  if (alarm.name === 'weeklyDigest') {
    logger.log('[Subsume] Weekly digest alarm triggered.');
    try {
      const prefs = await getPreferences();
      const digest = await generateWeeklyDigest(prefs);
      await saveWeeklyDigest(digest);
      await notifyWeeklyDigestReady(digest);
    } catch (err) {
      logger.error('[Subsume] Weekly digest generation failed:', err);
    }
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (
    notificationId === 'daily-new-releases' ||
    notificationId === 'weekly-digest' ||
    notificationId.startsWith('watch-alert-')
  ) {
    const page = notificationId.startsWith('watch-alert-') ? '?page=alerts' : '';
    chrome.tabs.create({ url: chrome.runtime.getURL(`ui/index.html${page}`) });
    chrome.notifications.clear(notificationId);
  }
});

// Run once a day (guarded to prevent resetting the schedule on MV3 restart)
chrome.alarms.get('dailyRefresh', (alarm) => {
  if (!alarm) {
    chrome.alarms.create('dailyRefresh', { periodInMinutes: 1440 });
  }
});

// Run once every 7 days (guarded to prevent resetting the schedule on MV3 restart)
chrome.alarms.get('weeklyDigest', (alarm) => {
  if (!alarm) {
    chrome.alarms.create('weeklyDigest', { periodInMinutes: 10080 });
  }
});

logger.log('[Subsume] Background service worker started.');
