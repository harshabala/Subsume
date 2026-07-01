import { MediaItem, MediaType, StreamingInfo } from '@/shared/types';
import { POSTER_BASE_URL } from './client';

export interface TmdbSearchDetails {
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

export interface TmdbSearchResult {
  page: number;
  results: TmdbSearchDetails[];
  total_results: number;
}

export interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
}

export interface TmdbWatchProvidersResult {
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

export function isRecentReleaseDate(dateStr: string, now = Date.now()): boolean {
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return false;
  const ts = parsed.getTime();
  return ts <= now && now - ts <= NINETY_DAYS_MS;
}

/**
 * Normalizes TMDB response into our app's MediaItem domain model.
 */
export function mapTmdbToMediaItem(
  result: TmdbSearchDetails,
  type: MediaType,
  genreMap: Record<number, string>
): MediaItem {
  const title = (type === 'movie' ? result.title : result.name) || 'Unknown Title';
  const releaseDate = (type === 'movie' ? result.release_date : result.first_air_date) || '';
  const parsedYear = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : 0;
  const year = isNaN(parsedYear) ? 0 : parsedYear;
  
  const genres = (result.genre_ids || [])
    .map((id) => genreMap[id])
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
