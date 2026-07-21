/**
 * Resolve LLM / heuristic recommendation titles against real catalog providers.
 * Unresolved candidates are dropped — never invent catalog works.
 */

import type { MediaItem, MediaType, UserPreferences } from '@/shared/types';
import { catalogWorkToMediaItem } from '@/shared/compatibility';
import { putMediaItem, findMediaByTitle } from './storage';
import { searchTitles, searchTitle, setTmdbApiKey } from './tmdb';
import { discoverySearch } from './discoverySearch';
import { logger } from '@/shared/logger';

const MAX_RESOLVED = 15;
/** Open Library ranks first hit at 1.0; accept only reasonably strong matches. */
const MIN_BOOK_MATCH_SCORE = 0.55;

export type RecommendationCandidate = {
  title: string;
  year?: number;
  type?: 'movie' | 'tv' | 'book';
  reason: string;
  seedTitle?: string;
};

export type ResolvedRecommendation = {
  media: MediaItem;
  reason: string;
  seedTitle?: string;
  workId: string;
};

function isMediaEnabled(type: MediaType, prefs: UserPreferences): boolean {
  const enabled = prefs.enabledMedia;
  if (!enabled) return true;
  if (type === 'book') return enabled.book !== false;
  if (type === 'movie') return enabled.movie !== false;
  if (type === 'tv') return enabled.tv !== false;
  return true;
}

function titlesClose(a: string, b: string): boolean {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.includes(nb) || nb.includes(na);
}

async function resolveBookCandidate(
  candidate: RecommendationCandidate
): Promise<MediaItem | null> {
  const { searchOpenLibrary } = await import('./openLibrary');
  const hits = await searchOpenLibrary({ query: candidate.title, limit: 5 });
  if (!hits.length) return null;

  const best = hits[0];
  if (best.matchScore < MIN_BOOK_MATCH_SCORE) return null;

  // Prefer a hit that roughly matches title (+ year when provided)
  let chosen = best;
  for (const hit of hits) {
    if (hit.matchScore < MIN_BOOK_MATCH_SCORE) continue;
    if (!titlesClose(hit.work.canonicalTitle, candidate.title)) continue;
    if (
      candidate.year &&
      hit.work.firstReleaseYear &&
      Math.abs(hit.work.firstReleaseYear - candidate.year) > 2
    ) {
      continue;
    }
    chosen = hit;
    break;
  }

  if (!titlesClose(chosen.work.canonicalTitle, candidate.title) && chosen.matchScore < 0.9) {
    return null;
  }

  const media = catalogWorkToMediaItem(chosen.work);
  media.type = 'book';
  if (chosen.work.bookDetails?.authors?.length) {
    media.authors = chosen.work.bookDetails.authors;
  }
  await putMediaItem(media);
  return media;
}

async function resolveScreenCandidate(
  candidate: RecommendationCandidate,
  prefs: UserPreferences
): Promise<MediaItem | null> {
  const type = (candidate.type === 'tv' ? 'tv' : 'movie') as MediaType;

  const cached = await findMediaByTitle(candidate.title, candidate.year);
  if (cached && cached.type !== 'book') {
    return cached;
  }

  const hasTmdb = Boolean(prefs.tmdbApiKey?.trim());
  if (hasTmdb) {
    setTmdbApiKey(prefs.tmdbApiKey!);
    try {
      const single = await searchTitle(candidate.title, candidate.year, type);
      if (single) {
        await putMediaItem(single);
        return single;
      }
    } catch (err) {
      logger.warn('[Subsume] TMDb searchTitle failed during catalog validate:', err);
    }

    try {
      const results = await searchTitles(candidate.title, type, candidate.year);
      const first = results[0];
      if (first) {
        await putMediaItem(first);
        return first;
      }
    } catch (err) {
      logger.warn('[Subsume] TMDb searchTitles failed during catalog validate:', err);
    }
  }

  try {
    const discovered = await discoverySearch(candidate.title, type);
    const first = discovered.find((m) => m.type === type) ?? discovered[0];
    if (first && first.type !== 'book') {
      await putMediaItem(first);
      return first;
    }
  } catch (err) {
    logger.warn('[Subsume] discoverySearch failed during catalog validate:', err);
  }

  return null;
}

/**
 * Map free-form recommendation candidates to real MediaItems.
 * Drops anything that cannot be resolved; caps at 15 results.
 */
export async function resolveRecommendationCandidates(
  candidates: RecommendationCandidate[],
  prefs: UserPreferences
): Promise<ResolvedRecommendation[]> {
  const resolved: ResolvedRecommendation[] = [];
  const seenIds = new Set<string>();

  for (const candidate of candidates) {
    if (resolved.length >= MAX_RESOLVED) break;
    const title = (candidate.title || '').trim();
    if (!title) continue;

    const type: MediaType =
      candidate.type === 'book' || candidate.type === 'tv' || candidate.type === 'movie'
        ? candidate.type
        : 'movie';

    if (!isMediaEnabled(type, prefs)) continue;

    try {
      const media =
        type === 'book'
          ? await resolveBookCandidate({ ...candidate, title, type })
          : await resolveScreenCandidate({ ...candidate, title, type }, prefs);

      if (!media) continue;
      if (seenIds.has(media.id)) continue;
      seenIds.add(media.id);

      resolved.push({
        media,
        reason: candidate.reason || 'Recommended based on your taste',
        seedTitle: candidate.seedTitle,
        workId: media.id,
      });
    } catch (err) {
      logger.warn(`[Subsume] Failed to resolve recommendation "${title}":`, err);
    }
  }

  return resolved;
}
