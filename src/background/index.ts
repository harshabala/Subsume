import { createMessageRouter, MessageHandlerMap } from '@/shared/messages';
import { logDiagnostic } from '@/shared/diagnosticLog';
import { logger } from '@/shared/logger';
import { setTmdbApiKey } from './tmdb';
import { setOmdbApiKey } from './omdb';
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
};

export { handlers };

createMessageRouter(handlers);

console.info('[Subsume] Extension ID (compare to Google OAuth Chrome client Item ID):', chrome.runtime.id);
logDiagnostic('info', 'bg.startup', 'Background service worker started', `extensionId=${chrome.runtime.id}`);

getPreferences()
  .then((prefs) => {
    if (prefs.tmdbApiKey) {
      setTmdbApiKey(prefs.tmdbApiKey);
    }
    if (prefs.omdbApiKey) {
      setOmdbApiKey(prefs.omdbApiKey);
    }
  })
  .catch((err) => {
    logger.error('[Subsume] Failed to initialize background API preferences:', err);
  });

mergeSeedCatalogIfVersionBehind().catch((err) => {
  logger.error('[Subsume] Seed catalogue merge failed:', err);
});

setupLifecycleAndAlarms();

logger.info('[Subsume] Background service worker started.');
