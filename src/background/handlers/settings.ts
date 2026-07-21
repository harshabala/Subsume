import { MessageHandlerMap } from '@/shared/messages';
import { MessageType, UserPreferences } from '@/shared/types';
import { getPreferences, savePreferences } from '../storage';
import { setTmdbApiKey } from '../tmdb';
import { setOmdbApiKey } from '../omdb';
import { buildContentPrefs } from '../contentPrefs';
import { getFreeDataSourceStatuses } from '../dataSources';
import { reconcileDispatchAlarm } from '../dispatch';
import { logger } from '@/shared/logger';

const API_KEY_FIELDS: (keyof UserPreferences)[] = [
  'tmdbApiKey',
  'omdbApiKey',
  'llmApiKey',
  'llmSecondaryApiKey',
  'googleBooksApiKey',
];

/**
 * Returns a copy of UserPreferences with all sensitive API key fields removed.
 * Used by GET_PREFERENCES so that content scripts running on arbitrary web
 * pages cannot read the user's API credentials.
 */
function sanitizePreferencesForContentScript(
  prefs: UserPreferences
): Omit<
  UserPreferences,
  'tmdbApiKey' | 'omdbApiKey' | 'llmApiKey' | 'llmSecondaryApiKey' | 'googleBooksApiKey'
> {
  const {
    tmdbApiKey: _tmdb,
    omdbApiKey: _omdb,
    llmApiKey: _llm,
    llmSecondaryApiKey: _llmSec,
    googleBooksApiKey: _gb,
    ...safe
  } = prefs;
  return safe;
}

function maskApiKey(key: string | undefined): string | undefined {
  if (!key) return key;
  if (key.length <= 4) return key;
  const last4 = key.slice(-4);
  return key.startsWith('sk-') ? `sk-...${last4}` : `...${last4}`;
}

function maskPreferencesApiKeys(prefs: UserPreferences): UserPreferences {
  return {
    ...prefs,
    tmdbApiKey: maskApiKey(prefs.tmdbApiKey),
    omdbApiKey: maskApiKey(prefs.omdbApiKey),
    llmApiKey: maskApiKey(prefs.llmApiKey),
    llmSecondaryApiKey: maskApiKey(prefs.llmSecondaryApiKey),
    googleBooksApiKey: maskApiKey(prefs.googleBooksApiKey),
  };
}

function isMaskedApiKey(value: string | undefined): boolean {
  return typeof value === 'string' && value.includes('...');
}

function mergePreferences(
  existing: UserPreferences,
  incoming: Partial<UserPreferences>
): UserPreferences {
  const merged: UserPreferences = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) continue;

    const field = key as keyof UserPreferences;
    if (API_KEY_FIELDS.includes(field) && isMaskedApiKey(value as string)) {
      continue;
    }

    (merged as unknown as Record<string, unknown>)[field] = value;
  }

  return merged;
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
  if (prefs.googleBooksApiKey !== undefined && typeof prefs.googleBooksApiKey !== 'string') return false;
  if (typeof prefs.hoverCardsEnabled !== 'boolean') return false;
  if (typeof prefs.posterOverlaysEnabled !== 'boolean') return false;
  if (!Array.isArray(prefs.disabledDomains) || !prefs.disabledDomains.every((d: any) => typeof d === 'string')) return false;
  if (!['low', 'medium', 'high'].includes(prefs.detectionSensitivity)) return false;
  if (typeof prefs.onboardingComplete !== 'boolean') return false;
  if (prefs.theme !== undefined && !['dark', 'light', 'system'].includes(prefs.theme)) return false;
  return true;
}

export const settingHandlers: MessageHandlerMap = {
  [MessageType.GET_PREFERENCES]: async () => {
    const prefs = await getPreferences();
    return sanitizePreferencesForContentScript(prefs);
  },

  [MessageType.GET_FULL_PREFERENCES]: async (payload) => {
    const { revealKeys } = (payload as { revealKeys?: boolean } | undefined) ?? {};
    const prefs = await getPreferences();
    return revealKeys ? prefs : maskPreferencesApiKeys(prefs);
  },

  [MessageType.SET_PREFERENCES]: async (payload) => {
    const incoming = payload as Partial<UserPreferences>;
    const existing = await getPreferences();
    const merged = mergePreferences(existing, incoming);
    if (!isValidUserPreferences(merged)) {
      throw new Error('Invalid preferences payload');
    }
    await savePreferences(merged);
    setTmdbApiKey(merged.tmdbApiKey ?? '');
    setOmdbApiKey(merged.omdbApiKey ?? '');
    try {
      await reconcileDispatchAlarm(merged);
    } catch (err) {
      logger.warn('[Subsume] reconcileDispatchAlarm after prefs save failed:', err);
    }
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

  [MessageType.GET_FREE_DATA_SOURCE_STATUS]: async () => {
    return getFreeDataSourceStatuses();
  },
};