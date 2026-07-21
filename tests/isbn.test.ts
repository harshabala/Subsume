import { describe, it, expect } from 'vitest';
import {
  normalizeIsbn,
  isValidIsbn10,
  isValidIsbn13,
  isValidIsbn,
  isbn10ToIsbn13,
  toIsbn13,
  extractIsbnCandidates,
  looksLikeBookIsbn,
} from '@/shared/isbn';

// Well-known valid ISBNs
const ISBN10_GATSBY = '0743273567';
const ISBN13_GATSBY = '9780743273565';
const ISBN10_HYPHEN = '0-7432-7356-7';
const ISBN13_HYPHEN = '978-0-7432-7356-5';
// Classic: 0-306-40615-2 ↔ 978-0-306-40615-7
const ISBN10_CLASSIC = '0306406152';
const ISBN13_CLASSIC = '9780306406157';
// ISBN-10 ending in X
const ISBN10_X = '080442957X';

describe('normalizeIsbn', () => {
  it('strips hyphens and spaces and uppercases X', () => {
    expect(normalizeIsbn('978-0-7432-7356-5')).toBe('9780743273565');
    expect(normalizeIsbn('0 7432 7356 7')).toBe('0743273567');
    expect(normalizeIsbn('080442957x')).toBe('080442957X');
  });
});

describe('isValidIsbn10', () => {
  it('accepts valid ISBN-10 checksums', () => {
    expect(isValidIsbn10(ISBN10_GATSBY)).toBe(true);
    expect(isValidIsbn10(ISBN10_HYPHEN)).toBe(true);
    expect(isValidIsbn10(ISBN10_CLASSIC)).toBe(true);
    expect(isValidIsbn10(ISBN10_X)).toBe(true);
  });

  it('rejects invalid checksum, length, and characters', () => {
    expect(isValidIsbn10('0743273568')).toBe(false); // bad check digit
    expect(isValidIsbn10('074327356')).toBe(false); // too short
    expect(isValidIsbn10('07432735670')).toBe(false); // too long
    expect(isValidIsbn10('074327356A')).toBe(false); // invalid char
    expect(isValidIsbn10('')).toBe(false);
  });
});

describe('isValidIsbn13', () => {
  it('accepts valid ISBN-13 with 978/979 prefix', () => {
    expect(isValidIsbn13(ISBN13_GATSBY)).toBe(true);
    expect(isValidIsbn13(ISBN13_HYPHEN)).toBe(true);
    expect(isValidIsbn13(ISBN13_CLASSIC)).toBe(true);
  });

  it('rejects bad checksum, wrong prefix, and non-book EAN', () => {
    expect(isValidIsbn13('9780743273566')).toBe(false); // bad check
    expect(isValidIsbn13('9770743273565')).toBe(false); // not 978/979
    expect(isValidIsbn13('1234567890123')).toBe(false); // random 13 digits
    expect(isValidIsbn13('978074327356')).toBe(false); // too short
    expect(isValidIsbn13('')).toBe(false);
  });
});

describe('isValidIsbn', () => {
  it('accepts either valid ISBN-10 or ISBN-13', () => {
    expect(isValidIsbn(ISBN10_GATSBY)).toBe(true);
    expect(isValidIsbn(ISBN13_GATSBY)).toBe(true);
    expect(isValidIsbn(ISBN10_HYPHEN)).toBe(true);
  });

  it('rejects invalid or wrong-length values', () => {
    expect(isValidIsbn('12345')).toBe(false);
    expect(isValidIsbn('abcdefghij')).toBe(false);
    expect(isValidIsbn('9780743273566')).toBe(false);
  });
});

describe('isbn10ToIsbn13 / toIsbn13', () => {
  it('converts valid ISBN-10 to ISBN-13 with 978 prefix', () => {
    expect(isbn10ToIsbn13(ISBN10_GATSBY)).toBe(ISBN13_GATSBY);
    expect(isbn10ToIsbn13(ISBN10_CLASSIC)).toBe(ISBN13_CLASSIC);
    expect(isbn10ToIsbn13(ISBN10_HYPHEN)).toBe(ISBN13_GATSBY);
  });

  it('returns null for invalid ISBN-10', () => {
    expect(isbn10ToIsbn13('0743273568')).toBeNull();
    expect(isbn10ToIsbn13('not-an-isbn')).toBeNull();
  });

  it('toIsbn13 prefers ISBN-13 and converts ISBN-10', () => {
    expect(toIsbn13(ISBN13_GATSBY)).toBe(ISBN13_GATSBY);
    expect(toIsbn13(ISBN13_HYPHEN)).toBe(ISBN13_GATSBY);
    expect(toIsbn13(ISBN10_GATSBY)).toBe(ISBN13_GATSBY);
    expect(toIsbn13('bad')).toBeNull();
    expect(toIsbn13('9780743273566')).toBeNull();
  });
});

describe('extractIsbnCandidates', () => {
  it('extracts valid ISBN-13 from free text', () => {
    const text = `Buy it now: ISBN 978-0-7432-7356-5 available.`;
    const found = extractIsbnCandidates(text);
    expect(found).toContain(ISBN13_GATSBY);
  });

  it('extracts valid ISBN-10 and includes converted ISBN-13', () => {
    const text = `ISBN-10: 0-306-40615-2`;
    const found = extractIsbnCandidates(text);
    expect(found).toContain(ISBN10_CLASSIC);
    expect(found).toContain(ISBN13_CLASSIC);
  });

  it('does not accept random 13-digit numbers as ISBNs', () => {
    const text = `Order number 1234567890123 is not a book.`;
    const found = extractIsbnCandidates(text);
    expect(found).not.toContain('1234567890123');
    expect(found.every((c) => isValidIsbn(c))).toBe(true);
  });

  it('returns empty array when no ISBNs present', () => {
    expect(extractIsbnCandidates('Just a blog post about reading.')).toEqual([]);
  });
});

describe('looksLikeBookIsbn', () => {
  it('matches isValidIsbn for book-like identifiers', () => {
    expect(looksLikeBookIsbn(ISBN13_GATSBY)).toBe(true);
    expect(looksLikeBookIsbn(ISBN10_GATSBY)).toBe(true);
    expect(looksLikeBookIsbn('1234567890123')).toBe(false);
    expect(looksLikeBookIsbn('not-isbn')).toBe(false);
  });
});
