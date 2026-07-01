import { createMessageRouter, MessageHandlerMap } from '@/shared/messages';
import { logger } from '@/shared/logger';
import { setTmdbApiKey } from './tmdb';
import { setOmdbApiKey } from './omdb';
import { getPreferences } from './storage';
import { setupLifecycleAndAlarms } from './events';

import { libraryHandlers } from './handlers/library';
import { titleHandlers } from './handlers/titles';
import { peopleHandlers } from './handlers/people';
import { recommendationHandlers } from './handlers/recommendations';
import { alertHandlers } from './handlers/alerts';
import { settingHandlers } from './handlers/settings';
import { syncHandlers } from './handlers/sync';

const handlers: MessageHandlerMap = {
  ...libraryHandlers,
  ...titleHandlers,
  ...peopleHandlers,
  ...recommendationHandlers,
  ...alertHandlers,
  ...settingHandlers,
  ...syncHandlers,
};

export { handlers };

createMessageRouter(handlers);

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

setupLifecycleAndAlarms();

logger.info('[Subsume] Background service worker started.');
