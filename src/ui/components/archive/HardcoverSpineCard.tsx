import { h } from 'preact';
import { useState } from 'preact/hooks';
import { LibraryItem, MediaItem, LibraryStatus } from '@/shared/types';
import {
  STATUS_OPTIONS,
  INTENT_CHIP_LABELS,
  resolveSanctuaryIntent,
  getReflectionExcerpt,
} from './constants';
import { hasEmotionalData, getEmotionalSpectrum, EMOTION_KEYS } from '@/shared/emotions';

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
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const reflectionExcerpt = getReflectionExcerpt(library);
  const intent = resolveSanctuaryIntent(library);
  const title = media?.canonicalTitle || 'Untitled Archive';

  const handleCardKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      className="media-card sanctuary-media-card"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleCardKeyDown}
      aria-label={`View details for ${title}`}
    >
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
        {reflectionExcerpt ? (
          <p className="hardcover-snippet hardcover-snippet-lead">
            "{reflectionExcerpt}"
          </p>
        ) : (
          <p className="hardcover-snippet-placeholder">A reflection yet to be inscribed…</p>
        )}

        <h4 className="media-card-title">
          {media?.canonicalTitle || 'Untitled Archive'}
        </h4>
        <div className="media-card-meta">
          <span>{media?.year}</span>
          {media?.ratings?.find((r) => r.provider === 'tmdb') && (
            <span className="sanctuary-card-badge">
              TMDb {media.ratings.find((r) => r.provider === 'tmdb')!.score.toFixed(1)}
            </span>
          )}
        </div>

        <span className="intent-chip" data-intent={intent}>
          {INTENT_CHIP_LABELS[intent]}
        </span>

        {hasEmotionalData(library) && (
          <div className="emotion-dots" data-testid="emotion-dots" aria-label="Emotional spectrum">
            {EMOTION_KEYS.map((key) => {
              const value = getEmotionalSpectrum(library)[key];
              return (
                <span
                  key={key}
                  className="emotion-dot"
                  data-emotion={key}
                  title={`${key}: ${value}`}
                  style={{ opacity: 0.35 + (value / 100) * 0.65 }}
                />
              );
            })}
          </div>
        )}

        <div className="hardcover-controls">
          <button
            type="button"
            className="hardcover-details-toggle"
            aria-expanded={detailsExpanded}
            onClick={(e) => {
              e.stopPropagation();
              setDetailsExpanded((prev) => !prev);
            }}
          >
            Details
            <span className="hardcover-details-chevron">{detailsExpanded ? '▴' : '▾'}</span>
          </button>

          {detailsExpanded && (
            <div className="hardcover-details-panel" onClick={(e) => e.stopPropagation()}>
              <select
                value={library.status}
                onChange={(e) => onUpdateStatus(library.mediaId, (e.target as HTMLSelectElement).value as LibraryStatus)}
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
          )}
        </div>
      </div>
    </div>
  );
}