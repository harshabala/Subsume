import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import { MessageType, MediaItem } from '@/shared/types';
import { DetailModal } from '../components/DetailModal';
import { PlatformChips } from '../components/PlatformChips';
import {
  ADD_TO_ARCHIVE_LABEL,
  IN_ARCHIVE_LABEL,
  NOW_SHOWING_TITLE,
  FILMS_TAB_LABEL,
  SERIES_TAB_LABEL,
  failedToAddToArchiveMessage,
} from '@/shared/productCopy';

export function NewReleases() {
  const [activeTab, setActiveTab] = useState<'movie' | 'tv'>('movie');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    sendMessage(MessageType.CLEAR_NOTIFICATION_BADGE, {}).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchReleases() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await sendMessage<any, MediaItem[]>(MessageType.GET_LATEST_RELEASES, {
          type: activeTab
        });
        if (!cancelled) {
          setItems(res.data ?? []);
        }
      } catch (err) {
        console.error('Failed to load new releases', err);
        if (!cancelled) {
          setItems([]);
          setLoadError(err instanceof Error ? err.message : 'Failed to load new releases.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    fetchReleases();
    return () => {
      cancelled = true;
    };
  }, [activeTab, retryToken]);

  const retryLoad = useCallback(() => {
    setRetryToken((t) => t + 1);
  }, []);

  const handleAddToLibrary = async (media: MediaItem) => {
    setActionError(null);
    try {
      await sendMessage(MessageType.ADD_TO_LIST, { mediaItem: media, type: media.type });
      setAddedIds(prev => new Set([...prev, media.id]));
    } catch (err) {
      console.error('Failed to add to archive', err);
      setActionError(err instanceof Error ? err.message : failedToAddToArchiveMessage());
    }
  };

  return (
    <div className="page-container">
      <header className="sanctuary-header">
        <div className="sanctuary-header-meta">
          <span className="sanctuary-subtitle">Catalogue No. 03 · Historic Theatre Programme</span>
        </div>
        <h1 className="sanctuary-title">{NOW_SHOWING_TITLE}</h1>
        <p className="sanctuary-description">
          Archival calendar of trending acquisitions and contemporary releases across global auditoriums.
        </p>
      </header>

      <div className="sanctuary-view-toggle recommendations-view-mode-toggle" role="group" aria-label="Release type">
        <button
          type="button"
          className={`sanctuary-view-toggle-btn recommendations-view-mode-btn ${activeTab === 'movie' ? 'recommendations-view-mode-btn-active' : 'recommendations-view-mode-btn-inactive'}`}
          onClick={() => setActiveTab('movie')}
          aria-pressed={activeTab === 'movie'}
        >
          {FILMS_TAB_LABEL}
        </button>
        <button
          type="button"
          className={`sanctuary-view-toggle-btn recommendations-view-mode-btn ${activeTab === 'tv' ? 'recommendations-view-mode-btn-active' : 'recommendations-view-mode-btn-inactive'}`}
          onClick={() => setActiveTab('tv')}
          aria-pressed={activeTab === 'tv'}
        >
          {SERIES_TAB_LABEL}
        </button>
      </div>

      {actionError && (
        <div className="sanctuary-empty-plaque sanctuary-notice-plaque">
          <p className="sanctuary-plaque-text sanctuary-notice-plaque-text">{actionError}</p>
        </div>
      )}

      <div className="programme-container">
        {loading ? (
          <div className="sanctuary-empty-plaque">
            <div className="subsume-spinner sanctuary-spinner-centered" />
            <p className="sanctuary-plaque-text">Assembling today&apos;s marquee...</p>
          </div>
        ) : loadError ? (
          <div className="sanctuary-empty-plaque">
            <span className="sanctuary-plaque-index">Programme note 503</span>
            <h3 className="sanctuary-plaque-title">Programme Currently Unavailable</h3>
            <p className="sanctuary-plaque-text">
              We could not reach today&apos;s release registry. Check your provider settings or connection.
            </p>
            <button
              type="button"
              className="optical-button recommendations-retry-btn"
              onClick={retryLoad}
            >
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="sanctuary-empty-plaque">
            <span className="sanctuary-plaque-index">Quiet marquee</span>
            <h3 className="sanctuary-plaque-title">No Releases Listed</h3>
            <p className="sanctuary-plaque-text">
              Nothing is scheduled in this programme right now. Try the other tab, or check back after the next refresh.
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
                  <div className="programme-chips-wrapper">
                    <PlatformChips availability={media.streamingAvailability} max={3} compact />
                  </div>
                </div>
                <div className="programme-meta">
                  {media.ratings?.find(r => r.provider === 'tmdb') && (
                    <div className="programme-rating">
                      SCORE {media.ratings.find(r => r.provider === 'tmdb')!.score.toFixed(1)}
                    </div>
                  )}
                  {addedIds.has(media.id) ? (
                    <span className="programme-archived">{IN_ARCHIVE_LABEL}</span>
                  ) : (
                    <button
                      type="button"
                      className="optical-button"
                      onClick={() => handleAddToLibrary(media)}
                    >
                      {ADD_TO_ARCHIVE_LABEL}
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
