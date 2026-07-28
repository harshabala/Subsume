/**
 * Catalog-safe cross-medium recommendations (film/TV ↔ book).
 *
 * Prefers existing work relations (`adaptation_of` / `adapted_as`) from
 * highly rated library seeds. Optionally resolves adaptation candidates via
 * provider search when a real catalog work is returned — never invents titles.
 */

import type { WorkRelation, WorkRelationType } from '@/shared/catalogTypes';
import { catalogWorkToMediaItem } from '@/shared/compatibility';
import type { MediaItem } from '@/shared/types';
import { logger } from '@/shared/logger';
import { relationLabelForWork } from './handlers/relations';
import {
  getAllLibraryItems,
  getAllMediaMap,
  getMediaItem,
  getWork,
  getWorkRelationsForWork,
  putMediaItem,
} from './storage';

const DEFAULT_LIMIT = 8;
const HIGH_RATING = 7;
const MAX_SEEDS = 8;
const MAX_CANDIDATE_SEARCHES = 3;
const ADAPTATION_RELATIONS = new Set<WorkRelationType>([
  'adaptation_of',
  'adapted_as',
  'based_on',
]);

export type CrossMediumRecommendation = {
  mediaId: string;
  media: MediaItem;
  explanation: string;
  discoveryMode: 'cross_medium';
  seedWorkId: string;
  seedTitle: string;
  relation?: WorkRelationType;
};

export type GenerateCrossMediumOptions = {
  limit?: number;
  /** When false, always return []. Caller should pass prefs.crossMediumRecommendationsEnabled. */
  enabled?: boolean;
  /** Attempt catalog search for adaptations when no stored relation exists (default true). */
  allowCandidateSearch?: boolean;
};

function isScreen(type: MediaItem['type']): boolean {
  return type === 'movie' || type === 'tv';
}

function isCrossMediumPair(a: MediaItem['type'], b: MediaItem['type']): boolean {
  return (isScreen(a) && b === 'book') || (a === 'book' && isScreen(b));
}

/** Build a human-readable bridge explanation from a relation edge. */
export function buildRelationBridgeExplanation(
  seed: MediaItem,
  linked: MediaItem,
  relation: WorkRelation,
): string {
  const { label } = relationLabelForWork(relation, seed.id);
  const seedMedium = seed.type === 'book' ? 'book' : seed.type === 'tv' ? 'series' : 'film';
  const linkedMedium =
    linked.type === 'book' ? 'book' : linked.type === 'tv' ? 'series' : 'film';

  if (relation.relation === 'adaptation_of' || relation.relation === 'adapted_as') {
    if (seed.type === 'book' && isScreen(linked.type)) {
      return `${label}: the ${linkedMedium} adaptation of your highly rated book “${seed.canonicalTitle}”.`;
    }
    if (isScreen(seed.type) && linked.type === 'book') {
      return `${label}: the source novel for “${seed.canonicalTitle}”, which you rated highly.`;
    }
  }

  if (relation.relation === 'based_on') {
    return `Based on / source link between “${seed.canonicalTitle}” (${seedMedium}) and “${linked.canonicalTitle}” (${linkedMedium}).`;
  }

  return `${label}: “${linked.canonicalTitle}” (${linkedMedium}) bridges from your archive entry “${seed.canonicalTitle}” (${seedMedium}).`;
}

/** Bridge copy when a catalog search finds an adaptation candidate (no stored relation). */
export function buildCandidateBridgeExplanation(
  seed: MediaItem,
  candidate: MediaItem,
): string {
  if (seed.type === 'book' && isScreen(candidate.type)) {
    return `Catalog adaptation candidate for your book “${seed.canonicalTitle}” — confirm the link in the work details if it fits.`;
  }
  if (isScreen(seed.type) && candidate.type === 'book') {
    return `Catalog source-novel candidate for “${seed.canonicalTitle}” — confirm the link in the work details if it fits.`;
  }
  return `Cross-medium catalog match near “${seed.canonicalTitle}”.`;
}

async function resolveLinkedMedia(workId: string): Promise<MediaItem | undefined> {
  const media = await getMediaItem(workId);
  if (media) return media;
  const work = await getWork(workId);
  if (!work) return undefined;
  const item = catalogWorkToMediaItem(work);
  await putMediaItem(item);
  return item;
}

function collectSeeds(
  library: Awaited<ReturnType<typeof getAllLibraryItems>>,
  mediaMap: Record<string, MediaItem>,
): MediaItem[] {
  const seeds: MediaItem[] = [];
  const ratingById = new Map(
    library.map((l) => [l.mediaId, l.userRating ?? 0] as const),
  );

  for (const item of library) {
    const media = mediaMap[item.mediaId];
    if (!media) continue;
    if (media.type !== 'book' && !isScreen(media.type)) continue;

    const isSeed =
      (item.userRating != null && item.userRating >= HIGH_RATING) ||
      item.status === 'watched';
    if (isSeed) seeds.push(media);
  }

  seeds.sort(
    (a, b) => (ratingById.get(b.id) ?? 0) - (ratingById.get(a.id) ?? 0),
  );
  return seeds.slice(0, MAX_SEEDS);
}

/**
 * Generate cross-medium recommendations from library seeds + work relations
 * (and optional catalog adaptation search). Never invents titles.
 */
export async function generateCrossMediumRecommendations(
  options: GenerateCrossMediumOptions = {},
): Promise<CrossMediumRecommendation[]> {
  const {
    limit = DEFAULT_LIMIT,
    enabled = true,
    allowCandidateSearch = true,
  } = options;

  if (!enabled) return [];

  const cap = Math.min(Math.max(limit, 1), 20);
  const library = await getAllLibraryItems();
  if (library.length === 0) return [];

  const mediaMap = await getAllMediaMap(library.map((l) => l.mediaId));
  const libraryIds = new Set(library.map((l) => l.mediaId));
  const seeds = collectSeeds(library, mediaMap);
  if (seeds.length === 0) return [];

  const results: CrossMediumRecommendation[] = [];
  const seenIds = new Set<string>();

  // ── Pass 1: stored adaptation relations ─────────────────────────────
  for (const seed of seeds) {
    if (results.length >= cap) break;

    let relations: WorkRelation[] = [];
    try {
      relations = await getWorkRelationsForWork(seed.id);
    } catch (err) {
      logger.warn('[Subsume] Failed to load work relations for cross-medium recs:', err);
      continue;
    }

    const adaptationRels = relations.filter((r) =>
      ADAPTATION_RELATIONS.has(r.relation),
    );

    for (const rel of adaptationRels) {
      if (results.length >= cap) break;

      const { linkedWorkId } = relationLabelForWork(rel, seed.id);
      if (!linkedWorkId || linkedWorkId === seed.id) continue;
      if (libraryIds.has(linkedWorkId) || seenIds.has(linkedWorkId)) continue;

      const linked = await resolveLinkedMedia(linkedWorkId);
      if (!linked) continue; // not in catalog — never invent
      if (!isCrossMediumPair(seed.type, linked.type)) continue;

      seenIds.add(linked.id);
      // Ensure media is persisted for UI hydration
      await putMediaItem(linked);

      results.push({
        mediaId: linked.id,
        media: linked,
        explanation: buildRelationBridgeExplanation(seed, linked, rel),
        discoveryMode: 'cross_medium',
        seedWorkId: seed.id,
        seedTitle: seed.canonicalTitle,
        relation: rel.relation,
      });
    }
  }

  // ── Pass 2: optional catalog adaptation search for seeds without hits ─
  if (allowCandidateSearch && results.length < cap) {
    const seedsNeedingSearch = seeds.filter((seed) => {
      // Skip seeds that already produced a cross-medium hit
      return !results.some((r) => r.seedWorkId === seed.id);
    });

    let searches = 0;
    for (const seed of seedsNeedingSearch) {
      if (results.length >= cap || searches >= MAX_CANDIDATE_SEARCHES) break;
      const title = seed.canonicalTitle?.trim();
      if (!title) continue;

      searches += 1;
      try {
        if (seed.type === 'book') {
          const { discoverySearch } = await import('./discoverySearch');
          const hits = await discoverySearch(title, undefined);
          for (const hit of hits) {
            if (results.length >= cap) break;
            if (!isScreen(hit.type)) continue;
            if (libraryIds.has(hit.id) || seenIds.has(hit.id)) continue;
            if (hit.id === seed.id) continue;

            await putMediaItem(hit);
            seenIds.add(hit.id);
            results.push({
              mediaId: hit.id,
              media: hit,
              explanation: buildCandidateBridgeExplanation(seed, hit),
              discoveryMode: 'cross_medium',
              seedWorkId: seed.id,
              seedTitle: seed.canonicalTitle,
            });
            break; // one candidate per seed
          }
        } else {
          const { searchOpenLibrary } = await import('./openLibrary');
          const hits = await searchOpenLibrary({ query: title, limit: 5 });
          for (const hit of hits) {
            if (results.length >= cap) break;
            if (hit.matchScore < 0.5) continue;

            const item = catalogWorkToMediaItem(hit.work);
            item.type = 'book';
            if (hit.work.bookDetails?.authors?.length) {
              item.authors = hit.work.bookDetails.authors;
            }
            if (libraryIds.has(item.id) || seenIds.has(item.id)) continue;
            if (item.id === seed.id) continue;

            await putMediaItem(item);
            seenIds.add(item.id);
            results.push({
              mediaId: item.id,
              media: item,
              explanation: buildCandidateBridgeExplanation(seed, item),
              discoveryMode: 'cross_medium',
              seedWorkId: seed.id,
              seedTitle: seed.canonicalTitle,
            });
            break;
          }
        }
      } catch (err) {
        logger.warn(
          `[Subsume] Cross-medium candidate search failed for "${title}":`,
          err,
        );
      }
    }
  }

  return results.slice(0, cap);
}
