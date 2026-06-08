import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import { MessageType, MediaItem } from '@/shared/types';
import { DetailModal } from '../components/DetailModal';
import { PlatformChips } from '../components/PlatformChips';

export function NewReleases() {
  const [activeTab, setActiveTab] = useState<'movie' | 'tv'>('movie');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  useEffect(() => {
    async function fetchReleases() {
      setLoading(true);
      try {
        const res = await sendMessage<any, MediaItem[]>(MessageType.GET_LATEST_RELEASES, {
          type: activeTab
        });
        if (res.success && res.data) {
          setItems(res.data);
        }
      } catch (err) {
        console.error('Failed to load new releases', err);
      } finally {
        setLoading(false);
      }
    }
    fetchReleases();
  }, [activeTab]);

  const handleAddToLibrary = async (media: MediaItem) => {
    try {
      await sendMessage(MessageType.ADD_TO_LIST, { mediaItem: media, type: media.type });
      setAddedIds(prev => new Set([...prev, media.id]));
    } catch (err) {
      console.error('Failed to add to library', err);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h2 className="page-title">What's Trending</h2>
        <p className="page-subtitle">Discover the most popular new releases today.</p>
      </header>

      <div className="tab-bar">
        <button
          className={`tab-item ${activeTab === 'movie' ? 'active' : ''}`}
          onClick={() => setActiveTab('movie')}
        >
          Movies
        </button>
        <button
          className={`tab-item ${activeTab === 'tv' ? 'active' : ''}`}
          onClick={() => setActiveTab('tv')}
        >
          TV Shows
        </button>
      </div>

      <div className="library-content">
        {loading ? (
          <div className="empty-state">
            <div className="subsume-spinner" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#a78bfa', width: 32, height: 32, borderWidth: 3}} />
            <p style={{ marginTop: 16, color: 'var(--color-text-secondary)' }}>Consulting the pop-culture oracle...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎟️</div>
            <h3 className="empty-state-title">TMDb went dark</h3>
            <p className="empty-state-description">
              We couldn't fetch today's trending releases. TMDb might be taking a coffee break, or your internet is acting up. Check your API key or connection and try again.
            </p>
          </div>
        ) : (
           <div className="card-grid">
             {items.map((media) => (
                <div key={media.id} className="media-card" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setSelectedMedia(media)}>
                 <div className="media-card-poster">
                   {media.posterUrl ? (
                     <img src={media.posterUrl} alt={media.canonicalTitle} loading="lazy" />
                   ) : (
                     <div className="empty-poster text-center p-4">No Image</div>
                   )}
                 </div>
                 <div className="media-card-body">
                   <h4 className="media-card-title" style={{ WebkitLineClamp: 1, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                     {media.canonicalTitle}
                   </h4>
                   <PlatformChips availability={media.streamingAvailability} max={2} compact />
                   <div className="media-card-meta">
                     <span>{media.year}</span>
                     {media.ratings?.find(r => r.provider === 'tmdb') && (
                        <span className="media-card-rating">
                          ⭐ {media.ratings.find(r => r.provider === 'tmdb')!.score.toFixed(1)}
                        </span>
                     )}
                   </div>
                     <button 
                       className="btn btn-secondary" 
                       style={{ width: '100%', marginTop: 8, padding: '6px 0', fontSize: 13 }}
                       onClick={(e) => { e.stopPropagation(); handleAddToLibrary(media); }}
                       disabled={addedIds.has(media.id)}
                     >
                       {addedIds.has(media.id) ? '✓ Added' : '+ Add to Library'}
                     </button>
                 </div>
               </div>
            ))}
          </div>
        )}
      </div>

      {selectedMedia && (
        <DetailModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onAddToLibrary={() => handleAddToLibrary(selectedMedia)}
        />
      )}
    </div>
  );
}
