import { MediaItem } from '@/shared/types';
import { getPreferences } from '../storage';
import { fetchOmdbRatings } from '../omdb';
import { fetchWatchProviders } from './streaming';

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
