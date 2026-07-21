/**
 * Book detection pipeline (Stages A–D).
 * Precision over recall. Never sends full HTML — callers only receive
 * minimal DetectionCandidate fields.
 *
 * Confidence floors (see docs §6.4):
 *   >= 0.85  high-confidence plaque
 *   0.65–0.84  subtle candidate
 *   < 0.65  filtered (not returned)
 */

import type { DetectionCandidate } from '@/shared/catalogTypes';
import { normalizeIsbn, toIsbn13 } from '@/shared/isbn';
import { detectJsonLdBooks } from './jsonLdBooks';
import {
  candidatesFromIsbns,
  extractIsbnsFromDocument,
} from './isbnContext';
import { detectViaDomainAdapters } from './domainAdapters';
import { detectTitleAuthorHeuristics } from './titleAuthorHeuristics';

export { detectJsonLdBooks } from './jsonLdBooks';
export { extractIsbnsFromDocument, candidatesFromIsbns } from './isbnContext';
export { detectViaDomainAdapters, BOOK_DOMAIN_ADAPTERS } from './domainAdapters';
export type { BookDomainAdapter } from './domainAdapters';
export { detectTitleAuthorHeuristics } from './titleAuthorHeuristics';

/** Annotation floor — candidates below this are dropped. */
export const MIN_ANNOTATION_CONFIDENCE = 0.65;
export const HIGH_CONFIDENCE = 0.85;

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function authorKey(authors?: string[]): string {
  return (authors || [])
    .map((a) => a.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim())
    .filter(Boolean)
    .sort()
    .join('|');
}

function primaryIsbn(c: DetectionCandidate): string | undefined {
  if (c.isbn13?.length) return normalizeIsbn(c.isbn13[0]);
  if (c.isbn10?.length) {
    const as13 = toIsbn13(c.isbn10[0]);
    return as13 || normalizeIsbn(c.isbn10[0]);
  }
  return undefined;
}

function mergeCandidates(a: DetectionCandidate, b: DetectionCandidate): DetectionCandidate {
  const isbn10 = [...new Set([...(a.isbn10 || []), ...(b.isbn10 || [])])];
  const isbn13 = [...new Set([...(a.isbn13 || []), ...(b.isbn13 || [])])];
  const authors = [...new Set([...(a.authorOrCreator || []), ...(b.authorOrCreator || [])])];
  const evidence = [...a.evidence, ...b.evidence];

  // Evidence stack boost (capped)
  const evidenceBoost = Math.min(0.08, evidence.length * 0.01);
  const confidence = Math.min(0.98, Math.max(a.confidence, b.confidence) + evidenceBoost);

  const title =
    a.title && b.title
      ? a.title.length >= b.title.length
        ? a.title
        : b.title
      : a.title || b.title;

  return {
    medium: 'book',
    title,
    authorOrCreator: authors.length ? authors : undefined,
    year: a.year ?? b.year,
    isbn10: isbn10.length ? isbn10 : undefined,
    isbn13: isbn13.length ? isbn13 : undefined,
    imageUrl: a.imageUrl || b.imageUrl,
    sourcePageUrl: a.sourcePageUrl || b.sourcePageUrl,
    confidence,
    evidence,
    providerHint: a.providerHint || b.providerHint,
  };
}

function dedupeCandidates(raw: DetectionCandidate[]): DetectionCandidate[] {
  const byIsbn = new Map<string, DetectionCandidate>();
  const byTitleAuthor = new Map<string, DetectionCandidate>();
  const noKey: DetectionCandidate[] = [];

  for (const c of raw) {
    const isbn = primaryIsbn(c);
    if (isbn) {
      const existing = byIsbn.get(isbn);
      byIsbn.set(isbn, existing ? mergeCandidates(existing, c) : c);
      continue;
    }

    const t = normalizeTitleKey(c.title || '');
    if (t) {
      const key = `${t}::${authorKey(c.authorOrCreator)}`;
      // Also try title-only merge when one side lacks author
      const titleOnlyKey = `${t}::`;
      const existing =
        byTitleAuthor.get(key) ||
        (c.authorOrCreator?.length ? byTitleAuthor.get(titleOnlyKey) : undefined);

      if (existing) {
        const merged = mergeCandidates(existing, c);
        byTitleAuthor.delete(titleOnlyKey);
        byTitleAuthor.set(
          `${normalizeTitleKey(merged.title)}::${authorKey(merged.authorOrCreator)}`,
          merged
        );
      } else {
        byTitleAuthor.set(key, c);
      }
      continue;
    }

    noKey.push(c);
  }

  // Merge title-author entries that share an ISBN with byIsbn already handled;
  // fold title matches onto ISBN entries when titles align
  const isbnList = [...byIsbn.values()];
  const titleList: DetectionCandidate[] = [];

  for (const c of byTitleAuthor.values()) {
    const t = normalizeTitleKey(c.title);
    const match = isbnList.find((i) => normalizeTitleKey(i.title) === t && t.length > 0);
    if (match) {
      const merged = mergeCandidates(match, c);
      const isbn = primaryIsbn(merged)!;
      byIsbn.set(isbn, merged);
    } else {
      titleList.push(c);
    }
  }

  return [...byIsbn.values(), ...titleList, ...noKey];
}

/**
 * Run book detection stages A–D on a document.
 * Returns deduped candidates sorted by confidence (desc), with confidence ≥ 0.65.
 */
export function detectBookCandidates(doc: Document, url: URL): DetectionCandidate[] {
  const sourcePageUrl = url.href;
  const stageResults: DetectionCandidate[] = [];

  // Stage A — JSON-LD Book / Audiobook
  stageResults.push(...detectJsonLdBooks(doc, sourcePageUrl));

  // Stage C — Domain adapters (before bare ISBN so adapters can skip context)
  const adapterResults = detectViaDomainAdapters(doc, url);
  stageResults.push(...adapterResults);
  const adapterMatched = adapterResults.length > 0;

  // Stage B — ISBN extraction (context required unless adapter already identified page)
  const { isbn10, isbn13 } = extractIsbnsFromDocument(doc, {
    requireContext: !adapterMatched,
  });
  // Only emit ISBN-only candidates when we have identifiers not already covered
  const existingIsbns = new Set(
    stageResults.flatMap((c) => [
      ...(c.isbn13 || []).map(normalizeIsbn),
      ...(c.isbn10 || []).map((x) => toIsbn13(x) || normalizeIsbn(x)),
    ])
  );
  const new10 = isbn10.filter((x) => !existingIsbns.has(normalizeIsbn(x)) && !existingIsbns.has(toIsbn13(x) || ''));
  const new13 = isbn13.filter((x) => !existingIsbns.has(normalizeIsbn(x)));
  if (new10.length || new13.length) {
    // ISBN without title: useful for resolver, confidence mid-high with context
    stageResults.push(
      ...candidatesFromIsbns(new10, new13, sourcePageUrl, adapterMatched ? 0.88 : 0.8)
    );
  }

  // Stage D — Title + author heuristics
  stageResults.push(...detectTitleAuthorHeuristics(doc, sourcePageUrl));

  // Strengthen ISBN-only rows with page title when domain looks bookish
  for (const c of stageResults) {
    if (!c.title && (c.isbn13?.length || c.isbn10?.length)) {
      const og = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
      const h1 = doc.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim();
      const t = (og || h1 || '').trim();
      if (t && t.length >= 3 && t.length <= 120) {
        c.title = t.replace(/\s*[|\-–—].*$/, '').trim();
        c.confidence = Math.min(0.9, c.confidence + 0.05);
      }
    }
  }

  const deduped = dedupeCandidates(stageResults);

  return deduped
    .filter((c) => c.confidence >= MIN_ANNOTATION_CONFIDENCE && (c.title || primaryIsbn(c)))
    .sort((a, b) => b.confidence - a.confidence);
}
