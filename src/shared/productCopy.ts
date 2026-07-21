import type { MediaType } from './types';
import type { WorkMedium } from './catalogTypes';

/** Canonical medium labels for user-facing badges and meta */
export const MEDIUM_LABEL: Record<WorkMedium | MediaType | 'movie' | 'tv' | 'book', string> = {
  movie: 'Film',
  tv: 'Series',
  book: 'Book',
};

/** Primary keep action — empty archive CTA */
export const ADD_TO_ARCHIVE_LABEL = 'Add to archive';

/** Primary keep action — already in archive */
export const IN_ARCHIVE_LABEL = 'In archive';

/** Primary keep action — remove from archive */
export const REMOVE_FROM_ARCHIVE_LABEL = 'Remove from archive';

/** Hover / dual-type add for series when type is ambiguous */
export const ADD_SERIES_TO_ARCHIVE_LABEL = 'Add series to archive';

/** Screen sub-tab under Screen medium filter */
export const FILMS_TAB_LABEL = 'Films';

/** Series sub-tab / medium filter */
export const SERIES_TAB_LABEL = 'Series';

/** Now Showing page / nav label */
export const NOW_SHOWING_TITLE = 'Now Showing';

/** Premiere Alerts page title */
export const PREMIERE_ALERTS_TITLE = 'Premiere Alerts';

/** Discovery live feed heading */
export const LIVE_FEED_LABEL = 'Live feed';

/** Generic retry CTA */
export const TRY_AGAIN_LABEL = 'Try again';

/** Creators registry (people) operational label */
export const CREATORS_LABEL = 'Creators';

export function mediumLabel(type: WorkMedium | MediaType | 'movie' | 'tv' | 'book' | string): string {
  if (type === 'book') return MEDIUM_LABEL.book;
  if (type === 'tv') return MEDIUM_LABEL.tv;
  if (type === 'movie') return MEDIUM_LABEL.movie;
  return MEDIUM_LABEL.movie;
}

/** User-facing error when an add-to-archive action fails */
export function failedToAddToArchiveMessage(detail?: string): string {
  if (detail?.trim()) return detail.trim();
  return 'Failed to add title to your archive.';
}

/** User-facing error when a remove-from-archive action fails */
export function failedToRemoveFromArchiveMessage(detail?: string): string {
  if (detail?.trim()) return detail.trim();
  return 'Failed to remove item from archive.';
}
