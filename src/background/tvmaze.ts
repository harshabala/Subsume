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

export interface TvMazePremiere {
  showId: number;
  title: string;
  year: number;
  airdate: string;
  season: number;
  episodeNumber: number;
  isSeriesPremiere: boolean;
  isSeasonPremiere: boolean;
  posterUrl?: string;
  rating?: number;
  url: string;
  summary?: string;
}

interface TvMazeScheduleEpisode {
  id: number;
  name: string;
  season: number;
  number: number;
  airdate: string;
  rating?: { average: number | null };
  show: TvMazeShow;
}

function formatDateOffset(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function mapScheduleEpisode(episode: TvMazeScheduleEpisode): TvMazePremiere {
  const year = episode.show.premiered
    ? parseInt(episode.show.premiered.substring(0, 4), 10)
    : episode.airdate
      ? parseInt(episode.airdate.substring(0, 4), 10)
      : 0;

  return {
    showId: episode.show.id,
    title: episode.show.name,
    year: isNaN(year) ? 0 : year,
    airdate: episode.airdate,
    season: episode.season,
    episodeNumber: episode.number,
    isSeriesPremiere: episode.season === 1 && episode.number === 1,
    isSeasonPremiere: episode.number === 1,
    posterUrl: episode.show.image?.medium || undefined,
    rating: episode.show.rating?.average ?? episode.rating?.average ?? undefined,
    url: `https://www.tvmaze.com/shows/${episode.show.id}`,
    summary: episode.show.summary ? stripHtml(episode.show.summary) : undefined,
  };
}

function dedupePremieres(premieres: TvMazePremiere[]): TvMazePremiere[] {
  const seen = new Set<number>();
  const unique: TvMazePremiere[] = [];

  for (const premiere of premieres) {
    if (seen.has(premiere.showId)) continue;
    seen.add(premiere.showId);
    unique.push(premiere);
  }

  return unique;
}

async function fetchScheduleForDate(date: string): Promise<TvMazePremiere[]> {
  const cacheKey = `tvmaze_schedule_${date}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as TvMazePremiere[];
  }

  try {
    const url = `${BASE_URL}/schedule?country=US&date=${date}`;
    const res = await fetchWithRetry(url, 3, 500);
    if (!res.ok) return [];

    const data: TvMazeScheduleEpisode[] = await res.json();
    const premieres = data
      .filter((episode) => episode.number === 1 || (episode.season === 1 && episode.number <= 2))
      .map(mapScheduleEpisode);

    CACHE.set(cacheKey, { data: premieres, timestamp: Date.now() });
    return premieres;
  } catch {
    return [];
  }
}

async function fetchWebSchedule(): Promise<TvMazePremiere[]> {
  const cacheKey = 'tvmaze_schedule_web';
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as TvMazePremiere[];
  }

  try {
    const url = `${BASE_URL}/schedule/web?country=US`;
    const res = await fetchWithRetry(url, 3, 500);
    if (!res.ok) return [];

    const data: TvMazeScheduleEpisode[] = await res.json();
    const premieres = data.map(mapScheduleEpisode);
    CACHE.set(cacheKey, { data: premieres, timestamp: Date.now() });
    return premieres;
  } catch {
    return [];
  }
}

/**
 * Fetches TV premieres from TVmaze web schedule and daily broadcast schedule
 * for today through the next `daysAhead` days (inclusive).
 */
export async function fetchTvMazePremieres(daysAhead = 7): Promise<TvMazePremiere[]> {
  const cacheKey = `tvmaze_premieres_${daysAhead}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as TvMazePremiere[];
  }

  const dateOffsets = Array.from({ length: daysAhead + 1 }, (_, i) => i);
  const [webPremieres, ...dailyPremieres] = await Promise.all([
    fetchWebSchedule(),
    ...dateOffsets.map((offset) => fetchScheduleForDate(formatDateOffset(offset))),
  ]);

  const combined = dedupePremieres([...webPremieres, ...dailyPremieres.flat()]);
  const today = formatDateOffset(0);
  const endDate = formatDateOffset(daysAhead);

  const inRange = combined.filter((premiere) => premiere.airdate >= today && premiere.airdate <= endDate);

  const sorted = inRange.sort((a, b) => {
    if (a.isSeriesPremiere !== b.isSeriesPremiere) {
      return a.isSeriesPremiere ? -1 : 1;
    }
    if (a.isSeasonPremiere !== b.isSeasonPremiere) {
      return a.isSeasonPremiere ? -1 : 1;
    }
    return a.airdate.localeCompare(b.airdate);
  });

  CACHE.set(cacheKey, { data: sorted, timestamp: Date.now() });
  return sorted;
}

// For testing only
export function _clearCache(): void {
  CACHE.clear();
}
