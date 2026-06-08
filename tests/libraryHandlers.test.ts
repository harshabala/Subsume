import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageType } from '@/shared/types';

vi.mock('@/shared/messages', () => ({
  createMessageRouter: vi.fn(),
}));

vi.mock('@/background/tmdb', () => ({
  searchTitle: vi.fn(),
  searchTitles: vi.fn(),
  getLatestReleases: vi.fn(),
  setTmdbApiKey: vi.fn(),
  enrichMediaWithOmdbRatings: vi.fn((item) => item),
  enrichMediaWithStreaming: vi.fn((item) => item),
  searchPerson: vi.fn(),
  fetchPersonDetails: vi.fn(),
  fetchPersonFilmography: vi.fn(),
  makeBearerHeaders: vi.fn(),
  fetchWithRetry: vi.fn(),
  POSTER_BASE_URL: 'https://image.tmdb.org/t/p/w500',
}));

vi.mock('@/background/omdb', () => ({
  setOmdbApiKey: vi.fn(),
}));

vi.mock('@/background/storage', () => ({
  findMediaByTitle: vi.fn(),
  putMediaItem: vi.fn(),
  getMediaItem: vi.fn(),
  getLibraryItem: vi.fn(),
  putLibraryItem: vi.fn(),
  removeLibraryItem: vi.fn(),
  getAllLibraryItems: vi.fn().mockResolvedValue([]),
  getLibraryPage: vi.fn(),
  getAllMediaMap: vi.fn(),
  getPreferences: vi.fn().mockResolvedValue({}),
  savePreferences: vi.fn(),
  exportLibraryData: vi.fn(),
  importLibraryData: vi.fn(),
  getAllPeople: vi.fn(),
  getPersonById: vi.fn(),
  savePerson: vi.fn(),
  deletePerson: vi.fn(),
  updatePersonSync: vi.fn(),
  getWeeklyDigest: vi.fn(),
  saveWeeklyDigest: vi.fn(),
  getAllWatchAlerts: vi.fn(),
  putWatchAlert: vi.fn(),
  deleteWatchAlert: vi.fn(),
}));

vi.mock('@/background/alerts', () => ({
  checkWatchAlerts: vi.fn(),
}));

vi.mock('@/background/recommendations', () => ({
  generateRuleBasedRecommendations: vi.fn(),
}));

vi.mock('@/background/llm', () => ({
  generateLLMRecommendations: vi.fn(),
  getPersonalizedRecommendations: vi.fn(),
}));

vi.mock('@/background/context', () => ({
  buildWatchProfile: vi.fn(),
  invalidateProfileCache: vi.fn(),
}));

vi.mock('@/background/digest', () => ({
  generateWeeklyDigest: vi.fn(),
  isDigestStale: vi.fn(),
}));

vi.mock('@/background/contentPrefs', () => ({
  buildContentPrefs: vi.fn(),
}));

import { handlers } from '@/background/index';
import { getLibraryItem, putLibraryItem, getMediaItem } from '@/background/storage';
import { MediaItem } from '@/shared/types';

const sender = {} as chrome.runtime.MessageSender;

describe('SET_USER_RATING validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects ratings below 1', async () => {
    const handler = handlers[MessageType.SET_USER_RATING]!;
    const result = await handler({ mediaId: 'tmdb_movie_1', rating: 0 }, sender);

    expect(result).toEqual({ updated: false });
    expect(getLibraryItem).not.toHaveBeenCalled();
  });

  it('rejects ratings above 10', async () => {
    const handler = handlers[MessageType.SET_USER_RATING]!;
    const result = await handler({ mediaId: 'tmdb_movie_1', rating: 11 }, sender);

    expect(result).toEqual({ updated: false });
    expect(getLibraryItem).not.toHaveBeenCalled();
  });

  it('returns updated false when library item does not exist', async () => {
    vi.mocked(getLibraryItem).mockResolvedValue(undefined);

    const handler = handlers[MessageType.SET_USER_RATING]!;
    const result = await handler({ mediaId: 'tmdb_movie_1', rating: 8 }, sender);

    expect(result).toEqual({ updated: false });
    expect(putLibraryItem).not.toHaveBeenCalled();
  });

  it('updates rating for valid requests', async () => {
    const item = {
      mediaId: 'tmdb_movie_1',
      status: 'watched' as const,
      addedAt: 1,
      updatedAt: 1,
    };
    vi.mocked(getLibraryItem).mockResolvedValue(item);

    const handler = handlers[MessageType.SET_USER_RATING]!;
    const result = await handler({ mediaId: 'tmdb_movie_1', rating: 8 }, sender);

    expect(result).toEqual({ updated: true });
    expect(putLibraryItem).toHaveBeenCalledWith(
      expect.objectContaining({ userRating: 8 })
    );
  });
});

describe('UPDATE_STATUS validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns updated false when library item does not exist', async () => {
    vi.mocked(getLibraryItem).mockResolvedValue(undefined);

    const handler = handlers[MessageType.UPDATE_STATUS]!;
    const result = await handler(
      { mediaId: 'tmdb_movie_1', status: 'watched' },
      sender
    );

    expect(result).toEqual({ updated: false });
    expect(putLibraryItem).not.toHaveBeenCalled();
  });

  it('rejects invalid status values', async () => {
    const handler = handlers[MessageType.UPDATE_STATUS]!;
    const result = await handler(
      { mediaId: 'tmdb_movie_1', status: 'invalid' as any },
      sender
    );

    expect(result).toEqual({ updated: false });
    expect(getLibraryItem).not.toHaveBeenCalled();
  });
});

const sampleMedia: MediaItem = {
  id: 'tmdb_movie_99',
  canonicalTitle: 'Inception',
  type: 'movie',
  year: 2010,
  genres: ['Science Fiction'],
  ratings: [{ provider: 'tmdb', score: 8.8 }],
  providers: [{ provider: 'tmdb', externalId: '99' }],
  posterUrl: '',
};

describe('ADD_TO_LIST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMediaItem).mockResolvedValue(undefined);
  });

  it('preserves existing library status when re-adding', async () => {
    vi.mocked(getLibraryItem).mockResolvedValue({
      mediaId: 'tmdb_movie_99',
      status: 'watched',
      userRating: 9,
      addedAt: 1000,
      updatedAt: 1000,
    });

    const handler = handlers[MessageType.ADD_TO_LIST]!;
    const result = await handler(
      { mediaItem: sampleMedia, type: 'movie' },
      sender
    );

    expect(result.status).toBe('watched');
    expect(result.userRating).toBe(9);
    expect(putLibraryItem).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'watched', userRating: 9 })
    );
  });

  it('sets to-watch for new library entries', async () => {
    vi.mocked(getLibraryItem).mockResolvedValue(undefined);

    const handler = handlers[MessageType.ADD_TO_LIST]!;
    const result = await handler(
      { mediaItem: sampleMedia, type: 'movie' },
      sender
    );

    expect(result.status).toBe('to-watch');
    expect(putLibraryItem).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'to-watch' })
    );
  });
});

describe('SET_USER_NOTES and SET_USER_TAGS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns updated false when library item does not exist (notes)', async () => {
    vi.mocked(getLibraryItem).mockResolvedValue(undefined);

    const handler = handlers[MessageType.SET_USER_NOTES]!;
    const result = await handler(
      { mediaId: 'tmdb_movie_1', notes: 'Great film' },
      sender
    );

    expect(result).toEqual({ updated: false });
    expect(putLibraryItem).not.toHaveBeenCalled();
  });

  it('returns updated false when library item does not exist (tags)', async () => {
    vi.mocked(getLibraryItem).mockResolvedValue(undefined);

    const handler = handlers[MessageType.SET_USER_TAGS]!;
    const result = await handler(
      { mediaId: 'tmdb_movie_1', tags: ['rewatch'] },
      sender
    );

    expect(result).toEqual({ updated: false });
    expect(putLibraryItem).not.toHaveBeenCalled();
  });
});