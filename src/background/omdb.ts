import { MediaRating } from '@/shared/types';
import { getPreferences } from './storage';
import { BoundedTtlCache } from './ttlCache';

const BASE_URL = 'https://www.omdbapi.com/';

const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
export const MAX_CACHE_SIZE = 500;
const cache = new BoundedTtlCache<MediaRating[]>(MAX_CACHE_SIZE, CACHE_TTL);

export function clearOmdbCache(): void {
  cache.clear();
}

export function getOmdbCacheSizeForTesting(): number {
  return cache.size;
}

export function setOmdbCacheEntryForTesting(key: string, data: MediaRating[]): void {
  cache.set(key, data);
}

let omdbApiKey: string | null = null;

export function setOmdbApiKey(key: string): void {
  omdbApiKey = key;
}

export async function ensureOmdbApiKey(): Promise<string | null> {
  if (omdbApiKey && omdbApiKey.trim()) {
    return omdbApiKey;
  }
  try {
    const prefs = await getPreferences();
    if (prefs?.omdbApiKey && prefs.omdbApiKey.trim()) {
      omdbApiKey = prefs.omdbApiKey;
      return omdbApiKey;
    }
  } catch {
    // Non-fatal
  }
  return null;
}

export const getOmdbApiKey = ensureOmdbApiKey;

interface OmdbRating {
  Source: string;
  Value: string;
}

interface OmdbResponse {
  Response: string;
  Error?: string;
  imdbRating?: string;
  Ratings?: OmdbRating[];
}

export async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = 3
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function fetchOmdbRatings(
  title: string,
  year: number,
  type: 'movie' | 'tv'
): Promise<MediaRating[]> {
  const key = await ensureOmdbApiKey();
  if (!key || !key.trim()) {
    return [];
  }

  const cacheKey = `omdb_${title}_${year}_${type}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const omdbType = type === 'tv' ? 'series' : 'movie';
  const url = `${BASE_URL}?apikey=${encodeURIComponent(key)}&t=${encodeURIComponent(title)}&y=${year}&type=${omdbType}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return [];
    }

    const data: OmdbResponse = await res.json();
    if (data.Response === 'False') {
      const error = data.Error ?? '';
      const isTransientError =
        error.includes('Invalid API key') || error.toLowerCase().includes('limit');
      if (!isTransientError) {
        cache.set(cacheKey, []);
      }
      return [];
    }

    const ratings: MediaRating[] = [];

    if (data.imdbRating && data.imdbRating !== 'N/A') {
      const score = parseFloat(data.imdbRating);
      if (!isNaN(score)) {
        ratings.push({ provider: 'imdb', score });
      }
    }

    if (Array.isArray(data.Ratings)) {
      for (const rating of data.Ratings) {
        if (rating.Source === 'Rotten Tomatoes' && rating.Value && rating.Value !== 'N/A') {
          const score = parseFloat(rating.Value.replace('%', ''));
          if (!isNaN(score)) {
            ratings.push({ provider: 'rt', score });
          }
        }
      }
    }

    cache.set(cacheKey, ratings);
    return ratings;
  } catch (err) {
    console.error('[Subsume OMDb] Fetch failed', err);
    return [];
  }
}