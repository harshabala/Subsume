/**
 * Screen (movie / TV / documentary) page-level detection.
 * Complements bookDetection and poster/grid scanners.
 */

import {
  detectJsonLdScreenWorks,
  type ScreenDetectionCandidate,
} from './jsonLdScreen';
import { detectViaScreenDomainAdapters } from './domainAdapters';

export type { ScreenDetectionCandidate, ScreenKind } from './jsonLdScreen';
export { detectJsonLdScreenWorks } from './jsonLdScreen';
export {
  detectViaScreenDomainAdapters,
  SCREEN_DOMAIN_ADAPTERS,
} from './domainAdapters';

/** Minimum confidence to report a screen page candidate (parity with book annotation floor). */
export const MIN_SCREEN_PAGE_CONFIDENCE = 0.65;

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function mergeScreen(
  a: ScreenDetectionCandidate,
  b: ScreenDetectionCandidate
): ScreenDetectionCandidate {
  // Prefer documentary / tv over plain movie when evidence conflicts
  const kindRank = { documentary: 3, tv: 2, movie: 1 } as const;
  const screenKind =
    kindRank[a.screenKind] >= kindRank[b.screenKind] ? a.screenKind : b.screenKind;
  const confidence = Math.min(0.98, Math.max(a.confidence, b.confidence) + 0.02);
  return {
    medium: screenKind === 'tv' ? 'tv' : 'movie',
    screenKind,
    title: a.title.length >= b.title.length ? a.title : b.title,
    year: a.year ?? b.year,
    imageUrl: a.imageUrl || b.imageUrl,
    sourcePageUrl: a.sourcePageUrl || b.sourcePageUrl,
    confidence,
    evidence: [...a.evidence, ...b.evidence],
    providerHint: a.providerHint || b.providerHint,
  };
}

function dedupe(raw: ScreenDetectionCandidate[]): ScreenDetectionCandidate[] {
  const byTitle = new Map<string, ScreenDetectionCandidate>();
  for (const c of raw) {
    const key = normalizeTitleKey(c.title);
    if (!key) continue;
    const existing = byTitle.get(key);
    byTitle.set(key, existing ? mergeScreen(existing, c) : c);
  }
  return [...byTitle.values()].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect movie / TV / documentary title pages via JSON-LD + domain adapters.
 */
export function detectScreenPageCandidates(
  doc: Document,
  url: URL
): ScreenDetectionCandidate[] {
  const sourcePageUrl = url.href;
  const stage: ScreenDetectionCandidate[] = [];

  stage.push(...detectJsonLdScreenWorks(doc, sourcePageUrl));
  stage.push(...detectViaScreenDomainAdapters(doc, url));

  return dedupe(stage).filter((c) => c.confidence >= MIN_SCREEN_PAGE_CONFIDENCE && c.title);
}
