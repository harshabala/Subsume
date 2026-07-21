import { h } from 'preact';
import { useEffect, useState, useRef, useCallback } from 'preact/hooks';
import { MediaItem, LibraryItem, LibraryStatus, MessageType } from '@/shared/types';
import type { BookEdition, WorkRelationType } from '@/shared/catalogTypes';
import { sendMessage } from '@/shared/messages';
import { DEFAULT_EMOTIONS, getEmotionalSpectrum, type EmotionalSpectrum } from '@/shared/emotions';
import { PlatformChips } from './PlatformChips';
import { EmotionalSliders } from './EmotionalSliders';
import { AuraVisualizer } from './AuraVisualizer';
import { ExpandableReflection } from './ExpandableReflection';
import { ReflectionTimeline } from './ReflectionTimeline';
import { ExperienceHistory } from './ExperienceHistory';
import { statusOptionsForMedium, getReflectionExcerpt } from './archive/constants';

type RelatedWorkRow = {
  relation: { id: string; relation: WorkRelationType; fromWorkId: string; toWorkId: string };
  label: string;
  linkedWorkId: string;
  linkedWork?: MediaItem;
};

interface DetailModalProps {
  media: MediaItem;
  libraryItem?: LibraryItem;
  onClose: () => void;
  onUpdateStatus?: (status: LibraryStatus) => void;
  onUpdateRating?: (rating: number) => void;
  onUpdateTags?: (tags: string[]) => void;
  onUpdateNotes?: (
    notes: string,
    atmosphere?: string,
    lingeringThought?: string,
    emotions?: EmotionalSpectrum,
  ) => void;
  onAddToLibrary?: () => void;
}

const SUGGESTED_TAGS = ["Rewatchable", "Festival", "Criterion", "Silent Era", "Foreign Language", "Comfort Watch", "One-Timer"];


const EXIT_FALLBACK_MS = 350;
const SAVE_CEREMONY_MS = 280; /* matches --duration-soft-settle; ≤300ms UI wiki */

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

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
  const [atmosphere, setAtmosphere] = useState(libraryItem?.atmosphere || '');
  const [lingeringThought, setLingeringThought] = useState(libraryItem?.lingeringThought || '');
  const [emotions, setEmotions] = useState<EmotionalSpectrum>(
    libraryItem ? getEmotionalSpectrum(libraryItem) : DEFAULT_EMOTIONS,
  );
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [closing, setClosing] = useState(false);
  const [saveCeremony, setSaveCeremony] = useState(false);
  const [pageProgress, setPageProgress] = useState<number | ''>('');
  const [totalPages, setTotalPages] = useState<number | ''>(media.pageCount ?? '');
  const [editions, setEditions] = useState<BookEdition[]>([]);
  const [preferredEditionId, setPreferredEditionId] = useState<string>(
    libraryItem?.preferredEditionId ?? media.preferredEditionId ?? '',
  );
  const [editionSaving, setEditionSaving] = useState(false);
  const [againBusy, setAgainBusy] = useState(false);
  const [experienceRefreshKey, setExperienceRefreshKey] = useState(0);
  const [relatedWorks, setRelatedWorks] = useState<RelatedWorkRow[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [candidates, setCandidates] = useState<MediaItem[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesDirection, setCandidatesDirection] = useState<'adaptation_of' | 'adapted_as' | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const ceremonyTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const progressDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const modalRef = useRef<HTMLDivElement>(null);
  const closedRef = useRef(false);
  const titleId = `detail-title-${media.id}`;
  const isBook = media.type === 'book';
  const statusOptions = statusOptionsForMedium(media.type);
  const againLabel = isBook ? 'Read again' : 'Watch again';

  const reflectionExcerpt = libraryItem ? getReflectionExcerpt(libraryItem) : undefined;

  const loadRelatedWorks = useCallback(() => {
    setRelatedLoading(true);
    sendMessage<{ workId: string }, { related: RelatedWorkRow[] }>(
      MessageType.GET_RELATED_WORKS,
      { workId: media.id },
    )
      .then((res) => {
        if (res.success && res.data?.related) {
          setRelatedWorks(res.data.related);
        }
      })
      .catch(() => {
        setRelatedWorks([]);
      })
      .finally(() => setRelatedLoading(false));
  }, [media.id]);

  useEffect(() => {
    loadRelatedWorks();
  }, [loadRelatedWorks]);

  const openLinkAdaptation = () => {
    setLinkOpen(true);
    setLinkError(null);
    setCandidates([]);
    setCandidatesLoading(true);
    sendMessage<
      { workId: string },
      { candidates: MediaItem[]; direction: 'adaptation_of' | 'adapted_as' | null }
    >(MessageType.SEARCH_ADAPTATION_CANDIDATES, { workId: media.id })
      .then((res) => {
        if (res.success && res.data) {
          setCandidates(res.data.candidates || []);
          setCandidatesDirection(res.data.direction);
        }
      })
      .catch((err) => {
        setLinkError(err instanceof Error ? err.message : 'Search failed');
      })
      .finally(() => setCandidatesLoading(false));
  };

  const assertAdaptation = async (candidate: MediaItem) => {
    setLinkingId(candidate.id);
    setLinkError(null);
    const relation: WorkRelationType =
      candidatesDirection || (isBook ? 'adapted_as' : 'adaptation_of');
    try {
      await sendMessage(MessageType.ASSERT_WORK_RELATION, {
        fromWorkId: media.id,
        toWorkId: candidate.id,
        relation,
        confidence: 'user_asserted' as const,
        fromMedia: media,
        toMedia: candidate,
      });
      setLinkOpen(false);
      setCandidates([]);
      loadRelatedWorks();
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Could not link works');
    } finally {
      setLinkingId(null);
    }
  };

  useEffect(() => {
    setNotes(libraryItem?.notes || '');
    setAtmosphere(libraryItem?.atmosphere || '');
    setLingeringThought(libraryItem?.lingeringThought || '');
    setEmotions(libraryItem ? getEmotionalSpectrum(libraryItem) : DEFAULT_EMOTIONS);
  }, [
    libraryItem?.notes,
    libraryItem?.atmosphere,
    libraryItem?.lingeringThought,
    libraryItem?.awe,
    libraryItem?.melancholy,
    libraryItem?.tension,
    libraryItem?.warmth,
  ]);

  // Load reading progress for books
  useEffect(() => {
    if (!isBook || !libraryItem) return;
    let cancelled = false;
    sendMessage<{ workId: string }, { experience?: { progress?: { value?: number; total?: number } } | null }>(
      MessageType.UPDATE_EXPERIENCE,
      { workId: media.id },
    )
      .then((res) => {
        if (cancelled || !res.success) return;
        const prog = res.data?.experience?.progress;
        if (prog?.value !== undefined) setPageProgress(prog.value);
        if (prog?.total !== undefined) setTotalPages(prog.total);
        else if (media.pageCount) setTotalPages(media.pageCount);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isBook, libraryItem?.mediaId, media.id, media.pageCount]);

  // Load book editions for preferred-edition picker
  useEffect(() => {
    if (!isBook) return;
    let cancelled = false;
    sendMessage<
      { workId: string },
      { editions: BookEdition[]; preferredEditionId?: string | null }
    >(MessageType.GET_BOOK_EDITIONS, { workId: media.id })
      .then((res) => {
        if (cancelled || !res.success || !res.data) return;
        setEditions(Array.isArray(res.data.editions) ? res.data.editions : []);
        if (res.data.preferredEditionId) {
          setPreferredEditionId(res.data.preferredEditionId);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isBook, media.id]);

  const handlePreferredEditionChange = async (editionId: string) => {
    setPreferredEditionId(editionId);
    if (!editionId) return;
    setEditionSaving(true);
    try {
      await sendMessage(MessageType.SET_PREFERRED_EDITION, {
        workId: media.id,
        editionId,
      });
    } catch {
      /* non-fatal */
    } finally {
      setEditionSaving(false);
    }
  };

  const handleReadOrWatchAgain = async () => {
    if (againBusy || !libraryItem) return;
    setAgainBusy(true);
    try {
      const kind = isBook ? 'read' : 'watch';
      await sendMessage(MessageType.CREATE_EXPERIENCE, {
        workId: media.id,
        kind,
        status: 'in_progress',
        editionId: preferredEditionId || undefined,
      });
      onUpdateStatus?.('watching');
      setExperienceRefreshKey((k) => k + 1);
      playSaveCeremony();
    } catch {
      /* non-fatal */
    } finally {
      setAgainBusy(false);
    }
  };

  useEffect(() => {
    return () => {
      if (notesDebounceRef.current) {
        clearTimeout(notesDebounceRef.current);
      }
      if (ceremonyTimerRef.current) {
        clearTimeout(ceremonyTimerRef.current);
      }
      if (progressDebounceRef.current) {
        clearTimeout(progressDebounceRef.current);
      }
    };
  }, []);

  const persistReadingProgress = (page: number | '', total: number | '') => {
    if (!isBook || !libraryItem) return;
    if (progressDebounceRef.current) clearTimeout(progressDebounceRef.current);
    progressDebounceRef.current = setTimeout(() => {
      progressDebounceRef.current = undefined;
      const value = typeof page === 'number' ? page : parseInt(String(page), 10);
      if (!Number.isFinite(value) || value < 0) return;
      const totalVal =
        typeof total === 'number'
          ? total
          : total === ''
            ? undefined
            : parseInt(String(total), 10);
      sendMessage(MessageType.UPDATE_EXPERIENCE, {
        workId: media.id,
        progress: {
          unit: 'page' as const,
          value,
          ...(Number.isFinite(totalVal as number) && (totalVal as number) > 0
            ? { total: totalVal as number }
            : {}),
        },
      }).catch(() => {});
    }, 400);
  };

  const finishClose = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  };

  const requestClose = () => {
    if (closedRef.current || closing) return;
    if (prefersReducedMotion()) {
      finishClose();
      return;
    }
    setClosing(true);
  };

  // Wait for curtain-close animationend, with timeout fallback if it never fires
  useEffect(() => {
    if (!closing) return;

    const el = modalRef.current;
    const onEnd = (e: AnimationEvent) => {
      if (el && e.target !== el) return;
      // Ignore enter animation if it somehow races; only finish on exit
      if (e.animationName && !String(e.animationName).includes('exit')) return;
      finishClose();
    };

    el?.addEventListener('animationend', onEnd as EventListener);
    const timer = window.setTimeout(finishClose, EXIT_FALLBACK_MS);
    return () => {
      el?.removeEventListener('animationend', onEnd as EventListener);
      window.clearTimeout(timer);
    };
  }, [closing]);

  const playSaveCeremony = () => {
    if (prefersReducedMotion()) return;
    // Retrigger one-shot class if already mid-ceremony
    setSaveCeremony(false);
    if (ceremonyTimerRef.current) {
      clearTimeout(ceremonyTimerRef.current);
    }
    // Double rAF so the class can re-apply and restart CSS animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setSaveCeremony(true);
        ceremonyTimerRef.current = setTimeout(() => {
          setSaveCeremony(false);
          ceremonyTimerRef.current = undefined;
        }, SAVE_CEREMONY_MS);
      });
    });
  };

  const commitNotesSave = (
    nextNotes: string,
    nextAtmosphere: string,
    nextLingering: string,
    nextEmotions: EmotionalSpectrum,
  ) => {
    onUpdateNotes?.(nextNotes, nextAtmosphere, nextLingering, nextEmotions);
    playSaveCeremony();
  };

  const scheduleNotesSave = (
    nextNotes: string,
    nextAtmosphere: string,
    nextLingering: string,
    nextEmotions: EmotionalSpectrum,
  ) => {
    if (notesDebounceRef.current) {
      clearTimeout(notesDebounceRef.current);
    }
    notesDebounceRef.current = setTimeout(() => {
      notesDebounceRef.current = undefined;
      commitNotesSave(nextNotes, nextAtmosphere, nextLingering, nextEmotions);
    }, 500);
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    scheduleNotesSave(value, atmosphere, lingeringThought, emotions);
  };

  const handleAtmosphereChange = (value: string) => {
    setAtmosphere(value);
    scheduleNotesSave(notes, value, lingeringThought, emotions);
  };

  const handleLingeringChange = (value: string) => {
    setLingeringThought(value);
    scheduleNotesSave(notes, atmosphere, value, emotions);
  };

  const handleEmotionChange = (key: keyof EmotionalSpectrum, value: number) => {
    const nextEmotions = { ...emotions, [key]: value };
    setEmotions(nextEmotions);
    scheduleNotesSave(notes, atmosphere, lingeringThought, nextEmotions);
  };

  const flushNotes = () => {
    if (notesDebounceRef.current) {
      clearTimeout(notesDebounceRef.current);
      notesDebounceRef.current = undefined;
      commitNotesSave(notes, atmosphere, lingeringThought, emotions);
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', handleEsc);
    modalRef.current?.focus();
    return () => document.removeEventListener('keydown', handleEsc);
  }, [closing]);

  const tmdbRating = media.ratings.find((r) => r.provider === 'tmdb');
  const imdbRating = media.ratings.find((r) => r.provider === 'imdb');
  const rtRating = media.ratings.find((r) => r.provider === 'rt');

  const closingClass = closing ? ' closing' : '';

  return (
    <div
      className={`sanctuary-modal-backdrop${closingClass}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        className={`sanctuary-modal-content${closingClass}`}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <button type="button" onClick={requestClose} className="sanctuary-modal-close" aria-label="Close details">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {libraryItem && reflectionExcerpt && (
          <ExpandableReflection
            text={reflectionExcerpt}
            className="sanctuary-detail-reflection-lead hardcover-snippet-lead"
          />
        )}

        <div className="sanctuary-detail-header">
          <div className="sanctuary-detail-poster-wrap">
            {media.posterUrl ? (
              <img src={media.posterUrl} alt={media.canonicalTitle} className="sanctuary-detail-poster-img" loading="lazy" decoding="async" />
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
              {isBook ? 'Book' : media.type === 'tv' ? 'TV series' : 'Film'}
            </div>
            <h2 id={titleId} className="sanctuary-detail-title">
              {media.canonicalTitle}
            </h2>

            {isBook && media.authors && media.authors.length > 0 && (
              <p className="sanctuary-detail-authors" style={{ margin: '0.25rem 0 0', opacity: 0.85 }}>
                {media.authors.join(', ')}
              </p>
            )}

            <div className="sanctuary-detail-ratings">
              <span className="sanctuary-detail-year">{media.year || '·'}</span>
              {!isBook && (
                <>
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
                </>
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
            <h3 className="sanctuary-detail-section-title">Programme notes</h3>
            <p className="sanctuary-detail-synopsis">{media.overview}</p>
          </div>
        )}

        {media.streamingAvailability && media.streamingAvailability.length > 0 && (
          <div className="sanctuary-detail-section">
            <h3 className="sanctuary-detail-section-title">Where to screen</h3>
            <PlatformChips availability={media.streamingAvailability} />
          </div>
        )}

        {media.providers.length > 0 && (
          <div className="sanctuary-detail-section">
            <h3 className="sanctuary-detail-section-title">Links</h3>
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

        <div className="sanctuary-detail-section" data-testid="related-works-section">
          <h3 className="sanctuary-detail-section-title">Related works</h3>
          {relatedLoading && (
            <p className="sanctuary-detail-related-empty">Loading related works…</p>
          )}
          {!relatedLoading && relatedWorks.length === 0 && !linkOpen && (
            <p className="sanctuary-detail-related-empty">
              No adaptations linked yet. Relations are only created from metadata or your confirmation.
            </p>
          )}
          {relatedWorks.length > 0 && (
            <ul className="sanctuary-detail-related-list">
              {relatedWorks.map((row) => (
                <li key={row.relation.id} className="sanctuary-detail-related-item">
                  <span className="sanctuary-detail-related-label">{row.label}</span>
                  <span className="sanctuary-detail-related-title">
                    {row.linkedWork?.canonicalTitle || row.linkedWorkId}
                    {row.linkedWork?.year ? (
                      <span className="sanctuary-detail-related-year"> ({row.linkedWork.year})</span>
                    ) : null}
                    {row.linkedWork?.type ? (
                      <span className="sanctuary-detail-related-medium"> · {row.linkedWork.type}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {!linkOpen ? (
            <button
              type="button"
              className="sanctuary-detail-related-link-btn"
              onClick={openLinkAdaptation}
              data-testid="link-adaptation-btn"
            >
              Link adaptation…
            </button>
          ) : (
            <div className="sanctuary-detail-related-search" data-testid="adaptation-candidates">
              <div className="sanctuary-detail-related-search-header">
                <span className="sanctuary-detail-control-label">
                  {isBook ? 'Film / series adaptations' : 'Source books'}
                </span>
                <button
                  type="button"
                  className="sanctuary-detail-related-cancel"
                  onClick={() => {
                    setLinkOpen(false);
                    setCandidates([]);
                    setLinkError(null);
                  }}
                >
                  Cancel
                </button>
              </div>
              {candidatesLoading && (
                <p className="sanctuary-detail-related-empty">Searching…</p>
              )}
              {linkError && (
                <p className="sanctuary-detail-related-error" role="alert">{linkError}</p>
              )}
              {!candidatesLoading && candidates.length === 0 && !linkError && (
                <p className="sanctuary-detail-related-empty">No candidates found for this title.</p>
              )}
              <ul className="sanctuary-detail-related-candidates">
                {candidates.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="sanctuary-detail-related-candidate"
                      disabled={linkingId === c.id}
                      onClick={() => assertAdaptation(c)}
                    >
                      <span className="sanctuary-detail-related-candidate-title">
                        {c.canonicalTitle}
                        {c.year ? ` (${c.year})` : ''}
                      </span>
                      <span className="sanctuary-detail-related-candidate-meta">
                        {c.type}
                        {c.authors?.length ? ` · ${c.authors.slice(0, 2).join(', ')}` : ''}
                        {linkingId === c.id ? ' · linking…' : ' · Link'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="sanctuary-detail-related-note">
                Linking is display-only — ratings and notes stay on each work.
              </p>
            </div>
          )}
        </div>

        <div className="sanctuary-detail-library-wrap">
          {libraryItem ? (
            <div className="sanctuary-detail-library-stack">
              <button
                type="button"
                className="sanctuary-detail-details-toggle"
                aria-expanded={detailsExpanded}
                onClick={() => setDetailsExpanded((prev) => !prev)}
              >
                Dossier
                <span className="sanctuary-detail-details-chevron">{detailsExpanded ? '▴' : '▾'}</span>
              </button>

              {detailsExpanded && (
                <div className="sanctuary-detail-details-panel">
                  <div className="sanctuary-detail-control-row">
                    <span className="sanctuary-detail-control-label">Status:</span>
                    <select
                      value={libraryItem.status}
                      onChange={(e) => onUpdateStatus?.((e.target as HTMLSelectElement).value as LibraryStatus)}
                      className="sanctuary-detail-input sanctuary-detail-select"
                    >
                      {statusOptions.map((opt) => (
                        <option value={opt.value} key={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {isBook && (
                    <div className="sanctuary-detail-control-row" data-testid="reading-progress">
                      <span className="sanctuary-detail-control-label">Progress:</span>
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        placeholder="Page"
                        value={pageProgress}
                        onInput={(e) => {
                          const raw = (e.target as HTMLInputElement).value;
                          const next = raw === '' ? '' : Math.max(0, parseInt(raw, 10) || 0);
                          setPageProgress(next);
                          persistReadingProgress(next, totalPages);
                        }}
                        className="sanctuary-detail-input"
                        style={{ width: '5rem' }}
                        aria-label="Current page"
                      />
                      <span style={{ opacity: 0.6 }}>/</span>
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        placeholder="Total"
                        value={totalPages}
                        onInput={(e) => {
                          const raw = (e.target as HTMLInputElement).value;
                          const next = raw === '' ? '' : Math.max(0, parseInt(raw, 10) || 0);
                          setTotalPages(next);
                          persistReadingProgress(pageProgress, next);
                        }}
                        className="sanctuary-detail-input"
                        style={{ width: '5rem' }}
                        aria-label="Total pages"
                      />
                      <span className="sanctuary-detail-control-label" style={{ opacity: 0.7 }}>
                        pages
                      </span>
                    </div>
                  )}

                  {isBook && editions.length > 0 && (
                    <div
                      className="sanctuary-detail-control-row"
                      data-testid="edition-picker"
                    >
                      <span className="sanctuary-detail-control-label">Edition:</span>
                      <select
                        value={preferredEditionId}
                        onChange={(e) =>
                          void handlePreferredEditionChange(
                            (e.target as HTMLSelectElement).value,
                          )
                        }
                        className="sanctuary-detail-input sanctuary-detail-select"
                        aria-label="Preferred edition"
                        disabled={editionSaving}
                      >
                        <option value="">Select edition…</option>
                        {editions.map((ed) => {
                          const isbn =
                            ed.isbn13?.[0] || ed.isbn10?.[0] || '';
                          const format = ed.format ? ed.format : '';
                          const parts = [
                            ed.title,
                            format,
                            isbn ? `ISBN ${isbn}` : '',
                          ].filter(Boolean);
                          return (
                            <option value={ed.id} key={ed.id}>
                              {parts.join(' · ')}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {libraryItem.status === 'watched' && (
                    <div className="sanctuary-detail-control-row">
                      <span className="sanctuary-detail-control-label">Your verdict:</span>
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
                        {libraryItem.userRating || 5} <span className="sanctuary-detail-rating-max">/ 10</span>
                      </span>
                    </div>
                  )}

                  {libraryItem.status === 'watched' && (
                    <div className="sanctuary-detail-control-row" data-testid="again-action">
                      <button
                        type="button"
                        className="sanctuary-btn-restraint"
                        disabled={againBusy}
                        onClick={() => void handleReadOrWatchAgain()}
                      >
                        {againBusy ? 'Starting…' : againLabel}
                      </button>
                    </div>
                  )}

                  <ExperienceHistory
                    workId={media.id}
                    medium={isBook ? 'book' : media.type === 'tv' ? 'tv' : 'movie'}
                    refreshKey={experienceRefreshKey}
                  />

                  <div className="sanctuary-detail-tags-section">
                    <span className="sanctuary-detail-control-label">Tags:</span>

                    <div className="sanctuary-detail-tags-list">
                      {(libraryItem.userTags || []).map((tag) => (
                        <span key={tag} className="sanctuary-detail-tag-chip">
                          {tag}
                          <button
                            type="button"
                            aria-label={`Remove tag ${tag}`}
                            onClick={() => {
                              const newTags = (libraryItem.userTags || []).filter(t => t !== tag);
                              onUpdateTags?.(newTags);
                            }}
                            className="sanctuary-detail-tag-remove"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder="Tag this screening, press Enter"
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
                      <span className="sanctuary-detail-suggestions-label">Suggested tags:</span>
                      {SUGGESTED_TAGS.map((tag) => {
                        const isAdded = (libraryItem.userTags || []).includes(tag);
                        if (isAdded) return null;
                        return (
                          <button
                            type="button"
                            key={tag}
                            onClick={() => {
                              const currentTags = libraryItem.userTags || [];
                              onUpdateTags?.([...currentTags, tag]);
                            }}
                            className="sanctuary-detail-suggestion-chip"
                          >
                            + {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div
                    className={`sanctuary-detail-notes-section save-ceremony-surface${saveCeremony ? ' save-ceremony' : ''}`}
                    data-testid="detail-notes-section"
                  >
                    <span className="sanctuary-detail-control-label">Reflection:</span>
                    <textarea
                      value={notes}
                      placeholder="What stayed with you after the credits?"
                      onChange={(e) => handleNotesChange(e.currentTarget.value)}
                      onBlur={flushNotes}
                      rows={4}
                      className="sanctuary-detail-input sanctuary-detail-textarea"
                    />

                    <div className="sanctuary-detail-metadata-inputs">
                      <div className="sanctuary-detail-input-wrap">
                        <span className="sanctuary-detail-control-label sanctuary-detail-control-label-sm">Atmosphere:</span>
                        <input
                          type="text"
                          value={atmosphere}
                          placeholder="e.g. Melancholic, Warm Amber"
                          onChange={(e) => handleAtmosphereChange(e.currentTarget.value)}
                          onBlur={flushNotes}
                          className="sanctuary-detail-input"
                        />
                      </div>
                      <div className="sanctuary-detail-input-wrap">
                        <span className="sanctuary-detail-control-label sanctuary-detail-control-label-sm">Lingering Thought:</span>
                        <input
                          type="text"
                          value={lingeringThought}
                          placeholder="e.g. The cost of love..."
                          onChange={(e) => handleLingeringChange(e.currentTarget.value)}
                          onBlur={flushNotes}
                          className="sanctuary-detail-input"
                        />
                      </div>
                    </div>

                    <div className="sanctuary-detail-emotions" data-testid="detail-emotions-panel">
                      <span className="sanctuary-detail-control-label">Afterglow · emotional spectrum</span>
                      <EmotionalSliders
                        values={emotions}
                        onChange={handleEmotionChange}
                        variant="sanctuary"
                        idPrefix="detail"
                      />
                      <AuraVisualizer values={emotions} variant="sanctuary" ceremony={saveCeremony} />
                    </div>
                  </div>

                  <ReflectionTimeline
                    workId={media.id}
                    medium={media.type === 'book' ? 'book' : media.type === 'tv' ? 'tv' : 'movie'}
                    showAbandonPrompts={libraryItem.status === 'abandoned'}
                  />
                </div>
              )}
            </div>
          ) : (
            <button className="sanctuary-detail-btn-inscribe" onClick={onAddToLibrary}>
              Add to archive
            </button>
          )}
        </div>
      </div>
    </div>
  );
}