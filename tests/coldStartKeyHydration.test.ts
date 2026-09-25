import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureTmdbApiKey, setTmdbApiKey } from '@/background/tmdb';
import { ensureOmdbApiKey, setOmdbApiKey, fetchOmdbRatings } from '@/background/omdb';
import { ensureGoogleBooksApiKey, setGoogleBooksApiKey } from '@/background/googleBooks';
import { DEFAULT_PREFS, savePreferences } from '@/background/storage';
import * as storage from '@/background/storage';
import { createMessageRouter } from '@/shared/messages';
import { MessageType } from '@/shared/types';
import { ensurePreferencesLoaded, _resetInitPreferencesPromiseForTesting } from '@/background/index';

describe('Cold-start key hydration', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    setTmdbApiKey('');
    setOmdbApiKey('');
    setGoogleBooksApiKey('');
    await savePreferences({
      ...DEFAULT_PREFS,
      tmdbApiKey: '',
      omdbApiKey: '',
      googleBooksApiKey: '',
    });
  });

  describe('TMDB lazy key hydration', () => {
    it('hydrates tmdbApiKey from storage preferences if uninitialized', async () => {
      await savePreferences({
        ...DEFAULT_PREFS,
        tmdbApiKey: 'storage-tmdb-key-999',
      });

      const key = await ensureTmdbApiKey();
      expect(key).toBe('storage-tmdb-key-999');
    });

    it('throws if no TMDB key exists in storage or memory', async () => {
      await expect(ensureTmdbApiKey()).rejects.toThrow('TMDB API key not configured');
    });
  });

  describe('OMDB lazy key hydration', () => {
    it('hydrates omdbApiKey from storage preferences when empty', async () => {
      await savePreferences({
        ...DEFAULT_PREFS,
        omdbApiKey: 'storage-omdb-key-777',
      });

      const key = await ensureOmdbApiKey();
      expect(key).toBe('storage-omdb-key-777');
    });

    it('uses hydrated OMDB key during fetchOmdbRatings', async () => {
      await savePreferences({
        ...DEFAULT_PREFS,
        omdbApiKey: 'hydrated-omdb-key',
      });

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          Response: 'True',
          imdbRating: '7.5',
          Ratings: [{ Source: 'Internet Movie Database', Value: '7.5/10' }],
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const ratings = await fetchOmdbRatings('The Matrix Resurrections', 2021, 'movie');
      expect(ratings).toEqual([{ provider: 'imdb', score: 7.5 }]);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('apikey=hydrated-omdb-key')
      );
    });
  });

  describe('Google Books lazy key hydration', () => {
    it('hydrates googleBooksApiKey from storage preferences when empty', async () => {
      await savePreferences({
        ...DEFAULT_PREFS,
        googleBooksApiKey: 'storage-gb-key-444',
      });

      const key = await ensureGoogleBooksApiKey();
      expect(key).toBe('storage-gb-key-444');
    });
  });

  describe('Message router onBeforeDispatch startup sync', () => {
    it('awaits preference loading before executing handlers', async () => {
      let prefsLoaded = false;
      let handlerRanAfterPrefs = false;

      const initPrefsPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          prefsLoaded = true;
          resolve();
        }, 20);
      });

      let routerListener: any;
      vi.spyOn(chrome.runtime.onMessage, 'addListener').mockImplementation((fn: any) => {
        routerListener = fn;
      });
      vi.spyOn(chrome.runtime, 'getURL').mockReturnValue('chrome-extension://test/');

      createMessageRouter(
        {
          [MessageType.CHECK_LIBRARY_STATUS]: async () => {
            handlerRanAfterPrefs = prefsLoaded;
            return { inLibrary: true };
          },
        },
        {
          onBeforeDispatch: () => initPrefsPromise,
        }
      );

      const response = await new Promise((resolve) => {
        routerListener(
          { type: MessageType.CHECK_LIBRARY_STATUS, payload: {} },
          { url: 'chrome-extension://test/popup.html' },
          resolve
        );
      });

      expect(response).toEqual({ success: true, data: { inLibrary: true } });
      expect(handlerRanAfterPrefs).toBe(true);
    });
  });

  describe('ensurePreferencesLoaded retry on failure', () => {
    it('resets initPreferencesPromise on failure so subsequent attempts retry', async () => {
      _resetInitPreferencesPromiseForTesting();
      let callCount = 0;
      const getPrefsSpy = vi.spyOn(storage, 'getPreferences').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Transient storage load failure');
        }
        return {
          ...DEFAULT_PREFS,
          tmdbApiKey: 'retried-tmdb-key',
        };
      });

      // First attempt fails and catches
      await ensurePreferencesLoaded();
      expect(callCount).toBe(1);

      // Second attempt retries instead of staying failed
      await ensurePreferencesLoaded();
      expect(callCount).toBe(2);
      expect(await ensureTmdbApiKey()).toBe('retried-tmdb-key');

      getPrefsSpy.mockRestore();
    });
  });
});
