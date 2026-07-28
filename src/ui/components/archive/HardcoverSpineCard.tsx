import { h } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { LibraryItem, MediaItem, LibraryStatus } from '@/shared/types';
import {
  statusOptionsForMedium,
  statusChipLabel,
  INTENT_CHIP_LABELS,
  resolveSanctuaryIntent,
  getReflectionExcerpt,
} from './constants';
import { truncateForExcerpt } from '@/shared/textTruncate';
import { hasEmotionalData, getEmotionalSpectrum, EMOTION_KEYS } from '@/shared/emotions';

export interface HardcoverSpineCardProps {
  library: LibraryItem;
  media: MediaItem;
  /** Grid index for enter stagger (first 6, like discovery feed). */
  index?: number;
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
  index = 0,
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
  const title = media?.canonicalTitle || 'Untitled work';
  const medium = media?.type || 'movie';
  const isBook = medium === 'book';
  const mediumLabel = isBook ? 'Book' : medium === 'tv' ? 'Series' : 'Film';
  const statusOptions = statusOptionsForMedium(medium);
  const statusLabel = statusChipLabel(library.status, medium);
  const staggerIndex = Math.min(index, 5);
  const hasRating = typeof library.userRating === 'number' && library.userRating >= 1;
  const committedRating = hasRating ? library.userRating! : undefined;
  /** Draft while dragging; commit only on pointer-up / blur / key change-end (not every step). */
  const [draftRating, setDraftRating] = useState(committedRating ?? 5);
  const draftRatingRef = useRef(draftRating);
  draftRatingRef.current = draftRating;
  const lastCommittedRatingRef = useRef<number | undefined>(committedRating);
  const isCompleted = library.status === 'watched';
  // Static excerpt on the open control — avoid nested buttons (expand lives in detail modal)
  const cardInscription = reflectionExcerpt ? truncateForExcerpt(reflectionExcerpt) : null;

  useEffect(() => {
    setDraftRating(committedRating ?? 5);
    lastCommittedRatingRef.current = committedRating;
  }, [committedRating, library.mediaId]);

  const commitDraftRating = useCallback(() => {
    const next = draftRatingRef.current;
    // Guard double-fire (pointerup + blur) and no-op when unchanged vs last commit.
    if (lastCommittedRatingRef.current === next) return;
    lastCommittedRatingRef.current = next;
    onUpdateRating(library.mediaId, next);
  }, [library.mediaId, onUpdateRating]);

  return (
    <article
      className="media-card sanctuary-media-card sanctuary-media-card--openable hardcover-spine-card"
      style={{ '--feed-index': staggerIndex } as Record<string, number>}
      data-medium={medium}
    >
      <button
        type="button"
        className="sanctuary-media-card-open hardcover-spine-open"
        onClick={onSelect}
        aria-label={`Open inscription for ${title}, ${statusLabel}`}
      >
        <div className="media-card-poster sanctuary-card-poster">
          {media?.posterUrl ? (
            <img
              src={media.posterUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="sanctuary-poster-img"
              aria-hidden="true"
            />
          ) : (
            <div className="sanctuary-poster-placeholder">
              <span className="sanctuary-placeholder-title">
                {isBook ? 'No cover' : 'No frame'}
              </span>
            </div>
          )}
        </div>
        <div className="sanctuary-card-content">
          <h4 className="media-card-title">{media?.canonicalTitle || 'Untitled'}</h4>
          <div className="media-card-meta">
            <span
              className="sanctuary-card-badge medium-badge"
              data-medium={medium}
            >
              {mediumLabel}
            </span>
            {media?.year ? <span>{media.year}</span> : null}
            {media?.ratings?.find((r) => r.provider === 'tmdb') && (
              <span className="sanctuary-card-badge">
                TMDb {media.ratings.find((r) => r.provider === 'tmdb')!.score.toFixed(1)}
              </span>
            )}
          </div>

          {cardInscription ? (
            <p className="hardcover-snippet hardcover-snippet-lead">
              &ldquo;{cardInscription}&rdquo;
            </p>
          ) : (
            <p className="hardcover-snippet-placeholder">No inscription yet</p>
          )}

          <span className="status-chip" data-status={library.status} data-medium={medium}>
            {statusLabel}
          </span>

          {isCompleted && library.sanctuaryIntent && (
            <span className="intent-chip intent-chip-secondary" data-intent={library.sanctuaryIntent}>
              {INTENT_CHIP_LABELS[library.sanctuaryIntent]}
            </span>
          )}

          {!isCompleted && (
            <span className="intent-chip" data-intent={intent}>
              {INTENT_CHIP_LABELS[intent]}
            </span>
          )}

          {hasEmotionalData(library) && (
            <div className="emotion-dots" data-testid="emotion-dots" aria-hidden="true">
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
        </div>
      </button>

      <div className="hardcover-controls sanctuary-card-actions">
        <button
          type="button"
          className="hardcover-details-toggle"
          aria-expanded={detailsExpanded}
          aria-controls={`dossier-${library.mediaId}`}
          id={`dossier-toggle-${library.mediaId}`}
          onClick={() => setDetailsExpanded((prev) => !prev)}
        >
          Dossier
          <span className="hardcover-details-chevron" aria-hidden="true">
            {detailsExpanded ? '▴' : '▾'}
          </span>
        </button>

        {detailsExpanded && (
          <div
            className="hardcover-details-panel"
            id={`dossier-${library.mediaId}`}
            role="region"
            aria-labelledby={`dossier-toggle-${library.mediaId}`}
          >
            <label className="hardcover-field-label" htmlFor={`status-${library.mediaId}`}>
              Status
            </label>
            <select
              id={`status-${library.mediaId}`}
              value={library.status}
              onChange={(e) =>
                onUpdateStatus(library.mediaId, (e.target as HTMLSelectElement).value as LibraryStatus)
              }
              className="hardcover-select"
              aria-label={`Status for ${title}`}
            >
              {statusOptions.map((opt) => (
                <option value={opt.value} key={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {isCompleted && (
              <div className="hardcover-rating-row">
                <label className="hardcover-rating-label" htmlFor={`rating-${library.mediaId}`}>
                  Your verdict
                </label>
                <input
                  id={`rating-${library.mediaId}`}
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={draftRating}
                  onInput={(e) =>
                    setDraftRating(parseInt((e.currentTarget as HTMLInputElement).value, 10))
                  }
                  onPointerUp={commitDraftRating}
                  onMouseUp={commitDraftRating}
                  onTouchEnd={commitDraftRating}
                  onKeyUp={commitDraftRating}
                  onBlur={commitDraftRating}
                  className="hardcover-range"
                  data-testid="spine-rating-slider"
                  aria-valuetext={
                    committedRating !== undefined ? `${draftRating} of 10` : 'Not set'
                  }
                />
                <span
                  className="hardcover-rating-val"
                  data-unset={committedRating === undefined || undefined}
                >
                  {/* Show draft while scrubbing; em dash only before any committed verdict */}
                  {committedRating !== undefined || draftRating !== 5
                    ? `${draftRating} / 10`
                    : '—'}
                </span>
              </div>
            )}

            {removeConfirmId === library.mediaId ? (
              <div className="hardcover-remove-row">
                <span className="hardcover-rating-label">Remove from archive?</span>
                <button
                  type="button"
                  className="hardcover-confirm-btn"
                  onClick={() => onRemoveItem(library.mediaId)}
                >
                  Remove
                </button>
                <button
                  type="button"
                  className="hardcover-remove-btn"
                  onClick={() => setRemoveConfirmId(null)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="hardcover-remove-btn"
                onClick={() => setRemoveConfirmId(library.mediaId)}
              >
                Remove from archive
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
