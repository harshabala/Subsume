import { MediaRating } from '@/shared/types';

const BASE_URL = 'https://www.omdbapi.com/';

const CACHE = new Map<string, { data: MediaRating[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

let omdbApiKey: string | null = null;

export function setOmdbApiKey(key: string): void {
  omdbApiKey = key;
}

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
  if (!omdbApiKey || !omdbApiKey.trim()) {
    return [];
  }

  const cacheKey = `omdb_${title}_${year}_${type}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const omdbType = type === 'tv' ? 'series' : 'movie';
  const url = `${BASE_URL}?apikey=${encodeURIComponent(omdbApiKey)}&t=${encodeURIComponent(title)}&y=${year}&type=${omdbType}`;

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
        CACHE.set(cacheKey, { data: [], timestamp: Date.now() });
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

    CACHE.set(cacheKey, { data: ratings, timestamp: Date.now() });
    return ratings;
  } catch (err) {
    console.error('[Subsume OMDb] Fetch failed', err);
    return [];
  }
}