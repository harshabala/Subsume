import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LibraryItem, MediaItem, PersonItem, UserPreferences } from '@/shared/types';

vi.mock('@/background/storage', () => ({
  getAllLibraryItems: vi.fn(),
  getMediaItem: vi.fn(),
  getAllPeople: vi.fn(),
  getPreferences: vi.fn(),
}));

import { buildTasteProfileForMedium, invalidateProfileCache } from '@/background/context';
import { getAllLibraryItems, getMediaItem, getAllPeople, getPreferences } from '@/background/storage';

const media = (id: string, over: Partial<MediaItem> = {}): MediaItem => ({
  id,
  canonicalTitle: id,
  type: 'movie',
  year: 2000,
  genres: ['drama'],
  ratings: [],
  providers: [],
  ...over,
});
const lib = (mediaId: string, over: Partial<LibraryItem> = {}) =>
  ({ mediaId, status: 'watched', addedAt: 1, updatedAt: 1, ...over }) as LibraryItem;
const person = (id: string, role: PersonItem['role']) => ({ id, name: id, role }) as PersonItem;

beforeEach(() => {
  invalidateProfileCache();
  vi.clearAllMocks();
});

describe('buildTasteProfileForMedium edge cases', () => {
  it('builds note excerpts from recall or qualitative notes when plain notes are missing', async () => {
    vi.mocked(getPreferences).mockResolvedValue({} as UserPreferences);
    vi.mocked(getAllPeople).mockResolvedValue([]);
    vi.mocked(getAllLibraryItems).mockResolvedValue([
      lib('a', { userRating: 9, emotionalRecall: 'r'.repeat(250) }),
      lib('b', { userRating: 9, qualitativeNotes: 'q'.repeat(200) }),
      lib('c', { userRating: 9 }),
      lib('d', { userRating: 9, notes: 'n'.repeat(120), emotionalRecall: 'ignored' }),
    ]);
    vi.mocked(getMediaItem).mockImplementation(async (id) => media(id, { year: id === 'a' ? 2001 : 2000 }));

    const profile = await buildTasteProfileForMedium('all');
    const byTitle = Object.fromEntries(profile.topRated.map((e) => [e.title, e]));
    expect(byTitle.a).toMatchObject({ noteExcerpt: 'r'.repeat(100), emotionalRecall: 'r'.repeat(200) });
    expect(byTitle.b).toMatchObject({ noteExcerpt: 'q'.repeat(100), qualitativeExcerpt: 'q'.repeat(150) });
    expect(byTitle.c.noteExcerpt).toBeUndefined();
    expect(byTitle.d.noteExcerpt).toBe('n'.repeat(100));
    // Missing favoriteGenres pref falls back to genres from top-rated titles
    expect(profile.favoriteGenres).toEqual(['drama']);
  });

  it('orders the wishlist newest first and filters followed creators per medium', async () => {
    vi.mocked(getPreferences).mockResolvedValue({ favoriteGenres: ['18'] } as UserPreferences);
    vi.mocked(getAllPeople).mockResolvedValue([
      person('tmdb_1', 'director'),
      person('openlibrary_author_OL1A', 'writer'),
      person('tmdb_2', 'writer'),
    ]);
    vi.mocked(getAllLibraryItems).mockResolvedValue([
      lib('w1', { status: 'to-watch', addedAt: 1 }),
      lib('w2', { status: 'watching', addedAt: 3 }),
      lib('w3', { status: 'to-watch', addedAt: 2 }),
    ]);
    vi.mocked(getMediaItem).mockImplementation(async (id) => media(id));

    const all = await buildTasteProfileForMedium('all');
    expect(all.wishlist.map((w) => w.title)).toEqual(['w2', 'w3', 'w1']);
    expect(all.followedCreators.map((c) => c.name)).toEqual(['tmdb_1', 'openlibrary_author_OL1A', 'tmdb_2']);

    const screen = await buildTasteProfileForMedium('screen');
    expect(screen.followedCreators.map((c) => c.name)).toEqual(['tmdb_1', 'tmdb_2']);
    const book = await buildTasteProfileForMedium('book');
    expect(book.followedCreators.map((c) => c.name)).toEqual(['openlibrary_author_OL1A', 'tmdb_2']);
  });
});
