import { MessageHandlerMap } from '@/shared/messages';
import { MessageType, UserPreferences } from '@/shared/types';
import { getPreferences, savePreferences } from '../storage';
import { setTmdbApiKey } from '../tmdb';
import { setOmdbApiKey } from '../omdb';
import { buildContentPrefs } from '../contentPrefs';

/**
 * Returns a copy of UserPreferences with all sensitive API key fields removed.
 * Used by GET_PREFERENCES so that content scripts running on arbitrary web
 * pages cannot read the user's API credentials.
 */
function sanitizePreferencesForContentScript(
  prefs: UserPreferences
): Omit<UserPreferences, 'tmdbApiKey' | 'omdbApiKey' | 'llmApiKey' | 'llmSecondaryApiKey'> {
  const { tmdbApiKey: _tmdb, omdbApiKey: _omdb, llmApiKey: _llm, llmSecondaryApiKey: _llmSec, ...safe } = prefs;
  return safe;
}

function isValidUserPreferences(prefs: any): prefs is UserPreferences {
  if (!prefs || typeof prefs !== 'object') return false;
  if (!Array.isArray(prefs.favoriteGenres) || !prefs.favoriteGenres.every((g: any) => typeof g === 'string')) return false;
  if (!Array.isArray(prefs.platforms) || !prefs.platforms.every((p: any) => typeof p === 'string')) return false;
  if (typeof prefs.region !== 'string') return false;
  if (typeof prefs.llmEnabled !== 'boolean') return false;
  if (prefs.llmProvider !== undefined && !['openai', 'anthropic', 'gemini', 'local'].includes(prefs.llmProvider)) return false;
  if (prefs.llmApiKey !== undefined && typeof prefs.llmApiKey !== 'string') return false;
  if (prefs.llmSecondaryApiKey !== undefined && typeof prefs.llmSecondaryApiKey !== 'string') return false;
  if (prefs.tmdbApiKey !== undefined && typeof prefs.tmdbApiKey !== 'string') return false;
  if (prefs.omdbApiKey !== undefined && typeof prefs.omdbApiKey !== 'string') return false;
  if (typeof prefs.hoverCardsEnabled !== 'boolean') return false;
  if (typeof prefs.posterOverlaysEnabled !== 'boolean') return false;
  if (!Array.isArray(prefs.disabledDomains) || !prefs.disabledDomains.every((d: any) => typeof d === 'string')) return false;
  if (!['low', 'medium', 'high'].includes(prefs.detectionSensitivity)) return false;
  if (typeof prefs.onboardingComplete !== 'boolean') return false;
  return true;
}

export const settingHandlers: MessageHandlerMap = {
  [MessageType.GET_PREFERENCES]: async () => {
    const prefs = await getPreferences();
    return sanitizePreferencesForContentScript(prefs);
  },

  [MessageType.GET_FULL_PREFERENCES]: async () => {
    // Returns the full unredacted preferences including API keys.
    // Only the Settings UI should call this message type.
    return getPreferences();
  },

  [MessageType.SET_PREFERENCES]: async (payload) => {
    const prefs = payload as UserPreferences;
    if (!isValidUserPreferences(prefs)) {
      throw new Error('Invalid preferences payload');
    }
    await savePreferences(prefs);
    setTmdbApiKey(prefs.tmdbApiKey ?? '');
    setOmdbApiKey(prefs.omdbApiKey ?? '');
    return { updated: true };
  },

  [MessageType.GET_POSTER_PREFS]: async (payload) => {
    const req = payload as { hostname: string };
    const prefs = await getPreferences();
    const contentPrefs = buildContentPrefs(prefs, req.hostname);
    return {
      overlaysEnabled: contentPrefs.posterOverlaysEnabled,
      detectionSensitivity: contentPrefs.detectionSensitivity,
    };
  },

  [MessageType.GET_CONTENT_PREFS]: async (payload) => {
    const req = payload as { hostname: string };
    const prefs = await getPreferences();
    return buildContentPrefs(prefs, req.hostname);
  },
};
