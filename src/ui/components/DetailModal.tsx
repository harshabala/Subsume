import { h } from 'preact';
import { useEffect, useState, useRef } from 'preact/hooks';
import { MediaItem, LibraryItem, LibraryStatus } from '@/shared/types';
import { PlatformChips } from './PlatformChips';

interface DetailModalProps {
  media: MediaItem;
  libraryItem?: LibraryItem;
  onClose: () => void;
  onUpdateStatus?: (status: LibraryStatus) => void;
  onUpdateRating?: (rating: number) => void;
  onUpdateTags?: (tags: string[]) => void;
  onUpdateNotes?: (notes: string) => void;
  onAddToLibrary?: () => void;
}

const STATUS_OPTIONS: { value: LibraryStatus; label: string }[] = [
  { value: 'to-watch', label: 'Want to Watch' },
  { value: 'watching', label: 'Watching' },
  { value: 'watched', label: 'Watched' },
  { value: 'abandoned', label: 'Abandoned' },
];

const SUGGESTED_TAGS = ["Rewatchable", "Festival", "Criterion", "Silent Era", "Foreign Language", "Comfort Watch", "One-Timer"];


export function DetailModal({
  media,
  libraryItem,
  onClose,
  onUpdateStatus,
  onUpdateRating,
  onUpdateTags,
  onUpdateNotes,
  onAddToLibrary,
}: DetailModalProps) {
  const [notes, setNotes] = useState(libraryItem?.notes || '');
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setNotes(libraryItem?.notes || '');
  }, [libraryItem?.notes]);

  useEffect(() => {
    return () => {
      if (notesDebounceRef.current) {
        clearTimeout(notesDebounceRef.current);
      }
    };
  }, []);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (notesDebounceRef.current) {
      clearTimeout(notesDebounceRef.current);
    }
    notesDebounceRef.current = setTimeout(() => {
      onUpdateNotes?.(value);
    }, 500);
  };

  const flushNotes = () => {
    if (notesDebounceRef.current) {
      clearTimeout(notesDebounceRef.current);
      notesDebounceRef.current = undefined;
      onUpdateNotes?.(notes);
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const tmdbRating = media.ratings.find((r) => r.provider === 'tmdb');
  const imdbRating = media.ratings.find((r) => r.provider === 'imdb');
  const rtRating = media.ratings.find((r) => r.provider === 'rt');

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="modal-header">
          <div className="modal-poster">
            {media.posterUrl ? (
              <img src={media.posterUrl} alt={media.canonicalTitle} />
            ) : (
              <div className="modal-poster-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="2" y="3" width="20" height="18" rx="2" />
                  <path d="M7 3v18M17 3v18M2 9h5M17 9h5M2 15h5M17 15h5" />
                </svg>
              </div>
            )}
          </div>
          <div className="modal-info">
            <h2 className="modal-title">{media.canonicalTitle}</h2>
            <div className="modal-meta">
              <span className="modal-year">{media.year || '—'}</span>
              <span className="modal-type-badge">
                {media.type === 'tv' ? 'TV Show' : 'Movie'}
              </span>
              {tmdbRating && (
                <span className="modal-rating">
                  ⭐ TMDb {tmdbRating.score.toFixed(1)}/10
                  {tmdbRating.votes ? ` (${tmdbRating.votes.toLocaleString()} votes)` : ''}
                </span>
              )}
              {imdbRating && (
                <span className="modal-rating">
                  ⭐ IMDb {imdbRating.score}/10
                </span>
              )}
              {rtRating && (
                <span className="modal-rating">
                  🍅 RT {rtRating.score}%
                </span>
              )}
            </div>
            {media.genres.length > 0 && (
              <div className="modal-genres">
                {media.genres.map((g) => (
                  <span key={g} className="modal-genre-tag">{g}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {media.overview && (
          <div className="modal-section">
            <h3 className="modal-section-title">Overview</h3>
            <p className="modal-overview">{media.overview}</p>
          </div>
        )}

        {media.streamingAvailability && media.streamingAvailability.length > 0 && (
          <div className="modal-section">
            <h3 className="modal-section-title">Where to Watch</h3>
            <PlatformChips availability={media.streamingAvailability} />
          </div>
        )}

        {media.providers.length > 0 && (
          <div className="modal-section">
            <h3 className="modal-section-title">Links</h3>
            <div className="modal-links">
              {media.providers.map((p) => (
                <a
                  key={p.provider}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-link"
                >
                  View on {p.provider.toUpperCase()}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          {libraryItem ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Status:</span>
                <select
                  value={libraryItem.status}
                  onChange={(e) => onUpdateStatus?.((e.target as HTMLSelectElement).value as LibraryStatus)}
                  className="modal-select"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option value={opt.value} key={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {libraryItem.status === 'watched' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Your rating:</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={libraryItem.userRating || 5}
                    onChange={(e) => onUpdateRating?.(parseInt((e.target as HTMLInputElement).value, 10))}
                    style={{ flex: 1, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 600, minWidth: 24, textAlign: 'center' }}>
                    {libraryItem.userRating || 5}
                  </span>
                </div>
              )}

              {/* Tags Segment */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Tags:</span>
                
                {/* Existing tags chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(libraryItem.userTags || []).map((tag) => (
                    <span 
                      key={tag} 
                      className="tag-chip" 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: 4, 
                        fontSize: 12, 
                        padding: '3px 8px', 
                        background: 'rgba(201, 168, 76, 0.1)', 
                        border: '1px solid rgba(201, 168, 76, 0.25)', 
                        borderRadius: 12,
                        color: 'var(--primary)'
                      }}
                    >
                      {tag}
                      <span 
                        onClick={() => {
                          const newTags = (libraryItem.userTags || []).filter(t => t !== tag);
                          onUpdateTags?.(newTags);
                        }} 
                        style={{ cursor: 'pointer', fontWeight: 'bold', marginLeft: 2 }}
                      >
                        ×
                      </span>
                    </span>
                  ))}
                </div>

                {/* Add Tag Input */}
                <input
                  type="text"
                  placeholder="Press Enter to add tag..."
                  className="modal-select"
                  style={{ width: '100%', fontSize: 13, padding: '6px 12px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const target = e.target as HTMLInputElement;
                      const newTag = target.value.trim();
                      if (newTag) {
                        const currentTags = libraryItem.userTags || [];
                        if (!currentTags.includes(newTag)) {
                          onUpdateTags?.([...currentTags, newTag]);
                        }
                        target.value = '';
                      }
                    }
                  }}
                />

                {/* Suggestion tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--fg-subtle)', display: 'block', width: '100%' }}>Suggestions:</span>
                  {SUGGESTED_TAGS.map((tag) => {
                    const isAdded = (libraryItem.userTags || []).includes(tag);
                    if (isAdded) return null;
                    return (
                      <span
                        key={tag}
                        onClick={() => {
                          const currentTags = libraryItem.userTags || [];
                          onUpdateTags?.([...currentTags, tag]);
                        }}
                        style={{ 
                          fontSize: 11, 
                          padding: '2px 8px', 
                          background: 'rgba(255,255,255,0.05)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: 8, 
                          cursor: 'pointer',
                          color: 'var(--color-text-secondary)',
                          userSelect: 'none'
                        }}
                      >
                        + {tag}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Notes:</span>
                <textarea
                  value={notes}
                  placeholder="What did you think? Directors to revisit, scenes you loved..."
                  onChange={(e) => handleNotesChange(e.currentTarget.value)}
                  onBlur={flushNotes}
                  rows={4}
                  className="modal-select"
                  style={{
                    width: '100%',
                    fontSize: 13,
                    padding: '10px 12px',
                    resize: 'vertical',
                    lineHeight: 1.5,
                    minHeight: 88,
                  }}
                />
              </div>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onAddToLibrary}>
              Add to Library
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
