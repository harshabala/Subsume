import { describe, it, expect } from 'vitest';
import {
  mediumLabel,
  MEDIUM_LABEL,
  PLAIN_ENGLISH_PITCH,
  WEEKLY_SELECTION_LABEL,
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
  EDITIONS_SECTION_TITLE,
  USE_AS_PREFERRED_EDITION_LABEL,
  PREFERRED_EDITION_BADGE,
  EDITIONS_SHARE_ARCHIVE_NOTE,
  STATS_BOOK_SECTION_TITLE,
  STATS_BOOK_FINISHED_LABEL,
  STATS_BOOK_READING_LABEL,
  STATS_BOOK_ABANDONED_LABEL,
  STATS_BOOK_PAGES_LABEL,
  STATS_BOOK_PAGES_PARTIAL_NOTE,
  failedToAddToArchiveMessage,
  failedToRemoveFromArchiveMessage,
  ARCHIVE_UPDATE_ERROR,
  EXPORT_KEEP_FILE_NOTICE,
  BACKUP_SECTION_PITCH,
} from '@/shared/productCopy';
import { legacyStatusLabel } from '@/shared/statusLabels';
import { INTENT_LABELS_V2 } from '@/shared/statusLabels';

describe('productCopy lexicon', () => {
  it('exports plain-English pitch and weekly selection label', () => {
    expect(PLAIN_ENGLISH_PITCH).toMatch(/private movie & book journal/i);
    expect(PLAIN_ENGLISH_PITCH).toMatch(/save what stayed with you/i);
    expect(WEEKLY_SELECTION_LABEL).toBe('Weekly selection');
    expect(WEEKLY_SELECTION_LABEL.toLowerCase()).not.toContain('dispatch');
  });

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

  it('edition reconciliation copy marks preferred without multi-work merge', () => {
    expect(EDITIONS_SECTION_TITLE).toBe('Editions');
    expect(USE_AS_PREFERRED_EDITION_LABEL).toBe('Use as preferred');
    expect(PREFERRED_EDITION_BADGE).toBe('Preferred');
    expect(EDITIONS_SHARE_ARCHIVE_NOTE).toMatch(/archive relationship/i);
    expect(EDITIONS_SHARE_ARCHIVE_NOTE).toMatch(/does not merge/i);
  });

  it('stats book reading copy stays literary (not To Watch / DNF jargon)', () => {
    expect(STATS_BOOK_SECTION_TITLE).toBe('On the page');
    expect(STATS_BOOK_FINISHED_LABEL).toBe('finished');
    expect(STATS_BOOK_READING_LABEL).toBe('currently reading');
    expect(STATS_BOOK_ABANDONED_LABEL).toBe('did not finish');
    expect(STATS_BOOK_PAGES_LABEL).toMatch(/pages/i);
    expect(STATS_BOOK_PAGES_PARTIAL_NOTE).toMatch(/page totals/i);
    expect(STATS_BOOK_ABANDONED_LABEL).not.toMatch(/stopped|to watch/i);
  });

  it('error helpers say archive not library', () => {
    expect(failedToAddToArchiveMessage()).toBe('Failed to add title to your archive.');
    expect(failedToAddToArchiveMessage('Network down')).toBe('Network down');
    expect(failedToRemoveFromArchiveMessage()).toBe('Failed to remove item from archive.');
    expect(failedToAddToArchiveMessage()).not.toMatch(/library/i);
    expect(failedToRemoveFromArchiveMessage()).not.toMatch(/library/i);
  });

  it('content-script archive failure and product pitch constants', () => {
    expect(ARCHIVE_UPDATE_ERROR).toBe('Could not update archive. Try again.');
    expect(PLAIN_ENGLISH_PITCH).toMatch(/Private movie & book journal/i);
    expect(EXPORT_KEEP_FILE_NOTICE).toMatch(/only full copy/i);
    expect(BACKUP_SECTION_PITCH).toMatch(/never sells/i);
    expect(BACKUP_SECTION_PITCH).toMatch(/Free forever on this device/i);
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
