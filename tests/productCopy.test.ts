import { describe, it, expect } from 'vitest';
import {
  mediumLabel,
  MEDIUM_LABEL,
  ADD_TO_ARCHIVE_LABEL,
  IN_ARCHIVE_LABEL,
} from '@/shared/productCopy';
import { legacyStatusLabel } from '@/shared/statusLabels';

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
  });

  it('book status labels stay book-aware (not To Watch)', () => {
    expect(legacyStatusLabel('to-watch', 'book')).toBe('Want to read');
    expect(legacyStatusLabel('watching', 'book')).toBe('Reading');
    expect(legacyStatusLabel('watched', 'book')).toBe('Read');
    expect(legacyStatusLabel('abandoned', 'book')).toBe('Did not finish');
  });
});
