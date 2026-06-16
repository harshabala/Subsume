import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserPreferences, LibraryItem, MediaItem } from '@/shared/types';

// Mock storage, tmdb, and context
vi.mock('@/background/storage', () => ({
  getAllLibraryItems: vi.fn(),
  getAllMediaMap: vi.fn(),
  getPreferences: vi.fn(),
  putMediaItem: vi.fn(),
  findMediaByTitle: vi.fn(),
}));

vi.mock('@/background/tmdb', () => ({
  searchTitle: vi.fn(),
}));

vi.mock('@/background/context', () => ({
  buildWatchProfile: vi.fn(),
}));

// Import tested modules
import {
  generateLLMRecommendations,
  callLLMProvider,
} from '@/background/llm';
import {
  getAllLibraryItems,
  getAllMediaMap,
  getPreferences,
  putMediaItem,
  findMediaByTitle,
} from '@/background/storage';
import { searchTitle } from '@/background/tmdb';

describe('LLM Recommendations Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('callLLMProvider error handling & sanitization', () => {
    const prefs: UserPreferences = {
      favoriteGenres: [],
      platforms: [],
      region: 'US',
      llmEnabled: true,
      llmProvider: 'openai',
      llmApiKey: 'test-api-key',
      hoverCardsEnabled: true,
      posterOverlaysEnabled: true,
      disabledDomains: [],
      detectionSensitivity: 'medium',
      onboardingComplete: true,
    };

    it('throws error when API key is missing', async () => {
      await expect(
        callLLMProvider('prompt', { ...prefs, llmApiKey: undefined })
      ).rejects.toThrow('LLM API key is missing');
    });

    it('sanitizes OpenAI API error response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          text: async () => '{"error": {"message": "Invalid API Key"}}',
        })
      );

      await expect(callLLMProvider('prompt', prefs)).rejects.toThrow(
        'OpenAI API error (Status 401)'
      );
    });

    it('sanitizes Anthropic API error response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          text: async () => '{"error": {"type": "invalid_request_error"}}',
        })
      );

      await expect(
        callLLMProvider('prompt', { ...prefs, llmProvider: 'anthropic' })
      ).rejects.toThrow('Anthropic API error (Status 400)');
    });

    it('sanitizes Gemini API error response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 403,
          text: async () => '{"error": "Forbidden"}',
        })
      );

      await expect(
        callLLMProvider('prompt', { ...prefs, llmProvider: 'gemini' })
      ).rejects.toThrow('Gemini API error (Status 403)');
    });
  });

  describe('generateLLMRecommendations flow', () => {
    const prefs: UserPreferences = {
      favoriteGenres: [],
      platforms: [],
      region: 'US',
      llmEnabled: true,
      llmProvider: 'openai',
      llmApiKey: 'test-api-key',
      hoverCardsEnabled: true,
      posterOverlaysEnabled: true,
      disabledDomains: [],
      detectionSensitivity: 'medium',
      onboardingComplete: true,
    };

    const mockLibrary: LibraryItem[] = [
      { mediaId: 'tmdb_movie_1', status: 'watched', addedAt: 1000, updatedAt: 1000, userRating: 9 },
      { mediaId: 'tmdb_movie_2', status: 'to-watch', addedAt: 1000, updatedAt: 1000 },
    ];

    const mockMediaMap: Record<string, MediaItem> = {
      tmdb_movie_1: {
        id: 'tmdb_movie_1',
        canonicalTitle: 'Inception',
        type: 'movie',
        year: 2010,
        genres: ['Action', 'Sci-Fi'],
        ratings: [],
        providers: [],
        posterUrl: '',
      },
      tmdb_movie_2: {
        id: 'tmdb_movie_2',
        canonicalTitle: 'Interstellar',
        type: 'movie',
        year: 2014,
        genres: ['Adventure', 'Sci-Fi'],
        ratings: [],
        providers: [],
        posterUrl: '',
      },
    };

    it('returns empty array when library is empty', async () => {
      vi.mocked(getPreferences).mockResolvedValue(prefs);
      vi.mocked(getAllLibraryItems).mockResolvedValue([]);
      vi.mocked(getAllMediaMap).mockResolvedValue({});

      const result = await generateLLMRecommendations();
      expect(result).toEqual([]);
    });

    it('resolves flat recommendations using local DB first, then falls back to TMDB', async () => {
      vi.mocked(getPreferences).mockResolvedValue(prefs);
      vi.mocked(getAllLibraryItems).mockResolvedValue(mockLibrary);
      vi.mocked(getAllMediaMap).mockResolvedValue(mockMediaMap);

      const llmResponse = JSON.stringify([
        { title: 'The Matrix', year: 1999, type: 'movie', explanation: 'Classic sci-fi movie.' },
        { title: 'Memento', year: 2000, type: 'movie', explanation: 'Nolan mindbender.' },
      ]);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: llmResponse } }],
          }),
        })
      );

      const cachedMovie: MediaItem = {
        id: 'tmdb_movie_matrix',
        canonicalTitle: 'The Matrix',
        type: 'movie',
        year: 1999,
        genres: ['Sci-Fi'],
        ratings: [],
        providers: [],
        posterUrl: '',
      };

      const searchedMovie: MediaItem = {
        id: 'tmdb_movie_memento',
        canonicalTitle: 'Memento',
        type: 'movie',
        year: 2000,
        genres: ['Thriller'],
        ratings: [],
        providers: [],
        posterUrl: '',
      };

      // Mock DB hit for The Matrix, miss for Memento
      vi.mocked(findMediaByTitle).mockImplementation(async (title) => {
        if (title === 'The Matrix') return cachedMovie;
        return null;
      });

      // Mock TMDB search for Memento
      vi.mocked(searchTitle).mockResolvedValue(searchedMovie);
      vi.mocked(putMediaItem).mockResolvedValue(undefined);

      const result = await generateLLMRecommendations();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        mediaId: 'tmdb_movie_matrix',
        explanation: 'Classic sci-fi movie.',
      });
      expect(result[1]).toEqual({
        mediaId: 'tmdb_movie_memento',
        explanation: 'Nolan mindbender.',
      });

      expect(findMediaByTitle).toHaveBeenCalledWith('The Matrix', 1999);
      expect(findMediaByTitle).toHaveBeenCalledWith('Memento', 2000);
      expect(searchTitle).toHaveBeenCalledWith('Memento', 2000, 'movie');
      expect(putMediaItem).toHaveBeenCalledWith(searchedMovie);
    });

    it('resolves grouped recommendations when user has >= 3 highly rated movies', async () => {
      const groupedLibrary: LibraryItem[] = [
        { mediaId: 'm1', status: 'watched', addedAt: 1, updatedAt: 1, userRating: 9 },
        { mediaId: 'm2', status: 'watched', addedAt: 1, updatedAt: 1, userRating: 10 },
        { mediaId: 'm3', status: 'watched', addedAt: 1, updatedAt: 1, userRating: 8 },
      ];

      const groupedMediaMap: Record<string, MediaItem> = {
        m1: { id: 'm1', canonicalTitle: 'Movie A', type: 'movie', year: 2020, genres: ['Action'], ratings: [], providers: [], posterUrl: '' },
        m2: { id: 'm2', canonicalTitle: 'Movie B', type: 'movie', year: 2021, genres: ['Drama'], ratings: [], providers: [], posterUrl: '' },
        m3: { id: 'm3', canonicalTitle: 'Movie C', type: 'movie', year: 2022, genres: ['Sci-Fi'], ratings: [], providers: [], posterUrl: '' },
      };

      vi.mocked(getPreferences).mockResolvedValue(prefs);
      vi.mocked(getAllLibraryItems).mockResolvedValue(groupedLibrary);
      vi.mocked(getAllMediaMap).mockResolvedValue(groupedMediaMap);

      const groupedLlmResponse = JSON.stringify([
        {
          seedTitle: 'Movie B',
          recommendations: [
            { title: 'Rec Film 1', year: 2023, type: 'movie', explanation: 'Because of Movie B' }
          ]
        }
      ]);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: groupedLlmResponse } }],
          }),
        })
      );

      const resolvedRec: MediaItem = {
        id: 'tmdb_movie_rec1',
        canonicalTitle: 'Rec Film 1',
        type: 'movie',
        year: 2023,
        genres: ['Drama'],
        ratings: [],
        providers: [],
        posterUrl: '',
      };

      vi.mocked(findMediaByTitle).mockResolvedValue(null);
      vi.mocked(searchTitle).mockResolvedValue(resolvedRec);

      const result = await generateLLMRecommendations();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        seedTitle: 'Movie B',
        recommendations: [
          { mediaId: 'tmdb_movie_rec1', explanation: 'Because of Movie B' }
        ]
      });
    });
  });
});
