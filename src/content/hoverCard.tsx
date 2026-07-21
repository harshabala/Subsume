import { render, h } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import {
  MessageType,
  MediaItem,
  MediaType,
  LibraryItem,
  CheckLibraryStatusResponse,
} from '@/shared/types';
import { formatPlatformName } from '@/shared/platforms';
import { setupShadowStyles } from '@/shared/shadowTokens';
import { attachClosedShadow, isTrustedGesture } from '@/content/closedShadow';

// ─── Positioning ─────────────────────────────────────────────────────

interface CardPosition {
  top: number;
  left: number;
}

function computePosition(target: HTMLElement): CardPosition {
  const rect = target.getBoundingClientRect();
  const cardW = 340;
  const cardH = 380;
  const gap = 12;

  let top = rect.bottom + gap + window.scrollY;
  let left = rect.left + window.scrollX;

  // Keep within viewport
  if (left + cardW > window.innerWidth) {
    left = window.innerWidth - cardW - 16;
  }
  if (left < 8) left = 8;

  // If card would go below viewport, show above
  if (rect.bottom + gap + cardH > window.innerHeight) {
    top = rect.top - cardH - gap + window.scrollY;
  }

  return { top, left };
}

// ─── Hover Card Component ────────────────────────────────────────────

interface HoverCardProps {
  mediaItem: MediaItem | null;
  loading: boolean;
  position: CardPosition;
  visible: boolean;
  exiting?: boolean;
  inLibrary: boolean;
  libraryItem: LibraryItem | null;
  onAdd: (type: MediaType) => void;
  onRemove: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function HoverCard({
  mediaItem,
  loading,
  position,
  visible,
  exiting = false,
  inLibrary,
  libraryItem,
  onAdd,
  onRemove,
  onMouseEnter,
  onMouseLeave,
}: HoverCardProps) {
  if (!visible && !exiting) return null;

  const imdbRating = mediaItem?.ratings.find((r) => r.provider === 'imdb');
  const rtRating = mediaItem?.ratings.find((r) => r.provider === 'rt');

  return (
    <div
      className={`subsume-hover-card ${visible && !exiting ? 'subsume-visible' : ''} ${exiting ? 'subsume-exiting' : ''}`}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {loading ? (
        <div className="subsume-skeleton">
          <div className="subsume-skeleton-header">
            <div className="subsume-skeleton-poster" />
            <div className="subsume-skeleton-info">
              <div className="subsume-skeleton-line subsume-skeleton-title" />
              <div className="subsume-skeleton-line subsume-skeleton-meta" />
            </div>
          </div>
          <div className="subsume-skeleton-line subsume-skeleton-ratings" />
          <div className="subsume-skeleton-line subsume-skeleton-overview" />
          <div className="subsume-skeleton-line subsume-skeleton-overview short" />
        </div>
      ) : mediaItem ? (
        <>
          {/* Header */}
          <div className="subsume-card-header">
            <div className="subsume-poster">
              {mediaItem.posterUrl ? (
                <img src={mediaItem.posterUrl} alt={mediaItem.canonicalTitle} />
              ) : (
                <div className="subsume-poster-placeholder">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="2" y="3" width="20" height="18" rx="2" />
                    <path d="M7 3v18M17 3v18M2 9h5M17 9h5M2 15h5M17 15h5" />
                  </svg>
                </div>
              )}
            </div>
            <div className="subsume-card-info">
              <h3 className="subsume-title">{mediaItem.canonicalTitle}</h3>
              <div className="subsume-meta">
                <span className="subsume-year">{mediaItem.year}</span>
                {mediaItem.runtimeMinutes && (
                  <span className="subsume-runtime">{mediaItem.runtimeMinutes} min</span>
                )}
                <span className="subsume-type-badge">
                  {mediaItem.type === 'tv' ? 'TV Show' : 'Movie'}
                </span>
              </div>
            </div>
          </div>

          {/* Ratings */}
          <div className="subsume-ratings">
            {imdbRating && (
              <div className="subsume-rating-chip subsume-imdb">
                <span className="subsume-rating-icon">⭐</span>
                <span className="subsume-rating-label">IMDb</span>
                <span className="subsume-rating-value">{imdbRating.score}/10</span>
              </div>
            )}
            {rtRating && (
              <div className="subsume-rating-chip subsume-rt">
                <span className="subsume-rating-icon">🍅</span>
                <span className="subsume-rating-label">RT</span>
                <span className="subsume-rating-value">{rtRating.score}%</span>
              </div>
            )}
          </div>

          {/* Streaming availability */}
          {mediaItem.streamingAvailability && mediaItem.streamingAvailability.length > 0 && (
            <div className="subsume-platforms">
              {mediaItem.streamingAvailability.slice(0, 3).map((info, index) => (
                <span key={`${info.platform}-${index}`} className="subsume-platform-tag">
                  {formatPlatformName(info.platform)}
                </span>
              ))}
            </div>
          )}

          {/* Genres */}
          <div className="subsume-genres">
            {mediaItem.genres.map((genre) => (
              <span key={genre} className="subsume-genre-tag">
                {genre}
              </span>
            ))}
          </div>

          {/* Overview */}
          {mediaItem.overview && (
            <p className="subsume-overview">{mediaItem.overview}</p>
          )}

          {/* Library Status Bar (Statistical Overlay) */}
          {inLibrary && libraryItem && (
            <div className="subsume-library-status-bar">
              <div className="subsume-library-status-left">
                <span className="subsume-library-label">Status</span>
                <span className={`subsume-status-badge status-${libraryItem.status}`}>
                  {libraryItem.status === 'to-watch' ? 'To Watch' :
                   libraryItem.status === 'watching' ? 'Watching' :
                   libraryItem.status === 'watched' ? 'Watched' : 'Abandoned'}
                </span>
              </div>
              {libraryItem.userRating !== undefined && (
                <div className="subsume-library-status-right">
                  <span className="subsume-library-label">My Rating</span>
                  <span className="subsume-user-rating-badge">
                    <span className="subsume-star">★</span> {libraryItem.userRating}/10
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions — only real user gestures (ignore synthetic page clicks) */}
          <div className="subsume-actions">
            {inLibrary ? (
              <button
                className="subsume-btn subsume-btn-danger"
                onClick={(e) => {
                  if (!isTrustedGesture(e)) return;
                  onRemove();
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Remove from archive
              </button>
            ) : (
              <>
                <button
                  className="subsume-btn subsume-btn-primary"
                  onClick={(e) => {
                    if (!isTrustedGesture(e)) return;
                    onAdd('movie');
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add to archive
                </button>
                <button
                  className="subsume-btn subsume-btn-secondary"
                  onClick={(e) => {
                    if (!isTrustedGesture(e)) return;
                    onAdd('tv');
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add series to archive
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="subsume-error">Could not load details</div>
      )}
    </div>
  );
}

// ─── Hover Card Manager ──────────────────────────────────────────────

type PrefetchEntry = {
  promise: Promise<{ success: boolean; data?: MediaItem }>;
};

export class HoverCardManager {
  private container: HTMLDivElement;
  private shadowRoot: ShadowRoot;
  private currentTarget: HTMLElement | null = null;
  private showTimeout: ReturnType<typeof setTimeout> | null = null;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;
  private prefetchDebounce: ReturnType<typeof setTimeout> | null = null;
  private isCardHovered = false;
  private isExiting = false;
  private libraryItems: Map<string, LibraryItem> = new Map();
  private prefetchCache = new Map<string, PrefetchEntry>();
  private static readonly SHOW_DELAY_MS = 150;
  private static readonly PREFETCH_DEBOUNCE_MS = 50;
  private syncListener: ((message: unknown, sender: chrome.runtime.MessageSender) => void) | null = null;

  constructor() {
    // Create closed shadow DOM container (page cannot reach privileged buttons)
    this.container = document.createElement('div');
    this.container.id = 'subsume-hover-root';
    this.shadowRoot = attachClosedShadow(this.container);

    setupShadowStyles(this.shadowRoot, HOVER_CARD_STYLES);

    // Render mount point
    const mount = document.createElement('div');
    mount.id = 'subsume-mount';
    this.shadowRoot.appendChild(mount);

    document.body.appendChild(this.container);
    this.setupSyncListener();
  }

  private setupSyncListener() {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    this.syncListener = (message: unknown, sender) => {
      // Only accept messages originating from our own extension service worker.
      // This prevents a compromised page from spoofing LIBRARY_UPDATED events.
      if (sender.id !== chrome.runtime.id) return;

      if (!message || typeof message !== 'object') return;
      const msg = message as {
        type?: string;
        libraryItem?: LibraryItem;
        mediaId?: string;
        action?: string;
      };

      if (msg.type === 'LIBRARY_UPDATED') {
        const libItem = msg.libraryItem;
        const mediaId = msg.mediaId || libItem?.mediaId;
        if (!mediaId) return;

        if (msg.action === 'add' && libItem) {
          this.libraryItems.set(mediaId, libItem);
        } else if (msg.action === 'update' && libItem) {
          this.libraryItems.set(mediaId, libItem);
        } else if (msg.action === 'remove') {
          this.libraryItems.delete(mediaId);
        }
      }
    };
    chrome.runtime.onMessage.addListener(this.syncListener);
  }

  private async fetchLibraryStatus(mediaId: string): Promise<LibraryItem | null> {
    const cached = this.libraryItems.get(mediaId);
    if (cached) return cached;

    try {
      const response = await sendMessage<{ mediaId: string }, CheckLibraryStatusResponse>(
        MessageType.CHECK_LIBRARY_STATUS,
        { mediaId }
      );
      if (!response.success || !response.data?.inLibrary) {
        return null;
      }

      const libraryItem: LibraryItem = {
        mediaId,
        status: response.data.status ?? 'to-watch',
        addedAt: Date.now(),
        updatedAt: Date.now(),
        userRating: response.data.userRating,
      };
      this.libraryItems.set(mediaId, libraryItem);
      return libraryItem;
    } catch (err) {
      console.error('[Subsume] Failed to check library status:', err);
      return null;
    }
  }

  public destroy(): void {
    if (this.syncListener && typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.removeListener(this.syncListener);
      this.syncListener = null;
    }

    this.cancelShow();
    this.cancelHide();
    this.currentTarget = null;
    this.isCardHovered = false;
    this.libraryItems.clear();

    const mount = this.shadowRoot.getElementById('subsume-mount');
    if (mount) {
      render(null, mount);
    }

    this.container.remove();
  }

  attachToElement(element: HTMLElement, title: string, yearGuess?: number): void {
    element.addEventListener('mouseenter', () => {
      this.schedulePrefetch(title, yearGuess);
      this.scheduleShow(element, title, yearGuess);
    });
    element.addEventListener('mouseleave', () => {
      this.scheduleHide();
    });
  }

  private prefetchKey(title: string, yearGuess?: number): string {
    return `${title}:${yearGuess ?? ''}`;
  }

  private schedulePrefetch(title: string, yearGuess?: number): void {
    if (this.prefetchDebounce) {
      clearTimeout(this.prefetchDebounce);
    }
    this.prefetchDebounce = setTimeout(() => {
      this.prefetchDebounce = null;
      this.startPrefetch(title, yearGuess);
    }, HoverCardManager.PREFETCH_DEBOUNCE_MS);
  }

  private startPrefetch(title: string, yearGuess?: number): PrefetchEntry {
    const key = this.prefetchKey(title, yearGuess);
    const existing = this.prefetchCache.get(key);
    if (existing) return existing;

    const promise = sendMessage<
      { title: string; yearGuess?: number },
      MediaItem
    >(MessageType.GET_TITLE_DETAILS, { title, yearGuess }).then((response) => ({
      success: response.success,
      data: response.data,
    }));

    const entry = { promise };
    this.prefetchCache.set(key, entry);
    return entry;
  }

  private scheduleShow(target: HTMLElement, title: string, yearGuess?: number): void {
    this.cancelHide();
    this.cancelShow();
    this.showTimeout = setTimeout(() => {
      this.currentTarget = target;
      this.isExiting = false;
      this.showCard(target, title, yearGuess);
    }, HoverCardManager.SHOW_DELAY_MS);
  }

  private scheduleHide(): void {
    this.cancelShow();
    this.hideTimeout = setTimeout(() => {
      if (!this.isCardHovered) {
        this.hideCard();
      }
    }, 200);
  }

  private cancelShow(): void {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
  }

  private cancelHide(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  private async showCard(target: HTMLElement, title: string, yearGuess?: number): Promise<void> {
    const mount = this.shadowRoot.getElementById('subsume-mount');
    if (!mount) return;

    const position = computePosition(target);

    // Immediately show loading state
    render(
      <HoverCard
        mediaItem={null}
        loading={true}
        position={position}
        visible={true}
        inLibrary={false}
        libraryItem={null}
        onAdd={() => {}}
        onRemove={() => {}}
        onMouseEnter={() => {
          this.isCardHovered = true;
          this.cancelHide();
        }}
        onMouseLeave={() => {
          this.isCardHovered = false;
          this.scheduleHide();
        }}
      />,
      mount
    );

    // Fetch metadata (use prefetched result when available)
    try {
      const prefetch = this.startPrefetch(title, yearGuess);
      const response = await prefetch.promise;

      if (this.currentTarget !== target) return; // User moved on

      const mediaItem = response.success ? response.data ?? null : null;

      const libraryItem = mediaItem ? await this.fetchLibraryStatus(mediaItem.id) : null;
      if (this.currentTarget !== target) return;

      const inLibrary = libraryItem !== null;

      render(
        <HoverCard
          mediaItem={mediaItem}
          loading={false}
          position={position}
          visible={true}
          inLibrary={inLibrary}
          libraryItem={libraryItem}
          onAdd={(type) => this.handleAdd(mediaItem!, type)}
          onRemove={() => this.handleRemove(mediaItem!)}
          onMouseEnter={() => {
            this.isCardHovered = true;
            this.cancelHide();
          }}
          onMouseLeave={() => {
            this.isCardHovered = false;
            this.scheduleHide();
          }}
        />,
        mount
      );
    } catch (err) {
      console.error('[Subsume] Failed to fetch title details:', err);
      render(
        <HoverCard
          mediaItem={null}
          loading={false}
          position={computePosition(target)}
          visible={true}
          inLibrary={false}
          libraryItem={null}
          onAdd={() => {}}
          onRemove={() => {}}
          onMouseEnter={() => {
            this.isCardHovered = true;
            this.cancelHide();
          }}
          onMouseLeave={() => {
            this.isCardHovered = false;
            this.scheduleHide();
          }}
        />,
        mount
      );
    }
  }

  private clearMount(): void {
    const mount = this.shadowRoot.getElementById('subsume-mount');
    if (mount) {
      render(null, mount);
    }
    this.currentTarget = null;
    this.isExiting = false;
  }

  private hideCard(): void {
    const mount = this.shadowRoot.getElementById('subsume-mount');
    if (!mount || !this.currentTarget) {
      this.clearMount();
      return;
    }

    const cardEl = mount.querySelector('.subsume-hover-card') as HTMLElement | null;
    if (!cardEl || this.isExiting) {
      this.clearMount();
      return;
    }

    this.isExiting = true;
    cardEl.classList.remove('subsume-visible');
    cardEl.classList.add('subsume-exiting');

    let finished = false;
    const finishExit = () => {
      if (finished) return;
      finished = true;
      cardEl.removeEventListener('transitionend', onTransitionEnd);
      this.clearMount();
    };

    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName === 'opacity') {
        finishExit();
      }
    };

    cardEl.addEventListener('transitionend', onTransitionEnd);
    setTimeout(finishExit, 300);
  }

  private async handleAdd(mediaItem: MediaItem, type: MediaType): Promise<void> {
    try {
      await sendMessage(MessageType.ADD_TO_LIST, {
        mediaItem: { ...mediaItem, type },
        type,
      });

      // Brief confirmation feedback
      const mount = this.shadowRoot.getElementById('subsume-mount');
      if (mount) {
        render(
          <div className="subsume-hover-card subsume-visible subsume-added">
            <div className="subsume-added-msg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>Added to archive!</span>
            </div>
          </div>,
          mount
        );

        setTimeout(() => this.hideCard(), 1200);
      }
    } catch (err) {
      console.error('[Subsume] Failed to add to list:', err);
    }
  }

  private async handleRemove(mediaItem: MediaItem): Promise<void> {
    try {
      await sendMessage(MessageType.REMOVE_FROM_LIBRARY, {
        mediaId: mediaItem.id,
      });

      const mount = this.shadowRoot.getElementById('subsume-mount');
      if (mount) {
        render(
          <div className="subsume-hover-card subsume-visible subsume-added">
            <div className="subsume-added-msg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>Removed from archive!</span>
            </div>
          </div>,
          mount
        );

        setTimeout(() => this.hideCard(), 1200);
      }
    } catch (err) {
      console.error('[Subsume] Failed to remove from library:', err);
    }
  }
}

// ─── Shadow DOM Styles ───────────────────────────────────────────────

const HOVER_CARD_STYLES = `
  :host {
    all: initial;
  }

  .subsume-hover-card {
    position: absolute;
    z-index: 2147483647;
    width: 340px;
    padding: var(--spacing-md);
    background: linear-gradient(135deg, hsla(240, 18%, 5%, 0.98), hsla(240, 14%, 11%, 0.98));
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--color-accent-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg), 0 0 0 1px var(--border-subtle) inset;
    font-family: var(--font-ui);
    color: var(--foreground);
    opacity: 0;
    transform: translateY(8px) scale(0.96);
    transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
  }

  .subsume-hover-card.subsume-visible {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  .subsume-hover-card.subsume-exiting {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
    pointer-events: none;
  }

  /* Skeleton loading */
  .subsume-skeleton {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .subsume-skeleton-header {
    display: flex;
    gap: var(--spacing-md);
  }

  .subsume-skeleton-poster {
    flex-shrink: 0;
    width: 72px;
    height: 108px;
    border-radius: var(--radius-sm);
    background: var(--border-subtle);
    animation: subsume-skeleton-pulse 1.5s ease-in-out infinite;
  }

  .subsume-skeleton-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding-top: var(--spacing-xs);
  }

  .subsume-skeleton-line {
    height: 12px;
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.06);
    animation: subsume-skeleton-pulse 1.5s ease-in-out infinite;
  }

  .subsume-skeleton-title {
    width: 85%;
    height: 16px;
  }

  .subsume-skeleton-meta {
    width: 55%;
  }

  .subsume-skeleton-ratings {
    width: 70%;
  }

  .subsume-skeleton-overview {
    width: 100%;
  }

  .subsume-skeleton-overview.short {
    width: 75%;
  }

  @keyframes subsume-skeleton-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* Header */
  .subsume-card-header {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .subsume-poster {
    flex-shrink: 0;
    width: 72px;
    height: 108px;
    border-radius: 2px;
    overflow: hidden;
    background: var(--border-subtle);
    border: 1px solid var(--border);
  }

  .subsume-poster img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .subsume-poster-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-control);
  }

  .subsume-card-info {
    flex: 1;
    min-width: 0;
  }

  .subsume-title {
    margin: 0 0 var(--spacing-xs);
    font-size: 16px;
    font-weight: 700;
    color: var(--text-reflection);
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .subsume-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    font-size: 12px;
    color: var(--text-meta);
  }

  .subsume-type-badge {
    background: var(--primary-soft);
    color: var(--primary);
    padding: 1px var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-weight: 600;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Ratings */
  .subsume-ratings {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .subsume-rating-chip {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: var(--spacing-xs) var(--spacing-md);
    border-radius: var(--radius-md);
    font-size: 12px;
    font-weight: 600;
  }

  .subsume-imdb {
    background: rgba(245, 197, 24, 0.08);
    border: 1px solid rgba(245, 197, 24, 0.15);
  }

  .subsume-rt {
    background: rgba(250, 50, 10, 0.08);
    border: 1px solid rgba(250, 50, 10, 0.15);
  }

  .subsume-rating-icon {
    font-size: 13px;
  }

  .subsume-rating-label {
    color: var(--text-meta);
    font-weight: 500;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .subsume-rating-value {
    color: var(--text-reflection);
    font-variant-numeric: tabular-nums;
  }

  /* Streaming platforms */
  .subsume-platforms {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: var(--spacing-md);
  }

  .subsume-platform-tag {
    padding: 3px var(--spacing-sm);
    background: var(--primary-soft);
    border: 1px solid var(--color-accent-border);
    border-radius: var(--radius-md);
    font-size: 10px;
    font-weight: 600;
    color: var(--primary);
  }

  /* Genres */
  .subsume-genres {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: var(--spacing-md);
  }

  .subsume-genre-tag {
    padding: 3px var(--spacing-md);
    background: var(--border-subtle);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    font-size: 11px;
    color: var(--text-artwork);
    font-weight: 500;
  }

  /* Overview */
  .subsume-overview {
    margin: 0 0 var(--spacing-md);
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-meta);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  /* Library Status Bar */
  .subsume-library-status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    background: var(--primary-soft);
    border: 1px solid var(--color-accent-border);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-md);
  }

  .subsume-library-status-left,
  .subsume-library-status-right {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .subsume-library-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-meta);
    font-weight: 600;
  }

  .subsume-status-badge {
    font-size: 12px;
    font-weight: 600;
  }

  .subsume-status-badge.status-to-watch {
    color: var(--muted-foreground);
  }

  .subsume-status-badge.status-watching {
    color: var(--primary);
  }

  .subsume-status-badge.status-watched {
    color: #34d399;
  }

  .subsume-status-badge.status-abandoned {
    color: #fca5a5;
  }

  .subsume-user-rating-badge {
    font-size: 12px;
    font-weight: 700;
    color: var(--primary);
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .subsume-star {
    color: var(--primary);
  }

  /* Actions */
  .subsume-actions {
    display: flex;
    gap: var(--spacing-sm);
  }

  .subsume-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: var(--radius-md);
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .subsume-btn:active {
    transform: scale(0.97);
  }

  .subsume-btn-primary {
    background: linear-gradient(135deg, var(--ring), var(--primary-hover));
    color: var(--background);
    box-shadow: var(--shadow-sm);
  }

  .subsume-btn-primary:hover {
    background: linear-gradient(135deg, var(--primary-hover), var(--primary));
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .subsume-btn-secondary {
    background: var(--border-subtle);
    color: var(--text-artwork);
    border: 1px solid var(--border);
  }

  .subsume-btn-secondary:hover {
    background: var(--border);
    border-color: var(--color-accent-border);
    color: var(--text-reflection);
    transform: translateY(-1px);
  }

  .subsume-btn-danger {
    flex: 1;
    background: hsla(0, 84%, 60%, 0.1);
    color: #fca5a5;
    border: 1px solid hsla(0, 84%, 60%, 0.2);
  }

  .subsume-btn-danger:hover {
    background: hsla(0, 84%, 60%, 0.18);
    transform: translateY(-1px);
    border-color: hsla(0, 84%, 60%, 0.3);
  }

  /* Added confirmation */
  .subsume-added {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px;
  }

  .subsume-added-msg {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    color: #34d399;
    font-size: 15px;
    font-weight: 600;
  }

  /* Error */
  .subsume-error {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--text-control);
    font-size: 13px;
  }

  @media (prefers-reduced-motion: reduce) {
    .subsume-hover-card {
      transition: none;
    }
    .subsume-skeleton-poster,
    .subsume-skeleton-line {
      animation: none;
    }
    .subsume-btn,
    .subsume-btn-primary,
    .subsume-btn-secondary {
      transition: none;
    }
    .subsume-btn:active,
    .subsume-btn-primary:hover,
    .subsume-btn-secondary:hover {
      transform: none;
    }
  }
`;
