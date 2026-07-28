/**
 * Offline detection accuracy harness — pure DOM analysis for books + screen.
 * Used by Vitest fixtures and optional CLI reporting.
 *
 * Does not mutate the host page (no data-subsume-id tagging).
 */

import type { DetectionCandidate } from '@/shared/catalogTypes';
import { detectBookCandidates } from './bookDetection';
import {
  detectScreenPageCandidates,
  type ScreenDetectionCandidate,
} from './screenDetection';

export type ExpectedMedium = 'book' | 'movie' | 'tv' | 'documentary';

export type ClassifiedMedium = ExpectedMedium | 'none';

export type SignalType =
  | 'json_ld'
  | 'isbn'
  | 'domain_adapter'
  | 'heuristic'
  | 'open_graph'
  | 'url_pattern'
  | 'title_author_text'
  | 'page_title'
  | 'microdata'
  | 'image_context'
  | 'unknown';

export interface FixtureManifestEntry {
  id: string;
  url: string;
  expectedMedium: ExpectedMedium;
  /** Substring expected in detected title when detection fires */
  expectedTitleIncludes?: string;
  htmlFile: string;
  notes?: string;
}

export interface DetectionHarnessResult {
  id: string;
  url: string;
  expectedMedium: ExpectedMedium;
  detected: boolean;
  classifiedAs: ClassifiedMedium;
  mediumCorrect: boolean;
  confidence: number;
  title?: string;
  signalsFired: SignalType[];
  primarySignal: SignalType;
  bookCandidateCount: number;
  screenCandidateCount: number;
  notes?: string;
}

function mapEvidenceType(t: string): SignalType {
  switch (t) {
    case 'json_ld':
      return 'json_ld';
    case 'isbn':
      return 'isbn';
    case 'domain_adapter':
      return 'domain_adapter';
    case 'title_author_text':
      return 'heuristic';
    case 'open_graph':
      return 'open_graph';
    case 'url_pattern':
      return 'url_pattern';
    case 'page_title':
      return 'page_title';
    case 'microdata':
      return 'microdata';
    case 'image_context':
      return 'image_context';
    default:
      return 'unknown';
  }
}

function signalsFromCandidates(
  candidates: Array<DetectionCandidate | ScreenDetectionCandidate>
): SignalType[] {
  const set = new Set<SignalType>();
  for (const c of candidates) {
    for (const e of c.evidence) {
      set.add(mapEvidenceType(e.type));
    }
    if ('screenKind' in c && c.screenKind === 'documentary') {
      // documentary is a classification outcome; signal still JSON-LD/adapter/etc.
    }
  }
  return [...set];
}

function primarySignal(signals: SignalType[]): SignalType {
  const order: SignalType[] = [
    'json_ld',
    'domain_adapter',
    'isbn',
    'open_graph',
    'url_pattern',
    'page_title',
    'heuristic',
    'microdata',
    'image_context',
    'unknown',
  ];
  for (const s of order) {
    if (signals.includes(s)) return s;
  }
  return 'unknown';
}

function classifyTop(
  books: DetectionCandidate[],
  screens: ScreenDetectionCandidate[]
): {
  detected: boolean;
  classifiedAs: ClassifiedMedium;
  confidence: number;
  title?: string;
  candidates: Array<DetectionCandidate | ScreenDetectionCandidate>;
} {
  const topBook = books[0];
  const topScreen = screens[0];

  if (!topBook && !topScreen) {
    return { detected: false, classifiedAs: 'none', confidence: 0, candidates: [] };
  }

  if (topBook && (!topScreen || topBook.confidence >= topScreen.confidence)) {
    return {
      detected: true,
      classifiedAs: 'book',
      confidence: topBook.confidence,
      title: topBook.title,
      candidates: books,
    };
  }

  const kind = topScreen!.screenKind;
  const classifiedAs: ClassifiedMedium =
    kind === 'documentary' ? 'documentary' : kind === 'tv' ? 'tv' : 'movie';

  return {
    detected: true,
    classifiedAs,
    confidence: topScreen!.confidence,
    title: topScreen!.title,
    candidates: screens,
  };
}

/**
 * Run book + screen page detection on a Document for a given page URL.
 * @param mode `baseline` = books only (pre-screenDetection pipeline)
 *             `full` = books + JSON-LD screen + domain adapters
 */
export function analyzePageDetection(
  doc: Document,
  pageUrl: string,
  mode: 'baseline' | 'full' = 'full'
): {
  books: DetectionCandidate[];
  screens: ScreenDetectionCandidate[];
  result: Omit<DetectionHarnessResult, 'id' | 'expectedMedium' | 'mediumCorrect' | 'notes'>;
} {
  const url = new URL(pageUrl);
  const books = detectBookCandidates(doc, url);
  const screens = mode === 'full' ? detectScreenPageCandidates(doc, url) : [];
  const top = classifyTop(books, screens);
  const signalsFired = signalsFromCandidates(top.candidates);

  return {
    books,
    screens,
    result: {
      url: pageUrl,
      detected: top.detected,
      classifiedAs: top.classifiedAs,
      confidence: top.confidence,
      title: top.title,
      signalsFired,
      primarySignal: top.detected ? primarySignal(signalsFired) : 'unknown',
      bookCandidateCount: books.length,
      screenCandidateCount: screens.length,
    },
  };
}

export function evaluateFixture(
  entry: FixtureManifestEntry,
  doc: Document,
  mode: 'baseline' | 'full' = 'full'
): DetectionHarnessResult {
  const { result } = analyzePageDetection(doc, entry.url, mode);
  const mediumCorrect =
    result.detected && result.classifiedAs === entry.expectedMedium;
  const titleOk =
    !entry.expectedTitleIncludes ||
    !result.detected ||
    !entry.expectedTitleIncludes ||
    (result.title
      ? result.title.toLowerCase().includes(entry.expectedTitleIncludes.toLowerCase())
      : false);
  // Title mismatch on a detection counts as incorrect medium path for harness
  const ok = mediumCorrect && (titleOk || !entry.expectedTitleIncludes);

  return {
    id: entry.id,
    expectedMedium: entry.expectedMedium,
    mediumCorrect: ok,
    notes: entry.notes,
    ...result,
  };
}

export interface HarnessReport {
  total: number;
  detected: number;
  correctMedium: number;
  falseNegatives: number;
  wrongMedium: number;
  byExpectedMedium: Record<
    ExpectedMedium,
    { total: number; detected: number; correct: number; wrongMedium: number }
  >;
  byPrimarySignal: Record<string, { hits: number; correct: number }>;
  falseNegativeIds: string[];
  wrongMediumIds: string[];
  zeroSignalDomains: string[];
  results: DetectionHarnessResult[];
}

export function summarizeHarness(results: DetectionHarnessResult[]): HarnessReport {
  const byExpectedMedium: HarnessReport['byExpectedMedium'] = {
    book: { total: 0, detected: 0, correct: 0, wrongMedium: 0 },
    movie: { total: 0, detected: 0, correct: 0, wrongMedium: 0 },
    tv: { total: 0, detected: 0, correct: 0, wrongMedium: 0 },
    documentary: { total: 0, detected: 0, correct: 0, wrongMedium: 0 },
  };
  const byPrimarySignal: HarnessReport['byPrimarySignal'] = {};
  const falseNegativeIds: string[] = [];
  const wrongMediumIds: string[] = [];
  const hostHits = new Map<string, { any: boolean }>();

  for (const r of results) {
    const bucket = byExpectedMedium[r.expectedMedium];
    bucket.total += 1;
    if (r.detected) bucket.detected += 1;
    if (r.mediumCorrect) bucket.correct += 1;
    if (r.detected && !r.mediumCorrect) {
      bucket.wrongMedium += 1;
      wrongMediumIds.push(r.id);
    }
    if (!r.detected) falseNegativeIds.push(r.id);

    if (r.detected) {
      const s = r.primarySignal;
      if (!byPrimarySignal[s]) byPrimarySignal[s] = { hits: 0, correct: 0 };
      byPrimarySignal[s].hits += 1;
      if (r.mediumCorrect) byPrimarySignal[s].correct += 1;
    }

    try {
      const host = new URL(r.url).hostname.replace(/^www\./, '');
      const h = hostHits.get(host) || { any: false };
      if (r.detected) h.any = true;
      hostHits.set(host, h);
    } catch {
      /* ignore */
    }
  }

  const zeroSignalDomains = [...hostHits.entries()]
    .filter(([, v]) => !v.any)
    .map(([host]) => host)
    .sort();

  return {
    total: results.length,
    detected: results.filter((r) => r.detected).length,
    correctMedium: results.filter((r) => r.mediumCorrect).length,
    falseNegatives: falseNegativeIds.length,
    wrongMedium: wrongMediumIds.length,
    byExpectedMedium,
    byPrimarySignal,
    falseNegativeIds,
    wrongMediumIds,
    zeroSignalDomains,
    results,
  };
}
