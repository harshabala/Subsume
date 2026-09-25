import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearTmdbCache,
  getTmdbCacheSizeForTesting,
  setTmdbCacheEntryForTesting,
  MAX_CACHE_SIZE as TMDB_MAX_CACHE_SIZE,
} from '@/background/tmdb';
import {
  clearOmdbCache,
  getOmdbCacheSizeForTesting,
  setOmdbCacheEntryForTesting,
  MAX_CACHE_SIZE as OMDB_MAX_CACHE_SIZE,
} from '@/background/omdb';
import {
  clearGoogleBooksCache,
  getGoogleBooksCacheSizeForTesting,
  setGoogleBooksCacheEntryForTesting,
  MAX_CACHE_SIZE as GB_MAX_CACHE_SIZE,
} from '@/background/googleBooks';

describe('Bounded API In-Memory Caches (P2-CS1)', () => {
  beforeEach(() => {
    clearTmdbCache();
    clearOmdbCache();
    clearGoogleBooksCache();
  });

  it('bounds TMDB cache to MAX_CACHE_SIZE = 500 with FIFO eviction', () => {
    expect(TMDB_MAX_CACHE_SIZE).toBe(500);
    expect(getTmdbCacheSizeForTesting()).toBe(0);

    for (let i = 0; i < 500; i++) {
      setTmdbCacheEntryForTesting(`key_${i}`, { id: i });
    }
    expect(getTmdbCacheSizeForTesting()).toBe(500);

    // Adding the 501st element must trigger FIFO eviction of key_0
    setTmdbCacheEntryForTesting('key_500', { id: 500 });
    expect(getTmdbCacheSizeForTesting()).toBe(500);

    // Updating an existing element should not evict or increase size beyond bound
    setTmdbCacheEntryForTesting('key_500', { id: 500, updated: true });
    expect(getTmdbCacheSizeForTesting()).toBe(500);
  });

  it('bounds OMDB cache to MAX_CACHE_SIZE = 500 with FIFO eviction', () => {
    expect(OMDB_MAX_CACHE_SIZE).toBe(500);
    expect(getOmdbCacheSizeForTesting()).toBe(0);

    for (let i = 0; i < 500; i++) {
      setOmdbCacheEntryForTesting(`key_${i}`, [{ provider: 'imdb', score: 8.0 }]);
    }
    expect(getOmdbCacheSizeForTesting()).toBe(500);

    setOmdbCacheEntryForTesting('key_500', [{ provider: 'imdb', score: 9.0 }]);
    expect(getOmdbCacheSizeForTesting()).toBe(500);

    setOmdbCacheEntryForTesting('key_500', [{ provider: 'imdb', score: 9.5 }]);
    expect(getOmdbCacheSizeForTesting()).toBe(500);
  });

  it('bounds Google Books cache to MAX_CACHE_SIZE = 500 with FIFO eviction', () => {
    expect(GB_MAX_CACHE_SIZE).toBe(500);
    expect(getGoogleBooksCacheSizeForTesting()).toBe(0);

    for (let i = 0; i < 500; i++) {
      setGoogleBooksCacheEntryForTesting(`key_${i}`, { volumeId: `vol_${i}` });
    }
    expect(getGoogleBooksCacheSizeForTesting()).toBe(500);

    setGoogleBooksCacheEntryForTesting('key_500', { volumeId: 'vol_500' });
    expect(getGoogleBooksCacheSizeForTesting()).toBe(500);

    setGoogleBooksCacheEntryForTesting('key_500', { volumeId: 'vol_500', fresh: true });
    expect(getGoogleBooksCacheSizeForTesting()).toBe(500);
  });
});
