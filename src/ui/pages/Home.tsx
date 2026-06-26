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
    <div className="page-container sanctuary-page">
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
        <div className="home-main-content">
          <div className="home-stat-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton skeleton-stat" style={{ animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
          <div className="home-skeleton-card-grid">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton skeleton-card" style={{ animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="home-main-content">
          <div className="home-stat-grid">
            {[
              { label: 'In Sanctuary', value: libraryCount, action: () => onNavigate('library') },
              { label: 'Anticipated', value: toWatchCount, action: () => onNavigate('library') },
              { label: 'Reflected', value: watchedCount, action: () => onNavigate('library') },
            ].map((stat) => (
              <button
                key={stat.label}
                onClick={stat.action}
                className="home-stat-btn"
              >
                <div className="home-stat-val">{stat.value}</div>
                <div className="home-stat-lbl">{stat.label}</div>
              </button>
            ))}
          </div>

          <section>
            <div className="home-section-header">
              <div>
                <h3 className="home-section-title">Picked For You</h3>
                <p className="home-section-desc">
                  {watchedCount >= 3 ? 'Curated from your sanctuary reflections' : 'Reflect on 3+ watched titles to unlock AI picks'}
                </p>
              </div>
              <button className="optical-button sm" onClick={() => onNavigate('recommendations')}>
                Explore All
              </button>
            </div>

            {picks.length === 0 ? (
              <div className="sanctuary-empty-plaque home-empty-notice">
                <span className="sanctuary-plaque-index">Sanctuary Notice</span>
                <p className="sanctuary-plaque-text">Add a few titles and mark some as watched to unlock personalized reflections.</p>
              </div>
            ) : (
              <div className="home-picks-grid">
                {picks.map(({ media, explanation }) => (
                  <div
                    key={media.id}
                    className="sanctuary-media-card clickable"
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
                      <p className="sanctuary-card-synopsis">{explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="home-section-header wrap">
              <div>
                <div className="home-section-title-row">
                  <h3 className="home-section-title">This Week</h3>
                  {weeklyDigest && (
                    <span className={`home-digest-badge ${weeklyDigest.llmGenerated ? 'ai' : 'algo'}`}>
                      {digestBadge}
                    </span>
                  )}
                </div>
                <p className="home-section-desc">
                  {platformNames ? `Programme arrivals on ${platformNames}` : 'Curated programme releases'}
                </p>
              </div>
              <div className="home-btn-group">
                <button
                  className="optical-button sm"
                  disabled={refreshingDigest}
                  onClick={handleRefreshDigest}
                >
                  {refreshingDigest ? 'Refreshing…' : 'Refresh Programme'}
                </button>
                <button className="optical-button sm" onClick={() => onNavigate('new-releases')}>
                  Full Programme
                </button>
              </div>
            </div>

            {weeklyPicks.length === 0 ? (
              <div className="sanctuary-empty-plaque home-empty-notice">
                <span className="sanctuary-plaque-index">Programme Notice</span>
                <p className="sanctuary-plaque-text">No weekly programme yet. Check your TMDb API key in Settings or refresh programme.</p>
              </div>
            ) : (
              <div className="home-weekly-grid">
                {weeklyPicks.map((pick) => {
                  const media = pick.media;
                  const rating = media ? pickRating(media) : null;
                  const availability = platformsToAvailability(pick.platforms);

                  return (
                    <div
                      key={pick.mediaId}
                      className={`sanctuary-media-card ${media ? 'clickable' : 'default-cursor'}`}
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
                        <p className="sanctuary-card-synopsis">
                          {pick.reason}
                        </p>
                        <div className="home-chips-wrap">
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