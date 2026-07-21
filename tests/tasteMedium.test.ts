import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LibraryItem, MediaItem } from '@/shared/types';

vi.mock('@/background/storage', () => ({
  getAllLibraryItems: vi.fn(),
  getMediaItem: vi.fn(),
  getAllPeople: vi.fn(),
  getPreferences: vi.fn(),
}));

import {
  buildWatchProfile,
  buildTasteProfileForMedium,
  invalidateProfileCache,
} from '@/background/context';
import {
  getAllLibraryItems,
  getMediaItem,
  getAllPeople,
  getPreferences,
} from '@/background/storage';

const basePrefs = {
  favoriteGenres: [],
  platforms: [],
  region: 'US',
  llmEnabled: false,
  hoverCardsEnabled: true,
  posterOverlaysEnabled: true,
  disabledDomains: [],
  detectionSensitivity: 'medium' as const,
  onboardingComplete: true,
};

function movie(id: string, title: string, year = 2010): MediaItem {
  return {
    id,
    canonicalTitle: title,
    type: 'movie',
    year,
    genres: ['Drama'],
    ratings: [],
    providers: [],
    posterUrl: '',
  };
}

function book(id: string, title: string, year = 1925): MediaItem {
  return {
    id,
    canonicalTitle: title,
    type: 'book',
    year,
    genres: ['Literary'],
    ratings: [],
    providers: [],
    posterUrl: '',
    authors: ['Someone'],
  };
}

describe('buildTasteProfileForMedium', () => {
  beforeEach(() => {
    invalidateProfileCache();
    vi.clearAllMocks();
    vi.mocked(getPreferences).mockResolvedValue(basePrefs);
    vi.mocked(getAllPeople).mockResolvedValue([]);
  });

  it('filters completed items by screen vs book medium', async () => {
    const library: LibraryItem[] = [
      { mediaId: 'm1', status: 'watched', addedAt: 1, updatedAt: 3, userRating: 9 },
      { mediaId: 'b1', status: 'watched', addedAt: 2, updatedAt: 4, userRating: 8 },
      { mediaId: 'm2', status: 'watched', addedAt: 3, updatedAt: 5, userRating: 7 },
      { mediaId: 'b2', status: 'to-watch', addedAt: 6, updatedAt: 6 },
    ];
    const mediaMap: Record<string, MediaItem> = {
      m1: movie('m1', 'Screen One'),
      b1: book('b1', 'Book One'),
      m2: movie('m2', 'Screen Two'),
      b2: book('b2', 'Book Wishlist'),
    };

    vi.mocked(getAllLibraryItems).mockResolvedValue(library);
    vi.mocked(getMediaItem).mockImplementation(async (id) => mediaMap[id]);

    const screen = await buildTasteProfileForMedium('screen');
    expect(screen.totalWatched).toBe(2);
    expect(screen.topRated.map((e) => e.title)).toEqual(['Screen One']);
    expect(screen.liked.map((e) => e.title)).toEqual(['Screen Two']);
    expect(screen.wishlist?.map((e) => e.title) ?? []).toEqual([]);

    invalidateProfileCache();
    const books = await buildTasteProfileForMedium('book');
    expect(books.totalWatched).toBe(1);
    expect(books.topRated.map((e) => e.title)).toEqual(['Book One']);
    expect(books.wishlist?.map((e) => e.title)).toEqual(['Book Wishlist']);
  });

  it('buildWatchProfile includes all media types', async () => {
    const library: LibraryItem[] = [
      { mediaId: 'm1', status: 'watched', addedAt: 1, updatedAt: 3, userRating: 9 },
      { mediaId: 'b1', status: 'watched', addedAt: 2, updatedAt: 4, userRating: 9 },
    ];
    const mediaMap: Record<string, MediaItem> = {
      m1: movie('m1', 'Screen One'),
      b1: book('b1', 'Book One'),
    };
    vi.mocked(getAllLibraryItems).mockResolvedValue(library);
    vi.mocked(getMediaItem).mockImplementation(async (id) => mediaMap[id]);

    const all = await buildWatchProfile();
    expect(all.totalWatched).toBe(2);
    expect(all.topRated.map((e) => e.title).sort()).toEqual(['Book One', 'Screen One']);
  });

  it('filters followed creators by medium', async () => {
    vi.mocked(getAllLibraryItems).mockResolvedValue([]);
    vi.mocked(getMediaItem).mockResolvedValue(undefined);
    vi.mocked(getAllPeople).mockResolvedValue([
      {
        id: '1',
        name: 'Director X',
        role: 'director',
        knownFor: [],
        filmographyIds: [],
        followedAt: 1,
        lastSyncedAt: 1,
      },
      {
        id: 'openlibrary_author_OL23919A',
        name: 'J. K. Rowling',
        role: 'writer',
        knownFor: [],
        filmographyIds: [],
        followedAt: 2,
        lastSyncedAt: 2,
      },
    ]);

    const screen = await buildTasteProfileForMedium('screen');
    expect(screen.followedCreators.map((c) => c.name)).toEqual(['Director X']);

    invalidateProfileCache();
    const books = await buildTasteProfileForMedium('book');
    expect(books.followedCreators.map((c) => c.name)).toEqual(['J. K. Rowling']);
  });
});
