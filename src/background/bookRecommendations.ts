/**
 * Catalog-backed book recommendations.
 * Seeds from highly rated library books (subjects/authors) and searches
 * Open Library — never invents titles via LLM.
 */

import type { MediaItem } from '@/shared/types';
import { catalogWorkToMediaItem } from '@/shared/compatibility';
import {
  getAllLibraryItems,
  getAllMediaMap,
  putMediaItem,
} from './storage';
import { logger } from '@/shared/logger';

const DEFAULT_LIMIT = 10;
const HIGH_RATING = 7;
const MAX_SEEDS = 6;
const SEARCHES_PER_SEED = 1;
const RESULTS_PER_SEARCH = 8;

function libraryKey(media: MediaItem): string {
  const authors = (media.authors ?? [])
    .map((a) => a.toLowerCase().trim())
    .filter(Boolean)
    .sort()
    .join('|');
  return `${media.canonicalTitle.toLowerCase().trim()}::${authors}`;
}

function collectAuthorQueries(media: MediaItem): string[] {
  return (media.authors ?? []).map((a) => a.trim()).filter(Boolean).slice(0, 2);
}

function collectSubjectQueries(media: MediaItem): string[] {
  // Genres on books often hold OL subjects after enrichment
  return (media.genres ?? []).map((g) => g.trim()).filter(Boolean).slice(0, 3);
}

/**
 * Recommend books by searching Open Library for works related to highly
 * rated books already in the user's library. Catalog-only — no LLM titles.
 */
export async function generateCatalogBookRecommendations(
  limit: number = DEFAULT_LIMIT
): Promise<MediaItem[]> {
  const cap = Math.min(Math.max(limit, 1), 20);
  const library = await getAllLibraryItems();
  const mediaMap = await getAllMediaMap(library.map((l) => l.mediaId));

  const libraryIds = new Set(library.map((l) => l.mediaId));
  const libraryTitleKeys = new Set<string>();

  const seedBooks: MediaItem[] = [];
  for (const item of library) {
    const media = mediaMap[item.mediaId];
    if (!media || media.type !== 'book') continue;
    libraryTitleKeys.add(libraryKey(media));
    libraryTitleKeys.add(media.canonicalTitle.toLowerCase().trim());

    const isSeed =
      (item.userRating != null && item.userRating >= HIGH_RATING) ||
      item.status === 'watched';
    if (isSeed) seedBooks.push(media);
  }

  if (seedBooks.length === 0) return [];

  // Prefer higher-rated seeds when ratings exist
  const ratingById = new Map(
    library.map((l) => [l.mediaId, l.userRating ?? 0] as const)
  );
  seedBooks.sort(
    (a, b) => (ratingById.get(b.id) ?? 0) - (ratingById.get(a.id) ?? 0)
  );

  const queries: string[] = [];
  const seenQueries = new Set<string>();

  for (const book of seedBooks.slice(0, MAX_SEEDS)) {
    for (const author of collectAuthorQueries(book)) {
      const q = `author:${author}`;
      const key = q.toLowerCase();
      if (seenQueries.has(key)) continue;
      seenQueries.add(key);
      queries.push(author); // OL free-text author search works better than author: prefix for /search.json
    }
    for (const subject of collectSubjectQueries(book)) {
      const key = subject.toLowerCase();
      if (seenQueries.has(key)) continue;
      seenQueries.add(key);
      queries.push(subject);
    }
    // Title-adjacent: search by author if we have nothing else
    if (queries.length === 0 && book.authors?.[0]) {
      queries.push(book.authors[0]);
    }
  }

  if (queries.length === 0) return [];

  let searchOpenLibrary: typeof import('./openLibrary').searchOpenLibrary;
  try {
    ({ searchOpenLibrary } = await import('./openLibrary'));
  } catch (err) {
    logger.warn('[Subsume] Open Library unavailable for book recs:', err);
    return [];
  }

  const results: MediaItem[] = [];
  const seenResultIds = new Set<string>();

  for (const query of queries.slice(0, MAX_SEEDS * SEARCHES_PER_SEED + 4)) {
    if (results.length >= cap) break;
    try {
      const hits = await searchOpenLibrary({
        query,
        limit: RESULTS_PER_SEARCH,
      });
      for (const hit of hits) {
        if (results.length >= cap) break;
        if (hit.matchScore < 0.4) continue;

        const media = catalogWorkToMediaItem(hit.work);
        media.type = 'book';
        if (hit.work.bookDetails?.authors?.length) {
          media.authors = hit.work.bookDetails.authors;
        }

        if (libraryIds.has(media.id)) continue;
        if (seenResultIds.has(media.id)) continue;

        const titleKey = media.canonicalTitle.toLowerCase().trim();
        if (libraryTitleKeys.has(titleKey) || libraryTitleKeys.has(libraryKey(media))) {
          continue;
        }

        seenResultIds.add(media.id);
        await putMediaItem(media);
        results.push(media);
      }
    } catch (err) {
      logger.warn(`[Subsume] Book rec search failed for "${query}":`, err);
    }
  }

  return results.slice(0, cap);
}
