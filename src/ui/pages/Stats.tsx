import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import { MessageType, LibraryItem, MediaItem } from '@/shared/types';

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

  // 1. Total Watched
  const totalWatched = watchedItems.length;

  // 2. Total Hours
  const totalMinutes = watchedItems.reduce((acc, item) => acc + (item.media?.runtimeMinutes || 0), 0);
  const totalHours = Math.round(totalMinutes / 60);

  // 3. Average Rating
  const ratedItems = watchedItems.filter(i => i.library.userRating !== undefined);
  const avgRating = ratedItems.length > 0
    ? (ratedItems.reduce((acc, item) => acc + item.library.userRating!, 0) / ratedItems.length).toFixed(1)
    : '—';

  // 4. Genre Breakdown
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

  // 5. Media Mix
  const moviesCount = watchedItems.filter(i => i.media?.type === 'movie').length;
  const tvCount = watchedItems.filter(i => i.media?.type === 'tv').length;
  const totalWatchedType = moviesCount + tvCount;
  const moviePercent = totalWatchedType > 0 ? Math.round((moviesCount / totalWatchedType) * 100) : 50;
  const tvPercent = totalWatchedType > 0 ? Math.round((tvCount / totalWatchedType) * 100) : 50;

  return (
    <div className="page-container">
      <header className="page-header">
        <h2 className="page-title">Personal Statistics</h2>
        <p className="page-subtitle">A comprehensive breakdown of your taste and watching history.</p>
      </header>

      {loading ? (
        <div className="empty-state">
           <div className="subsume-spinner" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#a78bfa', width: 32, height: 32, borderWidth: 3}} />
           <p style={{ marginTop: 16, color: 'var(--color-text-secondary)' }}>Calculating metrics...</p>
        </div>
      ) : totalWatched === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <h3 className="empty-state-title">No stats yet</h3>
          <p className="empty-state-description">
            Mark a few titles in your library as "Watched" and give them a rating to unlock your personal metrics dashboard!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Key Stat Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {/* Stat Card 1 */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>🎬</span>
              <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary)', display: 'block' }}>{totalWatched}</span>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Watched Titles</span>
            </div>
            
            {/* Stat Card 2 */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>⏳</span>
              <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary)', display: 'block' }}>{totalHours}</span>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hours Logged</span>
            </div>

            {/* Stat Card 3 */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>⭐</span>
              <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary)', display: 'block' }}>{avgRating}</span>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Rating</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {/* Genre Distribution Chart */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 10 }}>
                Top Genres
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {sortedGenres.map(([genre, count]) => {
                  const widthPercent = Math.round((count / maxGenreCount) * 100);
                  return (
                    <div key={genre} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{genre}</span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{count} {count === 1 ? 'title' : 'titles'}</span>
                      </div>
                      <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${widthPercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary-soft), var(--primary))', borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Media Mix */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 10 }}>
                Media Format Mix
              </h3>
              
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
                {/* Visual Progress Mix Bar */}
                <div style={{ width: '100%', height: 24, background: 'rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden', display: 'flex' }}>
                  {moviesCount > 0 && (
                    <div 
                      style={{ 
                        width: `${moviePercent}%`, 
                        height: '100%', 
                        background: 'var(--primary)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: 11, 
                        fontWeight: 'bold',
                        color: 'var(--color-surface)'
                      }}
                    >
                      {moviePercent}%
                    </div>
                  )}
                  {tvCount > 0 && (
                    <div 
                      style={{ 
                        width: `${tvPercent}%`, 
                        height: '100%', 
                        background: 'rgba(255,255,255,0.1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: 11, 
                        fontWeight: 'bold',
                        color: 'var(--color-text)'
                      }}
                    >
                      {tvPercent}%
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 32, justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--primary)' }} />
                    <span style={{ fontSize: 13, color: 'var(--color-text)' }}>Movies ({moviesCount})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(255,255,255,0.1)' }} />
                    <span style={{ fontSize: 13, color: 'var(--color-text)' }}>TV Shows ({tvCount})</span>
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
