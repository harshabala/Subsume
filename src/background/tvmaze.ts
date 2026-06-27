import { MediaItem } from '@/shared/types';
import { fetchWithRetry } from './tmdb';

const BASE_URL = 'https://api.tvmaze.com';
const CACHE = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 86400000; // 24 hours

interface TvMazeShow {
  id: number;
  name: string;
  genres: string[];
  premiered: string | null;
  rating: { average: number | null };
  image: { medium: string; original: string } | null;
  summary: string | null;
}

interface TvMazeSearchResult {
  score: number;
  show: TvMazeShow;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function mapShowToMediaItem(show: TvMazeShow): MediaItem {
  const year = show.premiered ? parseInt(show.premiered.substring(0, 4), 10) : 0;
  return {
    id: `tvmaze_tv_${show.id}`,
    canonicalTitle: show.name,
    type: 'tv',
    year: isNaN(year) ? 0 : year,
    genres: show.genres || [],
    ratings: show.rating?.average != null
      ? [{ provider: 'tvmaze', score: show.rating.average, votes: 0 }]
      : [],
    providers: [
      {
        provider: 'tvmaze',
        externalId: String(show.id),
        url: `https://www.tvmaze.com/shows/${show.id}`,
      },
    ],
    posterUrl: show.image?.medium || '',
    backdropUrl: show.image?.original || undefined,
    overview: show.summary ? stripHtml(show.summary) : '',
  };
}

export async function searchTvMaze(
  query: string,
  yearGuess?: number
): Promise<MediaItem | null> {
  const cacheKey = `tvmaze_search_${query}_${yearGuess}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as MediaItem | null;
  }

  try {
    const url = `${BASE_URL}/search/shows?q=${encodeURIComponent(query)}`;
    const res = await fetchWithRetry(url, 3, 500);
    if (!res.ok) return null;

    const data: TvMazeSearchResult[] = await res.json();
    if (!data.length) {
      CACHE.set(cacheKey, { data: null, timestamp: Date.now() });
      return null;
    }

    let best = data[0].show;
    if (yearGuess) {
      const yearMatch = data.find((r) => {
        const y = r.show.premiered ? parseInt(r.show.premiered.substring(0, 4), 10) : 0;
        return y === yearGuess;
      });
      if (yearMatch) best = yearMatch.show;
    }

    const item = mapShowToMediaItem(best);
    CACHE.set(cacheKey, { data: item, timestamp: Date.now() });
    return item;
  } catch {
    return null;
  }
}

export async function searchTvMazeMulti(query: string): Promise<MediaItem[]> {
  const cacheKey = `tvmaze_multi_${query}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as MediaItem[];
  }

  try {
    const url = `${BASE_URL}/search/shows?q=${encodeURIComponent(query)}`;
    const res = await fetchWithRetry(url, 3, 500);
    if (!res.ok) return [];

    const data: TvMazeSearchResult[] = await res.json();
    const items = data.slice(0, 10).map((r) => mapShowToMediaItem(r.show));
    CACHE.set(cacheKey, { data: items, timestamp: Date.now() });
    return items;
  } catch {
    return [];
  }
}

// For testing only
export function _clearCache(): void {
  CACHE.clear();
}
