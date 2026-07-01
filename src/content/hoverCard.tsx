import { h, Fragment } from 'preact';
import { MediaItem, MediaType, LibraryItem } from '@/shared/types';
import { formatPlatformName } from '@/shared/platforms';
import { CardPosition } from './positioning';

export interface HoverCardProps {
  mediaItem: MediaItem | null;
  loading: boolean;
  position: CardPosition;
  visible: boolean;
  inLibrary: boolean;
  libraryItem: LibraryItem | null;
  actionStatus: 'added-movie' | 'added-tv' | 'removed' | null;
  onAdd: (type: MediaType) => void;
  onRemove: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function HoverCard({
  mediaItem,
  loading,
  position,
  visible,
  inLibrary,
  libraryItem,
  actionStatus,
  onAdd,
  onRemove,
  onMouseEnter,
  onMouseLeave,
}: HoverCardProps) {
  if (!visible) return null;

  if (actionStatus) {
    const isRemove = actionStatus === 'removed';
    const addedLabel = actionStatus === 'added-movie' ? 'Movies' : 'TV Shows';
    const message = isRemove ? 'Removed from library!' : `Added to ${addedLabel}!`;
    
    return (
      <div
        className="subsume-hover-card subsume-visible subsume-added"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="subsume-added-msg">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span>{message}</span>
        </div>
      </div>
    );
  }

  const imdbRating = mediaItem?.ratings.find((r) => r.provider === 'imdb');
  const rtRating = mediaItem?.ratings.find((r) => r.provider === 'rt');

  return (
    <div
      className={`subsume-hover-card ${visible ? 'subsume-visible' : ''}`}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {loading ? (
        <div className="subsume-loading">
          <div className="subsume-spinner" />
          <span>Loading details…</span>
        </div>
      ) : mediaItem ? (
        <>
          {/* Header */}
          <div className="subsume-card-header">
            <div className="subsume-poster">
              {mediaItem.posterUrl ? (
                <img src={mediaItem.posterUrl} alt={mediaItem.canonicalTitle} />
              ) : (
                <div className="subsume-poster-placeholder">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="2" y="3" width="20" height="18" rx="2" />
                    <path d="M7 3v18M17 3v18M2 9h5M17 9h5M2 15h5M17 15h5" />
                  </svg>
                </div>
              )}
            </div>
            <div className="subsume-card-info">
              <h3 className="subsume-title">{mediaItem.canonicalTitle}</h3>
              <div className="subsume-meta">
                <span className="subsume-year">{mediaItem.year}</span>
                {mediaItem.runtimeMinutes && (
                  <span className="subsume-runtime">{mediaItem.runtimeMinutes} min</span>
                )}
                <span className="subsume-type-badge">
                  {mediaItem.type === 'tv' ? 'TV Show' : 'Movie'}
                </span>
              </div>
            </div>
          </div>

          {/* Ratings */}
          <div className="subsume-ratings">
            {imdbRating && (
              <div className="subsume-rating-chip subsume-imdb">
                <span className="subsume-rating-icon">⭐</span>
                <span className="subsume-rating-label">IMDb</span>
                <span className="subsume-rating-value">{imdbRating.score}/10</span>
              </div>
            )}
            {rtRating && (
              <div className="subsume-rating-chip subsume-rt">
                <span className="subsume-rating-icon">🍅</span>
                <span className="subsume-rating-label">RT</span>
                <span className="subsume-rating-value">{rtRating.score}%</span>
              </div>
            )}
          </div>

          {/* Streaming availability */}
          {mediaItem.streamingAvailability && mediaItem.streamingAvailability.length > 0 && (
            <div className="subsume-platforms">
              {mediaItem.streamingAvailability.slice(0, 3).map((info, index) => (
                <span key={`${info.platform}-${index}`} className="subsume-platform-tag">
                  {formatPlatformName(info.platform)}
                </span>
              ))}
            </div>
          )}

          {/* Genres */}
          <div className="subsume-genres">
            {mediaItem.genres.map((genre) => (
              <span key={genre} className="subsume-genre-tag">
                {genre}
              </span>
            ))}
          </div>

          {/* Overview */}
          {mediaItem.overview && (
            <p className="subsume-overview">{mediaItem.overview}</p>
          )}

          {/* Library Status Bar (Statistical Overlay) */}
          {inLibrary && libraryItem && (
            <div className="subsume-library-status-bar">
              <div className="subsume-library-status-left">
                <span className="subsume-library-label">Status</span>
                <span className={`subsume-status-badge status-${libraryItem.status}`}>
                  {libraryItem.status === 'to-watch' ? 'To Watch' :
                   libraryItem.status === 'watching' ? 'Watching' :
                   libraryItem.status === 'watched' ? 'Watched' : 'Abandoned'}
                </span>
              </div>
              {libraryItem.userRating !== undefined && (
                <div className="subsume-library-status-right">
                  <span className="subsume-library-label">My Rating</span>
                  <span className="subsume-user-rating-badge">
                    <span className="subsume-star">★</span> {libraryItem.userRating}/10
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="subsume-actions">
            {inLibrary ? (
              <button className="subsume-btn subsume-btn-danger" onClick={onRemove}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2" />
                </svg>
                Remove
              </button>
            ) : (
              <>
                <button className="subsume-btn subsume-btn-primary" onClick={() => onAdd('movie')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add to Movies
                </button>
                <button className="subsume-btn subsume-btn-secondary" onClick={() => onAdd('tv')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add to TV Shows
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="subsume-error">Could not load details</div>
      )}
    </div>
  );
}

export const HOVER_CARD_STYLES = `
  :host {
    all: initial;
  }

  .subsume-hover-card {
    position: absolute;
    z-index: 2147483647;
    width: 340px;
    padding: 16px;
    background: linear-gradient(135deg, rgba(10, 10, 11, 0.98), rgba(26, 26, 28, 0.98));
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(201, 168, 76, 0.15);
    border-radius: 16px;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(255, 255, 255, 0.03) inset;
    font-family: 'Geist', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #e8e6e1;
    opacity: 0;
    transform: translateY(8px) scale(0.96);
    transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
  }

  .subsume-hover-card.subsume-visible {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  /* Loading */
  .subsume-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 32px 0;
    color: rgba(232, 230, 225, 0.45);
    font-size: 13px;
  }

  .subsume-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid rgba(201, 168, 76, 0.1);
    border-top-color: #c9a84c;
    border-radius: 50%;
    animation: subsume-spin 0.8s linear infinite;
  }

  @keyframes subsume-spin {
    to { transform: rotate(360deg); }
  }

  /* Header */
  .subsume-card-header {
    display: flex;
    gap: 14px;
    margin-bottom: 12px;
  }

  .subsume-poster {
    flex-shrink: 0;
    width: 72px;
    height: 108px;
    border-radius: 10px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .subsume-poster img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .subsume-poster-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(232, 230, 225, 0.15);
  }

  .subsume-card-info {
    flex: 1;
    min-width: 0;
  }

  .subsume-title {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .subsume-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;
    color: rgba(232, 230, 225, 0.45);
  }

  .subsume-type-badge {
    background: rgba(201, 168, 76, 0.12);
    color: #c9a84c;
    padding: 1px 8px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Ratings */
  .subsume-ratings {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
  }

  .subsume-rating-chip {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
  }

  .subsume-imdb {
    background: rgba(245, 197, 24, 0.08);
    border: 1px solid rgba(245, 197, 24, 0.15);
  }

  .subsume-rt {
    background: rgba(250, 50, 10, 0.08);
    border: 1px solid rgba(250, 50, 10, 0.15);
  }

  .subsume-rating-icon {
    font-size: 13px;
  }

  .subsume-rating-label {
    color: rgba(232, 230, 225, 0.4);
    font-weight: 500;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .subsume-rating-value {
    color: #fff;
  }

  /* Streaming platforms */
  .subsume-platforms {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 10px;
  }

  .subsume-platform-tag {
    padding: 3px 8px;
    background: rgba(201, 168, 76, 0.1);
    border: 1px solid rgba(201, 168, 76, 0.2);
    border-radius: 8px;
    font-size: 10px;
    font-weight: 600;
    color: #c9a84c;
  }

  /* Genres */
  .subsume-genres {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 12px;
  }

  .subsume-genre-tag {
    padding: 3px 10px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    font-size: 11px;
    color: rgba(232, 230, 225, 0.55);
    font-weight: 500;
  }

  /* Overview */
  .subsume-overview {
    margin: 0 0 12px;
    font-size: 12px;
    line-height: 1.5;
    color: rgba(232, 230, 225, 0.5);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  /* Library Status Bar */
  .subsume-library-status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: rgba(201, 168, 76, 0.05);
    border: 1px solid rgba(201, 168, 76, 0.12);
    border-radius: 12px;
    margin-bottom: 14px;
  }

  .subsume-library-status-left,
  .subsume-library-status-right {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .subsume-library-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(232, 230, 225, 0.4);
    font-weight: 600;
  }

  .subsume-status-badge {
    font-size: 12px;
    font-weight: 600;
  }

  .subsume-status-badge.status-to-watch {
    color: #9e9a90;
  }

  .subsume-status-badge.status-watching {
    color: #c9a84c;
  }

  .subsume-status-badge.status-watched {
    color: #34d399;
  }

  .subsume-status-badge.status-abandoned {
    color: #fca5a5;
  }

  .subsume-user-rating-badge {
    font-size: 12px;
    font-weight: 700;
    color: #c9a84c;
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .subsume-star {
    color: #c9a84c;
  }

  /* Actions */
  .subsume-actions {
    display: flex;
    gap: 8px;
  }

  .subsume-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    border: none;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .subsume-btn:active {
    transform: scale(0.97);
  }

  .subsume-btn-primary {
    background: linear-gradient(135deg, #c9a84c, #d4b860);
    color: #0a0a0b;
    box-shadow: 0 4px 12px rgba(201, 168, 76, 0.15);
  }

  .subsume-btn-primary:hover {
    background: linear-gradient(135deg, #d4b860, #e2cb7c);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(201, 168, 76, 0.3);
  }

  .subsume-btn-secondary {
    background: rgba(255, 255, 255, 0.04);
    color: rgba(232, 230, 225, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .subsume-btn-secondary:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(201, 168, 76, 0.25);
    color: #fff;
    transform: translateY(-1px);
  }

  .subsume-btn-danger {
    flex: 1;
    background: rgba(239, 68, 68, 0.1);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .subsume-btn-danger:hover {
    background: rgba(239, 68, 68, 0.18);
    transform: translateY(-1px);
    border-color: rgba(239, 68, 68, 0.3);
  }

  /* Added confirmation */
  .subsume-added {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px;
  }

  .subsume-added-msg {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #34d399;
    font-size: 15px;
    font-weight: 600;
  }

  /* Error */
  .subsume-error {
    text-align: center;
    padding: 24px;
    color: rgba(232, 230, 225, 0.35);
    font-size: 13px;
  }

  @media (prefers-reduced-motion: reduce) {
    .subsume-hover-card {
      transition: none;
    }
    .subsume-spinner {
      animation: none;
      border-top-color: #c9a84c;
    }
    .subsume-btn,
    .subsume-btn-primary,
    .subsume-btn-secondary {
      transition: none;
    }
    .subsume-btn:active,
    .subsume-btn-primary:hover,
    .subsume-btn-secondary:hover {
      transform: none;
    }
  }
`;
