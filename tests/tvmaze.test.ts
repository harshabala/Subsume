import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchTvMaze, searchTvMazeMulti, _clearCache } from '@/background/tvmaze';

const MOCK_SHOW = {
  id: 169,
  name: 'Breaking Bad',
  type: 'Scripted',
  genres: ['Drama', 'Crime'],
  premiered: '2008-01-20',
  rating: { average: 9.3 },
  image: { medium: 'https://tvmaze.com/img.jpg', original: 'https://tvmaze.com/img.jpg' },
  summary: '<p>A chemistry teacher turned drug lord.</p>',
};

beforeEach(() => {
  _clearCache();
  vi.restoreAllMocks();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [{ score: 30, show: MOCK_SHOW }],
  });
});

afterEach(() => {
  vi.clearAllMocks();
  _clearCache();
});

describe('searchTvMaze', () => {
  it('returns a MediaItem for a TV show', async () => {
    const result = await searchTvMaze('Breaking Bad');
    expect(result).not.toBeNull();
    expect(result!.canonicalTitle).toBe('Breaking Bad');
    expect(result!.type).toBe('tv');
    expect(result!.year).toBe(2008);
    expect(result!.genres).toContain('Drama');
    expect(result!.id).toBe('tvmaze_tv_169');
  });

  it('sets rating from TVmaze average', async () => {
    const result = await searchTvMaze('Breaking Bad');
    expect(result!.ratings).toHaveLength(1);
    expect(result!.ratings[0].provider).toBe('tvmaze');
    expect(result!.ratings[0].score).toBe(9.3);
  });

  it('sets posterUrl from image.medium', async () => {
    const result = await searchTvMaze('Breaking Bad');
    expect(result!.posterUrl).toBe('https://tvmaze.com/img.jpg');
  });

  it('strips HTML tags from summary', async () => {
    const result = await searchTvMaze('Breaking Bad');
    expect(result!.overview).toBe('A chemistry teacher turned drug lord.');
    expect(result!.overview).not.toContain('<p>');
  });

  it('returns null when no results', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    const result = await searchTvMaze('xyzzy nothing matches');
    expect(result).toBeNull();
  });

  it('returns null when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const result = await searchTvMaze('Breaking Bad');
    expect(result).toBeNull();
  });
});

describe('searchTvMazeMulti', () => {
  it('returns up to 10 MediaItems', async () => {
    const manyShows = Array.from({ length: 15 }, (_, i) => ({
      score: 10 - i,
      show: { ...MOCK_SHOW, id: i + 1, name: `Show ${i + 1}` },
    }));
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => manyShows,
    });
    const results = await searchTvMazeMulti('show');
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it('returns empty array on error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const results = await searchTvMazeMulti('anything');
    expect(results).toEqual([]);
  });
});
