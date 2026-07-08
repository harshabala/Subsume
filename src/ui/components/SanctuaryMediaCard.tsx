import { h, ComponentChildren } from 'preact';
import { MediaItem } from '@/shared/types';

export interface SanctuaryMediaCardProps {
  media: MediaItem;
  title?: string;
  synopsis?: string;
  openable?: boolean;
  onOpen?: (media: MediaItem) => void;
  onAdd?: (media: MediaItem) => void;
  added?: boolean;
  adding?: boolean;
  addLabel?: string;
  addedLabel?: string;
  /** Rendered below synopsis, outside the open button (e.g. platform chips). */
  afterSynopsis?: ComponentChildren;
  /** Extra meta row inside the open region. */
  meta?: ComponentChildren;
}

export function SanctuaryMediaCard({
  media,
  title,
  synopsis,
  openable = true,
  onOpen,
  onAdd,
  added = false,
  adding = false,
  addLabel = 'Add to archive',
  addedLabel = 'In archive',
  afterSynopsis,
  meta,
}: SanctuaryMediaCardProps) {
  const displayTitle = title ?? media.canonicalTitle;
  const canOpen = openable && !!onOpen;

  const poster = (
    <div className="sanctuary-card-poster">
      {media.posterUrl ? (
        <img src={media.posterUrl} alt="" className="sanctuary-poster-img" loading="lazy" decoding="async" aria-hidden="true" />
      ) : (
        <div className="sanctuary-poster-placeholder">
          <span className="sanctuary-placeholder-title">{displayTitle}</span>
        </div>
      )}
    </div>
  );

  const body = (
    <div className="sanctuary-card-content">
      <h4 className="sanctuary-card-title">{displayTitle}</h4>
      {meta}
      {synopsis ? <p className="sanctuary-card-synopsis">{synopsis}</p> : null}
    </div>
  );

  return (
    <article className={`sanctuary-media-card ${canOpen ? 'sanctuary-media-card--openable' : ''}`}>
      {canOpen ? (
        <button
          type="button"
          className="sanctuary-media-card-open"
          onClick={() => onOpen!(media)}
          aria-label={`View details for ${displayTitle}`}
        >
          {poster}
          {body}
        </button>
      ) : (
        <>
          {poster}
          {body}
        </>
      )}
      {afterSynopsis}
      {onAdd && (
        <div className="sanctuary-card-actions">
          <button
            type="button"
            className="sanctuary-acquire-btn"
            disabled={added || adding}
            onClick={() => onAdd(media)}
          >
            {adding ? 'Adding…' : added ? addedLabel : addLabel}
          </button>
        </div>
      )}
    </article>
  );
}