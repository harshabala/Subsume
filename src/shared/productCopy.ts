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

export function mediumLabel(type: WorkMedium | MediaType | 'movie' | 'tv' | 'book' | string): string {
  if (type === 'book') return MEDIUM_LABEL.book;
  if (type === 'tv') return MEDIUM_LABEL.tv;
  if (type === 'movie') return MEDIUM_LABEL.movie;
  return MEDIUM_LABEL.movie;
}
