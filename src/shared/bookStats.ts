/**
 * Pure book-reading statistics for the Stats page.
 * Accepts legacy LibraryStatus and RelationshipStatus; optional page totals from
 * experience progress or media pageCount when present.
 */

import type { Experience } from './catalogTypes';
import type { LibraryStatus, MediaType } from './types';

export type BookStatsStatus =
  | LibraryStatus
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'abandoned';

/** Minimal row the Stats page / tests can pass without full library join. */
export interface BookStatsItem {
  /** Media type — non-books are ignored. */
  type?: MediaType | string;
  status: BookStatsStatus | string;
  /** Catalog page count when known (MediaItem.pageCount / edition). */
  pageCount?: number;
  /** Latest experience progress for this work, when loaded. */
  progress?: Experience['progress'] | null;
}

export interface BookReadingStats {
  /** Status completed / watched — finished the book. */
  finished: number;
  /** Status in_progress / watching — currently reading. */
  currentlyReading: number;
  /** Status abandoned — did not finish. */
  abandoned: number;
  /**
   * Sum of known page totals across finished + reading + abandoned books
   * that carry progress.total (page unit) or pageCount. Undefined when none.
   */
  totalPages?: number;
  /** How many books contributed to totalPages. */
  pagesKnownFor: number;
}

type Bucket = 'finished' | 'currentlyReading' | 'abandoned' | 'other';

function bucketForStatus(status: string): Bucket {
  switch (status) {
    case 'watched':
    case 'completed':
      return 'finished';
    case 'watching':
    case 'in_progress':
      return 'currentlyReading';
    case 'abandoned':
      return 'abandoned';
    default:
      return 'other';
  }
}

/**
 * Resolve a page total for one book when present.
 * Prefers progress.total for unit "page"; falls back to pageCount.
 */
export function resolveBookPageTotal(item: BookStatsItem): number | undefined {
  const progress = item.progress;
  if (
    progress &&
    progress.unit === 'page' &&
    typeof progress.total === 'number' &&
    Number.isFinite(progress.total) &&
    progress.total > 0
  ) {
    return Math.round(progress.total);
  }
  if (
    typeof item.pageCount === 'number' &&
    Number.isFinite(item.pageCount) &&
    item.pageCount > 0
  ) {
    return Math.round(item.pageCount);
  }
  return undefined;
}

/**
 * Compute richer book reading statistics from archive rows.
 * Non-book media (or missing type treated as non-book only when type is set
 * to movie/tv) are skipped. Items without type are counted when the caller
 * already filtered to books.
 */
export function computeBookReadingStats(items: readonly BookStatsItem[]): BookReadingStats {
  let finished = 0;
  let currentlyReading = 0;
  let abandoned = 0;
  let totalPages = 0;
  let pagesKnownFor = 0;

  for (const item of items) {
    if (item.type === 'movie' || item.type === 'tv') continue;
    // Explicit non-book medium strings
    if (item.type != null && item.type !== 'book' && item.type !== '') continue;

    const bucket = bucketForStatus(String(item.status));
    if (bucket === 'finished') finished += 1;
    else if (bucket === 'currentlyReading') currentlyReading += 1;
    else if (bucket === 'abandoned') abandoned += 1;
    else continue; // planned / unknown — not part of reading snapshot

    const pages = resolveBookPageTotal(item);
    if (pages !== undefined) {
      totalPages += pages;
      pagesKnownFor += 1;
    }
  }

  const result: BookReadingStats = {
    finished,
    currentlyReading,
    abandoned,
    pagesKnownFor,
  };
  if (pagesKnownFor > 0) {
    result.totalPages = totalPages;
  }
  return result;
}

/** True when any of the book reading buckets is non-zero. */
export function hasBookReadingActivity(stats: BookReadingStats): boolean {
  return stats.finished > 0 || stats.currentlyReading > 0 || stats.abandoned > 0;
}
