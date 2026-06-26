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

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    background: 'hsla(0, 0%, 100%, 0.03)',
    border: '1px solid var(--border-restraint)',
    color: 'var(--text-sanctuary)',
    borderRadius: 2,
    fontFamily: 'var(--font-ui)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const
  };

  const btnGoldStyle = {
    background: 'var(--border-hero)',
    border: 'none',
    color: 'hsl(240, 18%, 5%)',
    padding: '12px 28px',
    borderRadius: 2,
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%'
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 5, 8, 0.88)',
        backdropFilter: 'var(--blur-hero)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content"
        style={{
          background: 'var(--bg-plaque)',
          border: '1px solid var(--border-hero)',
          boxShadow: 'var(--shadow-hero)',
          borderRadius: 4,
          maxHeight: '90vh',
          width: '100%',
          maxWidth: 720,
          overflowY: 'auto',
          position: 'relative',
          color: 'var(--text-artwork)',
          padding: 32,
          boxSizing: 'border-box'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 24,
            right: 24,
            background: 'transparent',
            border: '1px solid var(--border-restraint)',
            color: 'var(--text-meta)',
            width: 32,
            height: 32,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'color 0.2s ease'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div style={{ display: 'flex', gap: 28, marginBottom: 32, flexWrap: 'wrap' }}>
          <div style={{ width: 180, flexShrink: 0, borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border-restraint)', background: 'hsl(240, 18%, 6%)' }}>
            {media.posterUrl ? (
              <img src={media.posterUrl} alt={media.canonicalTitle} style={{ width: '100%', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: 270, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-meta)' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                  <rect x="2" y="3" width="20" height="18" rx="2" />
                  <path d="M7 3v18M17 3v18M2 9h5M17 9h5M2 15h5M17 15h5" />
                </svg>
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--border-hero)', marginBottom: 6 }}>
              {media.type === 'tv' ? 'Series Sanctuary Inscription' : 'Cinematic Sanctuary Inscription'}
            </div>
            <h2 style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 32, fontWeight: 400, color: 'var(--text-sanctuary)', margin: '0 0 12px 0', lineHeight: 1.1 }}>
              {media.canonicalTitle}
            </h2>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-meta)', marginBottom: 16 }}>
              <span style={{ color: 'var(--text-reflection)', fontWeight: 600 }}>{media.year || '—'}</span>
              <span>·</span>
              {tmdbRating && (
                <span style={{ background: 'hsla(0,0%,100%,0.04)', padding: '3px 8px', borderRadius: 2, border: '1px solid var(--border-restraint)' }}>
                  TMDb <strong style={{ color: 'var(--border-hero)' }}>{tmdbRating.score.toFixed(1)}</strong>
                </span>
              )}
              {imdbRating && (
                <span style={{ background: 'hsla(0,0%,100%,0.04)', padding: '3px 8px', borderRadius: 2, border: '1px solid var(--border-restraint)' }}>
                  IMDb <strong style={{ color: 'var(--border-hero)' }}>{imdbRating.score}</strong>
                </span>
              )}
              {rtRating && (
                <span style={{ background: 'hsla(0,0%,100%,0.04)', padding: '3px 8px', borderRadius: 2, border: '1px solid var(--border-restraint)' }}>
                  RT <strong style={{ color: 'var(--border-hero)' }}>{rtRating.score}%</strong>
                </span>
              )}
            </div>

            {media.genres.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {media.genres.map((g) => (
                  <span key={g} style={{ fontFamily: 'var(--font-ui)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', padding: '4px 10px', background: 'transparent', border: '1px solid var(--border-restraint)', color: 'var(--text-reflection)', borderRadius: 2 }}>
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {media.overview && (
          <div style={{ marginBottom: 28, borderTop: '1px solid var(--border-restraint)', paddingTop: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-ui)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-meta)', margin: '0 0 10px 0' }}>Sanctuary Synopsis</h3>
            <p style={{ fontFamily: 'var(--font-editorial)', fontSize: 16, lineHeight: 1.6, color: 'var(--text-reflection)', margin: 0 }}>{media.overview}</p>
          </div>
        )}

        {media.streamingAvailability && media.streamingAvailability.length > 0 && (
          <div style={{ marginBottom: 28, borderTop: '1px solid var(--border-restraint)', paddingTop: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-ui)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-meta)', margin: '0 0 12px 0' }}>Exhibition Availability</h3>
            <PlatformChips availability={media.streamingAvailability} />
          </div>
        )}

        {media.providers.length > 0 && (
          <div style={{ marginBottom: 28, borderTop: '1px solid var(--border-restraint)', paddingTop: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-ui)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-meta)', margin: '0 0 12px 0' }}>Archival Catalog Links</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {media.providers.map((p) => (
                <a
                  key={p.provider}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--border-hero)', textDecoration: 'none', padding: '6px 12px', border: '1px solid var(--border-restraint)', borderRadius: 2 }}
                >
                  {p.provider.toUpperCase()}
                </a>
              ))}
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border-restraint)', paddingTop: 28 }}>
          {libraryItem ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-meta)' }}>Sanctuary State:</span>
                <select
                  value={libraryItem.status}
                  onChange={(e) => onUpdateStatus?.((e.target as HTMLSelectElement).value as LibraryStatus)}
                  style={{ ...inputStyle, width: 'auto', minWidth: 180 }}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option value={opt.value} key={opt.value} style={{ background: 'hsl(240, 18%, 8%)' }}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {libraryItem.status === 'watched' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-meta)' }}>Resonance Rating:</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={libraryItem.userRating || 5}
                    onChange={(e) => onUpdateRating?.(parseInt((e.target as HTMLInputElement).value, 10))}
                    style={{ accentColor: 'var(--border-hero)', flex: 1, maxWidth: 200, cursor: 'pointer' }}
                  />
                  <span style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 18, color: 'var(--border-hero)', minWidth: 32 }}>
                    {libraryItem.userRating || 5} <span style={{ fontSize: 12, fontStyle: 'normal', color: 'var(--text-meta)' }}>/ X</span>
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-meta)' }}>Sanctuary Tags:</span>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(libraryItem.userTags || []).map((tag) => (
                    <span 
                      key={tag} 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: 6, 
                        fontFamily: 'var(--font-ui)',
                        fontSize: 11, 
                        letterSpacing: '0.1em',
                        padding: '4px 10px', 
                        background: 'hsla(43, 74%, 49%, 0.1)', 
                        border: '1px solid var(--border-hero)', 
                        borderRadius: 2,
                        color: 'var(--border-hero)'
                      }}
                    >
                      {tag}
                      <span 
                        onClick={() => {
                          const newTags = (libraryItem.userTags || []).filter(t => t !== tag);
                          onUpdateTags?.(newTags);
                        }} 
                        style={{ cursor: 'pointer', fontWeight: 600 }}
                      >
                        ×
                      </span>
                    </span>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Inscribe custom tag and press Enter..."
                  style={inputStyle}
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

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-meta)', marginRight: 4 }}>Archival Suggestions:</span>
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
                          fontFamily: 'var(--font-ui)',
                          fontSize: 10, 
                          letterSpacing: '0.05em',
                          padding: '3px 8px', 
                          background: 'transparent', 
                          border: '1px solid var(--border-restraint)', 
                          borderRadius: 2, 
                          cursor: 'pointer',
                          color: 'var(--text-artwork)',
                          userSelect: 'none'
                        }}
                      >
                        + {tag}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-meta)' }}>Private Reflections & Notes:</span>
                <textarea
                  value={notes}
                  placeholder="Record private thoughts, directorial motifs, or memorable sequences..."
                  onChange={(e) => handleNotesChange(e.currentTarget.value)}
                  onBlur={flushNotes}
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    fontFamily: 'var(--font-editorial)',
                    fontSize: 14,
                    lineHeight: 1.6,
                    minHeight: 100
                  }}
                />
              </div>
            </div>
          ) : (
            <button style={btnGoldStyle} onClick={onAddToLibrary}>
              Inscribe into Sanctuary Library
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
