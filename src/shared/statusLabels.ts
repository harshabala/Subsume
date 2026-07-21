import type { WorkMedium, RelationshipStatus, SanctuaryIntentV2 } from './catalogTypes';
import type { LibraryStatus, SanctuaryIntent } from './types';

/** Map legacy LibraryStatus → RelationshipStatus */
export function legacyStatusToRelationship(status: LibraryStatus): RelationshipStatus {
  switch (status) {
    case 'to-watch':
      return 'planned';
    case 'watching':
      return 'in_progress';
    case 'watched':
      return 'completed';
    case 'abandoned':
      return 'abandoned';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Map RelationshipStatus → legacy LibraryStatus (for compatibility UI/handlers) */
export function relationshipToLegacyStatus(status: RelationshipStatus): LibraryStatus {
  switch (status) {
    case 'planned':
      return 'to-watch';
    case 'in_progress':
      return 'watching';
    case 'completed':
      return 'watched';
    case 'abandoned':
      return 'abandoned';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function legacyIntentToV2(intent: SanctuaryIntent | undefined): SanctuaryIntentV2 | undefined {
  if (!intent) return undefined;
  if (intent === 'revisit_this_month') return 'return_soon';
  return intent;
}

export function intentV2ToLegacy(intent: SanctuaryIntentV2 | undefined): SanctuaryIntent | undefined {
  if (!intent) return undefined;
  if (intent === 'return_soon') return 'revisit_this_month';
  return intent;
}

export function defaultIntentForStatus(status: RelationshipStatus): SanctuaryIntentV2 {
  switch (status) {
    case 'completed':
      return 'keep_memory';
    case 'in_progress':
      return 'return_soon';
    case 'planned':
      return 'wishlist';
    case 'abandoned':
      return 'keep_memory';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

const SCREEN_STATUS_LABELS: Record<RelationshipStatus, string> = {
  planned: 'Want to watch',
  in_progress: 'Watching',
  completed: 'Watched',
  abandoned: 'Stopped',
};

const BOOK_STATUS_LABELS: Record<RelationshipStatus, string> = {
  planned: 'Want to read',
  in_progress: 'Reading',
  completed: 'Read',
  abandoned: 'Did not finish',
};

/** Operational labels — plain language, medium-aware */
export function statusLabel(status: RelationshipStatus, medium: WorkMedium): string {
  if (medium === 'book') return BOOK_STATUS_LABELS[status];
  return SCREEN_STATUS_LABELS[status];
}

/** Legacy status labels for screens that still use LibraryStatus */
export function legacyStatusLabel(status: LibraryStatus, medium: WorkMedium | 'movie' | 'tv' | 'book'): string {
  return statusLabel(legacyStatusToRelationship(status), medium === 'book' ? 'book' : medium);
}

export const INTENT_LABELS_V2: Record<SanctuaryIntentV2, string> = {
  keep_memory: 'Keep This Memory',
  return_soon: 'Return Soon',
  wishlist: 'Wishlist',
};

export const EMOTION_LABELS_BY_MEDIUM: Record<
  WorkMedium | 'neutral',
  Record<'awe' | 'melancholy' | 'tension' | 'warmth', string>
> = {
  movie: {
    awe: 'Awe · the sublime frame',
    melancholy: 'Melancholy · sorrow in the cut',
    tension: 'Tension · the held breath',
    warmth: 'Warmth · afterglow and return',
  },
  tv: {
    awe: 'Awe · the sublime frame',
    melancholy: 'Melancholy · sorrow in the cut',
    tension: 'Tension · the held breath',
    warmth: 'Warmth · afterglow and return',
  },
  book: {
    awe: 'Awe · the world it opened',
    melancholy: 'Melancholy · what lingered between the lines',
    tension: 'Tension · the pull to turn the page',
    warmth: 'Warmth · the company it kept',
  },
  neutral: {
    awe: 'Sense of wonder',
    melancholy: 'Melancholy',
    tension: 'Tension',
    warmth: 'Warmth',
  },
};

export function emotionLabel(
  key: 'awe' | 'melancholy' | 'tension' | 'warmth',
  medium: WorkMedium
): string {
  return EMOTION_LABELS_BY_MEDIUM[medium][key];
}
