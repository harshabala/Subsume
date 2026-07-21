/**
 * ISBN-10 / ISBN-13 validation, normalization, and conversion.
 */

export function normalizeIsbn(raw: string): string {
  return raw.replace(/[-\s]/g, '').toUpperCase();
}

export function isValidIsbn10(raw: string): boolean {
  const isbn = normalizeIsbn(raw);
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += (10 - i) * Number(isbn[i]);
  }
  const check = isbn[9] === 'X' ? 10 : Number(isbn[9]);
  sum += check;
  return sum % 11 === 0;
}

export function isValidIsbn13(raw: string): boolean {
  const isbn = normalizeIsbn(raw);
  if (!/^\d{13}$/.test(isbn)) return false;
  // ISBN-13 must start with 978 or 979 for books
  if (!isbn.startsWith('978') && !isbn.startsWith('979')) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = Number(isbn[i]);
    sum += i % 2 === 0 ? n : n * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === Number(isbn[12]);
}

export function isValidIsbn(raw: string): boolean {
  const isbn = normalizeIsbn(raw);
  if (isbn.length === 10) return isValidIsbn10(isbn);
  if (isbn.length === 13) return isValidIsbn13(isbn);
  return false;
}

/** Convert valid ISBN-10 to ISBN-13 (978 prefix). */
export function isbn10ToIsbn13(raw: string): string | null {
  if (!isValidIsbn10(raw)) return null;
  const isbn10 = normalizeIsbn(raw);
  const core = `978${isbn10.slice(0, 9)}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = Number(core[i]);
    sum += i % 2 === 0 ? n : n * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return `${core}${check}`;
}

/** Prefer ISBN-13; convert ISBN-10 when possible. */
export function toIsbn13(raw: string): string | null {
  const isbn = normalizeIsbn(raw);
  if (isbn.length === 13 && isValidIsbn13(isbn)) return isbn;
  if (isbn.length === 10) return isbn10ToIsbn13(isbn);
  return null;
}

/**
 * Extract candidate ISBN strings from free text.
 * Does not validate context — caller must apply book-context rules.
 */
export function extractIsbnCandidates(text: string): string[] {
  const found = new Set<string>();
  // ISBN-13 with optional hyphens/spaces
  const re13 = /\b(?:97[89][-\s]?)?(?:\d[-\s]?){9}\d\b/g;
  // ISBN-10
  const re10 = /\b(?:ISBN(?:-1[03])?:?\s*)?(\d{9}[\dXx]|\d{1,5}[-\s]\d{1,7}[-\s]\d{1,7}[-\s][\dXx])\b/gi;

  for (const match of text.matchAll(re13)) {
    const n = normalizeIsbn(match[0]);
    if (n.length === 13 && isValidIsbn13(n)) found.add(n);
    if (n.length === 10 && isValidIsbn10(n)) {
      const c = isbn10ToIsbn13(n);
      if (c) found.add(c);
      found.add(n);
    }
  }
  for (const match of text.matchAll(re10)) {
    const n = normalizeIsbn(match[1] ?? match[0]);
    if (isValidIsbn10(n)) {
      found.add(n);
      const c = isbn10ToIsbn13(n);
      if (c) found.add(c);
    }
    if (isValidIsbn13(n)) found.add(n);
  }
  return [...found];
}

/** Reject numbers that are clearly not book ISBNs (e.g. random 13-digit). */
export function looksLikeBookIsbn(raw: string): boolean {
  return isValidIsbn(raw);
}
