import { h } from 'preact';
import { LibraryItem, MediaItem, LibraryStatus } from '@/shared/types';
import { STATUS_OPTIONS } from './constants';

export interface HardcoverSpineCardProps {
  library: LibraryItem;
  media: MediaItem;
  onSelect: () => void;
  onUpdateStatus: (mediaId: string, status: LibraryStatus) => void;
  onUpdateRating: (mediaId: string, rating: number) => void;
  onRemoveItem: (mediaId: string) => void;
  removeConfirmId: string | null;
  setRemoveConfirmId: (id: string | null) => void;
}

export function HardcoverSpineCard({
  library,
  media,
  onSelect,
  onUpdateStatus,
  onUpdateRating,
  onRemoveItem,
  removeConfirmId,
  setRemoveConfirmId,
}: HardcoverSpineCardProps) {
  return (
    <div className="media-card sanctuary-media-card" onClick={onSelect}>
      <div className="media-card-poster sanctuary-card-poster">
        {media?.posterUrl ? (
          <img
            src={media.posterUrl}
            alt={media.canonicalTitle}
            loading="lazy"
            className="sanctuary-poster-img"
          />
        ) : (
          <div className="sanctuary-poster-placeholder">
            <span className="sanctuary-placeholder-title">No Archival Plate</span>
          </div>
        )}
      </div>
      <div className="sanctuary-card-content">
        <h4 className="media-card-title">
          {media?.canonicalTitle || 'Untitled Archive'}
        </h4>
        <div className="media-card-meta">
          <span>{media?.year}</span>
          {media?.ratings?.find((r) => r.provider === 'tmdb') && (
            <span className="sanctuary-card-badge">
              TMDB {media.ratings.find((r) => r.provider === 'tmdb')!.score.toFixed(1)}
            </span>
          )}
        </div>

        {library.emotionalRecall && (
          <p className="hardcover-snippet">
            "{library.emotionalRecall}"
          </p>
        )}

        <div className="hardcover-controls">
          <select
            value={library.status}
            onChange={(e) => onUpdateStatus(library.mediaId, (e.target as HTMLSelectElement).value as LibraryStatus)}
            onClick={(e) => e.stopPropagation()}
            className="hardcover-select"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option value={opt.value} key={opt.value}>{opt.label}</option>
            ))}
          </select>

          {library.status === 'watched' && (
            <div className="hardcover-rating-row">
              <span className="hardcover-rating-label">Rating:</span>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={library.userRating || 5}
                onChange={(e) => onUpdateRating(library.mediaId, parseInt((e.target as HTMLInputElement).value, 10))}
                onClick={(e) => e.stopPropagation()}
                className="hardcover-range"
              />
              <span className="hardcover-rating-val">
                {library.userRating || 5} / 10
              </span>
            </div>
          )}

          {removeConfirmId === library.mediaId ? (
            <div className="hardcover-remove-row">
              <span className="hardcover-rating-label">Confirm Purge?</span>
              <button
                className="hardcover-confirm-btn"
                onClick={(e) => { e.stopPropagation(); onRemoveItem(library.mediaId); }}
              >
                Purge
              </button>
              <button
                className="hardcover-remove-btn"
                onClick={(e) => { e.stopPropagation(); setRemoveConfirmId(null); }}
              >
                Retain
              </button>
            </div>
          ) : (
            <button
              className="hardcover-remove-btn"
              onClick={(e) => { e.stopPropagation(); setRemoveConfirmId(library.mediaId); }}
            >
              Purge from Sanctuary
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
