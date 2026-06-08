import { h } from 'preact';
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
import { DetailModal } from '../components/DetailModal';
import { PlatformChips } from '../components/PlatformChips';
import { getPlatformNameById } from '@/shared/platforms';

interface JoinedItem {
  library: LibraryItem;
  media: MediaItem;
}

interface DigestPick extends WeeklyDigestItem {
  media?: MediaItem;
}

interface HomeProps {
  onNavigate: (page: 'library' | 'recommendations' | 'new-releases') => void;
}

function pickRating(media: MediaItem): string | null {
  const imdb = media.ratings.find((r) => r.provider === 'imdb');
  if (imdb) return `⭐ ${imdb.score}/10`;
  const tmdb = media.ratings.find((r) => r.provider === 'tmdb');
  if (tmdb) return `★ ${tmdb.score.toFixed(1)}`;
  return null;
}

function platformsToAvailability(platforms: string[]) {
  return platforms.map((platform) => ({ region: '', platform }));
}

export function Home({ onNavigate }: HomeProps) {
  const [loading, setLoading] = useState(true);
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

    const mediaRes = await sendMessage<any, MediaItem[]>(MessageType.GET_MEDIA_ITEMS, {
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

  const loadWeeklyDigest = async () => {
    const digestRes = await sendMessage<{}, WeeklyDigest>(MessageType.GET_WEEKLY_DIGEST, {});
    if (digestRes.success && digestRes.data) {
      setWeeklyDigest(digestRes.data);
      await hydrateDigestPicks(digestRes.data);
    }
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [prefsRes, libraryRes, digestRes, recsRes] = await Promise.all([
          sendMessage<{}, UserPreferences>(MessageType.GET_PREFERENCES, {}),
          sendMessage<{}, JoinedItem[]>(MessageType.GET_LIBRARY, {}),
          sendMessage<{}, WeeklyDigest>(MessageType.GET_WEEKLY_DIGEST, {}),
          sendMessage<any, Recommendation[]>(MessageType.GET_RECOMMENDATIONS, {}),
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
          const mediaRes = await sendMessage<any, MediaItem[]>(MessageType.GET_MEDIA_ITEMS, { mediaIds });
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
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const handleRefreshDigest = async () => {
    setRefreshingDigest(true);
    try {
      const digestRes = await sendMessage<{}, WeeklyDigest>(MessageType.REGENERATE_WEEKLY_DIGEST, {});
      if (digestRes.success && digestRes.data) {
        setWeeklyDigest(digestRes.data);
        await hydrateDigestPicks(digestRes.data);
      }
    } catch (err) {
      console.error('[Subsume] Failed to refresh weekly digest', err);
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
    }
  };

  const platformNames = (prefs?.platforms || [])
    .map((id) => getPlatformNameById(id))
    .filter(Boolean)
    .join(', ');

  const digestBadge = weeklyDigest?.llmGenerated ? 'AI Curated' : 'Algorithm';

  return (
    <div className="page-container">
      <header className="page-header">
        <h2 className="page-title">Home</h2>
        <p className="page-subtitle">
          Your taste-aware dashboard — what to watch next and what just dropped.
        </p>
      </header>

      {loading ? (
        <div className="empty-state">
          <div className="subsume-spinner" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#c9a84c', width: 32, height: 32, borderWidth: 3 }} />
          <p style={{ marginTop: 16, color: 'var(--color-text-secondary)' }}>Loading your dashboard...</p>
        </div>
      ) : (
        <div style={{ padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {[
              { label: 'In Library', value: libraryCount, action: () => onNavigate('library') },
              { label: 'Want to Watch', value: toWatchCount, action: () => onNavigate('library') },
              { label: 'Watched', value: watchedCount, action: () => onNavigate('library') },
            ].map((stat) => (
              <button
                key={stat.label}
                onClick={stat.action}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '16px 18px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'inherit',
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>{stat.value}</div>
                <div style={{ fontSize: 13, color: 'var(--fg-subtle)', marginTop: 4 }}>{stat.label}</div>
              </button>
            ))}
          </div>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Picked For You</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--fg-subtle)' }}>
                  Based on your library{watchedCount >= 3 ? '' : ' — rate 3+ watched titles for AI picks'}.
                </p>
              </div>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => onNavigate('recommendations')}>
                See all →
              </button>
            </div>

            {picks.length === 0 ? (
              <div style={{ padding: 24, borderRadius: 12, border: '1px dashed var(--border)', color: 'var(--fg-subtle)', fontSize: 14 }}>
                Add a few titles and mark some as watched to unlock recommendations.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {picks.map(({ media, explanation }) => (
                  <div
                    key={media.id}
                    className="media-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedMedia(media)}
                  >
                    <div className="media-card-poster">
                      {media.posterUrl ? (
                        <img src={media.posterUrl} alt={media.canonicalTitle} loading="lazy" />
                      ) : (
                        <div className="empty-poster text-center p-4">No Image</div>
                      )}
                    </div>
                    <div className="media-card-body">
                      <h4 className="media-card-title">{media.canonicalTitle}</h4>
                      <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: '6px 0 0', lineHeight: 1.4 }}>{explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Your Weekly Picks</h3>
                  {weeklyDigest && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: weeklyDigest.llmGenerated ? 'rgba(167, 139, 250, 0.15)' : 'rgba(255,255,255,0.08)',
                        color: weeklyDigest.llmGenerated ? '#c4b5fd' : 'var(--fg-subtle)',
                        border: `1px solid ${weeklyDigest.llmGenerated ? 'rgba(167, 139, 250, 0.35)' : 'var(--border)'}`,
                      }}
                    >
                      {digestBadge}
                    </span>
                  )}
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--fg-subtle)' }}>
                  {platformNames
                    ? `New releases from the past week on ${platformNames}`
                    : 'Personalized new releases from the past week'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: '6px 12px' }}
                  disabled={refreshingDigest}
                  onClick={handleRefreshDigest}
                >
                  {refreshingDigest ? 'Refreshing…' : 'Refresh picks'}
                </button>
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => onNavigate('new-releases')}>
                  See all →
                </button>
              </div>
            </div>

            {weeklyPicks.length === 0 ? (
              <div style={{ padding: 24, borderRadius: 12, border: '1px dashed var(--border)', color: 'var(--fg-subtle)', fontSize: 14 }}>
                No weekly picks yet. Check your TMDb API key in Settings or refresh picks.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {weeklyPicks.map((pick) => {
                  const media = pick.media;
                  const rating = media ? pickRating(media) : null;
                  const availability = platformsToAvailability(pick.platforms);

                  return (
                    <div
                      key={pick.mediaId}
                      className="media-card"
                      style={{ cursor: media ? 'pointer' : 'default' }}
                      onClick={() => media && setSelectedMedia(media)}
                    >
                      <div className="media-card-poster">
                        {media?.posterUrl ? (
                          <img src={media.posterUrl} alt={pick.title} loading="lazy" />
                        ) : (
                          <div className="empty-poster text-center p-4">No Image</div>
                        )}
                      </div>
                      <div className="media-card-body">
                        <h4 className="media-card-title">{pick.title}</h4>
                        <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: '6px 0 0', lineHeight: 1.4 }}>
                          {pick.reason}
                        </p>
                        <PlatformChips availability={availability} max={3} compact />
                        <div className="media-card-meta">
                          <span>{pick.year}</span>
                          {rating && <span className="media-card-rating">{rating}</span>}
                        </div>
                        {media && (
                          <button
                            className="btn btn-secondary"
                            style={{ width: '100%', marginTop: 8, padding: '6px 0', fontSize: 12 }}
                            disabled={addedIds.has(media.id)}
                            onClick={(e) => { e.stopPropagation(); handleAdd(media); }}
                          >
                            {addedIds.has(media.id) ? '✓ Added' : '+ Add'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {selectedMedia && (
        <DetailModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onAddToLibrary={() => handleAdd(selectedMedia)}
        />
      )}
    </div>
  );
}