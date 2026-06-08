import { MediaItem, MediaType, MediaProvider, UserPreferences, CrewRole, StreamingInfo } from '@/shared/types';
import { getMediaItem, putMediaItem, getAllMediaMap, putMediaItems, getPreferences } from './storage';
import { fetchOmdbRatings, runWithConcurrency } from './omdb';

const BASE_URL = 'https://api.themoviedb.org/3';
export const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const CACHE = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

let tmdbApiKey: string | null = null;

export function setTmdbApiKey(key: string): void {
  tmdbApiKey = key;
  loadGenreMap().catch(() => {});
}

export async function fetchWithRetry(url: string, retries = 3, baseDelay = 500, options?: RequestInit): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : baseDelay * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      if (res.status >= 500) {
        const delayMs = baseDelay * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        const delayMs = baseDelay * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  throw lastError || new Error(`Failed after ${retries} retries`);
}

export function makeBearerHeaders(key: string): RequestInit {
  if (!key || !key.trim()) {
    throw new Error('TMDb API key is missing or empty.');
  }
  return { headers: { Authorization: `Bearer ${key}` } };
}

function getTmdbApiKey(): string {
  if (!tmdbApiKey) {
    throw new Error('TMDB API key not configured. Please set it in Settings.');
  }
  return tmdbApiKey;
}

interface TmdbSearchDetails {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
}

interface TmdbSearchResult {
  page: number;
  results: TmdbSearchDetails[];
  total_results: number;
}

let GENRE_MAP: Record<number, string> = {};
let GENRE_MAP_LOADED = false;
let genreMapPromise: Promise<void> | null = null;

async function loadGenreMap(): Promise<void> {
  if (GENRE_MAP_LOADED) return;
  if (!genreMapPromise) {
    genreMapPromise = (async () => {
      try {
        const key = getTmdbApiKey();
        const [movieRes, tvRes] = await Promise.all([
          fetchWithRetry(`${BASE_URL}/genre/movie/list?language=en-US`, 3, 500, makeBearerHeaders(key)),
          fetchWithRetry(`${BASE_URL}/genre/tv/list?language=en-US`, 3, 500, makeBearerHeaders(key)),
        ]);
        const movieData = await movieRes.json();
        const tvData = await tvRes.json();
        const map: Record<number, string> = {};
        for (const g of movieData.genres || []) {
          map[g.id] = g.name;
        }
        for (const g of tvData.genres || []) {
          map[g.id] = g.name;
        }
        GENRE_MAP = map;
        GENRE_MAP_LOADED = true;
      } catch (err) {
        console.error('[Subsume] Failed to load genre map:', err);
        genreMapPromise = null;
        throw err;
      }
    })();
  }
  return genreMapPromise;
}

/**
 * Normalizes TMDB response into our app's MediaItem domain model.
 */
function mapTmdbToMediaItem(
  result: TmdbSearchDetails,
  type: MediaType
): MediaItem {
  const title = (type === 'movie' ? result.title : result.name) || 'Unknown Title';
  const releaseDate = (type === 'movie' ? result.release_date : result.first_air_date) || '';
  const parsedYear = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : 0;
  const year = isNaN(parsedYear) ? 0 : parsedYear;
  
  const genres = (result.genre_ids || [])
    .map((id) => GENRE_MAP[id])
    .filter(Boolean);

  return {
    id: `tmdb_${type}_${result.id}`,
    canonicalTitle: title,
    type,
    year,
    genres,
    ratings: [
      {
        provider: 'tmdb',
        score: result.vote_average || 0,
        votes: result.vote_count || 0,
      },
    ],
    providers: [
      {
        provider: 'tmdb',
        externalId: result.id?.toString() || '',
        url: `https://www.themoviedb.org/${type}/${result.id}`,
      },
    ],
    posterUrl: result.poster_path ? `${POSTER_BASE_URL}${result.poster_path}` : '',
    backdropUrl: result.backdrop_path ? `${POSTER_BASE_URL}${result.backdrop_path}` : undefined,
    overview: result.overview || '',
  };
}

// ─── Watch Providers ─────────────────────────────────────────────────

interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
}

interface TmdbWatchProvidersResult {
  link?: string;
  flatrate?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
}

export interface TmdbWatchProvidersResponse {
  id: number;
  results: Record<string, TmdbWatchProvidersResult>;
}

export interface MapWatchProvidersOptions {
  releaseDate?: string;
  theatricalReleaseDates?: string[];
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function isRecentReleaseDate(dateStr: string, now = Date.now()): boolean {
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return false;
  const ts = parsed.getTime();
  return ts <= now && now - ts <= NINETY_DAYS_MS;
}

/**
 * Maps a TMDb watch/providers API response to StreamingInfo[].
 */
export function mapWatchProvidersResponse(
  data: TmdbWatchProvidersResponse,
  region: string,
  type: 'movie' | 'tv',
  options: MapWatchProvidersOptions = {}
): StreamingInfo[] {
  const regionData = data.results?.[region];
  if (!regionData) return [];

  const seen = new Set<string>();
  const result: StreamingInfo[] = [];

  const addProviders = (providers: TmdbProvider[] | undefined) => {
    for (const provider of providers || []) {
      const name = provider.provider_name;
      if (!name || seen.has(name)) continue;
      seen.add(name);
      result.push({
        region,
        platform: name,
        url: regionData.link,
      });
    }
  };

  addProviders(regionData.flatrate);
  addProviders(regionData.rent);
  addProviders(regionData.buy);

  if (type === 'movie') {
    const hasFlatrate = (regionData.flatrate?.length ?? 0) > 0;
    const hasRecentTheatrical = (options.theatricalReleaseDates || []).some((d) =>
      isRecentReleaseDate(d)
    );
    const releaseDateRecent = options.releaseDate
      ? isRecentReleaseDate(options.releaseDate)
      : false;

    if (!hasFlatrate && (hasRecentTheatrical || releaseDateRecent)) {
      result.unshift({
        region,
        platform: 'In Theaters',
      });
    }
  }

  return result;
}

async function fetchTheatricalReleaseDates(
  tmdbNumericId: string,
  region: string
): Promise<string[]> {
  try {
    const key = getTmdbApiKey();
    const url = `${BASE_URL}/movie/${tmdbNumericId}/release_dates`;
    const res = await fetchWithRetry(url, 3, 500, makeBearerHeaders(key));
    if (!res.ok) return [];

    const data = await res.json();
    const dates: string[] = [];

    for (const entry of data.results || []) {
      if (entry.iso_3166_1 !== region) continue;
      for (const release of entry.release_dates || []) {
        if (release.type === 3 && release.release_date) {
          dates.push(release.release_date.split('T')[0]);
        }
      }
    }

    return dates;
  } catch {
    return [];
  }
}

/**
 * Fetches streaming / rental availability for a title in a given region.
 */
export async function fetchWatchProviders(
  tmdbNumericId: string,
  type: 'movie' | 'tv',
  region: string,
  options?: { releaseDate?: string }
): Promise<StreamingInfo[]> {
  const cacheKey = `watch_providers_${type}_${tmdbNumericId}_${region}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as StreamingInfo[];
  }

  try {
    const key = getTmdbApiKey();
    const url = `${BASE_URL}/${type}/${tmdbNumericId}/watch/providers`;
    const res = await fetchWithRetry(url, 3, 500, makeBearerHeaders(key));
    if (!res.ok) return [];

    const data: TmdbWatchProvidersResponse = await res.json();

    let theatricalReleaseDates: string[] = [];
    if (type === 'movie') {
      theatricalReleaseDates = await fetchTheatricalReleaseDates(tmdbNumericId, region);
    }

    const mapped = mapWatchProvidersResponse(data, region, type, {
      releaseDate: options?.releaseDate,
      theatricalReleaseDates,
    });

    CACHE.set(cacheKey, { data: mapped, timestamp: Date.now() });
    return mapped;
  } catch (err) {
    console.error('[Subsume TMDB] Watch providers fetch failed', err);
    return [];
  }
}

/**
 * Attaches streamingAvailability to a MediaItem using the user's region.
 */
export async function enrichMediaWithStreaming(
  item: MediaItem,
  region?: string,
  releaseDate?: string
): Promise<MediaItem> {
  const tmdbProvider = item.providers.find((p) => p.provider === 'tmdb');
  if (!tmdbProvider?.externalId) return item;

  let effectiveRegion = region;
  if (!effectiveRegion) {
    try {
      const prefs = await getPreferences();
      effectiveRegion = prefs.region || 'US';
    } catch {
      effectiveRegion = 'US';
    }
  }

  const availability = await fetchWatchProviders(
    tmdbProvider.externalId,
    item.type,
    effectiveRegion,
    { releaseDate }
  );

  return {
    ...item,
    streamingAvailability: availability,
  };
}

/**
 * Merges OMDb IMDb/RT ratings into a MediaItem without duplicating providers.
 */
export async function enrichMediaWithOmdbRatings(item: MediaItem): Promise<MediaItem> {
  const omdbRatings = await fetchOmdbRatings(item.canonicalTitle, item.year, item.type);
  if (omdbRatings.length === 0) {
    return item;
  }

  const existingProviders = new Set(item.ratings.map((rating) => rating.provider));
  const newRatings = omdbRatings.filter((rating) => !existingProviders.has(rating.provider));
  if (newRatings.length === 0) {
    return item;
  }

  return {
    ...item,
    ratings: [...item.ratings, ...newRatings],
  };
}

/**
 * Searches TMDb for a movie or TV show.
 */
export async function searchTitle(
  title: string,
  yearGuess?: number,
  typeGuess?: MediaType
): Promise<MediaItem | null> {
  await loadGenreMap();
  const cacheKey = `search_${title}_${yearGuess}_${typeGuess}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as MediaItem | null;
  }

  // If we don't know the type, we search both and take the best match.
  // Better approach: use Multi-Search, but multi-search doesn't easily let us filter by year.
  
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
      // Search both concurrently
      const [movieData, tvData] = await Promise.all([searchMovie(), searchTv()]);
      
      const mMatch = movieData.data.results[0];
      const tMatch = tvData.data.results[0];

      // Simple heuristic: pick the one with more popularity/votes, or movie by default
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
    const baseItem = mapTmdbToMediaItem(bestResult, finalType);
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
  await loadGenreMap();
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
    return data.results.map((r) => mapTmdbToMediaItem(r, 'movie'));
  };

  const searchTv = async () => {
    let url = `${BASE_URL}/search/tv?query=${encodeURIComponent(query)}&include_adult=false&page=1`;
    if (year) url += `&first_air_date_year=${year}`;
    const res = await fetchWithRetry(url, 3, 500, authOpts);
    if (!res.ok) throw new Error(`TMDb TV API error: ${res.status}`);
    const data: TmdbSearchResult = await res.json();
    return data.results.map((r) => mapTmdbToMediaItem(r, 'tv'));
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
  await loadGenreMap();
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
      return { base: mapTmdbToMediaItem(r, type), releaseDate };
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

/**
 * Searches TMDb for a person (actor/crew).
 */
export async function searchPerson(
  query: string,
  apiKey: string
): Promise<Array<{
  id: string;
  name: string;
  knownForDepartment: string;
  profilePath: string | null;
  knownFor: Array<{ title: string; mediaType: 'movie' | 'tv' }>;
}>> {
  const url = `${BASE_URL}/search/person?query=${encodeURIComponent(query)}&include_adult=false`;
  const res = await fetchWithRetry(url, 3, 500, makeBearerHeaders(apiKey));
  if (!res.ok) throw new Error(`TMDb Person search API error: ${res.status}`);
  const data = await res.json();
  
  return (data.results || []).map((p: any) => {
    const knownFor = (p.known_for || []).map((kf: any) => ({
      title: (kf.media_type === 'movie' ? kf.title : kf.name) || 'Unknown Title',
      mediaType: kf.media_type as 'movie' | 'tv'
    }));
    
    return {
      id: p.id?.toString() || '',
      name: p.name || 'Unknown Name',
      knownForDepartment: p.known_for_department || '',
      profilePath: p.profile_path || null,
      knownFor
    };
  });
}

/**
 * Fetches standard details for a person.
 */
export async function fetchPersonDetails(
  personId: string,
  apiKey: string
): Promise<{ biography: string; birthday: string; profilePath: string | null }> {
  const url = `${BASE_URL}/person/${personId}`;
  const res = await fetchWithRetry(url, 3, 500, makeBearerHeaders(apiKey));
  if (!res.ok) throw new Error(`TMDb Person Details API error: ${res.status}`);
  const data = await res.json();
  return {
    biography: data.biography || '',
    birthday: data.birthday || '',
    profilePath: data.profile_path || null,
  };
}

/**
 * Fetches complete filmography of a person, filtering by their CrewRole.
 */
export async function fetchPersonFilmography(
  personId: string,
  role: CrewRole,
  apiKey: string
): Promise<Array<{
  tmdbId: string;
  title: string;
  year: number;
  mediaType: 'movie' | 'tv';
  posterPath: string | null;
  voteAverage: number;
}>> {
  const personAuthOpts = makeBearerHeaders(apiKey);
  const [movieRes, tvRes] = await Promise.all([
    fetchWithRetry(`${BASE_URL}/person/${personId}/movie_credits?language=en-US`, 3, 500, personAuthOpts),
    fetchWithRetry(`${BASE_URL}/person/${personId}/tv_credits?language=en-US`, 3, 500, personAuthOpts),
  ]);

  if (!movieRes.ok) throw new Error(`TMDb movie credits error: ${movieRes.status}`);
  if (!tvRes.ok) throw new Error(`TMDb tv credits error: ${tvRes.status}`);

  const movieData = await movieRes.json();
  const tvData = await tvRes.json();

  let rawMovieItems: any[] = [];
  let rawTvItems: any[] = [];

  if (role === 'actor') {
    rawMovieItems = movieData.cast || [];
    rawTvItems = tvData.cast || [];
  } else {
    let jobTitles: string[] = [];
    if (role === 'director') jobTitles = ['Director'];
    else if (role === 'writer') jobTitles = ['Screenplay', 'Writer', 'Story'];
    else if (role === 'cinematographer') jobTitles = ['Director of Photography'];
    else if (role === 'composer') jobTitles = ['Original Music Composer'];
    else if (role === 'editor') jobTitles = ['Editor'];
    else if (role === 'producer') jobTitles = ['Producer'];

    rawMovieItems = (movieData.crew || []).filter((c: any) => jobTitles.includes(c.job));
    rawTvItems = (tvData.crew || []).filter((c: any) => jobTitles.includes(c.job));
  }

  const movies = rawMovieItems.map((item: any) => {
    const releaseDate = item.release_date || '';
    const year = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : 0;
    return {
      tmdbId: item.id?.toString() || '',
      title: item.title || 'Unknown Title',
      year: isNaN(year) ? 0 : year,
      mediaType: 'movie' as const,
      posterPath: item.poster_path || null,
      voteAverage: item.vote_average || 0
    };
  });

  const tvs = rawTvItems.map((item: any) => {
    const firstAirDate = item.first_air_date || '';
    const year = firstAirDate ? parseInt(firstAirDate.substring(0, 4), 10) : 0;
    return {
      tmdbId: item.id?.toString() || '',
      title: item.name || 'Unknown Title',
      year: isNaN(year) ? 0 : year,
      mediaType: 'tv' as const,
      posterPath: item.poster_path || null,
      voteAverage: item.vote_average || 0
    };
  });

  const combined = [...movies, ...tvs];
  const seen = new Set<string>();
  const deduped: Array<{
    tmdbId: string;
    title: string;
    year: number;
    mediaType: 'movie' | 'tv';
    posterPath: string | null;
    voteAverage: number;
  }> = [];

  for (const item of combined) {
    if (!seen.has(item.tmdbId)) {
      seen.add(item.tmdbId);
      deduped.push(item);
    }
  }

  deduped.sort((a, b) => b.year - a.year);

  // Fetch all existing media items at once to perform an in-memory check
  const mediaIds = deduped.map((item) => `tmdb_${item.mediaType}_${item.tmdbId}`);
  const existingMap = await getAllMediaMap(mediaIds);
  const newItems: MediaItem[] = [];

  for (const item of deduped) {
    const mediaId = `tmdb_${item.mediaType}_${item.tmdbId}`;
    if (!existingMap[mediaId]) {
      newItems.push({
        id: mediaId,
        canonicalTitle: item.title,
        type: item.mediaType,
        year: item.year,
        genres: [],
        ratings: [
          {
            provider: 'tmdb',
            score: item.voteAverage,
            votes: 0,
          },
        ],
        providers: [
          {
            provider: 'tmdb',
            externalId: item.tmdbId,
            url: `https://www.themoviedb.org/${item.mediaType}/${item.tmdbId}`,
          },
        ],
        posterUrl: item.posterPath ? `${POSTER_BASE_URL}${item.posterPath}` : '',
        overview: '',
      });
    }
  }

  if (newItems.length > 0) {
    await putMediaItems(newItems);
  }

  return deduped;
}

