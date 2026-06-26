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
    <div className="page-container" style={{ background: 'var(--bg-sanctuary)', minHeight: '100vh', color: 'var(--text-artwork)' }}>
      <header className="sanctuary-header">
        <div className="sanctuary-header-meta">
          <span className="sanctuary-subtitle">Archival Colophon</span>
        </div>
        <h2 className="sanctuary-title">Personal Statistics</h2>
        <p className="sanctuary-description">An archival breakdown of your sanctuary reflections and auteur engagement.</p>
      </header>

      {loading ? (
        <div className="sanctuary-empty-plaque">
           <div className="subsume-spinner" style={{ margin: '0 auto' }} />
           <p className="sanctuary-plaque-text" style={{ marginTop: 16 }}>Compiling archival plates...</p>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Key Stat Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {/* Stat Card 1 */}
            <div style={{ background: 'var(--bg-plaque)', border: '1px solid var(--border-restraint)', borderRadius: 4, padding: '28px 24px', textAlign: 'center', backdropFilter: 'var(--blur-hero)' }}>
              <span className="sanctuary-plaque-index" style={{ marginBottom: 16 }}>Plate I</span>
              <span className="stat-value" style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 42, fontWeight: 400, color: 'var(--text-reflection)', display: 'block', lineHeight: 1, marginBottom: 8 }}>{totalWatched}</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-meta)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Reflected Titles</span>
            </div>
            
            {/* Stat Card 2 */}
            <div style={{ background: 'var(--bg-plaque)', border: '1px solid var(--border-restraint)', borderRadius: 4, padding: '28px 24px', textAlign: 'center', backdropFilter: 'var(--blur-hero)' }}>
              <span className="sanctuary-plaque-index" style={{ marginBottom: 16 }}>Plate II</span>
              <span className="stat-value" style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 42, fontWeight: 400, color: 'var(--text-reflection)', display: 'block', lineHeight: 1, marginBottom: 8 }}>{totalHours}</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-meta)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Hours Sanctuary</span>
            </div>

            {/* Stat Card 3 */}
            <div style={{ background: 'var(--bg-plaque)', border: '1px solid var(--border-restraint)', borderRadius: 4, padding: '28px 24px', textAlign: 'center', backdropFilter: 'var(--blur-hero)' }}>
              <span className="sanctuary-plaque-index" style={{ marginBottom: 16 }}>Plate III</span>
              <span className="stat-value" style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 42, fontWeight: 400, color: 'var(--border-hero)', display: 'block', lineHeight: 1, marginBottom: 8 }}>{avgRating}</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-meta)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Mean Resonance</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {/* Genre Distribution Chart */}
            <div style={{ background: 'var(--bg-plaque)', border: '1px solid var(--border-restraint)', borderRadius: 4, padding: 28, backdropFilter: 'var(--blur-hero)' }}>
              <h3 style={{ fontFamily: 'var(--font-editorial)', fontSize: 20, fontStyle: 'italic', fontWeight: 400, color: 'var(--text-reflection)', margin: '0 0 24px 0', borderBottom: '1px solid var(--border-restraint)', paddingBottom: 12 }}>
                Auteur & Taxonomy Distribution
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {sortedGenres.map(([genre, count]) => {
                  const widthPercent = Math.round((count / maxGenreCount) * 100);
                  return (
                    <div key={genre} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
                        <span style={{ color: 'var(--text-reflection)', fontWeight: 400, letterSpacing: '0.02em' }}>{genre}</span>
                        <span style={{ color: 'var(--text-meta)', fontStyle: 'italic', fontFamily: 'var(--font-editorial)' }}>{count} {count === 1 ? 'record' : 'records'}</span>
                      </div>
                      <div style={{ width: '100%', height: 6, background: 'hsla(0, 0%, 100%, 0.04)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${widthPercent}%`, height: '100%', background: 'var(--border-hero)', borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Media Mix */}
            <div style={{ background: 'var(--bg-plaque)', border: '1px solid var(--border-restraint)', borderRadius: 4, padding: 28, display: 'flex', flexDirection: 'column', backdropFilter: 'var(--blur-hero)' }}>
              <h3 style={{ fontFamily: 'var(--font-editorial)', fontSize: 20, fontStyle: 'italic', fontWeight: 400, color: 'var(--text-reflection)', margin: '0 0 24px 0', borderBottom: '1px solid var(--border-restraint)', paddingBottom: 12 }}>
                Sanctuary Format Balance
              </h3>
              
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 28 }}>
                {/* Visual Progress Mix Bar */}
                <div style={{ width: '100%', height: 18, background: 'hsla(0, 0%, 100%, 0.04)', borderRadius: 2, overflow: 'hidden', display: 'flex', border: '1px solid var(--border-restraint)' }}>
                  {moviesCount > 0 && (
                    <div 
                      style={{ 
                        width: `${moviePercent}%`, 
                        height: '100%', 
                        background: 'var(--border-hero)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontFamily: 'var(--font-ui)',
                        fontSize: 10, 
                        fontWeight: 500,
                        letterSpacing: '0.05em',
                        color: 'hsl(240, 18%, 5%)'
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
                        background: 'hsla(0, 0%, 100%, 0.12)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontFamily: 'var(--font-ui)',
                        fontSize: 10, 
                        fontWeight: 500,
                        letterSpacing: '0.05em',
                        color: 'var(--text-reflection)'
                      }}
                    >
                      {tvPercent}%
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 36, justifyContent: 'center', fontFamily: 'var(--font-ui)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--border-hero)' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-artwork)', letterSpacing: '0.04em' }}>Cinema ({moviesCount})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: 'hsla(0, 0%, 100%, 0.12)' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-artwork)', letterSpacing: '0.04em' }}>Series ({tvCount})</span>
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
