/**
 * Appendable reflections and experience progress handlers (books expansion).
 */
import { v4 as uuidv4 } from 'uuid';
import type { MessageHandlerMap } from '@/shared/messages';
import type {
  Experience,
  Reflection,
  ReflectionKind,
  RelationshipStatus,
} from '@/shared/catalogTypes';
import { MessageType } from '@/shared/types';
import {
  legacyStatusToRelationship,
  relationshipToLegacyStatus,
} from '@/shared/statusLabels';
import { logger } from '@/shared/logger';
import { invalidateProfileCache } from '../context';
import {
  getExperience,
  getExperiencesForWork,
  getLibraryItem,
  getMediaItem,
  getReflectionsForWork,
  getRelationship,
  putExperience,
  putLibraryItem,
  putMediaItem,
  putReflection,
  putRelationship,
} from '../storage';

const VALID_REFLECTION_KINDS = new Set<ReflectionKind>([
  'first_impression',
  'progress_note',
  'completion_reflection',
  'later_reflection',
  'quotation',
  'idea_spark',
]);

const VALID_RELATIONSHIP_STATUSES = new Set<RelationshipStatus>([
  'planned',
  'in_progress',
  'completed',
  'abandoned',
]);

const LEGACY_STATUSES = ['to-watch', 'watching', 'watched', 'abandoned'] as const;

const EXCERPT_MAX = 280;

function excerptFromBody(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= EXCERPT_MAX) return trimmed;
  return `${trimmed.slice(0, EXCERPT_MAX - 1)}…`;
}

async function updateRelationshipExcerpt(workId: string, body: string): Promise<void> {
  const rel = await getRelationship(workId);
  if (!rel) return;
  await putRelationship({
    ...rel,
    latestReflectionExcerpt: excerptFromBody(body),
    updatedAt: Date.now(),
  });
}

function sortReflectionsAsc(reflections: Reflection[]): Reflection[] {
  return [...reflections].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

function parseStatus(
  raw: string | undefined,
  fallback: RelationshipStatus,
): RelationshipStatus {
  if (!raw) return fallback;
  if ((LEGACY_STATUSES as readonly string[]).includes(raw)) {
    return legacyStatusToRelationship(raw as (typeof LEGACY_STATUSES)[number]);
  }
  if (VALID_RELATIONSHIP_STATUSES.has(raw as RelationshipStatus)) {
    return raw as RelationshipStatus;
  }
  return fallback;
}

export const reflectionHandlers: MessageHandlerMap = {
  [MessageType.ADD_REFLECTION]: async (payload) => {
    const req = payload as {
      workId?: string;
      kind?: string;
      body?: string;
      title?: string;
      spoiler?: boolean;
      experienceId?: string;
      userEnteredQuote?: { text: string; locationLabel?: string };
    };

    const workId = typeof req?.workId === 'string' ? req.workId.trim() : '';
    const body = typeof req?.body === 'string' ? req.body.trim() : '';
    const kind = req?.kind as ReflectionKind | undefined;

    if (!workId || !body || !kind || !VALID_REFLECTION_KINDS.has(kind)) {
      throw new Error('Invalid ADD_REFLECTION payload: workId, kind, and body are required');
    }

    const now = Date.now();
    const reflection: Reflection = {
      id: uuidv4(),
      workId,
      kind,
      body,
      createdAt: now,
      updatedAt: now,
    };

    if (typeof req.title === 'string' && req.title.trim()) {
      reflection.title = req.title.trim();
    }
    if (typeof req.spoiler === 'boolean') {
      reflection.spoiler = req.spoiler;
    }
    if (typeof req.experienceId === 'string' && req.experienceId.trim()) {
      reflection.experienceId = req.experienceId.trim();
    }
    if (req.userEnteredQuote && typeof req.userEnteredQuote.text === 'string') {
      const text = req.userEnteredQuote.text.trim();
      if (text) {
        reflection.userEnteredQuote = {
          text,
          locationLabel:
            typeof req.userEnteredQuote.locationLabel === 'string' &&
            req.userEnteredQuote.locationLabel.trim()
              ? req.userEnteredQuote.locationLabel.trim()
              : undefined,
        };
      }
    }

    logger.log('[Subsume] ADD_REFLECTION:', workId, kind);
    await putReflection(reflection);
    await updateRelationshipExcerpt(workId, reflection.body);
    return reflection;
  },

  [MessageType.GET_REFLECTIONS]: async (payload) => {
    const req = payload as { workId?: string };
    const workId = typeof req?.workId === 'string' ? req.workId.trim() : '';
    if (!workId) {
      throw new Error('Invalid GET_REFLECTIONS payload: workId is required');
    }
    const reflections = await getReflectionsForWork(workId);
    return sortReflectionsAsc(reflections);
  },

  /**
   * Upsert reading/viewing progress on the current Experience for a work.
   * Payload: { experienceId?, workId?, progress?, status?, rating?, editionId? }
   * With only workId (no mutation fields), returns the latest experience without writing.
   */
  [MessageType.UPDATE_EXPERIENCE]: async (payload) => {
    const req = payload as {
      experienceId?: string;
      workId?: string;
      progress?: Experience['progress'];
      status?: RelationshipStatus | 'to-watch' | 'watching' | 'watched' | 'abandoned';
      rating?: number;
      editionId?: string;
    };

    const experienceId =
      typeof req?.experienceId === 'string' ? req.experienceId.trim() : '';
    const workId = typeof req?.workId === 'string' ? req.workId.trim() : '';

    if (!experienceId && !workId) {
      return { updated: false as const, reason: 'experienceId_or_workId_required' };
    }

    let current: Experience | undefined;
    if (experienceId) {
      current = await getExperience(experienceId);
    }
    if (!current && workId) {
      const list = await getExperiencesForWork(workId);
      current = [...list].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    }

    const resolvedWorkId = current?.workId ?? workId;
    const hasMutation =
      req.progress !== undefined ||
      req.status !== undefined ||
      req.rating !== undefined ||
      req.editionId !== undefined;

    // Read-only: return latest experience for work
    if (!hasMutation) {
      return { updated: false as const, experience: current ?? null };
    }

    if (!resolvedWorkId) {
      return { updated: false as const, reason: 'not_found' };
    }

    const media = await getMediaItem(resolvedWorkId);
    const isBook =
      media?.type === 'book' || resolvedWorkId.startsWith('openlibrary_');
    const kind = current?.kind ?? (isBook ? 'read' : 'watch');
    const status = parseStatus(req.status, current?.status ?? 'in_progress');
    const now = Date.now();

    let progress = current?.progress;
    if (req.progress && typeof req.progress === 'object') {
      const unit = req.progress.unit;
      const value = req.progress.value;
      if (
        (unit === 'percent' || unit === 'page' || unit === 'chapter' || unit === 'episode') &&
        typeof value === 'number' &&
        Number.isFinite(value)
      ) {
        progress = {
          unit,
          value: Math.max(0, value),
          total:
            typeof req.progress.total === 'number' && Number.isFinite(req.progress.total)
              ? Math.max(0, req.progress.total) || undefined
              : current?.progress?.total,
        };
      }
    }

    let rating = current?.rating;
    if (typeof req.rating === 'number' && Number.isFinite(req.rating)) {
      const r = Math.round(req.rating * 2) / 2;
      if (r >= 0 && r <= 10) rating = r;
    }

    const experience: Experience = {
      id: current?.id ?? `exp_${resolvedWorkId}_${now}`,
      workId: resolvedWorkId,
      kind,
      status,
      rating,
      editionId:
        typeof req.editionId === 'string' && req.editionId.trim()
          ? req.editionId.trim()
          : current?.editionId,
      format: current?.format,
      progress,
      startedAt:
        current?.startedAt ??
        (status === 'in_progress' || status === 'completed' || status === 'abandoned'
          ? now
          : undefined),
      completedAt: status === 'completed' ? current?.completedAt ?? now : current?.completedAt,
      abandonedAt: status === 'abandoned' ? current?.abandonedAt ?? now : current?.abandonedAt,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };

    logger.log('[Subsume] UPDATE_EXPERIENCE:', experience.id, experience.workId);
    await putExperience(experience);

    // Keep legacy library status in sync when status was provided
    if (req.status !== undefined) {
      const lib = await getLibraryItem(resolvedWorkId);
      const legacyStatus = relationshipToLegacyStatus(status);
      const libNow = Date.now();
      await putLibraryItem({
        mediaId: resolvedWorkId,
        status: legacyStatus,
        addedAt: lib?.addedAt ?? libNow,
        updatedAt: libNow,
        userRating: lib?.userRating ?? rating,
        userTags: lib?.userTags,
        notes: lib?.notes,
        sanctuaryIntent: lib?.sanctuaryIntent,
        emotionalRecall: lib?.emotionalRecall,
        qualitativeNotes: lib?.qualitativeNotes,
        atmosphere: lib?.atmosphere,
        lingeringThought: lib?.lingeringThought,
        awe: lib?.awe,
        melancholy: lib?.melancholy,
        tension: lib?.tension,
        warmth: lib?.warmth,
      });
      invalidateProfileCache();
    }

    // Persist page total on media when provided for books
    if (req.progress?.total && media && isBook) {
      await putMediaItem({ ...media, pageCount: req.progress.total });
    }

    return { updated: true as const, experience };
  },
};
