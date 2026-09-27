import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LibraryItem, MediaItem } from '@/shared/types';

vi.mock('@/background/storage', () => ({
  getAllLibraryItems: vi.fn(),
  getAllMediaMap: vi.fn(),
}));

import { generateRuleBasedRecommendations } from '@/background/recommendations';
import { getAllLibraryItems, getAllMediaMap } from '@/background/storage';

const lib = (mediaId: string, status: LibraryItem['status'], userRating?: number) =>
  ({ mediaId, status, userRating }) as LibraryItem;
const media = (id: string, genres: string[], tmdb?: number): MediaItem => ({
  id,
  canonicalTitle: id.toUpperCase(),
  type: 'movie',
  year: 2020,
  genres,
  ratings: tmdb === undefined ? [] : [{ provider: 'tmdb', score: tmdb }],
  providers: [],
});

beforeEach(() => vi.clearAllMocks());

describe('generateRuleBasedRecommendations', () => {
  it('returns [] when nothing is on the watchlist', async () => {
    vi.mocked(getAllLibraryItems).mockResolvedValue([lib('a', 'watched')]);
    vi.mocked(getAllMediaMap).mockResolvedValue({});
    await expect(generateRuleBasedRecommendations()).resolves.toEqual([]);
  });

  it('scores by genre taste, rating and similarity, skipping unknown media', async () => {
    vi.mocked(getAllLibraryItems).mockResolvedValue([
      lib('w1', 'watched', 10),
      lib('w2', 'watched'),
      lib('ghost-watched', 'watched'),
      lib('t1', 'to-watch'),
      lib('t2', 'to-watch'),
      lib('t3', 'to-watch'),
      lib('ghost-todo', 'to-watch'),
    ]);
    vi.mocked(getAllMediaMap).mockResolvedValue({
      w1: media('w1', ['drama', 'war', 'history']),
      w2: media('w2', ['drama']),
      t1: media('t1', ['drama', 'war', 'history'], 8.5),
      t2: media('t2', ['comedy'], 6),
      t3: media('t3', ['horror']),
    });

    const recs = await generateRuleBasedRecommendations('w1');
    expect(recs.map((r) => r.mediaId)).toEqual(['t1', 't2', 't3']);
    expect(recs[0].explanation).toBe(
      'Matches your favorite genres • Highly rated (8.5/10) • Because you just watched W1',
    );
    expect(recs[1].explanation).toBe('A great title in your watchlist');
  });

  it('ignores a similarity seed that is not in the media map and caps genre score at 10', async () => {
    vi.mocked(getAllLibraryItems).mockResolvedValue([
      lib('w1', 'watched', 10),
      lib('t1', 'to-watch'),
    ]);
    vi.mocked(getAllMediaMap).mockResolvedValue({
      w1: media('w1', ['a', 'b', 'c']),
      t1: media('t1', ['a', 'b', 'c']),
    });
    const recs = await generateRuleBasedRecommendations('missing');
    expect(recs).toEqual([{ mediaId: 't1', explanation: 'Matches your favorite genres' }]);
  });

  it('gives no similarity bonus when no genres are shared', async () => {
    vi.mocked(getAllLibraryItems).mockResolvedValue([lib('t1', 'to-watch'), lib('t2', 'to-watch')]);
    vi.mocked(getAllMediaMap).mockResolvedValue({ t1: media('t1', ['x']), t2: media('t2', ['y']) });
    const recs = await generateRuleBasedRecommendations('t2');
    expect(recs.find((r) => r.mediaId === 't1')?.explanation).toBe('A great title in your watchlist');
    await expect(generateRuleBasedRecommendations()).resolves.toHaveLength(2);
  });
});
