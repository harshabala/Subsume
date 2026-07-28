/**
 * Fixture-based detection harness for books / movies / series / documentaries.
 * HTML fixtures under tests/fixtures/detection/ — no live network required.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateFixture,
  summarizeHarness,
  type FixtureManifestEntry,
  type DetectionHarnessResult,
} from '@/content/detectionHarness';

const FIXTURE_ROOT = join(process.cwd(), 'tests/fixtures/detection');

function loadManifest(): { fixtures: FixtureManifestEntry[] } {
  const raw = readFileSync(join(FIXTURE_ROOT, 'manifest.json'), 'utf8');
  return JSON.parse(raw) as { fixtures: FixtureManifestEntry[] };
}

function loadHtml(htmlFile: string): void {
  const html = readFileSync(join(FIXTURE_ROOT, 'html', htmlFile), 'utf8');
  document.open();
  document.write(html);
  document.close();
}

function runAll(mode: 'baseline' | 'full'): DetectionHarnessResult[] {
  const { fixtures } = loadManifest();
  return fixtures.map((entry) => {
    loadHtml(entry.htmlFile);
    return evaluateFixture(entry, document, mode);
  });
}

describe('detection harness fixtures', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('manifest has ~30 fixtures spanning four media buckets', () => {
    const { fixtures } = loadManifest();
    expect(fixtures.length).toBeGreaterThanOrEqual(28);
    expect(fixtures.length).toBeLessThanOrEqual(36);
    const counts = { book: 0, movie: 0, tv: 0, documentary: 0 };
    for (const f of fixtures) counts[f.expectedMedium] += 1;
    expect(counts.book).toBeGreaterThanOrEqual(8);
    expect(counts.movie).toBeGreaterThanOrEqual(8);
    expect(counts.tv).toBeGreaterThanOrEqual(8);
    expect(counts.documentary).toBeGreaterThanOrEqual(6);
  });

  it('baseline (books-only) has high false-negative rate on screen fixtures', () => {
    const results = runAll('baseline');
    const report = summarizeHarness(results);
    // Screen media cannot be page-classified without screenDetection
    expect(report.byExpectedMedium.movie.correct).toBe(0);
    expect(report.byExpectedMedium.tv.correct).toBe(0);
    expect(report.byExpectedMedium.documentary.correct).toBe(0);
    // Books still work via existing pipeline
    expect(report.byExpectedMedium.book.detected).toBeGreaterThanOrEqual(5);
  });

  it('full pipeline improves screen + documentary classification without collapsing books', () => {
    const baseline = summarizeHarness(runAll('baseline'));
    const full = summarizeHarness(runAll('full'));

    expect(full.correctMedium).toBeGreaterThan(baseline.correctMedium);
    expect(full.byExpectedMedium.movie.correct).toBeGreaterThanOrEqual(5);
    expect(full.byExpectedMedium.tv.correct).toBeGreaterThanOrEqual(5);
    expect(full.byExpectedMedium.documentary.correct).toBeGreaterThanOrEqual(4);
    // Books stay precision-first
    expect(full.byExpectedMedium.book.correct).toBeGreaterThanOrEqual(
      baseline.byExpectedMedium.book.correct
    );
    // Blog weak mentions should not become high-confidence book spam
    const blog = full.results.find((r) => r.id === 'book-blog-review');
    expect(blog?.mediumCorrect).toBe(false);
  });

  it('JSON-LD Movie with Documentary genre classifies as documentary (not bare movie)', () => {
    loadHtml('doc-imdb-free-solo.html');
    const r = evaluateFixture(
      {
        id: 'doc-imdb-free-solo',
        url: 'https://www.imdb.com/title/tt7775622/',
        expectedMedium: 'documentary',
        expectedTitleIncludes: 'Free Solo',
        htmlFile: 'doc-imdb-free-solo.html',
      },
      document,
      'full'
    );
    expect(r.detected).toBe(true);
    expect(r.classifiedAs).toBe('documentary');
    expect(r.primarySignal).toMatch(/json_ld|domain_adapter/);
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('IMDb title page without JSON-LD still detects via domain adapter', () => {
    loadHtml('movie-imdb-no-jsonld.html');
    const r = evaluateFixture(
      {
        id: 'movie-imdb-no-jsonld',
        url: 'https://www.imdb.com/title/tt13238346/',
        expectedMedium: 'movie',
        expectedTitleIncludes: 'Past Lives',
        htmlFile: 'movie-imdb-no-jsonld.html',
      },
      document,
      'full'
    );
    expect(r.detected).toBe(true);
    expect(r.classifiedAs).toBe('movie');
    expect(r.signalsFired).toContain('domain_adapter');
  });

  it('TVSeries JSON-LD classifies as tv not movie', () => {
    loadHtml('series-imdb-succession.html');
    const r = evaluateFixture(
      {
        id: 'series-imdb-succession',
        url: 'https://www.imdb.com/title/tt7660850/',
        expectedMedium: 'tv',
        expectedTitleIncludes: 'Succession',
        htmlFile: 'series-imdb-succession.html',
      },
      document,
      'full'
    );
    expect(r.detected).toBe(true);
    expect(r.classifiedAs).toBe('tv');
  });

  // --- Top-3 fix regressions (JSON-LD screen, domain adapters, documentary kind) ---

  it('IMDb documentary without genre field upgrades via subnav (not bare movie)', () => {
    loadHtml('doc-imdb-no-genre-field.html');
    const r = evaluateFixture(
      {
        id: 'doc-imdb-neighbor',
        url: 'https://www.imdb.com/title/tt7681902/',
        expectedMedium: 'documentary',
        expectedTitleIncludes: 'Neighbor',
        htmlFile: 'doc-imdb-no-genre-field.html',
      },
      document,
      'full'
    );
    expect(r.detected).toBe(true);
    expect(r.classifiedAs).toBe('documentary');
    expect(r.signalsFired).toContain('domain_adapter');
  });

  it('Prime Video amazon path detects movie via domain adapter', () => {
    loadHtml('movie-streaming-prime.html');
    const r = evaluateFixture(
      {
        id: 'movie-streaming-prime',
        url: 'https://www.amazon.com/gp/video/detail/B098XYZ',
        expectedMedium: 'movie',
        expectedTitleIncludes: 'Green Knight',
        htmlFile: 'movie-streaming-prime.html',
      },
      document,
      'full'
    );
    expect(r.detected).toBe(true);
    expect(r.classifiedAs).toBe('movie');
    expect(r.signalsFired).toContain('domain_adapter');
  });

  it('Wikipedia documentary film page is not classified as bare movie', () => {
    loadHtml('doc-wikipedia-13th.html');
    const r = evaluateFixture(
      {
        id: 'doc-wikipedia-13th',
        url: 'https://en.wikipedia.org/wiki/13th_(film)',
        expectedMedium: 'documentary',
        expectedTitleIncludes: '13th',
        htmlFile: 'doc-wikipedia-13th.html',
      },
      document,
      'full'
    );
    expect(r.detected).toBe(true);
    expect(r.classifiedAs).toBe('documentary');
  });

  it('Netflix series page classifies as tv', () => {
    loadHtml('series-netflix.html');
    const r = evaluateFixture(
      {
        id: 'series-netflix',
        url: 'https://www.netflix.com/title/80057281',
        expectedMedium: 'tv',
        expectedTitleIncludes: 'Stranger Things',
        htmlFile: 'series-netflix.html',
      },
      document,
      'full'
    );
    expect(r.detected).toBe(true);
    expect(r.classifiedAs).toBe('tv');
  });

  it('full harness holds ≥90% correct with zero wrong mediums', () => {
    const full = summarizeHarness(runAll('full'));
    expect(full.correctMedium).toBeGreaterThanOrEqual(27);
    expect(full.wrongMedium).toBe(0);
    expect(full.falseNegativeIds).toEqual(
      expect.arrayContaining([
        'book-blog-review',
        'movie-blog-mention',
        'series-letterboxd-list',
      ])
    );
    // Intentional FNs only — no unexpected misses
    expect(full.falseNegatives).toBe(3);
  });
});
