import { describe, it, expect } from 'vitest';
import { normalizeLibraryItem, isValidLibraryItem } from '@/background/storage';
import { LibraryItem, SanctuaryIntent } from '@/shared/types';

describe('Sanctuary Architecture v2.1 Schema & Storage', () => {
  it('normalizes library items with default sanctuaryIntent based on status', () => {
    const rawToWatch: LibraryItem = {
      mediaId: 'tmdb_movie_100',
      status: 'to-watch',
      addedAt: 1000,
      updatedAt: 1000,
    };
    const normalized = normalizeLibraryItem(rawToWatch);
    expect(normalized.sanctuaryIntent).toBe('wishlist');
  });

  it('validates library items containing v2.1 Sanctuary fields and compatibility fields', () => {
    const fullSanctuaryItem: LibraryItem = {
      mediaId: 'tmdb_movie_100',
      id: 'movie:100',
      tmdbId: 100,
      mediaType: 'movie',
      title: 'Inception',
      posterPath: '/path.jpg',
      releaseYear: 2010,
      directorNames: ['Christopher Nolan'],
      status: 'watched',
      sanctuaryIntent: 'keep_memory' as SanctuaryIntent,
      emotionalRecall: 'The spinning top at the end.',
      qualitativeNotes: 'Deep contemplation on dreams.',
      userRating: 9.5,
      scriptParallels: ['You must decide.'],
      originalScreenplaySparks: 'A dream architect thriller.',
      addedAt: 1000,
      updatedAt: 1000,
      contemplatedAt: 1050,
    };

    expect(isValidLibraryItem(fullSanctuaryItem)).toBe(true);
  });
});
