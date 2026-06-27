import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as trakt from '@/background/trakt';

describe('Trakt trending supplement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getTraktTrending returns movie titles with slugs', async () => {
    vi.spyOn(trakt, 'getTraktTrending').mockResolvedValue([
      { title: 'Oppenheimer', year: 2023, traktSlug: 'oppenheimer-2023', watchers: 500 },
      { title: 'Barbie', year: 2023, traktSlug: 'barbie-2023', watchers: 300 },
    ]);
    const trending = await trakt.getTraktTrending('movie', 2);
    expect(trending).toHaveLength(2);
    expect(trending[0].title).toBe('Oppenheimer');
    expect(trending[0].traktSlug).toBe('oppenheimer-2023');
  });

  it('getTraktTrending returns empty array gracefully', async () => {
    vi.spyOn(trakt, 'getTraktTrending').mockResolvedValue([]);
    const trending = await trakt.getTraktTrending('tv', 10);
    expect(trending).toEqual([]);
  });
});
