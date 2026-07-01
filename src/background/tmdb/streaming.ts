import { StreamingInfo } from '@/shared/types';
import { BASE_URL, fetchWithRetry, makeBearerHeaders, getTmdbApiKey } from './client';
import { mapWatchProvidersResponse, TmdbWatchProvidersResponse } from './mappers';
import { CACHE, CACHE_TTL } from './cache';

export async function fetchTheatricalReleaseDates(
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
