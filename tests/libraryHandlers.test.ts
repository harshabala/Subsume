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

vi.mock('@/background/storage', async () => {
  const { intentForStatus, isValidMediaItem } = await vi.importActual<
    typeof import('@/background/storage')
  >('@/background/storage');
  return {
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
    intentForStatus,
    isValidMediaItem,
  };
});

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
import { getLibraryItem, putLibraryItem, getMediaItem, getPreferences, savePreferences } from '@/background/storage';
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

  it('syncs sanctuaryIntent when status is updated', async () => {
    const item = {
      mediaId: 'tmdb_movie_1',
      status: 'to-watch' as const,
      sanctuaryIntent: 'wishlist' as const,
      addedAt: 1,
      updatedAt: 1,
    };
    vi.mocked(getLibraryItem).mockResolvedValue(item);

    const handler = handlers[MessageType.UPDATE_STATUS]!;
    const result = await handler(
      { mediaId: 'tmdb_movie_1', status: 'watched' },
      sender
    );

    expect(result).toEqual({ updated: true });
    expect(putLibraryItem).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'watched',
        sanctuaryIntent: 'keep_memory',
      })
    );
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

  it('sets default sanctuaryIntent to wishlist for new library entries', async () => {
    vi.mocked(getLibraryItem).mockResolvedValue(undefined);

    const handler = handlers[MessageType.ADD_TO_LIST]!;
    const result = await handler(
      { mediaItem: sampleMedia, type: 'movie' },
      sender
    );

    expect(result.sanctuaryIntent).toBe('wishlist');
    expect(putLibraryItem).toHaveBeenCalledWith(
      expect.objectContaining({ sanctuaryIntent: 'wishlist' })
    );
  });
});

describe('CHECK_LIBRARY_STATUS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns inLibrary false for invalid mediaId', async () => {
    const handler = handlers[MessageType.CHECK_LIBRARY_STATUS]!;
    const result = await handler({ mediaId: 'page_example.com' }, sender);
    expect(result).toEqual({ inLibrary: false });
    expect(getLibraryItem).not.toHaveBeenCalled();
  });

  it('returns inLibrary false when item is not in library', async () => {
    vi.mocked(getLibraryItem).mockResolvedValue(undefined);

    const handler = handlers[MessageType.CHECK_LIBRARY_STATUS]!;
    const result = await handler({ mediaId: 'tmdb_movie_99' }, sender);

    expect(result).toEqual({ inLibrary: false });
  });

  it('returns scoped status fields when item exists', async () => {
    vi.mocked(getLibraryItem).mockResolvedValue({
      mediaId: 'tmdb_movie_42',
      status: 'watched',
      userRating: 9,
      addedAt: 1,
      updatedAt: 2,
    });

    const handler = handlers[MessageType.CHECK_LIBRARY_STATUS]!;
    const result = await handler({ mediaId: 'tmdb_movie_42' }, sender);

    expect(result).toEqual({
      inLibrary: true,
      status: 'watched',
      userRating: 9,
    });
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

  it('updates emotionalRecall, notes, atmosphere, and lingeringThought successfully', async () => {
    const existingItem = {
      mediaId: 'tmdb_movie_1',
      emotionalRecall: 'Old recall',
      notes: 'Old notes',
      atmosphere: 'Old atmosphere',
      lingeringThought: 'Old lingering thought',
    };
    vi.mocked(getLibraryItem).mockResolvedValue(existingItem as any);

    const handler = handlers[MessageType.SET_USER_NOTES]!;
    const result = await handler(
      {
        mediaId: 'tmdb_movie_1',
        notes: 'Great film',
        emotionalRecall: 'What stayed with me',
        atmosphere: 'Cozy',
        lingeringThought: 'Beautiful ending',
      },
      sender
    );

    expect(result).toEqual({ updated: true });
    expect(putLibraryItem).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaId: 'tmdb_movie_1',
        emotionalRecall: 'What stayed with me',
        notes: 'Great film',
        atmosphere: 'Cozy',
        lingeringThought: 'Beautiful ending',
      })
    );
  });

  it('persists emotional spectrum metrics (awe, melancholy, tension, warmth)', async () => {
    const existingItem = {
      mediaId: 'tmdb_movie_1',
      notes: 'Old notes',
    };
    vi.mocked(getLibraryItem).mockResolvedValue(existingItem as any);

    const handler = handlers[MessageType.SET_USER_NOTES]!;
    const result = await handler(
      {
        mediaId: 'tmdb_movie_1',
        notes: 'La La Land reflection',
        awe: 82,
        melancholy: 45,
        tension: 12,
        warmth: 91,
      },
      sender
    );

    expect(result).toEqual({ updated: true });
    expect(putLibraryItem).toHaveBeenCalledWith(
      expect.objectContaining({
        awe: 82,
        melancholy: 45,
        tension: 12,
        warmth: 91,
      })
    );
  });

  it('rejects out-of-range emotional metrics', async () => {
    const handler = handlers[MessageType.SET_USER_NOTES]!;
    const result = await handler(
      { mediaId: 'tmdb_movie_1', notes: 'Bad', awe: 150 },
      sender
    );

    expect(result).toEqual({ updated: false });
    expect(putLibraryItem).not.toHaveBeenCalled();
  });
});

describe('GET_PREFERENCES sanitization', () => {
  it('strips llmSecondaryApiKey alongside other API keys', async () => {
    vi.mocked(getPreferences).mockResolvedValue({
      region: 'US',
      llmApiKey: 'secret-llm',
      llmSecondaryApiKey: 'secret-secondary',
      tmdbApiKey: 'secret-tmdb',
      omdbApiKey: 'secret-omdb',
    } as any);

    const handler = handlers[MessageType.GET_PREFERENCES]!;
    const result: any = await handler(undefined, sender);

    expect(result.region).toBe('US');
    expect(result).not.toHaveProperty('llmApiKey');
    expect(result).not.toHaveProperty('llmSecondaryApiKey');
    expect(result).not.toHaveProperty('tmdbApiKey');
    expect(result).not.toHaveProperty('omdbApiKey');
  });
});

describe('GET_FULL_PREFERENCES masking', () => {
  it('returns masked API keys by default', async () => {
    vi.mocked(getPreferences).mockResolvedValue({
      favoriteGenres: [],
      platforms: [],
      region: 'US',
      llmEnabled: false,
      llmApiKey: 'sk-abcdefghijklmnop',
      llmSecondaryApiKey: 'sk-secondarykey1234',
      tmdbApiKey: 'tmdb-secret-key-99',
      omdbApiKey: 'omdb-secret-key-88',
      hoverCardsEnabled: true,
      posterOverlaysEnabled: true,
      disabledDomains: [],
      detectionSensitivity: 'medium',
      onboardingComplete: true,
    });

    const handler = handlers[MessageType.GET_FULL_PREFERENCES]!;
    const result: any = await handler({}, sender);

    expect(result.llmApiKey).toBe('sk-...mnop');
    expect(result.llmSecondaryApiKey).toBe('sk-...1234');
    expect(result.tmdbApiKey).toBe('...y-99');
    expect(result.omdbApiKey).toBe('...y-88');
  });

  it('returns full API keys when revealKeys is true', async () => {
    vi.mocked(getPreferences).mockResolvedValue({
      favoriteGenres: [],
      platforms: [],
      region: 'US',
      llmEnabled: false,
      llmApiKey: 'sk-full-secret-key',
      tmdbApiKey: 'tmdb-full-secret',
      hoverCardsEnabled: true,
      posterOverlaysEnabled: true,
      disabledDomains: [],
      detectionSensitivity: 'medium',
      onboardingComplete: true,
    } as any);

    const handler = handlers[MessageType.GET_FULL_PREFERENCES]!;
    const result: any = await handler({ revealKeys: true }, sender);

    expect(result.llmApiKey).toBe('sk-full-secret-key');
    expect(result.tmdbApiKey).toBe('tmdb-full-secret');
  });
});

describe('SET_PREFERENCES validation', () => {
  const validBase = {
    favoriteGenres: ['Sci-Fi'],
    platforms: ['Netflix'],
    region: 'US',
    llmEnabled: true,
    hoverCardsEnabled: true,
    posterOverlaysEnabled: true,
    disabledDomains: [],
    detectionSensitivity: 'medium',
    onboardingComplete: true,
  };

  it('accepts valid preferences with llmSecondaryApiKey', async () => {
    const handler = handlers[MessageType.SET_PREFERENCES]!;
    const res = await handler({ ...validBase, llmSecondaryApiKey: 'sec-key' }, sender);
    expect(res).toEqual({ updated: true });
  });

  it('rejects preferences where llmSecondaryApiKey is not a string', async () => {
    const handler = handlers[MessageType.SET_PREFERENCES]!;
    await expect(handler({ ...validBase, llmSecondaryApiKey: 12345 }, sender)).rejects.toThrow('Invalid preferences payload');
  });

  it('merges partial updates with existing preferences instead of replacing them', async () => {
    vi.mocked(getPreferences).mockResolvedValue({
      ...validBase,
      tmdbApiKey: 'existing-tmdb-key',
      llmApiKey: 'existing-llm-key',
    } as any);

    const handler = handlers[MessageType.SET_PREFERENCES]!;
    await handler({ onboardingComplete: false }, sender);

    expect(savePreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        onboardingComplete: false,
        tmdbApiKey: 'existing-tmdb-key',
        llmApiKey: 'existing-llm-key',
      })
    );
  });

  it('does not overwrite API keys when masked values are submitted', async () => {
    vi.mocked(getPreferences).mockResolvedValue({
      ...validBase,
      tmdbApiKey: 'existing-tmdb-key',
      llmApiKey: 'existing-llm-key',
    } as any);

    const handler = handlers[MessageType.SET_PREFERENCES]!;
    await handler({
      ...validBase,
      tmdbApiKey: '...y-99',
      llmApiKey: 'sk-...mnop',
    }, sender);

    expect(savePreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        tmdbApiKey: 'existing-tmdb-key',
        llmApiKey: 'existing-llm-key',
      })
    );
  });
});