/**
 * Work-relation handlers — adaptations and related works (Phase 3).
 * Relations are created only from structured providers or user assertion,
 * never from silent LLM inference.
 */
import { v4 as uuidv4 } from 'uuid';
import type { MessageHandlerMap } from '@/shared/messages';
import type { WorkRelation, WorkRelationType } from '@/shared/catalogTypes';
import { catalogWorkToMediaItem, mediaItemToCatalogWork } from '@/shared/compatibility';
import { MessageType, type MediaItem } from '@/shared/types';
import { logger } from '@/shared/logger';
import {
  deleteWorkRelation,
  getMediaItem,
  getWork,
  getWorkRelationsForWork,
  putMediaItem,
  putWork,
  putWorkRelation,
} from '../storage';

const DISPLAY_RELATIONS = new Set<WorkRelationType>(['adaptation_of', 'adapted_as']);

const ASSERTABLE_RELATIONS = new Set<WorkRelationType>([
  'adaptation_of',
  'adapted_as',
  'based_on',
  'inspired_by',
  'remake_of',
  'sequel_to',
  'prequel_to',
  'series_member',
  'companion_to',
  'same_universe',
]);

export type RelatedWorkEntry = {
  relation: WorkRelation;
  /** Perspective-aware label for the linked work relative to the query work. */
  label: string;
  linkedWorkId: string;
  linkedWork?: MediaItem;
};

/** Human-readable label for a relation edge from the perspective of `workId`. */
export function relationLabelForWork(
  rel: WorkRelation,
  workId: string,
): { label: string; linkedWorkId: string } {
  const isFrom = rel.fromWorkId === workId;
  const linkedWorkId = isFrom ? rel.toWorkId : rel.fromWorkId;

  if (rel.relation === 'adaptation_of') {
    return {
      label: isFrom ? 'Adaptation of' : 'Adapted as',
      linkedWorkId,
    };
  }
  if (rel.relation === 'adapted_as') {
    return {
      label: isFrom ? 'Adapted as' : 'Adaptation of',
      linkedWorkId,
    };
  }
  if (rel.relation === 'based_on') {
    return {
      label: isFrom ? 'Based on' : 'Source for',
      linkedWorkId,
    };
  }

  const pretty = rel.relation.replace(/_/g, ' ');
  return {
    label: isFrom ? pretty.charAt(0).toUpperCase() + pretty.slice(1) : `Related (${pretty})`,
    linkedWorkId,
  };
}

async function resolveMedia(workId: string): Promise<MediaItem | undefined> {
  const media = await getMediaItem(workId);
  if (media) return media;
  const work = await getWork(workId);
  if (work) return catalogWorkToMediaItem(work);
  return undefined;
}

/** Ensure both ends exist in media + works stores so the archive can resolve titles. */
async function ensureWorkCataloged(item: MediaItem): Promise<void> {
  const existing = await getMediaItem(item.id);
  if (!existing) {
    await putMediaItem(item);
  }
  const work = await getWork(item.id);
  if (!work) {
    await putWork(mediaItemToCatalogWork(existing ?? item));
  }
}

function inverseRelation(relation: WorkRelationType): WorkRelationType | null {
  if (relation === 'adaptation_of') return 'adapted_as';
  if (relation === 'adapted_as') return 'adaptation_of';
  return null;
}

async function maybeEnrichFromWikidata(workId: string, media: MediaItem): Promise<void> {
  try {
    const { fetchWikidataAdaptations, matchAndStoreWikidataAdaptations } = await import(
      '../wikidata'
    );
    const imdb = media.providers?.find((p) => p.provider === 'imdb')?.externalId;
    const hints = await fetchWikidataAdaptations({
      imdbId: imdb,
      title: media.canonicalTitle,
      year: media.year,
      medium: media.type,
    });
    if (hints.length === 0) return;
    await matchAndStoreWikidataAdaptations(workId, media, hints);
  } catch (err) {
    logger.warn('[Subsume] Wikidata adaptation enrichment skipped:', err);
  }
}

export const relationHandlers: MessageHandlerMap = {
  [MessageType.GET_RELATED_WORKS]: async (payload) => {
    const req = payload as { workId?: string; enrich?: boolean };
    const workId = (req.workId || '').trim();
    if (!workId) return { related: [] as RelatedWorkEntry[] };

    const media = await resolveMedia(workId);
    // Optional light enrichment from Wikidata (structured only, medium confidence).
    // Opt-in only — avoid SPARQL on every detail-modal open.
    if (req.enrich === true && media) {
      await maybeEnrichFromWikidata(workId, media);
    }

    const relations = await getWorkRelationsForWork(workId);
    // First release: surface adaptation_of / adapted_as primarily; include others if present.
    const focused = relations.filter(
      (r) => DISPLAY_RELATIONS.has(r.relation) || r.confidence === 'user_asserted',
    );

    const related: RelatedWorkEntry[] = [];
    for (const relation of focused) {
      const { label, linkedWorkId } = relationLabelForWork(relation, workId);
      const linkedWork = await resolveMedia(linkedWorkId);
      related.push({ relation, label, linkedWorkId, linkedWork });
    }

    related.sort((a, b) => a.relation.createdAt - b.relation.createdAt);
    return { related };
  },

  [MessageType.ASSERT_WORK_RELATION]: async (payload) => {
    const req = payload as {
      fromWorkId?: string;
      toWorkId?: string;
      relation?: WorkRelationType;
      /** Must be user_asserted for this message (structured providers use storage helpers). */
      confidence?: 'user_asserted';
      sourceUrl?: string;
      /** Optional media snapshots so linked works resolve after a candidate pick. */
      fromMedia?: MediaItem;
      toMedia?: MediaItem;
      /** When true (default), also store the inverse adaptation edge. */
      alsoInverse?: boolean;
    };

    const fromWorkId = (req.fromWorkId || '').trim();
    const toWorkId = (req.toWorkId || '').trim();
    const relation = req.relation;

    if (!fromWorkId || !toWorkId) {
      throw new Error('fromWorkId and toWorkId are required');
    }
    if (fromWorkId === toWorkId) {
      throw new Error('Cannot relate a work to itself');
    }
    if (!relation || !ASSERTABLE_RELATIONS.has(relation)) {
      throw new Error(`Unsupported relation type: ${String(relation)}`);
    }

    // ASSERT path is always user-confirmed — never silent LLM permanent relations.
    const finalConfidence: WorkRelation['confidence'] = 'user_asserted';

    if (req.fromMedia && req.fromMedia.id === fromWorkId) {
      await ensureWorkCataloged(req.fromMedia);
    }
    if (req.toMedia && req.toMedia.id === toWorkId) {
      await ensureWorkCataloged(req.toMedia);
    }

    const existing = await getWorkRelationsForWork(fromWorkId);
    const duplicate = existing.find(
      (r) =>
        r.fromWorkId === fromWorkId &&
        r.toWorkId === toWorkId &&
        r.relation === relation,
    );
    if (duplicate) {
      return { relation: duplicate, created: false };
    }

    const now = Date.now();
    const rel: WorkRelation = {
      id: uuidv4(),
      fromWorkId,
      toWorkId,
      relation,
      confidence: finalConfidence,
      sourceProvider: 'user',
      sourceUrl: req.sourceUrl,
      createdAt: now,
    };
    await putWorkRelation(rel);

    let inverse: WorkRelation | undefined;
    const inv = inverseRelation(relation);
    if (req.alsoInverse !== false && inv) {
      const invDup = (await getWorkRelationsForWork(toWorkId)).find(
        (r) => r.fromWorkId === toWorkId && r.toWorkId === fromWorkId && r.relation === inv,
      );
      if (!invDup) {
        inverse = {
          id: uuidv4(),
          fromWorkId: toWorkId,
          toWorkId: fromWorkId,
          relation: inv,
          confidence: finalConfidence,
          sourceProvider: 'user',
          sourceUrl: req.sourceUrl,
          createdAt: now,
        };
        await putWorkRelation(inverse);
      }
    }

    return { relation: rel, inverse, created: true };
  },

  [MessageType.SEARCH_ADAPTATION_CANDIDATES]: async (payload) => {
    const req = payload as { workId?: string; limit?: number };
    const workId = (req.workId || '').trim();
    if (!workId) return { candidates: [] as MediaItem[], direction: null };

    const media = await resolveMedia(workId);
    if (!media) {
      throw new Error(`Work not found: ${workId}`);
    }

    const limit = Math.min(Math.max(req.limit ?? 8, 1), 20);
    const title = media.canonicalTitle?.trim();
    if (!title) return { candidates: [] as MediaItem[], direction: null };

    const isBook = media.type === 'book';

    // Book → search screen (TMDb / discovery). Movie/TV → search books (Open Library).
    if (isBook) {
      const { discoverySearch } = await import('../discoverySearch');
      const hits = await discoverySearch(title, undefined);
      const candidates = hits
        .filter((h) => h.type === 'movie' || h.type === 'tv')
        .filter((h) => h.id !== workId)
        .slice(0, limit);
      // Do not permanently save candidates here (discovery may already cache locally).
      return {
        candidates,
        direction: 'adapted_as' as const,
        sourceWorkId: workId,
        sourceTitle: title,
      };
    }

    const ol = await import('../openLibrary');
    const hits = await ol.searchOpenLibrary({ query: title, limit });
    // Map to MediaItem without putting into storage (candidates only).
    const candidates: MediaItem[] = hits.map((hit) => {
      const item = catalogWorkToMediaItem(hit.work);
      item.type = 'book';
      if (hit.work.bookDetails?.authors) {
        item.authors = hit.work.bookDetails.authors;
      }
      return item;
    }).filter((h) => h.id !== workId);

    return {
      candidates,
      direction: 'adaptation_of' as const,
      sourceWorkId: workId,
      sourceTitle: title,
    };
  },
};

/** Test helper re-export for inverse cleanup. */
export { deleteWorkRelation, ensureWorkCataloged };
