import { MessageHandlerMap } from '@/shared/messages';
import { logger } from '@/shared/logger';
import {
  MessageType,
  MediaItem,
  GetTitleDetailsRequest,
  GetMediaItemsRequest,
  SearchTitlesRequest,
  GetLatestReleasesRequest,
  PosterMatch,
} from '@/shared/types';
import {
  searchTitle,
  searchTitles,
  getLatestReleases,
  enrichMediaWithOmdbRatings,
  enrichMediaWithStreaming,
  makeBearerHeaders,
  fetchWithRetry,
  POSTER_BASE_URL,
} from '../tmdb';
import {
  findMediaByTitle,
  putMediaItem,
  getMediaItem,
  getLibraryItem,
  getAllMediaMap,
  getPreferences,
} from '../storage';
import { searchTvMaze } from '../tvmaze';
import { fetchTraktRating } from '../trakt';
import { fetchWikipediaSummary, fetchWikidataDirectorInfo } from '../wikidata';

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

/**
 * Best-effort enrichment from free APIs (TVmaze rating via Trakt, Wikipedia summary,
 * Wikidata director bio). Never throws — returns the item as-is if any step fails.
 */
async function enrichWithFreeApis(item: MediaItem): Promise<MediaItem> {
  let enriched = { ...item };

  // Enrich overview from Wikipedia only when missing (avoids unnecessary fetch on keyed TMDb results)
  if (!enriched.overview) {
    const summary = await fetchWikipediaSummary(item.canonicalTitle, item.year).catch(() => null);
    if (summary) {
      enriched = { ...enriched, wikidataSummary: summary, overview: summary };
    }
  }

  // Fetch Wikidata director bio if we have an IMDb ID
  const imdbProvider = item.providers.find((p) => p.provider === 'imdb');
  if (imdbProvider?.externalId) {
    const dirInfo = await fetchWikidataDirectorInfo(imdbProvider.externalId).catch(() => null);
    if (dirInfo) {
      enriched = {
        ...enriched,
        wikidataDirectorBio: dirInfo.directorBio || undefined,
      };
    }
  }

  // Enrich with Trakt rating if we can infer a slug (best-effort)
  const traktSlug = item.canonicalTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (traktSlug && (item.type === 'movie' || item.type === 'tv')) {
    const traktRating = await fetchTraktRating(traktSlug, item.type).catch(() => null);
    if (traktRating && !enriched.ratings.some((r) => r.provider === 'trakt')) {
      enriched = { ...enriched, ratings: [...enriched.ratings, traktRating] };
    }
  }

  return enriched;
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

export const titleHandlers: MessageHandlerMap = {
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

    // 2. Fetch from TMDb (with TVmaze fallback for TV content when no TMDb key)
    let mediaItem: MediaItem | null = null;
    try {
      mediaItem = await searchTitle(req.title, req.yearGuess, req.typeGuess);
    } catch (err) {
      // TMDb key missing — fall back to TVmaze for TV content
      if (req.typeGuess === 'tv' || !req.typeGuess) {
        const tvResult = await searchTvMaze(req.title, req.yearGuess).catch(() => null);
        if (tvResult) {
          mediaItem = tvResult;
        }
      }
      if (!mediaItem) {
        logger.warn('[Subsume] Title lookup failed and no fallback available:', err);
      }
    }

    if (mediaItem) {
      mediaItem = await enrichWithFreeApis(mediaItem).catch(() => mediaItem!);
      await putMediaItem(mediaItem);
      return mediaItem;
    }

    throw new Error('Title not found on TMDb');
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

  [MessageType.GET_LATEST_RELEASES]: async (payload) => {
    const req = payload as GetLatestReleasesRequest;
    const type = req?.type || 'movie';
    logger.log(`[Subsume] GET_LATEST_RELEASES for ${type}`);
    
    chrome.action.setBadgeText({ text: '' });
    
    const prefs = await getPreferences();
    return getLatestReleases(type, prefs);
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

  [MessageType.OPEN_CAPTURE_CANVAS]: async (payload) => {
    const req = payload as { mediaId: string };
    if (!/^tmdb_(movie|tv)_\d+$/.test(req.mediaId)) {
      logger.warn('[Subsume] OPEN_CAPTURE_CANVAS rejected invalid mediaId:', req.mediaId);
      return { success: false, error: 'Invalid mediaId format' };
    }
    chrome.tabs.create({
      url: chrome.runtime.getURL(`ui/index.html?act=capture&mediaId=${req.mediaId}`)
    });
    return { success: true };
  },
};
