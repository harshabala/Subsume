import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import { MessageType, LibraryItem, MediaItem } from '@/shared/types';
import { EmotionalWeatherChart } from '../components/EmotionalWeatherChart';

interface JoinedItem {
  library: LibraryItem;
  media: MediaItem;
}

export function Stats() {
  const [items, setItems] = useState<JoinedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLibrary() {
      setLoading(true);
      try {
        const res = await sendMessage<any, JoinedItem[]>(MessageType.GET_LIBRARY, {});
        if (res.success && res.data) {
          setItems(res.data);
        }
      } catch (err) {
        console.error('Failed to load library stats', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLibrary();
  }, []);

  const watchedItems = items.filter(i => i.library.status === 'watched');

  const totalWatched = watchedItems.length;

  const totalMinutes = watchedItems.reduce((acc, item) => acc + (item.media?.runtimeMinutes || 0), 0);
  const totalHours = Math.round(totalMinutes / 60);

  const ratedItems = watchedItems.filter(i => i.library.userRating !== undefined);
  const avgRating = ratedItems.length > 0
    ? (ratedItems.reduce((acc, item) => acc + item.library.userRating!, 0) / ratedItems.length).toFixed(1)
    : '—';

  const genreCounts: Record<string, number> = {};
  watchedItems.forEach(item => {
    (item.media?.genres || []).forEach(g => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });
  const maxGenreCount = Math.max(...Object.values(genreCounts), 1);
  const sortedGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const moviesCount = watchedItems.filter(i => i.media?.type === 'movie').length;
  const tvCount = watchedItems.filter(i => i.media?.type === 'tv').length;
  const totalWatchedType = moviesCount + tvCount;
  const moviePercent = totalWatchedType > 0 ? Math.round((moviesCount / totalWatchedType) * 100) : 50;
  const tvPercent = totalWatchedType > 0 ? Math.round((tvCount / totalWatchedType) * 100) : 50;

  return (
    <div className="page-container sanctuary-page-shell">
      <header className="sanctuary-header">
        <div className="sanctuary-header-meta">
          <span className="sanctuary-subtitle">Archival Colophon</span>
        </div>
        <h2 className="sanctuary-title">Personal Statistics</h2>
        <p className="sanctuary-description">An archival breakdown of your sanctuary reflections and auteur engagement.</p>
      </header>

      {loading ? (
        <div className="sanctuary-empty-plaque">
           <div className="subsume-spinner sanctuary-spinner-centered" />
           <p className="sanctuary-plaque-text sanctuary-plaque-text-spaced">Compiling archival plates...</p>
        </div>
      ) : totalWatched === 0 ? (
        <div className="sanctuary-empty-plaque">
          <span className="sanctuary-plaque-index">Plate Index 00</span>
          <h3 className="sanctuary-plaque-title">No reflections recorded</h3>
          <p className="sanctuary-plaque-text">
            Mark titles in your sanctuary as "Watched" and provide reflections to assemble your archival scientific museum plates.
          </p>
        </div>
      ) : (
        <div className="stats-stack">
          <EmotionalWeatherChart
            items={items.map((item) => item.library)}
            className="stats-weather-chart"
          />

          <div className="stats-grid">
            <div className="stats-plaque-card">
              <span className="sanctuary-plaque-index stats-plaque-index">Plate I</span>
              <span className="stat-value stats-plaque-value">{totalWatched}</span>
              <span className="stats-plaque-label">Reflected Titles</span>
            </div>

            <div className="stats-plaque-card">
              <span className="sanctuary-plaque-index stats-plaque-index">Plate II</span>
              <span className="stat-value stats-plaque-value">{totalHours}</span>
              <span className="stats-plaque-label">Hours Sanctuary</span>
            </div>

            <div className="stats-plaque-card">
              <span className="sanctuary-plaque-index stats-plaque-index">Plate III</span>
              <span className="stat-value stats-plaque-value accent">{avgRating}</span>
              <span className="stats-plaque-label">Mean Resonance</span>
            </div>
          </div>

          <div className="stats-charts-grid">
            <div className="stats-chart-panel">
              <h3 className="stats-chart-title">
                Auteur & Taxonomy Distribution
              </h3>
              <div className="stats-genre-list">
                {sortedGenres.map(([genre, count]) => {
                  const widthPercent = Math.round((count / maxGenreCount) * 100);
                  return (
                    <div key={genre} className="stats-genre-row">
                      <div className="stats-genre-header">
                        <span className="stats-genre-name">{genre}</span>
                        <span className="stats-genre-count">{count} {count === 1 ? 'record' : 'records'}</span>
                      </div>
                      <div className="stats-progress-track">
                        <div className="stats-progress-fill" style={{ width: `${widthPercent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="stats-chart-panel flex-col">
              <h3 className="stats-chart-title">
                Sanctuary Format Balance
              </h3>

              <div className="stats-mix-center">
                <div className="stats-mix-bar">
                  {moviesCount > 0 && (
                    <div className="stats-mix-segment cinema" style={{ width: `${moviePercent}%` }}>
                      {moviePercent}%
                    </div>
                  )}
                  {tvCount > 0 && (
                    <div className="stats-mix-segment series" style={{ width: `${tvPercent}%` }}>
                      {tvPercent}%
                    </div>
                  )}
                </div>

                <div className="stats-legend">
                  <div className="stats-legend-item">
                    <div className="stats-legend-swatch cinema" />
                    <span className="stats-legend-label">Cinema ({moviesCount})</span>
                  </div>
                  <div className="stats-legend-item">
                    <div className="stats-legend-swatch series" />
                    <span className="stats-legend-label">Series ({tvCount})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}