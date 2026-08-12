import type { MediaType } from './types';
import type { WorkMedium } from './catalogTypes';

/** Plain-English product pitch (onboarding, Settings Start here, CWS). Poetry is secondary. */
export const PLAIN_ENGLISH_PITCH =
  'Private movie & book journal for Chrome. Save what stayed with you while you browse.';

/** User-facing name for free weekly local picks (never “Dispatch”). */
export const WEEKLY_SELECTION_LABEL = 'Weekly selection';

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

/** Book dossier: preferred-edition section heading */
export const EDITIONS_SECTION_TITLE = 'Editions';

/** CTA on a non-preferred edition row */
export const USE_AS_PREFERRED_EDITION_LABEL = 'Use as preferred';

/** Badge when this edition is the preferred printing */
export const PREFERRED_EDITION_BADGE = 'Preferred';

/**
 * Honesty copy: editions under one work share archive state;
 * preferred edition is not a multi-work merge.
 */
export const EDITIONS_SHARE_ARCHIVE_NOTE =
  'Editions of this work share one archive relationship (status, notes, and verdict). “Use as preferred” marks the printing you mean — it does not merge separate catalog works.';

/** Stats page — book reading section title (literary tone). */
export const STATS_BOOK_SECTION_TITLE = 'On the page';

/** Stats labels for book reading buckets */
export const STATS_BOOK_FINISHED_LABEL = 'finished';
export const STATS_BOOK_READING_LABEL = 'currently reading';
export const STATS_BOOK_ABANDONED_LABEL = 'did not finish';
export const STATS_BOOK_PAGES_LABEL = 'pages among them';

/** Stats footnote when page totals are partial */
export const STATS_BOOK_PAGES_PARTIAL_NOTE =
  'Page totals appear when an edition or progress records them — not every volume carries a count.';

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

/**
 * Content-script hover card / plaque: archive add or remove failed.
 * Shown with role="alert" for ~3s so failures are never silent.
 */
export const ARCHIVE_UPDATE_ERROR = 'Could not update archive. Try again.';

/** After successful library export — stickiness / sole off-device copy. */
export const EXPORT_KEEP_FILE_NOTICE =
  "Keep this file — it's the only full copy of your sanctuary off this device.";

/** Settings Backup & sync section honesty line. */
export const BACKUP_SECTION_PITCH =
  'Free forever on this device. Optional private backup (Drive) is optional — Subsume never sells your library.';
