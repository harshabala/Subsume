import { MediaItem, MediaType, UserPreferences } from '@/shared/types';
import { BASE_URL, getTmdbApiKey, fetchWithRetry, makeBearerHeaders } from './client';
import { TmdbSearchDetails, TmdbSearchResult, mapTmdbToMediaItem } from './mappers';
import { CACHE, CACHE_TTL } from './cache';
import { loadGenreMap } from './genres';
import { enrichMediaWithOmdbRatings, enrichMediaWithStreaming } from './enrichment';
import { runWithConcurrency } from '../omdb';

/**
 * Searches TMDb for a movie or TV show.
 */
export async function searchTitle(
  title: string,
  yearGuess?: number,
  typeGuess?: MediaType
): Promise<MediaItem | null> {
  const genreMap = await loadGenreMap();
  const cacheKey = `search_${title}_${yearGuess}_${typeGuess}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as MediaItem | null;
  }

  const authOpts = makeBearerHeaders(getTmdbApiKey());

  const searchMovie = async () => {
    let url = `${BASE_URL}/search/movie?query=${encodeURIComponent(title)}&include_adult=false`;
    if (yearGuess) url += `&primary_release_year=${yearGuess}`;
    
    const res = await fetchWithRetry(url, 3, 500, authOpts);
    if (!res.ok) throw new Error(`TMDb Movie API error: ${res.status}`);
    const data: TmdbSearchResult = await res.json();
    return { data, type: 'movie' as MediaType };
  };

  const searchTv = async () => {
    let url = `${BASE_URL}/search/tv?query=${encodeURIComponent(title)}&include_adult=false`;
    if (yearGuess) url += `&first_air_date_year=${yearGuess}`;
    
    const res = await fetchWithRetry(url, 3, 500, authOpts);
    if (!res.ok) throw new Error(`TMDb TV API error: ${res.status}`);
    const data: TmdbSearchResult = await res.json();
    return { data, type: 'tv' as MediaType };
  };

  try {
    let bestResult: TmdbSearchDetails | undefined;
    let finalType: MediaType = 'movie';

    if (typeGuess === 'movie') {
      const { data } = await searchMovie();
      bestResult = data.results[0];
    } else if (typeGuess === 'tv') {
      const { data } = await searchTv();
      bestResult = data.results[0];
    } else {
      const [movieData, tvData] = await Promise.all([searchMovie(), searchTv()]);
      
      const mMatch = movieData.data.results[0];
      const tMatch = tvData.data.results[0];

      if (mMatch && tMatch) {
        if (tMatch.vote_count > mMatch.vote_count * 2) {
          bestResult = tMatch;
          finalType = 'tv';
        } else {
          bestResult = mMatch;
          finalType = 'movie';
        }
      } else if (mMatch) {
        bestResult = mMatch;
        finalType = 'movie';
      } else if (tMatch) {
        bestResult = tMatch;
        finalType = 'tv';
      }
    }

    if (!bestResult) return null;

    const releaseDate =
      (finalType === 'movie' ? bestResult.release_date : bestResult.first_air_date) || undefined;
    const baseItem = mapTmdbToMediaItem(bestResult, finalType, genreMap);
    const withRatings = await enrichMediaWithOmdbRatings(baseItem);
    const resultItem = await enrichMediaWithStreaming(withRatings, undefined, releaseDate);
    CACHE.set(cacheKey, { data: resultItem, timestamp: Date.now() });
    return resultItem;
  } catch (err) {
    console.error('[Subsume TMDB] Search failed', err);
    return null;
  }
}

export async function searchTitles(
  query: string,
  type?: MediaType,
  year?: number
): Promise<MediaItem[]> {
  const genreMap = await loadGenreMap();
  const cacheKey = `search_multi_${query}_${type}_${year}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as MediaItem[] || [];
  }

  const authOpts = makeBearerHeaders(getTmdbApiKey());

  const searchMovie = async () => {
    let url = `${BASE_URL}/search/movie?query=${encodeURIComponent(query)}&include_adult=false&page=1`;
    if (year) url += `&primary_release_year=${year}`;
    const res = await fetchWithRetry(url, 3, 500, authOpts);
    if (!res.ok) throw new Error(`TMDb Movie API error: ${res.status}`);
    const data: TmdbSearchResult = await res.json();
    return data.results.map((r) => mapTmdbToMediaItem(r, 'movie', genreMap));
  };

  const searchTv = async () => {
    let url = `${BASE_URL}/search/tv?query=${encodeURIComponent(query)}&include_adult=false&page=1`;
    if (year) url += `&first_air_date_year=${year}`;
    const res = await fetchWithRetry(url, 3, 500, authOpts);
    if (!res.ok) throw new Error(`TMDb TV API error: ${res.status}`);
    const data: TmdbSearchResult = await res.json();
    return data.results.map((r) => mapTmdbToMediaItem(r, 'tv', genreMap));
  };

  try {
    let results: MediaItem[] = [];

    if (type === 'movie') {
      results = await searchMovie();
    } else if (type === 'tv') {
      results = await searchTv();
    } else {
      const [movies, tvShows] = await Promise.all([searchMovie(), searchTv()]);
      results = [...movies, ...tvShows];
    }

    results.sort((a, b) => {
      const aVotes = a.ratings.find((r) => r.provider === 'tmdb')?.votes || 0;
      const bVotes = b.ratings.find((r) => r.provider === 'tmdb')?.votes || 0;
      return bVotes - aVotes;
    });

    const limited = await runWithConcurrency(
      results.slice(0, 10),
      enrichMediaWithOmdbRatings,
      3
    );
    CACHE.set(cacheKey, { data: limited, timestamp: Date.now() });
    return limited;
  } catch (err) {
    console.error('[Subsume TMDB] Multi-search failed', err);
    return [];
  }
}

/**
 * Helper to get a date string for recent releases
 */
function getRecentDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

/**
 * Fetches the latest trending or currently airing titles.
 */
export async function getLatestReleases(
  type: 'movie' | 'tv',
  prefs?: UserPreferences,
  recentDays: number = 60
): Promise<MediaItem[]> {
  const genreMap = await loadGenreMap();
  let url = `${BASE_URL}`;
  
  const authOpts = makeBearerHeaders(getTmdbApiKey());

  if (prefs && (prefs.favoriteGenres.length > 0 || prefs.platforms.length > 0 || recentDays !== 60)) {
    url += `/discover/${type}?language=en-US&page=1&sort_by=popularity.desc`;
    
    // Restrict to recent releases
    const recentDate = getRecentDate(recentDays);
    if (type === 'movie') {
      url += `&primary_release_date.gte=${recentDate}&primary_release_date.lte=${getRecentDate(0)}`;
    } else {
      url += `&air_date.gte=${recentDate}&air_date.lte=${getRecentDate(0)}`;
    }

    if (prefs.favoriteGenres.length > 0) {
      url += `&with_genres=${prefs.favoriteGenres.join('|')}`;
    }
    if (prefs.platforms.length > 0) {
      url += `&with_watch_providers=${prefs.platforms.join('|')}&watch_region=${prefs.region || 'US'}`;
    }
  } else {
    const endpoint = type === 'movie' ? '/movie/now_playing' : '/tv/on_the_air';
    url += `${endpoint}?language=en-US&page=1`;
  }
  
  try {
    const res = await fetchWithRetry(url, 3, 500, authOpts);
    if (!res.ok) throw new Error('Failed to fetch latest releases');
    const data: TmdbSearchResult = await res.json();
    
    const prefsRegion = prefs?.region || 'US';
    const bases = data.results.map((r) => {
      const releaseDate = (type === 'movie' ? r.release_date : r.first_air_date) || undefined;
      return { base: mapTmdbToMediaItem(r, type, genreMap), releaseDate };
    });
    const withRatings = await runWithConcurrency(
      bases,
      async ({ base }) => enrichMediaWithOmdbRatings(base),
      3
    );
    const items = await Promise.all(
      withRatings.map((item, index) =>
        enrichMediaWithStreaming(item, prefsRegion, bases[index].releaseDate)
      )
    );
    return items;
  } catch (err) {
    console.error('TMDb Latest Releases Error:', err);
    return [];
  }
}
