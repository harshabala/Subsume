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
    <div className="media-card" onClick={onSelect} style={{ cursor: 'pointer' }}>
      <div className="media-card-poster">
        {media?.posterUrl ? (
          <img
            src={media.posterUrl}
            alt={media.canonicalTitle}
            loading="lazy"
            style={{ borderRadius: '4px', boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)' }}
          />
        ) : (
          <div className="empty-poster text-center p-4" style={{ borderRadius: '4px', boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)' }}>No Image</div>
        )}
      </div>
      <div className="media-card-body">
        <h4
          className="media-card-title"
          style={{ fontFamily: 'var(--font-serif, "Newsreader", Georgia, serif)', fontSize: '16px', fontWeight: 500 }}
        >
          {media?.canonicalTitle || 'Unknown Title'}
        </h4>
        <div className="media-card-meta" style={{ fontFamily: 'var(--font-serif, "Newsreader", Georgia, serif)' }}>
          <span>{media?.year}</span>
          {media?.ratings?.find((r) => r.provider === 'tmdb') && (
            <span className="media-card-rating">
              ⭐ {media.ratings.find((r) => r.provider === 'tmdb')!.score.toFixed(1)}
            </span>
          )}
        </div>

        {library.emotionalRecall && (
          <p
            className="hardcover-snippet"
            style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)', fontSize: '13px', margin: '8px 0', lineHeight: 1.4 }}
          >
            "{library.emotionalRecall}"
          </p>
        )}

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <select
            value={library.status}
            onChange={(e) => onUpdateStatus(library.mediaId, (e.target as HTMLSelectElement).value as LibraryStatus)}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--color-surface-elevated)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              padding: '6px 8px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option value={opt.value} key={opt.value}>{opt.label}</option>
            ))}
          </select>

          {library.status === 'watched' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Your rating:</span>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={library.userRating || 5}
                onChange={(e) => onUpdateRating(library.mediaId, parseInt((e.target as HTMLInputElement).value, 10))}
                onClick={(e) => e.stopPropagation()}
                style={{ flex: 1, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>
                {library.userRating || 5}
              </span>
            </div>
          )}

          {removeConfirmId === library.mediaId ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Remove?</span>
              <button
                className="btn btn-primary"
                style={{ padding: '4px 10px', fontSize: 12 }}
                onClick={(e) => { e.stopPropagation(); onRemoveItem(library.mediaId); }}
              >
                Yes
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: 12 }}
                onClick={(e) => { e.stopPropagation(); setRemoveConfirmId(null); }}
              >
                No
              </button>
            </div>
          ) : (
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: 12, alignSelf: 'flex-start' }}
              onClick={(e) => { e.stopPropagation(); setRemoveConfirmId(library.mediaId); }}
            >
              🗑️ Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
