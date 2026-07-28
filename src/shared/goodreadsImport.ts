/**
 * Local-only Goodreads export CSV parsing and status mapping.
 * Never send CSV contents to an LLM — parse on-device only.
 *
 * Non-goals: not a full Goodreads sync; one-shot archive seed from user export.
 */

import type { LibraryStatus } from './types';

/** Max data rows processed per import (header excluded). */
export const GOODREADS_IMPORT_BATCH_CAP = 100;

/** Parsed fields from a Goodreads library export row (best-effort). */
export interface GoodreadsImportRow {
  /** 1-based data row index in the original CSV (header is row 0). */
  rowIndex: number;
  title: string;
  author?: string;
  isbn13?: string;
  /** Goodreads stars 0–5; 0 means unrated. */
  myRating?: number;
  exclusiveShelf?: string;
  /** Raw Date Read cell (e.g. YYYY/MM/DD). */
  dateRead?: string;
}

export interface ParseGoodreadsCsvResult {
  rows: GoodreadsImportRow[];
  /** Total data rows present before cap. */
  totalDataRows: number;
  /** True when more rows existed than the batch cap. */
  truncated: boolean;
  warnings: string[];
}

const HEADER_ALIASES: Record<keyof Omit<GoodreadsImportRow, 'rowIndex'>, string[]> = {
  title: ['title'],
  author: ['author'],
  isbn13: ['isbn13', 'isbn 13'],
  myRating: ['my rating'],
  exclusiveShelf: ['exclusive shelf'],
  dateRead: ['date read'],
};

/**
 * Map Goodreads Exclusive Shelf → Subsume LibraryStatus.
 * Custom shelves fall back to planned (to-watch).
 */
export function mapGoodreadsShelfToStatus(shelf: string | undefined | null): LibraryStatus {
  const s = (shelf ?? '').trim().toLowerCase().replace(/_/g, '-');
  if (s === 'read') return 'watched';
  if (s === 'currently-reading' || s === 'currently reading') return 'watching';
  if (s === 'to-read' || s === 'to read') return 'to-watch';
  // Common abandoned-ish shelves
  if (s === 'did-not-finish' || s === 'dnf' || s === 'abandoned') return 'abandoned';
  return 'to-watch';
}

/**
 * Map Goodreads 1–5 star rating to Subsume 1–10 scale (×2).
 * 0 / empty / invalid → undefined (unrated).
 */
export function mapGoodreadsRatingToSubsume(
  rating: number | undefined | null,
): number | undefined {
  if (rating == null || !Number.isFinite(rating) || rating <= 0) return undefined;
  const stars = Math.min(5, Math.max(1, Math.round(rating)));
  return stars * 2;
}

/**
 * Parse Goodreads Date Read into epoch ms (UTC noon to reduce TZ edge cases).
 * Accepts YYYY/MM/DD, YYYY-MM-DD, or empty.
 */
export function parseGoodreadsDate(raw: string | undefined | null): number | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  const m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!m) return undefined;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const ms = Date.UTC(year, month - 1, day, 12, 0, 0);
  if (!Number.isFinite(ms)) return undefined;
  return ms;
}

/** Strip Goodreads formula-style ISBN cells: ="978…" or =""978…"" */
export function cleanGoodreadsIsbnCell(raw: string | undefined | null): string | undefined {
  if (raw == null) return undefined;
  let s = String(raw).trim();
  if (!s) return undefined;
  // ="value" or =""value""
  if (s.startsWith('=')) {
    s = s.slice(1).trim();
  }
  // strip surrounding quotes repeatedly
  while (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  // digits / X only for validation later
  const digits = s.replace(/[-\s]/g, '');
  if (!digits) return undefined;
  return digits;
}

/**
 * Minimal RFC4180-ish CSV line split: handles quoted fields and escaped "".
 */
export function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

/** Split full CSV text into non-empty physical lines (preserves quoted newlines as single logical line). */
export function splitCsvRows(text: string): string[] {
  const rows: string[] = [];
  let cur = '';
  let inQuotes = false;
  const normalized = text.replace(/^\uFEFF/, ''); // BOM
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      cur += ch;
      continue;
    }
    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && normalized[i + 1] === '\n') i += 1;
      if (cur.trim().length > 0) rows.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim().length > 0) rows.push(cur);
  return rows;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ');
}

function findColumnIndex(headers: string[], aliases: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (aliases.includes(h)) return i;
  }
  return -1;
}

function cellAt(cells: string[], index: number): string | undefined {
  if (index < 0 || index >= cells.length) return undefined;
  const v = cells[index]?.trim();
  return v || undefined;
}

/**
 * Parse a Goodreads library export CSV string into import rows.
 * Local-only; does not network or call LLM.
 */
export function parseGoodreadsCsv(
  csvText: string,
  options?: { cap?: number },
): ParseGoodreadsCsvResult {
  const cap = options?.cap ?? GOODREADS_IMPORT_BATCH_CAP;
  const warnings: string[] = [];
  const text = (csvText ?? '').trim();
  if (!text) {
    return { rows: [], totalDataRows: 0, truncated: false, warnings: ['Empty CSV'] };
  }

  const lines = splitCsvRows(text);
  if (lines.length < 2) {
    return {
      rows: [],
      totalDataRows: 0,
      truncated: false,
      warnings: ['CSV has no data rows (need header + at least one book)'],
    };
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const col = {
    title: findColumnIndex(headers, HEADER_ALIASES.title),
    author: findColumnIndex(headers, HEADER_ALIASES.author),
    isbn13: findColumnIndex(headers, HEADER_ALIASES.isbn13),
    // Fallback: plain ISBN column if ISBN13 missing
    isbn: findColumnIndex(headers, ['isbn']),
    myRating: findColumnIndex(headers, HEADER_ALIASES.myRating),
    exclusiveShelf: findColumnIndex(headers, HEADER_ALIASES.exclusiveShelf),
    dateRead: findColumnIndex(headers, HEADER_ALIASES.dateRead),
  };

  if (col.title < 0) {
    return {
      rows: [],
      totalDataRows: 0,
      truncated: false,
      warnings: ['Missing required Title column — is this a Goodreads library export?'],
    };
  }

  const dataLines = lines.slice(1);
  const totalDataRows = dataLines.length;
  const truncated = totalDataRows > cap;
  if (truncated) {
    warnings.push(
      `Import capped at ${cap} of ${totalDataRows} rows (not a full Goodreads sync).`,
    );
  }

  const rows: GoodreadsImportRow[] = [];
  const limit = Math.min(totalDataRows, cap);

  for (let i = 0; i < limit; i++) {
    const cells = splitCsvLine(dataLines[i]);
    const title = cellAt(cells, col.title)?.trim() ?? '';
    if (!title) {
      warnings.push(`Row ${i + 1}: skipped empty Title`);
      continue;
    }

    const author = cellAt(cells, col.author);
    let isbn13 = cleanGoodreadsIsbnCell(cellAt(cells, col.isbn13));
    if (!isbn13 && col.isbn >= 0) {
      isbn13 = cleanGoodreadsIsbnCell(cellAt(cells, col.isbn));
    }

    const ratingRaw = cellAt(cells, col.myRating);
    let myRating: number | undefined;
    if (ratingRaw != null && ratingRaw !== '') {
      const n = Number(ratingRaw);
      if (Number.isFinite(n)) myRating = n;
    }

    const exclusiveShelf = cellAt(cells, col.exclusiveShelf);
    const dateRead = cellAt(cells, col.dateRead);

    rows.push({
      rowIndex: i + 1,
      title,
      author,
      isbn13,
      myRating,
      exclusiveShelf,
      dateRead,
    });
  }

  return { rows, totalDataRows, truncated, warnings };
}

/** Search query string for Open Library title(+author) fallback. */
export function goodreadsRowSearchQuery(row: GoodreadsImportRow): string {
  const title = row.title.trim();
  const author = row.author?.trim();
  if (author) return `${title} ${author}`;
  return title;
}
