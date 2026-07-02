import { MessageHandlerMap } from '@/shared/messages';
import { logger } from '@/shared/logger';
import {
  MessageType,
  GetRecommendationsRequest,
  MediaItem,
  Recommendation,
} from '@/shared/types';
import { getPreferences, getWeeklyDigest, saveWeeklyDigest } from '../storage';
import { generateRuleBasedRecommendations } from '../recommendations';
import { generateLLMRecommendations, getPersonalizedRecommendations } from '../llm';
import { buildWatchProfile } from '../context';
import { generateWeeklyDigest, isDigestStale } from '../digest';
import { getDiscoveryFeed } from '../discoveryFeed';
import { getTraktTrending } from '../trakt';
import { GetDiscoveryFeedRequest } from '@/shared/types';

export const recommendationHandlers: MessageHandlerMap = {
  [MessageType.GET_RECOMMENDATIONS]: async (payload) => {
    const req = payload as GetRecommendationsRequest;
    logger.log('[Subsume] GET_RECOMMENDATIONS', req);
    
    // Check if LLM is enabled and has a key
    const prefs = await getPreferences();
    if (prefs.llmEnabled && prefs.llmApiKey) {
      try {
        logger.log('[Subsume] Using LLM for recommendations...');
        const llmRecs = await generateLLMRecommendations();
        if (llmRecs.length > 0) {
          return llmRecs;
        }
      } catch (err) {
        logger.error('[Subsume] LLM recommendations failed, falling back to rule-based', err);
      }
    }
    
    logger.log('[Subsume] Using rule-based recommendations fallback');
    const ruleRecs: Recommendation[] = await generateRuleBasedRecommendations(req?.basedOnMediaId);

    // If we have fewer than 5 recommendations, supplement with Trakt trending
    if (ruleRecs.length < 5) {
      const traktMovies = await getTraktTrending('movie', 10).catch(() => []);
      const traktTv = await getTraktTrending('tv', 10).catch(() => []);
      const traktItems: MediaItem[] = [
        ...traktMovies.map((t) => ({
          id: `trakt_trending_${t.traktSlug}`,
          canonicalTitle: t.title,
          type: 'movie' as const,
          year: t.year,
          genres: [],
          ratings: [],
          providers: [{ provider: 'trakt' as const, externalId: t.traktSlug, url: `https://trakt.tv/movies/${t.traktSlug}` }],
          posterUrl: '',
          overview: '',
        })),
        ...traktTv.map((t) => ({
          id: `trakt_trending_${t.traktSlug}`,
          canonicalTitle: t.title,
          type: 'tv' as const,
          year: t.year,
          genres: [],
          ratings: [],
          providers: [{ provider: 'trakt' as const, externalId: t.traktSlug, url: `https://trakt.tv/shows/${t.traktSlug}` }],
          posterUrl: '',
          overview: '',
        })),
      ];
      // Deduplicate by title (rule recs don't have titles so no overlap possible; traktItems dedup against each other)
      const existingTraktTitles = new Set<string>();
      const dedupedTraktItems = traktItems.filter((item) => {
        const key = item.canonicalTitle.toLowerCase();
        if (existingTraktTitles.has(key)) return false;
        existingTraktTitles.add(key);
        return true;
      });
      const combined: Array<Recommendation | MediaItem> = [...ruleRecs, ...dedupedTraktItems].slice(0, 20);
      return combined;
    }

    return ruleRecs;
  },

  [MessageType.BUILD_WATCH_PROFILE]: async () => {
    const profile = await buildWatchProfile();
    return { profile };
  },

  [MessageType.GET_PERSONALIZED_RECS]: async () => {
    const prefs = await getPreferences();

    if (!prefs.llmEnabled || !prefs.llmApiKey) {
      return { error: 'no_llm_key', flat: [], grouped: null };
    }

    try {
      const { flat, grouped } = await getPersonalizedRecommendations(prefs);
      return { flat, grouped };
    } catch (err) {
      logger.error('[Subsume] GET_PERSONALIZED_RECS failed:', err);
      return { error: 'llm_failed', flat: [], grouped: null };
    }
  },

  [MessageType.GET_WEEKLY_DIGEST]: async () => {
    const cached = await getWeeklyDigest();
    if (cached && !isDigestStale(cached)) {
      return cached;
    }

    if (cached) {
      const prefs = await getPreferences();
      generateWeeklyDigest(prefs)
        .then(async (digest) => {
          await saveWeeklyDigest(digest);
        })
        .catch((err) => {
          logger.error('[Subsume] Background weekly digest regen failed:', err);
        });
      return cached;
    }

    const prefs = await getPreferences();
    const digest = await generateWeeklyDigest(prefs);
    await saveWeeklyDigest(digest);
    return digest;
  },

  [MessageType.REGENERATE_WEEKLY_DIGEST]: async () => {
    const prefs = await getPreferences();
    const digest = await generateWeeklyDigest(prefs);
    await saveWeeklyDigest(digest);
    return digest;
  },

  [MessageType.GET_DISCOVERY_FEED]: async (payload) => {
    const req = (payload || {}) as GetDiscoveryFeedRequest;
    logger.log('[Subsume] GET_DISCOVERY_FEED', { force: !!req.force });
    return getDiscoveryFeed(!!req.force);
  },
};
