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
  if (imdb) return `IMDb ${imdb.score}/10`;
  const tmdb = media.ratings.find((r) => r.provider === 'tmdb');
  if (tmdb) return `TMDb ${tmdb.score.toFixed(1)}`;
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
    <div className="page-container" style={{ background: 'var(--bg-sanctuary)', minHeight: '100vh', color: 'var(--text-artwork)' }}>
      <header className="sanctuary-header">
        <div className="sanctuary-header-meta">
          <span className="sanctuary-subtitle">Auditorium Sanctuary</span>
        </div>
        <h2 className="sanctuary-title">Home</h2>
        <p className="sanctuary-description">
          Your taste-aware sanctuary — what to reflect on next and programme arrivals.
        </p>
      </header>

      {loading ? (
        <div style={{ padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton skeleton-stat" style={{ animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton skeleton-card" style={{ animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {[
              { label: 'In Sanctuary', value: libraryCount, action: () => onNavigate('library') },
              { label: 'Anticipated', value: toWatchCount, action: () => onNavigate('library') },
              { label: 'Reflected', value: watchedCount, action: () => onNavigate('library') },
            ].map((stat) => (
              <button
                key={stat.label}
                onClick={stat.action}
                style={{
                  background: 'var(--bg-plaque)',
                  border: '1px solid var(--border-restraint)',
                  borderRadius: 4,
                  padding: '24px 28px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'inherit',
                  backdropFilter: 'var(--blur-hero)',
                  transition: 'border-color 250ms ease, background 250ms ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hero)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-plaque-hover)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-restraint)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-plaque)';
                }}
              >
                <div className="stat-value" style={{
                  fontFamily: 'var(--font-editorial)',
                  fontSize: 38,
                  fontWeight: 400,
                  fontStyle: 'italic',
                  color: 'var(--text-reflection)',
                  lineHeight: 1,
                  marginBottom: 8,
                }}>{stat.value}</div>
                <div style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 11,
                  color: 'var(--text-meta)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                }}>{stat.label}</div>
              </button>
            ))}
          </div>

          <section>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border-restraint)' }}>
              <div>
                <h3 style={{
                  fontFamily: 'var(--font-editorial)',
                  fontSize: 24,
                  fontWeight: 400,
                  fontStyle: 'italic',
                  color: 'var(--text-reflection)',
                  margin: '0 0 6px',
                }}>Picked For You</h3>
                <p style={{ fontFamily: 'var(--font-ui)', margin: 0, fontSize: 13, color: 'var(--text-meta)' }}>
                  {watchedCount >= 3 ? 'Curated from your sanctuary reflections' : 'Reflect on 3+ watched titles to unlock AI picks'}
                </p>
              </div>
              <button className="optical-button" style={{ padding: '8px 16px' }} onClick={() => onNavigate('recommendations')}>
                Explore All
              </button>
            </div>

            {picks.length === 0 ? (
              <div className="sanctuary-empty-plaque" style={{ margin: '24px 0' }}>
                <span className="sanctuary-plaque-index">Sanctuary Notice</span>
                <p className="sanctuary-plaque-text">Add a few titles and mark some as watched to unlock personalized reflections.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
                {picks.map(({ media, explanation }) => (
                  <div
                    key={media.id}
                    className="sanctuary-media-card"
                    onClick={() => setSelectedMedia(media)}
                  >
                    <div className="sanctuary-card-poster">
                      {media.posterUrl ? (
                        <img src={media.posterUrl} alt={media.canonicalTitle} className="sanctuary-poster-img" loading="lazy" />
                      ) : (
                        <div className="sanctuary-poster-placeholder">
                          <span className="sanctuary-placeholder-title">No Image</span>
                        </div>
                      )}
                    </div>
                    <div className="sanctuary-card-content">
                      <h4 className="sanctuary-card-title">{media.canonicalTitle}</h4>
                      <p className="sanctuary-card-synopsis" style={{ margin: 0 }}>{explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border-restraint)', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h3 style={{
                    fontFamily: 'var(--font-editorial)',
                    fontSize: 24,
                    fontWeight: 400,
                    fontStyle: 'italic',
                    color: 'var(--text-reflection)',
                    margin: 0,
                  }}>This Week</h3>
                  {weeklyDigest && (
                    <span style={{
                      fontFamily: 'var(--font-ui)',
                      fontSize: 10,
                      fontWeight: 500,
                      padding: '4px 10px',
                      borderRadius: 2,
                      background: weeklyDigest.llmGenerated ? 'hsla(45, 90%, 65%, 0.12)' : 'var(--bg-plaque)',
                      color: weeklyDigest.llmGenerated ? 'hsl(45, 90%, 75%)' : 'var(--text-meta)',
                      border: `1px solid ${weeklyDigest.llmGenerated ? 'var(--border-hero)' : 'var(--border-restraint)'}`,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}>
                      {digestBadge}
                    </span>
                  )}
                </div>
                <p style={{ fontFamily: 'var(--font-ui)', margin: 0, fontSize: 13, color: 'var(--text-meta)' }}>
                  {platformNames ? `Programme arrivals on ${platformNames}` : 'Curated programme releases'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="optical-button"
                  style={{ padding: '8px 16px' }}
                  disabled={refreshingDigest}
                  onClick={handleRefreshDigest}
                >
                  {refreshingDigest ? 'Refreshing…' : 'Refresh Programme'}
                </button>
                <button className="optical-button" style={{ padding: '8px 16px' }} onClick={() => onNavigate('new-releases')}>
                  Full Programme
                </button>
              </div>
            </div>

            {weeklyPicks.length === 0 ? (
              <div className="sanctuary-empty-plaque" style={{ margin: '24px 0' }}>
                <span className="sanctuary-plaque-index">Programme Notice</span>
                <p className="sanctuary-plaque-text">No weekly programme yet. Check your TMDb API key in Settings or refresh programme.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
                {weeklyPicks.map((pick) => {
                  const media = pick.media;
                  const rating = media ? pickRating(media) : null;
                  const availability = platformsToAvailability(pick.platforms);

                  return (
                    <div
                      key={pick.mediaId}
                      className="sanctuary-media-card"
                      style={{ cursor: media ? 'pointer' : 'default' }}
                      onClick={() => media && setSelectedMedia(media)}
                    >
                      <div className="sanctuary-card-poster">
                        {media?.posterUrl ? (
                          <img src={media.posterUrl} alt={pick.title} className="sanctuary-poster-img" loading="lazy" />
                        ) : (
                          <div className="sanctuary-poster-placeholder">
                            <span className="sanctuary-placeholder-title">No Image</span>
                          </div>
                        )}
                      </div>
                      <div className="sanctuary-card-content">
                        <h4 className="sanctuary-card-title">{pick.title}</h4>
                        <p className="sanctuary-card-synopsis" style={{ margin: 0 }}>
                          {pick.reason}
                        </p>
                        <div style={{ margin: '4px 0' }}>
                          <PlatformChips availability={availability} max={3} compact />
                        </div>
                        <div className="sanctuary-card-meta">
                          <span>{pick.year}</span>
                          {rating && <span>{rating}</span>}
                        </div>
                        {media && (
                          <div className="sanctuary-card-actions">
                            <button
                              className="sanctuary-acquire-btn"
                              disabled={addedIds.has(media.id)}
                              onClick={(e) => { e.stopPropagation(); handleAdd(media); }}
                            >
                              {addedIds.has(media.id) ? 'Acquired' : '+ Acquire'}
                            </button>
                          </div>
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