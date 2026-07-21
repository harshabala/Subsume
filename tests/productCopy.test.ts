import { describe, it, expect } from 'vitest';
import {
  mediumLabel,
  MEDIUM_LABEL,
  ADD_TO_ARCHIVE_LABEL,
  IN_ARCHIVE_LABEL,
  REMOVE_FROM_ARCHIVE_LABEL,
  ADD_SERIES_TO_ARCHIVE_LABEL,
  FILMS_TAB_LABEL,
  SERIES_TAB_LABEL,
  NOW_SHOWING_TITLE,
  PREMIERE_ALERTS_TITLE,
  LIVE_FEED_LABEL,
  TRY_AGAIN_LABEL,
  CREATORS_LABEL,
  failedToAddToArchiveMessage,
  failedToRemoveFromArchiveMessage,
} from '@/shared/productCopy';
import { legacyStatusLabel } from '@/shared/statusLabels';
import { INTENT_LABELS_V2 } from '@/shared/statusLabels';

describe('productCopy lexicon', () => {
  it('uses Film | Series | Book for medium badges', () => {
    expect(mediumLabel('movie')).toBe('Film');
    expect(mediumLabel('tv')).toBe('Series');
    expect(mediumLabel('book')).toBe('Book');
    expect(MEDIUM_LABEL.movie).toBe('Film');
    expect(MEDIUM_LABEL.tv).toBe('Series');
    expect(MEDIUM_LABEL.book).toBe('Book');
  });

  it('uses archive vocabulary for keep actions', () => {
    expect(ADD_TO_ARCHIVE_LABEL).toBe('Add to archive');
    expect(IN_ARCHIVE_LABEL).toBe('In archive');
    expect(REMOVE_FROM_ARCHIVE_LABEL).toBe('Remove from archive');
    expect(ADD_SERIES_TO_ARCHIVE_LABEL).toBe('Add series to archive');
  });

  it('uses Films / Series operational tab labels', () => {
    expect(FILMS_TAB_LABEL).toBe('Films');
    expect(SERIES_TAB_LABEL).toBe('Series');
  });

  it('uses canonical page and feed labels', () => {
    expect(NOW_SHOWING_TITLE).toBe('Now Showing');
    expect(PREMIERE_ALERTS_TITLE).toBe('Premiere Alerts');
    expect(LIVE_FEED_LABEL).toBe('Live feed');
    expect(TRY_AGAIN_LABEL).toBe('Try again');
    expect(CREATORS_LABEL).toBe('Creators');
  });

  it('error helpers say archive not library', () => {
    expect(failedToAddToArchiveMessage()).toBe('Failed to add title to your archive.');
    expect(failedToAddToArchiveMessage('Network down')).toBe('Network down');
    expect(failedToRemoveFromArchiveMessage()).toBe('Failed to remove item from archive.');
    expect(failedToAddToArchiveMessage()).not.toMatch(/library/i);
    expect(failedToRemoveFromArchiveMessage()).not.toMatch(/library/i);
  });

  it('book status labels stay book-aware (not To Watch)', () => {
    expect(legacyStatusLabel('to-watch', 'book')).toBe('Want to read');
    expect(legacyStatusLabel('watching', 'book')).toBe('Reading');
    expect(legacyStatusLabel('watched', 'book')).toBe('Read');
    expect(legacyStatusLabel('abandoned', 'book')).toBe('Did not finish');
  });

  it('intent V2 uses Return Soon', () => {
    expect(INTENT_LABELS_V2.return_soon).toBe('Return Soon');
  });
});
