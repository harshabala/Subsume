import { h } from 'preact';
import { DetailModal } from '../components/DetailModal';
import { useHomeData } from '../hooks/useHomeData';
import { SimulatedPostsSection } from '../components/SimulatedPostsSection';
import { WeeklyDigestSection } from '../components/WeeklyDigestSection';
import { pickRating } from '../utils/mediaUtils';

interface HomeProps {
  onNavigate: (page: 'library' | 'recommendations' | 'new-releases') => void;
  onOpenCapture?: (mediaId: string) => void;
}

export function Home({ onNavigate, onOpenCapture }: HomeProps) {
  const {
    loading,
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
    setSelectedMedia
  } = useHomeData();

  const heroMedia = weeklyPicks.find((p) => p.media)?.media || picks[0]?.media || null;
  const heroTitle = heroMedia?.canonicalTitle || "In the Mood for Love";
  const heroDirector = heroMedia?.wikidataDirectorBio || "Wong Kar-wai";
  const heroRating = heroMedia ? (pickRating(heroMedia) || "TMDb 4.8") : "TMDb 4.8";
  const heroQuote = heroMedia?.overview
    ? (heroMedia.overview.length > 120 ? heroMedia.overview.slice(0, 117) + "..." : heroMedia.overview)
    : "He remembers those vanished years. As though looking through a dusty window pane, the past is something he could see, but not touch.";
  const heroPoster = heroMedia?.posterUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80";
  const heroMediaId = heroMedia?.id || "tmdb_movie_1024";

  return (
    <div className="page-container sanctuary-page focus-pull-active">
      <SimulatedPostsSection />

      {/* Cinematic Lobby Header / Grid */}
      <div className="lobby-container">
        <div className="hero-poster-column">
          <div className="hero-poster-frame">
            <img src={heroPoster} alt={heroTitle} className="hero-poster-img" />
            <div className="catalogue-plaque-card">
              <div className="plaque-header">
                <span className="plaque-rating">{heroRating}</span>
                <span className="plaque-index">No. 001</span>
              </div>
              <h3 className="plaque-title">{heroTitle}</h3>
              <p className="plaque-director">Directed by {heroDirector}</p>
              <blockquote className="plaque-quote">"{heroQuote}"</blockquote>
              <div className="plaque-actions">
                <button
                  className="plaque-btn reflect"
                  onClick={() => onOpenCapture?.(heroMediaId)}
                >
                  Reflect
                </button>
                <button
                  className="plaque-btn archive"
                  onClick={() => onNavigate('library')}
                >
                  Archive
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lobby-info-column">
          <span className="lobby-act">Act I</span>
          <h2 className="lobby-heading">Discovery</h2>
          <p className="lobby-desc">
            Welcome to the entry hall of your sanctuary. Here, the cinema you encounter is catalogued not merely by metadata, but by the emotional imprint it leaves behind.
          </p>
          <div className="lobby-status-panel">
            <span className="status-indicator"></span>
            <span className="status-text">Contextual Awareness Engine v2.4 Active</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="home-main-content" style={{ marginTop: '4rem' }}>
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
        <div className="home-main-content" style={{ marginTop: '4rem' }}>
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

          <WeeklyDigestSection
            weeklyDigest={weeklyDigest}
            weeklyPicks={weeklyPicks}
            refreshingDigest={refreshingDigest}
            platformNames={platformNames}
            digestBadge={digestBadge}
            addedIds={addedIds}
            onNavigate={onNavigate}
            onRefreshDigest={handleRefreshDigest}
            onSelectMedia={setSelectedMedia}
            onAddMedia={handleAdd}
          />
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