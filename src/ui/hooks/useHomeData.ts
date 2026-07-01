import { useState, useEffect } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import {
  MessageType,
  MediaItem,
  LibraryItem,
  Recommendation,
  UserPreferences,
  WeeklyDigest,
  WeeklyDigestItem,
} from '@/shared/types';
import { getPlatformNameById } from '@/shared/platforms';

interface JoinedItem {
  library: LibraryItem;
  media: MediaItem;
}

export interface DigestPick extends WeeklyDigestItem {
  media?: MediaItem;
}

export function useHomeData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingDigest, setRefreshingDigest] = useState(false);
  const [libraryCount, setLibraryCount] = useState(0);
  const [watchedCount, setWatchedCount] = useState(0);
  const [toWatchCount, setToWatchCount] = useState(0);
  const [weeklyDigest, setWeeklyDigest] = useState<WeeklyDigest | null>(null);
  const [weeklyPicks, setWeeklyPicks] = useState<DigestPick[]>([]);
  const [picks, setPicks] = useState<(Recommendation & { media: MediaItem })[]>([]);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const hydrateDigestPicks = async (digest: WeeklyDigest) => {
    const items = digest.items.slice(0, 12);
    if (items.length === 0) {
      setWeeklyPicks([]);
      return;
    }

    const mediaRes = await sendMessage<unknown, MediaItem[]>(MessageType.GET_MEDIA_ITEMS, {
      mediaIds: items.map((item) => item.mediaId),
    });

    const mediaMap = new Map((mediaRes.data || []).map((m) => [m.id, m]));
    setWeeklyPicks(
      items.map((item) => ({
        ...item,
        media: mediaMap.get(item.mediaId),
      }))
    );
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [prefsRes, libraryRes, digestRes, recsRes] = await Promise.all([
          sendMessage<{}, UserPreferences>(MessageType.GET_PREFERENCES, {}),
          sendMessage<{}, JoinedItem[]>(MessageType.GET_LIBRARY, {}),
          sendMessage<{}, WeeklyDigest>(MessageType.GET_WEEKLY_DIGEST, {}),
          sendMessage<unknown, Recommendation[]>(MessageType.GET_RECOMMENDATIONS, {}),
        ]);

        if (prefsRes.success && prefsRes.data) setPrefs(prefsRes.data);

        if (libraryRes.success && libraryRes.data) {
          setLibraryCount(libraryRes.data.length);
          setWatchedCount(libraryRes.data.filter((i) => i.library.status === 'watched').length);
          setToWatchCount(libraryRes.data.filter((i) => i.library.status === 'to-watch').length);
        }

        if (digestRes.success && digestRes.data) {
          setWeeklyDigest(digestRes.data);
          await hydrateDigestPicks(digestRes.data);
        }

        const recData = recsRes.data || [];
        if (recData.length > 0 && !('seedTitle' in recData[0])) {
          const mediaIds = (recData as Recommendation[]).map((r) => r.mediaId).slice(0, 6);
          const mediaRes = await sendMessage<unknown, MediaItem[]>(MessageType.GET_MEDIA_ITEMS, { mediaIds });
          if (mediaRes.data) {
            const mediaMap = new Map(mediaRes.data.map((m) => [m.id, m]));
            const hydrated = (recData as Recommendation[])
              .map((r) => ({ ...r, media: mediaMap.get(r.mediaId)! }))
              .filter((r) => r.media)
              .slice(0, 6);
            setPicks(hydrated);
          }
        }
      } catch (err) {
        console.error('[Subsume] Failed to load home dashboard', err);
        setError('Failed to load your sanctuary. Please try refreshing.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const handleRefreshDigest = async () => {
    setRefreshingDigest(true);
    setError(null);
    try {
      const digestRes = await sendMessage<{}, WeeklyDigest>(MessageType.REGENERATE_WEEKLY_DIGEST, {});
      if (digestRes.success && digestRes.data) {
        setWeeklyDigest(digestRes.data);
        await hydrateDigestPicks(digestRes.data);
      }
    } catch (err) {
      console.error('[Subsume] Failed to refresh weekly digest', err);
      setError('Failed to refresh the programme. Please try again.');
    } finally {
      setRefreshingDigest(false);
    }
  };

  const handleAdd = async (media: MediaItem) => {
    try {
      await sendMessage(MessageType.ADD_TO_LIST, { mediaItem: media, type: media.type });
      setAddedIds((prev) => new Set(prev).add(media.id));
      setLibraryCount((c) => c + 1);
      setToWatchCount((c) => c + 1);
    } catch (err) {
      console.error('Failed to add to library', err);
      setError('Failed to add item to your library.');
    }
  };

  const platformNames = (prefs?.platforms || [])
    .map((id) => getPlatformNameById(id))
    .filter(Boolean)
    .join(', ');

  const digestBadge = weeklyDigest?.llmGenerated ? 'AI Curated' : 'Algorithm';

  return {
    loading,
    error,
    refreshingDigest,
    libraryCount,
    watchedCount,
    toWatchCount,
    weeklyDigest,
    weeklyPicks,
    picks,
    addedIds,
    handleRefreshDigest,
    handleAdd,
    platformNames,
    digestBadge,
    selectedMedia,
    setSelectedMedia,
  };
}
