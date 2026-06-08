import { MediaItem } from '@/shared/types';

/** Merge a sparse media payload (e.g. from poster badge) without clobbering enriched fields. */
export function mergeMediaItems(incoming: MediaItem, existing: MediaItem): MediaItem {
  const existingProviders = new Set(existing.ratings.map((r) => r.provider));
  const mergedRatings = [
    ...existing.ratings,
    ...incoming.ratings.filter((r) => !existingProviders.has(r.provider)),
  ];

  return {
    ...existing,
    canonicalTitle: incoming.canonicalTitle || existing.canonicalTitle,
    type: incoming.type || existing.type,
    year: incoming.year || existing.year,
    genres: incoming.genres.length > 0 ? incoming.genres : existing.genres,
    ratings: mergedRatings,
    providers: incoming.providers.length > 0 ? incoming.providers : existing.providers,
    posterUrl: incoming.posterUrl || existing.posterUrl,
    backdropUrl: incoming.backdropUrl || existing.backdropUrl,
    overview: incoming.overview || existing.overview,
    runtimeMinutes: incoming.runtimeMinutes ?? existing.runtimeMinutes,
    originalTitle: incoming.originalTitle || existing.originalTitle,
    streamingAvailability:
      incoming.streamingAvailability && incoming.streamingAvailability.length > 0
        ? incoming.streamingAvailability
        : existing.streamingAvailability,
  };
}