/**
 * Pure Goodreads CSV row parser + status/rating mapping.
 * Fixture string only — no network, no LLM.
 */
import { describe, it, expect } from 'vitest';
import {
  GOODREADS_IMPORT_BATCH_CAP,
  cleanGoodreadsIsbnCell,
  goodreadsRowSearchQuery,
  mapGoodreadsRatingToSubsume,
  mapGoodreadsShelfToStatus,
  parseGoodreadsCsv,
  parseGoodreadsDate,
  splitCsvLine,
} from '@/shared/goodreadsImport';

/** Minimal Goodreads-style export fixture (header + 4 data rows). */
const FIXTURE_CSV = `Book Id,Title,Author,ISBN,ISBN13,My Rating,Exclusive Shelf,Date Read
1,"The Great Gatsby","F. Scott Fitzgerald",="0743273567",="9780743273565",5,read,2020/06/15
2,"1984","George Orwell",="0451524934",="9780451524935",4,currently-reading,
3,"Dune","Frank Herbert",="0441172717",="9780441172719",0,to-read,
4,"Circe","Madeline Miller",,"",3,did-not-finish,2019/01/01
`;

describe('mapGoodreadsShelfToStatus', () => {
  it('maps standard exclusive shelves', () => {
    expect(mapGoodreadsShelfToStatus('read')).toBe('watched');
    expect(mapGoodreadsShelfToStatus('to-read')).toBe('to-watch');
    expect(mapGoodreadsShelfToStatus('currently-reading')).toBe('watching');
  });

  it('maps abandoned-like shelves and custom defaults', () => {
    expect(mapGoodreadsShelfToStatus('did-not-finish')).toBe('abandoned');
    expect(mapGoodreadsShelfToStatus('dnf')).toBe('abandoned');
    expect(mapGoodreadsShelfToStatus('favorites')).toBe('to-watch');
    expect(mapGoodreadsShelfToStatus('')).toBe('to-watch');
    expect(mapGoodreadsShelfToStatus(undefined)).toBe('to-watch');
  });

  it('is case-insensitive and tolerates spaces/underscores', () => {
    expect(mapGoodreadsShelfToStatus('Read')).toBe('watched');
    expect(mapGoodreadsShelfToStatus('CURRENTLY_READING')).toBe('watching');
    expect(mapGoodreadsShelfToStatus('to read')).toBe('to-watch');
  });
});

describe('mapGoodreadsRatingToSubsume', () => {
  it('maps 1–5 stars to 2–10 on Subsume scale', () => {
    expect(mapGoodreadsRatingToSubsume(1)).toBe(2);
    expect(mapGoodreadsRatingToSubsume(2)).toBe(4);
    expect(mapGoodreadsRatingToSubsume(3)).toBe(6);
    expect(mapGoodreadsRatingToSubsume(4)).toBe(8);
    expect(mapGoodreadsRatingToSubsume(5)).toBe(10);
  });

  it('treats 0 / empty / invalid as unrated', () => {
    expect(mapGoodreadsRatingToSubsume(0)).toBeUndefined();
    expect(mapGoodreadsRatingToSubsume(undefined)).toBeUndefined();
    expect(mapGoodreadsRatingToSubsume(null)).toBeUndefined();
    expect(mapGoodreadsRatingToSubsume(NaN)).toBeUndefined();
  });
});

describe('parseGoodreadsDate', () => {
  it('parses YYYY/MM/DD and YYYY-MM-DD', () => {
    const a = parseGoodreadsDate('2020/06/15');
    const b = parseGoodreadsDate('2020-06-15');
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(a).toBe(b);
    const d = new Date(a!);
    expect(d.getUTCFullYear()).toBe(2020);
    expect(d.getUTCMonth()).toBe(5);
    expect(d.getUTCDate()).toBe(15);
  });

  it('returns undefined for empty or garbage', () => {
    expect(parseGoodreadsDate('')).toBeUndefined();
    expect(parseGoodreadsDate('not-a-date')).toBeUndefined();
    expect(parseGoodreadsDate(undefined)).toBeUndefined();
  });
});

describe('cleanGoodreadsIsbnCell', () => {
  it('strips Goodreads formula quoting', () => {
    expect(cleanGoodreadsIsbnCell('="9780743273565"')).toBe('9780743273565');
    expect(cleanGoodreadsIsbnCell('="0743273567"')).toBe('0743273567');
    expect(cleanGoodreadsIsbnCell('978-0-7432-7356-5')).toBe('9780743273565');
  });

  it('returns undefined for empty cells', () => {
    expect(cleanGoodreadsIsbnCell('')).toBeUndefined();
    expect(cleanGoodreadsIsbnCell('=""')).toBeUndefined();
    expect(cleanGoodreadsIsbnCell(undefined)).toBeUndefined();
  });
});

describe('splitCsvLine', () => {
  it('handles quoted commas and escaped quotes', () => {
    expect(splitCsvLine('a,"b,c",d')).toEqual(['a', 'b,c', 'd']);
    expect(splitCsvLine('"He said ""hi"""')).toEqual(['He said "hi"']);
  });
});

describe('parseGoodreadsCsv', () => {
  it('parses fixture rows with Title, Author, ISBN13, rating, shelf, date', () => {
    const result = parseGoodreadsCsv(FIXTURE_CSV);
    expect(result.totalDataRows).toBe(4);
    expect(result.truncated).toBe(false);
    expect(result.rows).toHaveLength(4);

    const gatsby = result.rows[0];
    expect(gatsby.title).toBe('The Great Gatsby');
    expect(gatsby.author).toBe('F. Scott Fitzgerald');
    expect(gatsby.isbn13).toBe('9780743273565');
    expect(gatsby.myRating).toBe(5);
    expect(gatsby.exclusiveShelf).toBe('read');
    expect(gatsby.dateRead).toBe('2020/06/15');
    expect(gatsby.rowIndex).toBe(1);

    const orwell = result.rows[1];
    expect(orwell.title).toBe('1984');
    expect(orwell.exclusiveShelf).toBe('currently-reading');
    expect(orwell.myRating).toBe(4);

    const dune = result.rows[2];
    expect(dune.title).toBe('Dune');
    expect(dune.myRating).toBe(0);
    expect(dune.exclusiveShelf).toBe('to-read');

    const circe = result.rows[3];
    expect(circe.title).toBe('Circe');
    expect(circe.exclusiveShelf).toBe('did-not-finish');
    expect(circe.myRating).toBe(3);
  });

  it('maps fixture shelves and ratings correctly', () => {
    const { rows } = parseGoodreadsCsv(FIXTURE_CSV);
    expect(mapGoodreadsShelfToStatus(rows[0].exclusiveShelf)).toBe('watched');
    expect(mapGoodreadsRatingToSubsume(rows[0].myRating)).toBe(10);
    expect(mapGoodreadsShelfToStatus(rows[1].exclusiveShelf)).toBe('watching');
    expect(mapGoodreadsRatingToSubsume(rows[1].myRating)).toBe(8);
    expect(mapGoodreadsShelfToStatus(rows[2].exclusiveShelf)).toBe('to-watch');
    expect(mapGoodreadsRatingToSubsume(rows[2].myRating)).toBeUndefined();
    expect(mapGoodreadsShelfToStatus(rows[3].exclusiveShelf)).toBe('abandoned');
    expect(mapGoodreadsRatingToSubsume(rows[3].myRating)).toBe(6);
    expect(parseGoodreadsDate(rows[0].dateRead)).toBeDefined();
  });

  it('caps batch size and reports truncated', () => {
    const result = parseGoodreadsCsv(FIXTURE_CSV, { cap: 2 });
    expect(result.rows).toHaveLength(2);
    expect(result.totalDataRows).toBe(4);
    expect(result.truncated).toBe(true);
    expect(result.warnings.some((w) => w.includes('capped'))).toBe(true);
    expect(GOODREADS_IMPORT_BATCH_CAP).toBe(100);
  });

  it('warns on missing Title column', () => {
    const result = parseGoodreadsCsv('Foo,Bar\n1,2');
    expect(result.rows).toHaveLength(0);
    expect(result.warnings.some((w) => /Title/i.test(w))).toBe(true);
  });

  it('skips empty titles', () => {
    const csv = `Title,Author,Exclusive Shelf\n,"Nobody",to-read\n"Real Book","Someone",read\n`;
    const result = parseGoodreadsCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].title).toBe('Real Book');
    expect(result.warnings.some((w) => /empty Title/i.test(w))).toBe(true);
  });

  it('builds title+author search query', () => {
    const { rows } = parseGoodreadsCsv(FIXTURE_CSV);
    expect(goodreadsRowSearchQuery(rows[0])).toBe(
      'The Great Gatsby F. Scott Fitzgerald',
    );
  });
});
