import { h } from 'preact';
import { useState, useEffect, useRef, useId, useCallback } from 'preact/hooks';
import {
  MediaItem,
  MessageType,
  SanctuaryIntent,
  LibraryStatus,
  AddToListRequest,
  UpdateStatusRequest,
  SetUserNotesRequest,
  SetUserRatingRequest,
  GetMediaItemsRequest,
  LibraryItem,
} from '@/shared/types';
import { sendMessage } from '@/shared/messages';
import { DEFAULT_EMOTIONS, type EmotionalSpectrum } from '@/shared/emotions';
import { INTENT_CHIP_LABELS } from './archive/constants';
import { EmotionalSliders } from './EmotionalSliders';
import { AuraVisualizer } from './AuraVisualizer';
import '../styles/poetic-sanctuary.css';

export interface PoeticCaptureCanvasProps {
  mediaId: string;
  onClose: () => void;
  onSave?: () => void;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SAVE_CEREMONY_MS = 280; /* matches --duration-soft-settle; ≤300ms UI wiki */
const EXIT_FALLBACK_MS = 350; /* curtain-close + buffer; matches DetailModal */
/** Progressive disclosure: intent + rating after short recall, not a full essay. */
const RECALL_DISCLOSURE_CHARS = 40;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function PoeticCaptureCanvas({ mediaId, onClose, onSave }: PoeticCaptureCanvasProps) {
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [emotionalRecall, setEmotionalRecall] = useState<string>('');
  const [intent, setIntent] = useState<SanctuaryIntent>('keep_memory');
  const [rating, setRating] = useState<number>(0);
  const [atmosphere, setAtmosphere] = useState<string>('');
  const [lingeringThought, setLingeringThought] = useState<string>('');
  const [emotions, setEmotions] = useState<EmotionalSpectrum>(DEFAULT_EMOTIONS);
  const [isWriting, setIsWriting] = useState<boolean>(false);
  /** Sticky: first non-empty blur on recall reveals intent + rating. */
  const [recallBlurredWithContent, setRecallBlurredWithContent] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveCeremony, setSaveCeremony] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const ceremonyTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const closedRef = useRef(false);
  const headingId = useId();
  const textareaId = useId();

  const finishClose = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (closedRef.current || closing) return;
    if (prefersReducedMotion()) {
      finishClose();
      return;
    }
    setClosing(true);
  }, [closing, finishClose]);

  const fetchMedia = useCallback(async (isMounted: () => boolean) => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await sendMessage<GetMediaItemsRequest, MediaItem[]>(MessageType.GET_MEDIA_ITEMS, {
        mediaIds: [mediaId],
      });
      if (!isMounted()) return;
      if (res.success && res.data && res.data.length > 0) {
        setMedia(res.data[0]);
        setLoadError(false);
      } else {
        setMedia(null);
        setLoadError(true);
      }
    } catch (err) {
      if (!isMounted()) return;
      console.error('[PoeticCaptureCanvas] Failed to load media:', err);
      setMedia(null);
      setLoadError(true);
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, [mediaId]);

  useEffect(() => {
    let isMounted = true;
    fetchMedia(() => isMounted);
    return () => {
      isMounted = false;
    };
  }, [fetchMedia]);

  useEffect(() => {
    if (!loading && !loadError && media) {
      setIsWriting(true);
    } else if (loading || loadError) {
      setIsWriting(false);
    }
  }, [loading, loadError, media]);

  useEffect(() => {
    if (loading || loadError) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const focusTextarea = () => {
      textareaRef.current?.focus();
    };
    const focusTimer = window.setTimeout(focusTextarea, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
        return;
      }

      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [requestClose, loading, loadError]);

  useEffect(() => {
    return () => {
      if (ceremonyTimerRef.current) {
        clearTimeout(ceremonyTimerRef.current);
      }
    };
  }, []);

  // Wait for curtain-close animationend, with timeout fallback if it never fires
  useEffect(() => {
    if (!closing) return;

    const el = dialogRef.current;
    const onEnd = (e: AnimationEvent) => {
      if (el && e.target !== el) return;
      if (e.animationName && !String(e.animationName).includes('exit')) return;
      finishClose();
    };

    el?.addEventListener('animationend', onEnd as EventListener);
    const timer = window.setTimeout(finishClose, EXIT_FALLBACK_MS);
    return () => {
      el?.removeEventListener('animationend', onEnd as EventListener);
      window.clearTimeout(timer);
    };
  }, [closing, finishClose]);

  const handleRetry = () => {
    fetchMedia(() => true);
  };

  const finishAfterSave = () => {
    onSave?.();
    requestClose();
  };

  const handleSave = async () => {
    if (!media || saving) return;
    setSaveError(null);
    setSaving(true);
    try {
      await sendMessage<AddToListRequest, LibraryItem>(MessageType.ADD_TO_LIST, {
        mediaItem: media,
        type: media.type,
      });
      const statusMap: Record<SanctuaryIntent, LibraryStatus> = {
        keep_memory: 'watched',
        revisit_this_month: 'watching',
        wishlist: 'to-watch',
      };
      await sendMessage<UpdateStatusRequest, Record<string, unknown>>(MessageType.UPDATE_STATUS, {
        mediaId,
        status: statusMap[intent],
      });
      const hasNotes =
        emotionalRecall.trim() ||
        atmosphere.trim() ||
        lingeringThought.trim() ||
        emotions.awe !== DEFAULT_EMOTIONS.awe ||
        emotions.melancholy !== DEFAULT_EMOTIONS.melancholy ||
        emotions.tension !== DEFAULT_EMOTIONS.tension ||
        emotions.warmth !== DEFAULT_EMOTIONS.warmth;
      if (hasNotes) {
        await sendMessage<SetUserNotesRequest, Record<string, unknown>>(MessageType.SET_USER_NOTES, {
          mediaId,
          notes: '',
          emotionalRecall: emotionalRecall.trim() || undefined,
          atmosphere: atmosphere.trim() || undefined,
          lingeringThought: lingeringThought.trim() || undefined,
          awe: emotions.awe,
          melancholy: emotions.melancholy,
          tension: emotions.tension,
          warmth: emotions.warmth,
        });
      }
      if (rating > 0) {
        await sendMessage<SetUserRatingRequest, Record<string, unknown>>(MessageType.SET_USER_RATING, {
          mediaId,
          rating,
        });
      }

      // One-shot micro-ceremony before dismiss; PRM skips motion and closes immediately
      if (prefersReducedMotion()) {
        finishAfterSave();
        return;
      }
      setSaveCeremony(true);
      ceremonyTimerRef.current = setTimeout(() => {
        ceremonyTimerRef.current = undefined;
        finishAfterSave();
      }, SAVE_CEREMONY_MS);
    } catch (err) {
      console.error('[PoeticCaptureCanvas] Save failed:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save reflection. Please try again.');
      setSaving(false);
    }
  };

  const director = media?.wikidataDirectorBio;
  const showProgressiveControls =
    emotionalRecall.length >= RECALL_DISCLOSURE_CHARS || recallBlurredWithContent;
  const modalClass = `poetic-sanctuary-modal${isWriting ? ' staging-one-focal-point' : ''}${saveCeremony ? ' save-ceremony' : ''}${closing ? ' closing' : ''}`;

  return (
    <div
      class={modalClass}
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      <div class="poetic-backdrop">
        {media?.posterUrl && (
          <img
            src={media.posterUrl}
            alt={media.canonicalTitle}
            class={`poetic-poster ${isWriting ? 'writing' : ''}`}
          />
        )}
      </div>

      <div class="poetic-content">
        {loading ? (
          <div class="poetic-loading" data-testid="poetic-loading">
            <div class="poetic-loading-pulse" />
            <p class="poetic-loading-text">Opening the frame…</p>
          </div>
        ) : loadError ? (
          <div class="poetic-error" data-testid="poetic-error">
            <p class="poetic-error-text">This title could not be retrieved from the vault.</p>
            <button type="button" class="poetic-retry-btn" data-testid="poetic-retry-btn" onClick={handleRetry}>
              Try Again
            </button>
          </div>
        ) : (
          <>
            {media && (
              <div class="poetic-media-header" data-testid="poetic-media-header">
                <h2 class="poetic-film-title">
                  {media.canonicalTitle}
                  {media.year ? ` (${media.year})` : ''}
                </h2>
                {director && (
                  <p class="poetic-film-director">Directed by {director}</p>
                )}
              </div>
            )}

            <h1 id={headingId} class="poetic-heading">What stayed with you?</h1>

            <label for={textareaId} class="sr-only">Emotional recall</label>
            <textarea
              id={textareaId}
              ref={textareaRef}
              class="poetic-textarea"
              placeholder="Reflect on the silence after..."
              value={emotionalRecall}
              onInput={(e) => setEmotionalRecall((e.currentTarget as HTMLTextAreaElement).value)}
              onFocus={() => setIsWriting(true)}
              onBlur={() => {
                setIsWriting(false);
                const value = textareaRef.current?.value ?? emotionalRecall;
                if (value.trim().length > 0) {
                  setRecallBlurredWithContent(true);
                }
              }}
            />

            <div
              class={`poetic-emotions-panel save-ceremony-surface${saveCeremony ? ' save-ceremony' : ''}`}
              data-testid="poetic-emotions-panel"
            >
              <EmotionalSliders
                values={emotions}
                onChange={(key, value) => setEmotions((prev) => ({ ...prev, [key]: value }))}
                variant="sanctuary"
                idPrefix="poetic"
              />
              <AuraVisualizer values={emotions} variant="sanctuary" ceremony={saveCeremony} />
            </div>

            {showProgressiveControls && (
              <div class="progressive-controls">
                <div class="intent-selectors" data-testid="intent-selectors">
                  <button
                    type="button"
                    data-intent="keep_memory"
                    class={intent === 'keep_memory' ? 'active' : ''}
                    onClick={() => setIntent('keep_memory')}
                  >
                    {INTENT_CHIP_LABELS.keep_memory}
                  </button>
                  <button
                    type="button"
                    data-intent="revisit_this_month"
                    class={intent === 'revisit_this_month' ? 'active' : ''}
                    onClick={() => setIntent('revisit_this_month')}
                  >
                    {INTENT_CHIP_LABELS.revisit_this_month}
                  </button>
                  <button
                    type="button"
                    data-intent="wishlist"
                    class={intent === 'wishlist' ? 'active' : ''}
                    onClick={() => setIntent('wishlist')}
                  >
                    {INTENT_CHIP_LABELS.wishlist}
                  </button>
                </div>

                <div class="rating-control" data-testid="rating-control">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      type="button"
                      data-rating={`${num}`}
                      class={rating === num ? 'active' : ''}
                      onClick={() => setRating(num)}
                    >
                      {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][num - 1]}
                    </button>
                  ))}
                </div>

                <div class="metadata-fields-group">
                  <div class="metadata-input-group">
                    <label class="metadata-label" for="poetic-atmosphere">Atmosphere</label>
                    <input
                      id="poetic-atmosphere"
                      type="text"
                      class="poetic-input"
                      placeholder="e.g. Melancholic, Neon-drenched, Warm Amber"
                      value={atmosphere}
                      onInput={(e) => setAtmosphere((e.currentTarget as HTMLInputElement).value)}
                      data-testid="atmosphere-input"
                    />
                  </div>

                  <div class="metadata-input-group">
                    <label class="metadata-label" for="poetic-lingering">Lingering Thought</label>
                    <input
                      id="poetic-lingering"
                      type="text"
                      class="poetic-input"
                      placeholder="e.g. The cost of love / A memory frozen in time..."
                      value={lingeringThought}
                      onInput={(e) => setLingeringThought((e.currentTarget as HTMLInputElement).value)}
                      data-testid="lingering-thought-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {saveError && (
              <p class="poetic-save-error">{saveError}</p>
            )}

            <div class="poetic-actions">
              <button type="button" class="close-btn" onClick={requestClose}>
                Close
              </button>
              <button
                type="button"
                class="save-btn"
                data-testid="save-btn"
                onClick={handleSave}
                disabled={!media || saving}
              >
                Save reflection
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}