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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    sendMessage(MessageType.CLEAR_NOTIFICATION_BADGE, {}).catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchReleases() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await sendMessage<any, MediaItem[]>(MessageType.GET_LATEST_RELEASES, {
          type: activeTab
        });
        setItems(res.data ?? []);
      } catch (err) {
        console.error('Failed to load new releases', err);
        setItems([]);
        setLoadError(err instanceof Error ? err.message : 'Failed to load new releases.');
      } finally {
        setLoading(false);
      }
    }
    fetchReleases();
  }, [activeTab]);

  const handleAddToLibrary = async (media: MediaItem) => {
    setActionError(null);
    try {
      await sendMessage(MessageType.ADD_TO_LIST, { mediaItem: media, type: media.type });
      setAddedIds(prev => new Set([...prev, media.id]));
    } catch (err) {
      console.error('Failed to add to library', err);
      setActionError(err instanceof Error ? err.message : 'Failed to add title to your library.');
    }
  };

  return (
    <div className="page-container">
      <header className="sanctuary-header">
        <div className="sanctuary-header-meta">
          <span className="sanctuary-subtitle">Catalogue No. 03 — Historic Theatre Programme</span>
        </div>
        <h1 className="sanctuary-title">Cinematic Programme</h1>
        <p className="sanctuary-description">
          Archival calendar of trending acquisitions and contemporary releases across global auditoriums.
        </p>
      </header>

      <div className="recommendations-view-mode-toggle" style={{ margin: '0 auto 32px', maxWidth: 360 }}>
        <button
          className={`recommendations-view-mode-btn ${activeTab === 'movie' ? 'recommendations-view-mode-btn-active' : 'recommendations-view-mode-btn-inactive'}`}
          onClick={() => setActiveTab('movie')}
          style={{ flex: 1, padding: '8px 16px' }}
        >
          Feature Films
        </button>
        <button
          className={`recommendations-view-mode-btn ${activeTab === 'tv' ? 'recommendations-view-mode-btn-active' : 'recommendations-view-mode-btn-inactive'}`}
          onClick={() => setActiveTab('tv')}
          style={{ flex: 1, padding: '8px 16px' }}
        >
          Series & Repertoires
        </button>
      </div>

      {(loadError || actionError) && (
        <div className="sanctuary-empty-plaque" style={{ maxWidth: 500, margin: '0 auto 24px', borderColor: 'var(--border-hero)' }}>
          <p className="sanctuary-plaque-text" style={{ color: 'var(--text-reflection)' }}>{loadError || actionError}</p>
        </div>
      )}

      <div className="programme-container">
        {loading ? (
          <div className="sanctuary-empty-plaque">
            <div className="subsume-spinner" style={{ margin: '0 auto 16px' }} />
            <p className="sanctuary-plaque-text">Inspecting auditorium programme...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="sanctuary-empty-plaque">
            <span className="sanctuary-plaque-index">REF. 503-PROG</span>
            <h3 className="sanctuary-plaque-title">Programme Currently Unavailable</h3>
            <p className="sanctuary-plaque-text">
              We could not retrieve today's programme registry. Verify provider configuration or internet connectivity.
            </p>
          </div>
        ) : (
          <div>
            {items.map((media) => (
              <div key={media.id} className="programme-item">
                <div className="programme-date">
                  {media.year || 'ACT I'}
                </div>
                <div>
                  <button
                    type="button"
                    className="programme-title programme-title-btn"
                    onClick={() => setSelectedMedia(media)}
                  >
                    {media.canonicalTitle}
                  </button>
                  <div style={{ marginTop: 8 }}>
                    <PlatformChips availability={media.streamingAvailability} max={3} compact />
                  </div>
                </div>
                <div className="programme-meta">
                  {media.ratings?.find(r => r.provider === 'tmdb') && (
                    <div style={{ color: 'var(--text-artwork)', marginBottom: 8 }}>
                      SCORE {media.ratings.find(r => r.provider === 'tmdb')!.score.toFixed(1)}
                    </div>
                  )}
                  {addedIds.has(media.id) ? (
                    <span style={{ color: 'var(--text-meta)', fontSize: '10px' }}>In library</span>
                  ) : (
                    <button
                      className="optical-button"
                      style={{ padding: '6px 12px', fontSize: '9px' }}
                      onClick={() => handleAddToLibrary(media)}
                    >
                      Add to library
                    </button>
                  )}
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
