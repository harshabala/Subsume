import { MediaItem, MediaRating } from '@/shared/types';
import { fetchWithRetry } from './tmdb';

export const TRAKT_CLIENT_ID = '2e9c6e05fc48fce41abf78ac01c1f6fc92dd43e7f47e1e61b84e0b31b940e88a';

const BASE_URL = 'https://api.trakt.tv';
const CACHE = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 86400000; // 24 hours

// Exported for testing purposes
export function __clearCache(): void {
  CACHE.clear();
}

function traktHeaders(): RequestInit {
  return {
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': TRAKT_CLIENT_ID,
    },
  };
}

export async function fetchTraktRating(
  slug: string,
  type: 'movie' | 'tv'
): Promise<MediaRating | null> {
  const cacheKey = `trakt_rating_${type}_${slug}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as MediaRating | null;
  }

  try {
    const endpoint = type === 'tv' ? 'shows' : 'movies';
    const url = `${BASE_URL}/${endpoint}/${slug}/ratings`;
    const res = await fetchWithRetry(url, 3, 500, traktHeaders());
    if (!res.ok) {
      CACHE.set(cacheKey, { data: null, timestamp: Date.now() });
      return null;
    }

    const data: { rating: number; votes: number } = await res.json();
    const rating: MediaRating = {
      provider: 'trakt',
      score: data.rating,
      votes: data.votes,
    };
    CACHE.set(cacheKey, { data: rating, timestamp: Date.now() });
    return rating;
  } catch {
    return null;
  }
}

export async function getTraktTrending(
  type: 'movie' | 'tv',
  limit = 20
): Promise<Array<{ title: string; year: number; traktSlug: string; watchers: number }>> {
  const cacheKey = `trakt_trending_${type}_${limit}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as Array<{ title: string; year: number; traktSlug: string; watchers: number }>;
  }

  try {
    const endpoint = type === 'tv' ? 'shows' : 'movies';
    const url = `${BASE_URL}/${endpoint}/trending?limit=${limit}`;
    const res = await fetchWithRetry(url, 3, 500, traktHeaders());
    if (!res.ok) return [];

    const data: Array<{ watchers: number; movie?: { title: string; year: number; ids: { slug: string } }; show?: { title: string; year: number; ids: { slug: string } } }> = await res.json();

    const results = data.map((entry) => {
      const item = type === 'tv' ? entry.show! : entry.movie!;
      return {
        title: item.title,
        year: item.year,
        traktSlug: item.ids.slug,
        watchers: entry.watchers,
      };
    });
    CACHE.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  } catch {
    return [];
  }
}

export async function searchTrakt(query: string, type?: 'movie' | 'tv'): Promise<MediaItem[]> {
  const cacheKey = `trakt_search_${query}_${type}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as MediaItem[];
  }

  try {
    const typeParam = type ? type === 'tv' ? 'show' : 'movie' : 'movie,show';
    const url = `${BASE_URL}/search/${typeParam}?query=${encodeURIComponent(query)}&limit=10`;
    const res = await fetchWithRetry(url, 3, 500, traktHeaders());
    if (!res.ok) return [];

    const data: Array<{
      type: string;
      score: number;
      movie?: { title: string; year: number; ids: { slug: string; tmdb?: number } };
      show?: { title: string; year: number; ids: { slug: string; tmdb?: number } };
    }> = await res.json();

    const items: MediaItem[] = data.map((entry) => {
      const isMovie = entry.type === 'movie';
      const raw = isMovie ? entry.movie! : entry.show!;
      const mediaType = isMovie ? 'movie' : 'tv';
      return {
        id: `trakt_${mediaType}_${raw.ids.slug}`,
        canonicalTitle: raw.title,
        type: mediaType,
        year: raw.year,
        genres: [],
        ratings: [],
        providers: [
          {
            provider: 'trakt',
            externalId: raw.ids.slug,
            url: `https://trakt.tv/${isMovie ? 'movies' : 'shows'}/${raw.ids.slug}`,
          },
        ],
        posterUrl: '',
        overview: '',
      };
    });

    CACHE.set(cacheKey, { data: items, timestamp: Date.now() });
    return items;
  } catch {
    return [];
  }
}
