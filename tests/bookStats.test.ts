import { describe, it, expect } from 'vitest';
import {
  computeBookReadingStats,
  hasBookReadingActivity,
  resolveBookPageTotal,
  type BookStatsItem,
} from '@/shared/bookStats';

function book(partial: Partial<BookStatsItem> & Pick<BookStatsItem, 'status'>): BookStatsItem {
  return {
    type: 'book',
    ...partial,
  };
}

describe('resolveBookPageTotal', () => {
  it('prefers progress.total when unit is page', () => {
    expect(
      resolveBookPageTotal(
        book({
          status: 'watched',
          pageCount: 300,
          progress: { unit: 'page', value: 120, total: 280 },
        }),
      ),
    ).toBe(280);
  });

  it('falls back to pageCount when progress has no page total', () => {
    expect(
      resolveBookPageTotal(
        book({
          status: 'watching',
          pageCount: 412,
          progress: { unit: 'percent', value: 40 },
        }),
      ),
    ).toBe(412);
    expect(
      resolveBookPageTotal(
        book({ status: 'watched', pageCount: 180 }),
      ),
    ).toBe(180);
  });

  it('returns undefined when no page data is present', () => {
    expect(resolveBookPageTotal(book({ status: 'watched' }))).toBeUndefined();
    expect(
      resolveBookPageTotal(
        book({ status: 'watching', progress: { unit: 'chapter', value: 3, total: 12 } }),
      ),
    ).toBeUndefined();
    expect(
      resolveBookPageTotal(
        book({ status: 'watched', pageCount: 0, progress: { unit: 'page', value: 10, total: 0 } }),
      ),
    ).toBeUndefined();
  });
});

describe('computeBookReadingStats', () => {
  it('counts finished (watched/completed), reading (watching/in_progress), and abandoned', () => {
    const stats = computeBookReadingStats([
      book({ status: 'watched' }),
      book({ status: 'completed' }),
      book({ status: 'watching' }),
      book({ status: 'in_progress' }),
      book({ status: 'abandoned' }),
      book({ status: 'to-watch' }),
      book({ status: 'planned' }),
    ]);
    expect(stats).toEqual({
      finished: 2,
      currentlyReading: 2,
      abandoned: 1,
      pagesKnownFor: 0,
    });
  });

  it('ignores screen media even if status looks like reading', () => {
    const stats = computeBookReadingStats([
      book({ status: 'watched' }),
      { type: 'movie', status: 'watched', pageCount: 999 },
      { type: 'tv', status: 'watching' },
      { type: 'movie', status: 'abandoned' },
    ]);
    expect(stats.finished).toBe(1);
    expect(stats.currentlyReading).toBe(0);
    expect(stats.abandoned).toBe(0);
    expect(stats.totalPages).toBeUndefined();
  });

  it('sums optional total pages when present and omits when none', () => {
    const withPages = computeBookReadingStats([
      book({ status: 'watched', pageCount: 200 }),
      book({
        status: 'watching',
        progress: { unit: 'page', value: 50, total: 350 },
      }),
      book({ status: 'abandoned', pageCount: 100 }),
      book({ status: 'watched' }), // no page data
    ]);
    expect(withPages.finished).toBe(2);
    expect(withPages.currentlyReading).toBe(1);
    expect(withPages.abandoned).toBe(1);
    expect(withPages.totalPages).toBe(200 + 350 + 100);
    expect(withPages.pagesKnownFor).toBe(3);

    const without = computeBookReadingStats([
      book({ status: 'watched' }),
      book({ status: 'watching' }),
    ]);
    expect(without.totalPages).toBeUndefined();
    expect(without.pagesKnownFor).toBe(0);
  });

  it('does not count planned/to-watch toward page totals or activity buckets', () => {
    const stats = computeBookReadingStats([
      book({ status: 'to-watch', pageCount: 500 }),
      book({ status: 'planned', pageCount: 400 }),
    ]);
    expect(stats.finished).toBe(0);
    expect(stats.currentlyReading).toBe(0);
    expect(stats.abandoned).toBe(0);
    expect(stats.totalPages).toBeUndefined();
    expect(hasBookReadingActivity(stats)).toBe(false);
  });

  it('hasBookReadingActivity reflects non-zero buckets', () => {
    expect(
      hasBookReadingActivity({
        finished: 0,
        currentlyReading: 0,
        abandoned: 0,
        pagesKnownFor: 0,
      }),
    ).toBe(false);
    expect(
      hasBookReadingActivity({
        finished: 1,
        currentlyReading: 0,
        abandoned: 0,
        pagesKnownFor: 0,
      }),
    ).toBe(true);
    expect(
      hasBookReadingActivity({
        finished: 0,
        currentlyReading: 0,
        abandoned: 2,
        pagesKnownFor: 0,
      }),
    ).toBe(true);
  });

  it('accepts pre-filtered rows without type as books', () => {
    const stats = computeBookReadingStats([{ status: 'watched', pageCount: 90 }]);
    expect(stats.finished).toBe(1);
    expect(stats.totalPages).toBe(90);
  });
});
