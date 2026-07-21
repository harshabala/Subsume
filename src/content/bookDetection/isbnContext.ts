/**
 * Stage B — ISBN extraction from page text/meta with nearby book-context checks.
 * Precision over recall: require book-context terms unless skipContext is set
 * (e.g. domain adapter already identified a book page).
 */

import type { DetectionCandidate } from '@/shared/catalogTypes';
import {
  extractIsbnCandidates,
  isValidIsbn10,
  isValidIsbn13,
  normalizeIsbn,
  toIsbn13,
} from '@/shared/isbn';

/** Terms that indicate a nearby string is about a book rather than a random product code. */
export const BOOK_CONTEXT_TERMS = [
  'book',
  'novel',
  'author',
  'isbn',
  'paperback',
  'hardcover',
  'hardback',
  'softcover',
  'audiobook',
  'publisher',
  'edition',
  'volume',
  'literature',
  'memoir',
  'essay',
  'fiction',
  'nonfiction',
  'non-fiction',
  'reading',
  'reader',
  'writer',
  'bestseller',
  'best-seller',
  'chapters',
  'page count',
  'pages',
  'kindle',
  'epub',
  'library',
] as const;

const BOOK_CONTEXT_RE = new RegExp(
  `\\b(?:${BOOK_CONTEXT_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i'
);

const CONTEXT_WINDOW = 120;

export function hasBookContext(text: string, matchIndex: number, matchLength: number): boolean {
  const start = Math.max(0, matchIndex - CONTEXT_WINDOW);
  const end = Math.min(text.length, matchIndex + matchLength + CONTEXT_WINDOW);
  return BOOK_CONTEXT_RE.test(text.slice(start, end));
}

function splitIsbnBuckets(rawList: string[]): { isbn10: string[]; isbn13: string[] } {
  const isbn10: string[] = [];
  const isbn13: string[] = [];
  const seen10 = new Set<string>();
  const seen13 = new Set<string>();

  for (const raw of rawList) {
    const n = normalizeIsbn(raw);
    if (n.length === 10 && isValidIsbn10(n) && !seen10.has(n)) {
      seen10.add(n);
      isbn10.push(n);
      const as13 = toIsbn13(n);
      if (as13 && !seen13.has(as13)) {
        seen13.add(as13);
        isbn13.push(as13);
      }
    } else if (n.length === 13 && isValidIsbn13(n) && !seen13.has(n)) {
      seen13.add(n);
      isbn13.push(n);
    }
  }

  return { isbn10, isbn13 };
}

function collectMetaText(doc: Document): string {
  const parts: string[] = [];

  for (const meta of doc.querySelectorAll('meta')) {
    const name = (meta.getAttribute('name') || meta.getAttribute('property') || '').toLowerCase();
    const content = meta.getAttribute('content') || '';
    if (!content) continue;
    if (
      name.includes('isbn') ||
      name.includes('book') ||
      name === 'description' ||
      name === 'og:description' ||
      name === 'og:title' ||
      name === 'twitter:title' ||
      name === 'keywords'
    ) {
      parts.push(`${name} ${content}`);
    }
  }

  for (const el of doc.querySelectorAll('[itemprop="isbn"], [data-isbn], [data-asin]')) {
    const val =
      el.getAttribute('content') ||
      el.getAttribute('data-isbn') ||
      el.getAttribute('data-asin') ||
      el.textContent ||
      '';
    if (val.trim()) parts.push(`isbn ${val}`);
  }

  return parts.join('\n');
}

/**
 * Extract validated ISBNs from document text and metadata.
 * When `requireContext` is true (default), only keep ISBNs near book-context terms.
 */
export function extractIsbnsFromDocument(
  doc: Document,
  options: { requireContext?: boolean } = {}
): { isbn10: string[]; isbn13: string[] } {
  const requireContext = options.requireContext !== false;
  const bodyText = doc.body?.innerText || doc.body?.textContent || '';
  const metaText = collectMetaText(doc);
  const combined = `${metaText}\n${bodyText}`;

  if (!requireContext) {
    return splitIsbnBuckets(extractIsbnCandidates(combined));
  }

  // Walk candidate matches with context windows. Prefer labeled "ISBN" occurrences first.
  const labeled: string[] = [];
  const labeledRe =
    /ISBN(?:-1[03])?:?\s*([0-9][0-9\- ]{8,16}[0-9Xx])/gi;
  for (const m of combined.matchAll(labeledRe)) {
    const n = normalizeIsbn(m[1]);
    if (isValidIsbn10(n) || isValidIsbn13(n)) labeled.push(n);
  }

  const loose = extractIsbnCandidates(combined);
  const contextual: string[] = [...labeled];

  for (const candidate of loose) {
    const n = normalizeIsbn(candidate);
    // Find an occurrence in combined text for context check
    const plain = candidate.replace(/[-\s]/g, '');
    const idx = combined.toUpperCase().indexOf(plain.toUpperCase());
    if (idx === -1) {
      // Hyphenated form may differ; accept if already labeled
      continue;
    }
    if (hasBookContext(combined, idx, plain.length)) {
      contextual.push(n);
    }
  }

  return splitIsbnBuckets(contextual);
}

/** Build low-to-mid confidence ISBN-only candidates (title may be empty until merged). */
export function candidatesFromIsbns(
  isbn10: string[],
  isbn13: string[],
  sourcePageUrl: string,
  baseConfidence = 0.78
): DetectionCandidate[] {
  if (isbn10.length === 0 && isbn13.length === 0) return [];

  const primary = isbn13[0] || isbn10[0] || '';
  return [
    {
      medium: 'book',
      title: '',
      isbn10: isbn10.length ? isbn10 : undefined,
      isbn13: isbn13.length ? isbn13 : undefined,
      sourcePageUrl,
      confidence: baseConfidence,
      evidence: [
        {
          type: 'isbn',
          value: primary,
          weight: 0.75,
        },
      ],
    },
  ];
}
