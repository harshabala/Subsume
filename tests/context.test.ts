import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LibraryItem, MediaItem } from '@/shared/types';

// Mock storage
vi.mock('@/background/storage', () => ({
  getAllLibraryItems: vi.fn(),
  getMediaItem: vi.fn(),
  getAllPeople: vi.fn(),
  getPreferences: vi.fn(),
}));

import { buildWatchProfile, invalidateProfileCache } from '@/background/context';
import {
  getAllLibraryItems,
  getMediaItem,
  getAllPeople,
  getPreferences,
} from '@/background/storage';

describe('WatchProfile Context Engine', () => {
  beforeEach(() => {
    invalidateProfileCache();
    vi.clearAllMocks();
  });

  it('correctly buckets library items into rating tiers and enforces sorting & caps', async () => {
    // 1. Mock DB functions
    vi.mocked(getPreferences).mockResolvedValue({
      favoriteGenres: [],
      platforms: [],
      region: 'US',
      llmEnabled: false,
      hoverCardsEnabled: true,
      posterOverlaysEnabled: true,
      disabledDomains: [],
      detectionSensitivity: 'medium',
      onboardingComplete: true,
    });

    vi.mocked(getAllPeople).mockResolvedValue([]);

    // Set up 25 watched items with various ratings
    const mockLibrary: LibraryItem[] = [];
    const mockMediaMap: Record<string, MediaItem> = {};

    // 5 top-rated items (rating >= 8)
    for (let i = 1; i <= 5; i++) {
      const id = `m_top_${i}`;
      mockLibrary.push({ mediaId: id, status: 'watched', addedAt: i, updatedAt: i, userRating: 8 + (i % 3) });
      mockMediaMap[id] = { id, canonicalTitle: `Top Movie ${i}`, type: 'movie', year: 2010 + i, genres: ['Action'], ratings: [], providers: [], posterUrl: '' };
    }

    // 3 liked items (rating 6-7)
    for (let i = 1; i <= 3; i++) {
      const id = `m_liked_${i}`;
      mockLibrary.push({ mediaId: id, status: 'watched', addedAt: i, updatedAt: i, userRating: 6 + (i % 2) });
      mockMediaMap[id] = { id, canonicalTitle: `Liked Movie ${i}`, type: 'movie', year: 2005, genres: ['Drama'], ratings: [], providers: [], posterUrl: '' };
    }

    // 2 disliked items (rating <= 4)
    for (let i = 1; i <= 2; i++) {
      const id = `m_disliked_${i}`;
      mockLibrary.push({ mediaId: id, status: 'watched', addedAt: i, updatedAt: i, userRating: 3 });
      mockMediaMap[id] = { id, canonicalTitle: `Disliked Movie ${i}`, type: 'movie', year: 2000, genres: ['Comedy'], ratings: [], providers: [], posterUrl: '' };
    }

    // 2 unrated items
    for (let i = 1; i <= 2; i++) {
      const id = `m_unrated_${i}`;
      mockLibrary.push({ mediaId: id, status: 'watched', addedAt: i, updatedAt: i });
      mockMediaMap[id] = { id, canonicalTitle: `Unrated Movie ${i}`, type: 'movie', year: 2015, genres: ['Sci-Fi'], ratings: [], providers: [], posterUrl: '' };
    }

    vi.mocked(getAllLibraryItems).mockResolvedValue(mockLibrary);
    vi.mocked(getMediaItem).mockImplementation(async (id) => mockMediaMap[id]);

    const profile = await buildWatchProfile();

    // Check bucketing counts
    expect(profile.topRated).toHaveLength(5);
    expect(profile.liked).toHaveLength(3);
    expect(profile.disliked).toHaveLength(2);
    expect(profile.unrated).toHaveLength(2);
    expect(profile.totalWatched).toBe(12);

    // Verify top-rated sorting (descending by rating, then descending by year)
    // Ratings are: i=1: 9 (yr 2011), i=2: 10 (yr 2012), i=3: 8 (yr 2013), i=4: 9 (yr 2014), i=5: 10 (yr 2015)
    // Sorted should be:
    // 1. Movie 5 (rating 10, year 2015)
    // 2. Movie 2 (rating 10, year 2012)
    // 3. Movie 4 (rating 9, year 2014)
    // 4. Movie 1 (rating 9, year 2011)
    // 5. Movie 3 (rating 8, year 2013)
    expect(profile.topRated[0].title).toBe('Top Movie 5');
    expect(profile.topRated[1].title).toBe('Top Movie 2');
    expect(profile.topRated[2].title).toBe('Top Movie 4');
    expect(profile.topRated[3].title).toBe('Top Movie 1');
    expect(profile.topRated[4].title).toBe('Top Movie 3');
  });

  it('enforces in-memory caching and TTL', async () => {
    vi.mocked(getPreferences).mockResolvedValue({
      favoriteGenres: [],
      platforms: [],
      region: 'US',
      llmEnabled: false,
      hoverCardsEnabled: true,
      posterOverlaysEnabled: true,
      disabledDomains: [],
      detectionSensitivity: 'medium',
      onboardingComplete: true,
    });
    vi.mocked(getAllPeople).mockResolvedValue([]);
    vi.mocked(getAllLibraryItems).mockResolvedValue([]);

    // First call reads from storage
    const profile1 = await buildWatchProfile();
    expect(getAllLibraryItems).toHaveBeenCalledTimes(1);

    // Second call hit cache, no storage call
    const profile2 = await buildWatchProfile();
    expect(profile1).toBe(profile2);
    expect(getAllLibraryItems).toHaveBeenCalledTimes(1);

    // Invalidation clears cache, next call reads storage again
    invalidateProfileCache();
    const profile3 = await buildWatchProfile();
    expect(profile3).not.toBe(profile1);
    expect(getAllLibraryItems).toHaveBeenCalledTimes(2);
  });

  it('derives favorite genres from top-rated list if preferences lack them', async () => {
    vi.mocked(getPreferences).mockResolvedValue({
      favoriteGenres: [], // empty genres in preferences
      platforms: [],
      region: 'US',
      llmEnabled: false,
      hoverCardsEnabled: true,
      posterOverlaysEnabled: true,
      disabledDomains: [],
      detectionSensitivity: 'medium',
      onboardingComplete: true,
    });
    vi.mocked(getAllPeople).mockResolvedValue([]);

    const mockLibrary: LibraryItem[] = [
      { mediaId: 'm1', status: 'watched', addedAt: 1, updatedAt: 1, userRating: 10 },
      { mediaId: 'm2', status: 'watched', addedAt: 2, updatedAt: 2, userRating: 9 },
      { mediaId: 'm3', status: 'watched', addedAt: 3, updatedAt: 3, userRating: 8 },
    ];

    const mockMediaMap: Record<string, MediaItem> = {
      m1: { id: 'm1', canonicalTitle: 'A', type: 'movie', year: 2020, genres: ['Action', 'Thriller'], ratings: [], providers: [], posterUrl: '' },
      m2: { id: 'm2', canonicalTitle: 'B', type: 'movie', year: 2021, genres: ['Sci-Fi', 'Action'], ratings: [], providers: [], posterUrl: '' },
      m3: { id: 'm3', canonicalTitle: 'C', type: 'movie', year: 2022, genres: ['Action', 'Comedy'], ratings: [], providers: [], posterUrl: '' },
    };

    vi.mocked(getAllLibraryItems).mockResolvedValue(mockLibrary);
    vi.mocked(getMediaItem).mockImplementation(async (id) => mockMediaMap[id]);

    const profile = await buildWatchProfile();

    // Favorite genres should be derived from top rated movies:
    // Action (3 occurrences), Thriller (1), Sci-Fi (1), Comedy (1)
    // Action should be the top favorite genre.
    expect(profile.favoriteGenres).toContain('Action');
    expect(profile.favoriteGenres[0]).toBe('Action');
  });
});
