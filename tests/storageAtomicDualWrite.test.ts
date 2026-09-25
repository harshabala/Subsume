import { describe, it, expect, vi, beforeEach } from 'vitest';
import { putMediaItem, putLibraryItem, getDb } from '@/background/storage';
import { MediaItem, LibraryItem } from '@/shared/types';

describe('Atomic Multi-Store Dual Writes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('putMediaItem executes inside an atomic multi-store transaction with [media, works]', async () => {
    const db = await getDb();
    const txSpy = vi.spyOn(db, 'transaction');

    const sampleMedia: MediaItem = {
      id: 'tmdb_movie_atomic_1',
      canonicalTitle: 'Atomic Movie',
      type: 'movie',
      year: 2024,
      genres: ['Sci-Fi'],
      ratings: [],
      providers: [],
    };

    await putMediaItem(sampleMedia);

    expect(txSpy).toHaveBeenCalledWith(['media', 'works'], 'readwrite');

    // Verify written to both stores
    const mediaRow = await db.get('media', sampleMedia.id);
    expect(mediaRow).toBeDefined();
    expect(mediaRow?.canonicalTitle).toBe('Atomic Movie');

    const workRow = await db.get('works', sampleMedia.id);
    expect(workRow).toBeDefined();
    expect(workRow?.canonicalTitle).toBe('Atomic Movie');
  });

  it('putLibraryItem executes inside an atomic multi-store transaction with [library, relationships]', async () => {
    const db = await getDb();
    const txSpy = vi.spyOn(db, 'transaction');

    const sampleLibrary: LibraryItem = {
      mediaId: 'tmdb_movie_atomic_1',
      status: 'completed',
      progress: { current: 1, total: 1, unit: 'count' },
      userRating: 9,
      notes: 'Terrific film',
      tags: [],
      collections: [],
      updatedAt: Date.now(),
    };

    await putLibraryItem(sampleLibrary);

    expect(txSpy).toHaveBeenCalledWith(['library', 'relationships'], 'readwrite');

    // Verify written to both stores
    const libRow = await db.get('library', sampleLibrary.mediaId);
    expect(libRow).toBeDefined();
    expect(libRow?.userRating).toBe(9);

    const relRow = await db.get('relationships', sampleLibrary.mediaId);
    expect(relRow).toBeDefined();
    expect(relRow?.status).toBe('completed');
  });
});
