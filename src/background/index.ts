import { createMessageRouter, MessageHandlerMap } from '@/shared/messages';
import { logDiagnostic } from '@/shared/diagnosticLog';
import { logger } from '@/shared/logger';
import { setTmdbApiKey } from './tmdb';
import { setOmdbApiKey } from './omdb';
import { setGoogleBooksApiKey } from './googleBooks';
import { getPreferences, mergeSeedCatalogIfVersionBehind } from './storage';
import { setupLifecycleAndAlarms } from './events';

import { libraryHandlers } from './handlers/library';
import { titleHandlers } from './handlers/titles';
import { peopleHandlers } from './handlers/people';
import { recommendationHandlers } from './handlers/recommendations';
import { alertHandlers } from './handlers/alerts';
import { settingHandlers } from './handlers/settings';
import { syncHandlers } from './handlers/sync';
import { bookHandlers } from './handlers/books';
import { reflectionHandlers } from './handlers/reflections';
import { relationHandlers } from './handlers/relations';

const handlers: MessageHandlerMap = {
  ...libraryHandlers,
  ...titleHandlers,
  ...peopleHandlers,
  ...recommendationHandlers,
  ...alertHandlers,
  ...settingHandlers,
  ...syncHandlers,
  ...bookHandlers,
  ...reflectionHandlers,
  ...relationHandlers,
};

export { handlers };

let initPreferencesPromise: Promise<void> | null = null;

export function ensurePreferencesLoaded(): Promise<void> {
  if (!initPreferencesPromise) {
    initPreferencesPromise = getPreferences()
      .then((prefs) => {
        if (prefs.tmdbApiKey) {
          setTmdbApiKey(prefs.tmdbApiKey);
        }
        if (prefs.omdbApiKey) {
          setOmdbApiKey(prefs.omdbApiKey);
        }
        if (prefs.googleBooksApiKey) {
          setGoogleBooksApiKey(prefs.googleBooksApiKey);
        }
      })
      .catch((err) => {
        initPreferencesPromise = null;
        logger.error('[Subsume] Failed to initialize background API preferences:', err);
      });
  }
  return initPreferencesPromise;
}

export function _resetInitPreferencesPromiseForTesting(): void {
  initPreferencesPromise = null;
}

// Ensure startup hydration begins immediately
ensurePreferencesLoaded();

// Register message router, awaiting preference hydration before dispatching
createMessageRouter(handlers, {
  onBeforeDispatch: () => ensurePreferencesLoaded(),
});

console.info('[Subsume] Extension ID (compare to Google OAuth Chrome client Item ID):', chrome.runtime.id);
logDiagnostic('info', 'bg.startup', 'Background service worker started', `extensionId=${chrome.runtime.id}`);

import { healFirstInscriptionIfLibraryNonEmpty } from './activationHooks';

healFirstInscriptionIfLibraryNonEmpty().catch((err) => {
  logger.warn('[Subsume] firstInscription heal on startup failed:', err);
});

mergeSeedCatalogIfVersionBehind().catch((err) => {
  logger.error('[Subsume] Seed catalogue merge failed:', err);
});

setupLifecycleAndAlarms();

logger.info('[Subsume] Background service worker started.');
