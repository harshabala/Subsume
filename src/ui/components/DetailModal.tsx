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
      className="sanctuary-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sanctuary-modal-content">
        <button onClick={onClose} className="sanctuary-modal-close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="sanctuary-detail-header">
          <div className="sanctuary-detail-poster-wrap">
            {media.posterUrl ? (
              <img src={media.posterUrl} alt={media.canonicalTitle} className="sanctuary-detail-poster-img" />
            ) : (
              <div className="sanctuary-detail-poster-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                  <rect x="2" y="3" width="20" height="18" rx="2" />
                  <path d="M7 3v18M17 3v18M2 9h5M17 9h5M2 15h5M17 15h5" />
                </svg>
              </div>
            )}
          </div>

          <div className="sanctuary-detail-main">
            <div className="sanctuary-detail-inscription">
              {media.type === 'tv' ? 'Series Sanctuary Inscription' : 'Cinematic Sanctuary Inscription'}
            </div>
            <h2 className="sanctuary-detail-title">
              {media.canonicalTitle}
            </h2>

            <div className="sanctuary-detail-ratings">
              <span className="sanctuary-detail-year">{media.year || '—'}</span>
              <span>·</span>
              {tmdbRating && (
                <span className="sanctuary-detail-rating-chip">
                  TMDb <strong className="sanctuary-detail-rating-val">{tmdbRating.score.toFixed(1)}</strong>
                </span>
              )}
              {imdbRating && (
                <span className="sanctuary-detail-rating-chip">
                  IMDb <strong className="sanctuary-detail-rating-val">{imdbRating.score}</strong>
                </span>
              )}
              {rtRating && (
                <span className="sanctuary-detail-rating-chip">
                  RT <strong className="sanctuary-detail-rating-val">{rtRating.score}%</strong>
                </span>
              )}
            </div>

            {media.genres.length > 0 && (
              <div className="sanctuary-detail-genres">
                {media.genres.map((g) => (
                  <span key={g} className="sanctuary-detail-genre-chip">
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {media.overview && (
          <div className="sanctuary-detail-section">
            <h3 className="sanctuary-detail-section-title">Sanctuary Synopsis</h3>
            <p className="sanctuary-detail-synopsis">{media.overview}</p>
          </div>
        )}

        {media.streamingAvailability && media.streamingAvailability.length > 0 && (
          <div className="sanctuary-detail-section">
            <h3 className="sanctuary-detail-section-title">Exhibition Availability</h3>
            <PlatformChips availability={media.streamingAvailability} />
          </div>
        )}

        {media.providers.length > 0 && (
          <div className="sanctuary-detail-section">
            <h3 className="sanctuary-detail-section-title">Archival Catalog Links</h3>
            <div className="sanctuary-detail-providers">
              {media.providers.map((p) => (
                <a
                  key={p.provider}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sanctuary-detail-provider-btn"
                >
                  {p.provider.toUpperCase()}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="sanctuary-detail-library-wrap">
          {libraryItem ? (
            <div className="sanctuary-detail-library-stack">
              <div className="sanctuary-detail-control-row">
                <span className="sanctuary-detail-control-label">Sanctuary State:</span>
                <select
                  value={libraryItem.status}
                  onChange={(e) => onUpdateStatus?.((e.target as HTMLSelectElement).value as LibraryStatus)}
                  className="sanctuary-detail-input sanctuary-detail-select"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option value={opt.value} key={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {libraryItem.status === 'watched' && (
                <div className="sanctuary-detail-control-row">
                  <span className="sanctuary-detail-control-label">Resonance Rating:</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={libraryItem.userRating || 5}
                    onChange={(e) => onUpdateRating?.(parseInt((e.target as HTMLInputElement).value, 10))}
                    className="sanctuary-detail-range"
                  />
                  <span className="sanctuary-detail-rating-display">
                    {libraryItem.userRating || 5} <span className="sanctuary-detail-rating-max">/ X</span>
                  </span>
                </div>
              )}

              <div className="sanctuary-detail-tags-section">
                <span className="sanctuary-detail-control-label">Sanctuary Tags:</span>
                
                <div className="sanctuary-detail-tags-list">
                  {(libraryItem.userTags || []).map((tag) => (
                    <span key={tag} className="sanctuary-detail-tag-chip">
                      {tag}
                      <span
                        onClick={() => {
                          const newTags = (libraryItem.userTags || []).filter(t => t !== tag);
                          onUpdateTags?.(newTags);
                        }}
                        className="sanctuary-detail-tag-remove"
                      >
                        ×
                      </span>
                    </span>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Inscribe custom tag and press Enter..."
                  className="sanctuary-detail-input"
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

                <div className="sanctuary-detail-suggestions">
                  <span className="sanctuary-detail-suggestions-label">Archival Suggestions:</span>
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
                        className="sanctuary-detail-suggestion-chip"
                      >
                        + {tag}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="sanctuary-detail-notes-section">
                <span className="sanctuary-detail-control-label">Private Reflections & Notes:</span>
                <textarea
                  value={notes}
                  placeholder="Record private thoughts, directorial motifs, or memorable sequences..."
                  onChange={(e) => handleNotesChange(e.currentTarget.value)}
                  onBlur={flushNotes}
                  rows={4}
                  className="sanctuary-detail-input sanctuary-detail-textarea"
                />
              </div>
            </div>
          ) : (
            <button className="sanctuary-detail-btn-inscribe" onClick={onAddToLibrary}>
              Inscribe into Sanctuary Library
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
