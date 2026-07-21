/**
 * Stage D — Title + author heuristics for arbitrary pages (reviews, essays, lists).
 * A title alone is insufficient for annotation (confidence < 0.65 filtered later).
 */

import type { DetectionCandidate } from '@/shared/catalogTypes';

/** "Title by Author" — common in reviews and blurbs. */
const TITLE_BY_AUTHOR_RE =
  /[“"«]?([A-Z0-9][^"“”»\n]{2,80}?)[”"»]?\s+by\s+([A-Z][a-zA-Z.''\-]+(?:\s+[A-Z][a-zA-Z.''\-]+){0,4})/g;

/** Review-page headline patterns */
const REVIEW_TITLE_RE =
  /(?:review(?:s)? of|reading|book review)\s*[:\-–—]?\s*[“"«]?([^"“”»\n]{3,80})[”"»]?/gi;

const MIN_TITLE_LEN = 3;
const MAX_TITLE_LEN = 120;
const MAX_CANDIDATES = 12;

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/^[\s:–—\-]+|[\s:–—\-]+$/g, '')
    .replace(/[“”«»"']/g, '')
    .trim();
}

function cleanAuthor(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/[,.;:]+$/, '')
    .replace(/\s+\(.*\)$/, '')
    .trim();
}

function isPlausibleTitle(title: string): boolean {
  if (title.length < MIN_TITLE_LEN || title.length > MAX_TITLE_LEN) return false;
  // Reject pure URLs / emails
  if (/^https?:\/\//i.test(title) || /@/.test(title)) return false;
  // Need at least one letter
  if (!/[A-Za-z]/.test(title)) return false;
  // Reject very generic phrases
  if (/^(click here|read more|home|about|contact)$/i.test(title)) return false;
  return true;
}

function isPlausibleAuthor(author: string): boolean {
  if (author.length < 2 || author.length > 60) return false;
  if (!/^[A-Za-z]/.test(author)) return false;
  // Avoid sentence fragments
  if (/\b(the|and|with|from|that|this|which|when|where)\b/i.test(author) && author.split(/\s+/).length > 4) {
    return false;
  }
  return true;
}

function pushUnique(
  list: DetectionCandidate[],
  seen: Set<string>,
  candidate: DetectionCandidate
): void {
  const key = `${candidate.title.toLowerCase()}|${(candidate.authorOrCreator || []).join(',').toLowerCase()}`;
  if (seen.has(key)) return;
  seen.add(key);
  list.push(candidate);
}

/**
 * Detect title+author style book mentions in document text and headings.
 * Emits medium confidence when both title and author are present; weak
 * title-only signals stay below the 0.65 annotation floor.
 */
export function detectTitleAuthorHeuristics(
  doc: Document,
  sourcePageUrl: string
): DetectionCandidate[] {
  const candidates: DetectionCandidate[] = [];
  const seen = new Set<string>();

  const isReviewPage =
    /review/i.test(doc.title || '') ||
    /review/i.test(sourcePageUrl) ||
    Boolean(doc.querySelector('[itemtype*="Review"], meta[property="og:type"][content*="article"]'));

  // Headings: "Title by Author"
  for (const heading of doc.querySelectorAll('h1, h2, h3')) {
    const text = (heading.textContent || '').replace(/\s+/g, ' ').trim();
    TITLE_BY_AUTHOR_RE.lastIndex = 0;
    const m = TITLE_BY_AUTHOR_RE.exec(text);
    if (!m) continue;
    const title = cleanTitle(m[1]);
    const author = cleanAuthor(m[2]);
    if (!isPlausibleTitle(title) || !isPlausibleAuthor(author)) continue;

    pushUnique(candidates, seen, {
      medium: 'book',
      title,
      authorOrCreator: [author],
      sourcePageUrl,
      confidence: isReviewPage ? 0.78 : 0.72,
      evidence: [
        { type: 'title_author_text', value: `${title} by ${author}`, weight: 0.7 },
      ],
    });
  }

  // Body text — sample limited text for performance
  const bodyText = (doc.body?.innerText || doc.body?.textContent || '').slice(0, 40_000);

  TITLE_BY_AUTHOR_RE.lastIndex = 0;
  for (const m of bodyText.matchAll(TITLE_BY_AUTHOR_RE)) {
    if (candidates.length >= MAX_CANDIDATES) break;
    const title = cleanTitle(m[1]);
    const author = cleanAuthor(m[2]);
    if (!isPlausibleTitle(title) || !isPlausibleAuthor(author)) continue;

    // Prefer quoted titles as slightly stronger
    const quoted = /[“"«]/.test(m[0]);
    pushUnique(candidates, seen, {
      medium: 'book',
      title,
      authorOrCreator: [author],
      sourcePageUrl,
      confidence: quoted ? 0.74 : 0.7,
      evidence: [
        { type: 'title_author_text', value: `${title} by ${author}`, weight: quoted ? 0.72 : 0.65 },
      ],
    });
  }

  // Review phrasing without explicit "by"
  if (isReviewPage && candidates.length < MAX_CANDIDATES) {
    REVIEW_TITLE_RE.lastIndex = 0;
    for (const m of bodyText.matchAll(REVIEW_TITLE_RE)) {
      if (candidates.length >= MAX_CANDIDATES) break;
      const title = cleanTitle(m[1]);
      if (!isPlausibleTitle(title)) continue;

      // Single clear subject on a review page — still needs author for strong confidence
      const nearby = bodyText.slice(
        Math.max(0, (m.index ?? 0) - 80),
        Math.min(bodyText.length, (m.index ?? 0) + m[0].length + 160)
      );
      const byMatch = nearby.match(
        /\bby\s+([A-Z][a-zA-Z.''\-]+(?:\s+[A-Z][a-zA-Z.''\-]+){0,3})/
      );
      const author = byMatch ? cleanAuthor(byMatch[1]) : undefined;

      if (author && isPlausibleAuthor(author)) {
        pushUnique(candidates, seen, {
          medium: 'book',
          title,
          authorOrCreator: [author],
          sourcePageUrl,
          confidence: 0.76,
          evidence: [
            { type: 'title_author_text', value: `review: ${title}`, weight: 0.7 },
          ],
        });
      } else {
        // Title-only on review page — below annotation threshold unless other stages merge
        pushUnique(candidates, seen, {
          medium: 'book',
          title,
          sourcePageUrl,
          confidence: 0.55,
          evidence: [
            { type: 'title_author_text', value: title, weight: 0.4 },
          ],
        });
      }
    }
  }

  // Bare title-only weak mentions in generic pages are intentionally not emitted
  // (precision over recall). Title-only review hits stay at 0.55 and get filtered
  // by the pipeline floor unless strengthened by ISBN/JSON-LD merge.

  return candidates.slice(0, MAX_CANDIDATES);
}
