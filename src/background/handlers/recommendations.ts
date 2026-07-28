import { MessageHandlerMap } from '@/shared/messages';
import { logger } from '@/shared/logger';
import {
  MessageType,
  GetRecommendationsRequest,
  MediaItem,
  Recommendation,
  GroupedRecommendation,
  PersonalizedRecommendation,
  RecommendationGroup,
  SubmitRecommendationFeedbackRequest,
  RecommendationFeedbackEntry,
  isGroupedRecommendationList,
} from '@/shared/types';
import {
  getPreferences,
  getWeeklyDigest,
  saveWeeklyDigest,
  getAllLibraryItems,
  getAllMediaMap,
} from '../storage';
import { generateRuleBasedRecommendations } from '../recommendations';
import {
  generateLLMRecommendations,
  getPersonalizedRecommendations,
  buildCuratorPromptPreview,
} from '../llm';
import { buildTasteProfileForMedium } from '../context';
import { generateWeeklyDigest, isDigestStale } from '../digest';
import { generateSubsumeDispatch } from '../dispatch';
import { getDiscoveryFeed, discoveryFeedToWeeklyDigest } from '../discoveryFeed';
import { getTraktTrending } from '../trakt';
import { GetDiscoveryFeedRequest, UserPreferences, WeeklyDigest } from '@/shared/types';
import { generateCatalogBookRecommendations } from '../bookRecommendations';
import { generateCrossMediumRecommendations } from '../crossMediumRecommendations';
import { resolveRecommendationCandidates } from '../catalogValidate';
import { getLlmProviderCapabilities } from '@/shared/llmCapabilities';

const REC_FEEDBACK_KEY = 'subsume_rec_feedback';
const MAX_FEEDBACK_ENTRIES = 500;

async function getRecFeedback(): Promise<RecommendationFeedbackEntry[]> {
  try {
    const data = await chrome.storage.local.get(REC_FEEDBACK_KEY);
    const raw = data[REC_FEEDBACK_KEY];
    return Array.isArray(raw) ? (raw as RecommendationFeedbackEntry[]) : [];
  } catch {
    return [];
  }
}

async function saveRecFeedback(entries: RecommendationFeedbackEntry[]): Promise<void> {
  await chrome.storage.local.set({
    [REC_FEEDBACK_KEY]: entries.slice(-MAX_FEEDBACK_ENTRIES),
  });
}

/** Work IDs the user dismissed or marked not interested. */
export async function getDismissedRecWorkIds(): Promise<Set<string>> {
  const entries = await getRecFeedback();
  const ids = new Set<string>();
  for (const e of entries) {
    if (e.action === 'dismiss' || e.action === 'not_interested') {
      ids.add(e.workId);
    }
  }
  return ids;
}

function filterDismissedMedia(items: MediaItem[], dismissed: Set<string>): MediaItem[] {
  if (dismissed.size === 0) return items;
  return items.filter((m) => !dismissed.has(m.id));
}

function filterDismissedRecs(
  recs: Recommendation[],
  dismissed: Set<string>
): Recommendation[] {
  if (dismissed.size === 0) return recs;
  return recs.filter((r) => !dismissed.has(r.mediaId));
}

function filterDismissedPersonalized(
  recs: PersonalizedRecommendation[],
  dismissed: Set<string>
): PersonalizedRecommendation[] {
  if (dismissed.size === 0) return recs;
  return recs.filter((r) => !dismissed.has(r.tmdbId));
}

async function resolveWeeklyDigest(prefs: UserPreferences): Promise<WeeklyDigest> {
  if (prefs.dispatchEnabled) {
    try {
      const digest = await generateSubsumeDispatch(prefs);
      if (digest.items.length > 0) return digest;
    } catch (err) {
      logger.warn('[Subsume] Subsume Dispatch generation failed, falling back:', err);
    }
  }

  try {
    const digest = await generateWeeklyDigest(prefs);
    if (digest.items.length > 0) {
      return digest;
    }
  } catch (err) {
    logger.warn('[Subsume] Weekly digest generation failed, using discovery feed:', err);
  }

  try {
    const feed = await getDiscoveryFeed();
    if (feed.items.length > 0) {
      return discoveryFeedToWeeklyDigest(feed);
    }
  } catch (err) {
    logger.error('[Subsume] Discovery feed fallback for weekly digest failed:', err);
  }

  return { generatedAt: Date.now(), items: [], llmGenerated: false };
}

async function resolveForcedDigest(prefs: UserPreferences): Promise<WeeklyDigest> {
  if (prefs.dispatchEnabled) {
    try {
      const digest = await generateSubsumeDispatch(prefs, { force: true });
      if (digest.items.length > 0) return digest;
    } catch (err) {
      logger.warn('[Subsume] Forced Subsume Dispatch failed, falling back:', err);
    }
  }
  return resolveWeeklyDigest({ ...prefs, dispatchEnabled: false });
}

async function libraryHasBooks(): Promise<boolean> {
  const library = await getAllLibraryItems();
  if (library.length === 0) return false;
  const mediaMap = await getAllMediaMap(library.map((l) => l.mediaId));
  return library.some((l) => mediaMap[l.mediaId]?.type === 'book');
}

export const recommendationHandlers: MessageHandlerMap = {
  [MessageType.GET_RECOMMENDATIONS]: async (payload) => {
    const req = payload as GetRecommendationsRequest;
    logger.log('[Subsume] GET_RECOMMENDATIONS', req);

    const prefs = await getPreferences();
    const dismissed = await getDismissedRecWorkIds();

    let primary: Array<Recommendation | MediaItem> = [];
    /** When LLM returns seed-grouped shape, keep groups and still append catalog/cross. */
    let llmGroups: GroupedRecommendation[] | null = null;

    if (prefs.llmEnabled && prefs.llmApiKey) {
      try {
        logger.log('[Subsume] Using LLM for recommendations...');
        const llmRecs = await generateLLMRecommendations();
        if (Array.isArray(llmRecs) && llmRecs.length > 0) {
          // Robust group detection (not seedTitle — flat recs may carry seedTitle)
          if (isGroupedRecommendationList(llmRecs)) {
            const filtered = llmRecs
              .map((g) => ({
                seedTitle: g.seedTitle,
                recommendations: filterDismissedRecs(g.recommendations, dismissed),
              }))
              .filter((g) => g.recommendations.length > 0);
            // Empty after dismiss → fall through to rule-based / catalog paths
            if (filtered.length > 0) {
              llmGroups = filtered;
              // Flatten for dedupe against book/cross appends
              primary = llmGroups.flatMap((g) => g.recommendations);
            }
          } else {
            primary = filterDismissedRecs(llmRecs as Recommendation[], dismissed);
          }
        }
      } catch (err) {
        logger.error('[Subsume] LLM recommendations failed, falling back to rule-based', err);
      }
    }

    if (primary.length === 0 && !llmGroups) {
      logger.log('[Subsume] Using rule-based recommendations fallback');
      const ruleRecs: Recommendation[] = await generateRuleBasedRecommendations(
        req?.basedOnMediaId
      );
      primary = filterDismissedRecs(ruleRecs, dismissed);
    }

    // Catalog book recommendations (never LLM-invented titles)
    let bookAsRecs: Recommendation[] = [];
    const booksEnabled = prefs.enabledMedia?.book !== false;
    if (booksEnabled && (await libraryHasBooks())) {
      try {
        const bookRecs = await generateCatalogBookRecommendations(8);
        const filteredBooks = filterDismissedMedia(bookRecs, dismissed);
        bookAsRecs = filteredBooks.map((m) => ({
          mediaId: m.id,
          explanation: 'Related to books in your archive',
          discoveryMode: 'catalog' as const,
        }));
        if (!llmGroups) {
          primary = [...primary, ...bookAsRecs].slice(0, 20);
        }
      } catch (err) {
        logger.warn('[Subsume] Catalog book recommendations failed:', err);
      }
    }

    // Cross-medium bridges (film/TV ↔ book) — gated on pref, catalog-only
    let novelCross: Recommendation[] = [];
    if (prefs.crossMediumRecommendationsEnabled === true) {
      try {
        const cross = await generateCrossMediumRecommendations({
          limit: 6,
          enabled: true,
        });
        const crossMedia = filterDismissedMedia(
          cross.map((c) => c.media),
          dismissed,
        );
        const crossIds = new Set(crossMedia.map((m) => m.id));
        const crossAsRecs: Recommendation[] = cross
          .filter((c) => crossIds.has(c.mediaId))
          .map((c) => ({
            mediaId: c.mediaId,
            explanation: c.explanation,
            discoveryMode: 'cross_medium' as const,
            seedTitle: c.seedTitle,
          }));
        // Prefer not duplicating mediaIds already in primary / groups
        const existingIds = new Set(
          primary.map((p) =>
            'mediaId' in p ? (p as Recommendation).mediaId : (p as MediaItem).id,
          ),
        );
        novelCross = crossAsRecs.filter((r) => !existingIds.has(r.mediaId));
        if (!llmGroups) {
          primary = [...primary, ...novelCross].slice(0, 24);
        }
      } catch (err) {
        logger.warn('[Subsume] Cross-medium recommendations failed:', err);
      }
    }

    // LLM grouped mode: return groups + catalog/cross as additional groups (never drop them)
    if (llmGroups) {
      const groups: GroupedRecommendation[] = [...llmGroups];
      if (bookAsRecs.length > 0) {
        const existingIds = new Set(
          groups.flatMap((g) => g.recommendations.map((r) => r.mediaId)),
        );
        const novelBooks = bookAsRecs.filter((r) => !existingIds.has(r.mediaId));
        if (novelBooks.length > 0) {
          groups.push({
            seedTitle: 'Related books',
            recommendations: novelBooks,
          });
        }
      }
      if (novelCross.length > 0) {
        // Group cross-medium by seed title so chip filter + bridge copy stay intact
        const bySeed = new Map<string, Recommendation[]>();
        for (const r of novelCross) {
          const key = r.seedTitle?.trim() || 'Cross-medium bridges';
          const list = bySeed.get(key) ?? [];
          list.push(r);
          bySeed.set(key, list);
        }
        for (const [seedTitle, recommendations] of bySeed) {
          // Prefer merging into an existing LLM group with the same seed
          const existing = groups.find((g) => g.seedTitle === seedTitle);
          if (existing) {
            const existingIds = new Set(existing.recommendations.map((r) => r.mediaId));
            for (const r of recommendations) {
              if (!existingIds.has(r.mediaId)) existing.recommendations.push(r);
            }
          } else {
            groups.push({ seedTitle, recommendations });
          }
        }
      }
      return groups;
    }

    // If we have fewer than 5 recommendations, supplement with Trakt trending
    if (primary.length < 5) {
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
          providers: [
            {
              provider: 'trakt' as const,
              externalId: t.traktSlug,
              url: `https://trakt.tv/movies/${t.traktSlug}`,
            },
          ],
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
          providers: [
            {
              provider: 'trakt' as const,
              externalId: t.traktSlug,
              url: `https://trakt.tv/shows/${t.traktSlug}`,
            },
          ],
          posterUrl: '',
          overview: '',
        })),
      ];
      const existingTraktTitles = new Set<string>();
      const dedupedTraktItems = filterDismissedMedia(traktItems, dismissed).filter((item) => {
        const key = item.canonicalTitle.toLowerCase();
        if (existingTraktTitles.has(key)) return false;
        existingTraktTitles.add(key);
        return true;
      });
      return [...primary, ...dedupedTraktItems].slice(0, 20);
    }

    return primary;
  },

  [MessageType.BUILD_WATCH_PROFILE]: async () => {
    const [all, screen, book] = await Promise.all([
      buildTasteProfileForMedium('all'),
      buildTasteProfileForMedium('screen'),
      buildTasteProfileForMedium('book'),
    ]);
    // `profile` kept for backward compatibility with Recommendations UI
    return { profile: all, all, screen, book };
  },

  [MessageType.BUILD_TASTE_PROFILE]: async () => {
    const [all, screen, book] = await Promise.all([
      buildTasteProfileForMedium('all'),
      buildTasteProfileForMedium('screen'),
      buildTasteProfileForMedium('book'),
    ]);
    return { profile: all, all, screen, book };
  },

  [MessageType.GET_PERSONALIZED_RECS]: async () => {
    const prefs = await getPreferences();

    if (!prefs.llmEnabled || !prefs.llmApiKey) {
      return { error: 'no_llm_key', flat: [], grouped: null };
    }

    try {
      const { flat, grouped } = await getPersonalizedRecommendations(prefs);
      const dismissed = await getDismissedRecWorkIds();

      // Safety net: re-resolve any unresolved titles through catalog validators
      const candidates = flat
        .filter((r) => !r.tmdbId)
        .map((r) => ({
          title: r.title,
          year: r.year,
          type: r.type,
          reason: r.reason,
          seedTitle: r.seedTitle,
        }));

      let resolvedFlat = filterDismissedPersonalized(
        flat.filter((r) => Boolean(r.tmdbId)),
        dismissed
      );

      if (candidates.length > 0) {
        const extra = await resolveRecommendationCandidates(candidates, prefs);
        for (const r of extra) {
          if (dismissed.has(r.workId)) continue;
          if (resolvedFlat.some((x) => x.tmdbId === r.workId)) continue;
          resolvedFlat.push({
            tmdbId: r.workId,
            title: r.media.canonicalTitle,
            year: r.media.year,
            type: r.media.type === 'book' || r.media.type === 'tv' ? r.media.type : 'movie',
            posterUrl: r.media.posterUrl || undefined,
            ratings: r.media.ratings,
            reason: r.reason,
            seedTitle: r.seedTitle,
            confidenceSignal: 'medium',
          });
        }
      }

      resolvedFlat = resolvedFlat.filter((r) => Boolean(r.tmdbId));

      let resolvedGrouped: RecommendationGroup[] | null = null;
      if (grouped) {
        resolvedGrouped = grouped
          .map((g) => ({
            seedTitle: g.seedTitle,
            recommendations: filterDismissedPersonalized(
              g.recommendations.filter((r) => Boolean(r.tmdbId)),
              dismissed
            ),
          }))
          .filter((g) => g.recommendations.length > 0);
        if (resolvedGrouped.length === 0) resolvedGrouped = null;
      }

      return { flat: resolvedFlat, grouped: resolvedGrouped };
    } catch (err) {
      logger.error('[Subsume] GET_PERSONALIZED_RECS failed:', err);
      return { error: 'llm_failed', flat: [], grouped: null };
    }
  },

  [MessageType.GET_LLM_PROVIDER_CAPABILITIES]: async () => {
    const prefs = await getPreferences();
    const provider = prefs.llmProvider || 'openai';
    return getLlmProviderCapabilities(provider);
  },

  [MessageType.SUBMIT_RECOMMENDATION_FEEDBACK]: async (payload) => {
    const req = payload as SubmitRecommendationFeedbackRequest;
    if (!req?.workId || !req?.action) {
      return { ok: false, error: 'invalid_payload' };
    }
    if (!['save', 'dismiss', 'not_interested'].includes(req.action)) {
      return { ok: false, error: 'invalid_action' };
    }

    const entries = await getRecFeedback();
    entries.push({
      workId: req.workId,
      action: req.action,
      at: Date.now(),
    });
    await saveRecFeedback(entries);
    return { ok: true };
  },

  [MessageType.GET_CURATOR_PROMPT_PREVIEW]: async () => {
    const prefs = await getPreferences();
    return buildCuratorPromptPreview(prefs);
  },

  [MessageType.GET_WEEKLY_DIGEST]: async () => {
    const cached = await getWeeklyDigest();
    if (cached && !isDigestStale(cached) && cached.items.length > 0) {
      return cached;
    }

    if (cached && cached.items.length > 0) {
      const prefs = await getPreferences();
      const regen = prefs.dispatchEnabled
        ? generateSubsumeDispatch(prefs)
        : generateWeeklyDigest(prefs);
      regen
        .then(async (digest) => {
          await saveWeeklyDigest(digest);
        })
        .catch((err) => {
          logger.error('[Subsume] Background weekly digest regen failed:', err);
        });
      return cached;
    }

    const prefs = await getPreferences();
    const digest = await resolveWeeklyDigest(prefs);
    await saveWeeklyDigest(digest);
    return digest;
  },

  [MessageType.REGENERATE_WEEKLY_DIGEST]: async () => {
    const prefs = await getPreferences();
    const digest = await resolveForcedDigest(prefs);
    await saveWeeklyDigest(digest);
    return digest;
  },

  [MessageType.GET_SUBSUME_DISPATCH]: async () => {
    const prefs = await getPreferences();
    if (prefs.dispatchEnabled) {
      const digest = await generateSubsumeDispatch(prefs);
      await saveWeeklyDigest(digest);
      return digest;
    }
    const cached = await getWeeklyDigest();
    if (cached && cached.items.length > 0) return cached;
    return resolveWeeklyDigest(prefs);
  },

  [MessageType.REGENERATE_SUBSUME_DISPATCH]: async () => {
    const prefs = await getPreferences();
    const digest = await resolveForcedDigest({ ...prefs, dispatchEnabled: true });
    await saveWeeklyDigest(digest);
    return digest;
  },

  [MessageType.GET_DISCOVERY_FEED]: async (payload) => {
    const req = (payload || {}) as GetDiscoveryFeedRequest;
    logger.log('[Subsume] GET_DISCOVERY_FEED', { force: !!req.force });
    return getDiscoveryFeed(!!req.force);
  },
};
