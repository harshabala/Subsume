import { describe, it, expect } from 'vitest';
import type { BookEdition } from '@/shared/catalogTypes';
import {
  formatEditionLanguage,
  formatEditionIsbn,
  editionMetaParts,
  formatEditionListLabel,
  sortEditionsPreferredFirst,
} from '@/shared/bookEditions';
import {
  EDITIONS_SECTION_TITLE,
  USE_AS_PREFERRED_EDITION_LABEL,
  PREFERRED_EDITION_BADGE,
  EDITIONS_SHARE_ARCHIVE_NOTE,
} from '@/shared/productCopy';

function edition(partial: Partial<BookEdition> & Pick<BookEdition, 'id' | 'workId' | 'title'>): BookEdition {
  return {
    authors: ['Author'],
    providerIds: [],
    sourceProvenance: [],
    sourceConfidence: 'high',
    ...partial,
  };
}

describe('bookEditions helpers', () => {
  it('formatEditionLanguage maps common codes and falls back', () => {
    expect(formatEditionLanguage('eng')).toBe('English');
    expect(formatEditionLanguage('fre')).toBe('French');
    expect(formatEditionLanguage('/languages/spa')).toBe('Spanish');
    expect(formatEditionLanguage('xyz')).toBe('XYZ');
    expect(formatEditionLanguage('')).toBeUndefined();
    expect(formatEditionLanguage(null)).toBeUndefined();
  });

  it('formatEditionIsbn prefers ISBN-13 over ISBN-10', () => {
    expect(
      formatEditionIsbn({ isbn13: ['9780743273565'], isbn10: ['0743273567'] }),
    ).toBe('9780743273565');
    expect(formatEditionIsbn({ isbn10: ['0743273567'] })).toBe('0743273567');
    expect(formatEditionIsbn({})).toBeUndefined();
  });

  it('editionMetaParts includes language, ISBN, publisher, format, date, pages', () => {
    const parts = editionMetaParts({
      language: 'eng',
      isbn13: ['9780743273565'],
      publisher: 'Scribner',
      format: 'paperback',
      publishedDate: '2004',
      pageCount: 180,
    });
    expect(parts).toEqual([
      'English',
      'ISBN 9780743273565',
      'Scribner',
      'paperback',
      '2004',
      '180 pp',
    ]);
  });

  it('formatEditionListLabel joins title with meta', () => {
    const label = formatEditionListLabel({
      title: 'The Great Gatsby',
      subtitle: 'Reprint',
      language: 'eng',
      isbn13: ['9780743273565'],
      publisher: 'Scribner',
      format: 'paperback',
    });
    expect(label).toContain('The Great Gatsby — Reprint');
    expect(label).toContain('English');
    expect(label).toContain('ISBN 9780743273565');
    expect(label).toContain('Scribner');
    expect(label).toContain('paperback');
  });

  it('sortEditionsPreferredFirst moves preferred to front without mutating', () => {
    const a = edition({ id: 'a', workId: 'w', title: 'A' });
    const b = edition({ id: 'b', workId: 'w', title: 'B' });
    const c = edition({ id: 'c', workId: 'w', title: 'C' });
    const input = [a, b, c];
    const sorted = sortEditionsPreferredFirst(input, 'b');
    expect(sorted.map((e) => e.id)).toEqual(['b', 'a', 'c']);
    expect(input.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(sortEditionsPreferredFirst(input, 'missing').map((e) => e.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(sortEditionsPreferredFirst(input, null).map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('edition reconciliation product copy', () => {
  it('exposes preferred-edition clarity and shared-archive honesty', () => {
    expect(EDITIONS_SECTION_TITLE).toBe('Editions');
    expect(USE_AS_PREFERRED_EDITION_LABEL).toBe('Use as preferred');
    expect(PREFERRED_EDITION_BADGE).toBe('Preferred');
    expect(EDITIONS_SHARE_ARCHIVE_NOTE).toMatch(/share one archive relationship/i);
    expect(EDITIONS_SHARE_ARCHIVE_NOTE).toMatch(/does not merge separate catalog works/i);
  });
});
