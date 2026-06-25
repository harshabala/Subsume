/**
 * Act I Discovery Plaque Injection
 *
 * Injects Sleek Museum Catalogue Plaques encapsulated inside open Shadow DOM
 * onto detected poster images on host webpages.
 */

import { render, h } from 'preact';
import { sendMessage } from '@/shared/messages';
import { MessageType, MediaItem, MediaRating, PosterMatch, LibraryItem } from '@/shared/types';
import { logger } from '@/shared/logger';

const BADGE_ATTR = 'data-subsume-badge';
const WRAP_CLASS = 'subsume-poster-wrap';

type RatingProvider = 'imdb' | 'tmdb' | 'rt';

const RATING_PRIORITY: RatingProvider[] = ['imdb', 'tmdb', 'rt'];

export function pickDisplayRating(ratings: MediaRating[]): { provider: RatingProvider; score: number } | null {
  if (!ratings || !Array.isArray(ratings)) return null;
  for (const provider of RATING_PRIORITY) {
    const rating = ratings.find((r) => r.provider === provider);
    if (rating && typeof rating.score === 'number' && rating.score > 0) {
      const score = rating.score > 10 ? rating.score / 10 : rating.score;
      return { provider, score };
    }
  }
  return null;
}

function ensureWrapper(img: HTMLImageElement): HTMLElement {
  const parent = img.parentElement;
  if (parent?.classList.contains(WRAP_CLASS)) {
    return parent;
  }

  const wrap = document.createElement('span');
  wrap.className = WRAP_CLASS;
  wrap.style.cssText = 'position:relative;display:inline-block;line-height:0;vertical-align:top;';
  img.parentNode?.insertBefore(wrap, img);
  wrap.appendChild(img);
  return wrap;
}

interface PlaqueProps {
  match: PosterMatch;
  inLibrary: boolean;
  onReflect: () => void;
}

function MuseumPlaqueOverlay({ match, onReflect }: PlaqueProps) {
  const displayRating = pickDisplayRating(match.ratings);
  let baselineScore = '8.4';
  if (displayRating && displayRating.score > 0) {
    baselineScore = displayRating.score.toFixed(1);
  }

  return h(
    'div',
    { className: 'subsume-plaque-root' },
    h(
      'div',
      {
        className: 'museum-plaque',
        onClick: (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          onReflect();
        },
        title: 'Reflect on this title',
      },
      [
        h('span', { className: 'plaque-score' }, `★ ${baselineScore}`),
        h('span', { className: 'plaque-reveal' }, [
          h('span', { className: 'plaque-separator' }, '│'),
          h('span', { className: 'plaque-action' }, 'Reflect'),
        ]),
      ]
    )
  );
}

const PLAQUE_STYLES = `
  :host {
    all: initial;
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2147483646;
    --bg-plaque: hsla(240, 15%, 11%, 0.85);
    --text-artwork: hsl(0, 0%, 82%);
    --border-restraint: hsla(0, 0%, 100%, 0.08);
    --font-editorial: 'Newsreader', 'Cormorant Garamond', Georgia, serif;
    --font-ui: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-family: var(--font-ui);
  }

  .subsume-plaque-root {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .museum-plaque {
    position: absolute;
    bottom: 8px;
    right: 8px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 8px;
    background: var(--bg-plaque);
    color: var(--text-artwork);
    border: 1px solid var(--border-restraint);
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.02em;
    cursor: pointer;
    pointer-events: auto;
    transition: all 450ms cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
    white-space: nowrap;
  }

  .museum-plaque:hover {
    background: hsla(240, 15%, 16%, 0.95);
    color: hsl(0, 0%, 96%);
    border-color: hsla(0, 0%, 100%, 0.2);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);
    transform: translateY(-1px);
  }

  .plaque-score {
    display: inline-block;
    color: hsl(0, 0%, 96%);
    font-weight: 600;
  }

  .plaque-reveal {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 0;
    opacity: 0;
    transition: all 450ms cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
  }

  .museum-plaque:hover .plaque-reveal {
    max-width: 120px;
    opacity: 1;
  }

  .plaque-separator {
    opacity: 0.4;
  }

  .plaque-action {
    font-family: var(--font-editorial);
    font-size: 13px;
    font-weight: 600;
    color: hsl(0, 0%, 96%);
  }

  @media (prefers-reduced-motion: reduce) {
    .museum-plaque, .plaque-reveal {
      transition: none;
    }
    .museum-plaque:hover {
      transform: none;
    }
  }
`;

interface BadgeState {
  match: PosterMatch;
  inLibrary: boolean;
  host: HTMLElement;
  shadowRoot: ShadowRoot;
  mount: HTMLElement;
  mediaId: string;
}

export class MuseumPlaqueManager {
  private badges = new Map<HTMLImageElement, BadgeState>();
  private libraryIds = new Set<string>();
  private syncListener: ((message: unknown, sender: chrome.runtime.MessageSender) => void) | null = null;

  constructor() {
    this.setupSyncListener();
  }

  private setupSyncListener(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;
    this.syncListener = (message: unknown, sender: chrome.runtime.MessageSender) => {
      if (sender.id !== chrome.runtime.id) return;
      if (!message || typeof message !== 'object') return;
      if (!('type' in message) || (message as Record<string, unknown>).type !== 'LIBRARY_UPDATED') return;

      const msg = message as { mediaId?: unknown; libraryItem?: { mediaId?: unknown }; action?: unknown };
      const mediaId = typeof msg.mediaId === 'string' ? msg.mediaId : (typeof msg.libraryItem?.mediaId === 'string' ? msg.libraryItem.mediaId : undefined);
      if (!mediaId) return;

      if (msg.action === 'add' || msg.action === 'update') {
        this.libraryIds.add(mediaId);
      } else if (msg.action === 'remove') {
        this.libraryIds.delete(mediaId);
      }

      for (const state of this.badges.values()) {
        if (state.mediaId === mediaId) {
          state.inLibrary = msg.action !== 'remove';
          this.renderBadge(state);
        }
      }
    };
    chrome.runtime.onMessage.addListener(this.syncListener);
  }

  public destroy(): void {
    if (this.syncListener && typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.removeListener(this.syncListener);
      this.syncListener = null;
    }

    for (const [img, state] of this.badges.entries()) {
      render(null, state.mount);
      state.host.remove();
      img.removeAttribute(BADGE_ATTR);
    }
    this.badges.clear();
    this.libraryIds.clear();
  }

  async initLibraryCache(): Promise<void> {
    try {
      const res = await sendMessage<{}, { library: LibraryItem; media: MediaItem }[]>(
        MessageType.GET_LIBRARY,
        {}
      );
      if (res.success && res.data) {
        this.libraryIds = new Set(res.data.map((item) => item.library.mediaId));
        for (const state of this.badges.values()) {
          state.inLibrary = this.libraryIds.has(state.mediaId);
          this.renderBadge(state);
        }
      }
    } catch (err) {
      logger.warn('[Subsume] Failed to load library cache for museum plaques:', err);
    }
  }

  attachBadge(img: HTMLImageElement, match: PosterMatch): void {
    if (img.hasAttribute(BADGE_ATTR)) return;

    const mediaId = `tmdb_${match.type}_${match.tmdbId}`;
    const wrapper = ensureWrapper(img);

    const host = document.createElement('div');
    host.setAttribute(BADGE_ATTR, 'true');
    host.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    wrapper.appendChild(host);

    const shadowRoot = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = PLAQUE_STYLES;
    shadowRoot.appendChild(style);

    const mount = document.createElement('div');
    shadowRoot.appendChild(mount);

    const state: BadgeState = {
      match,
      inLibrary: match.inLibrary || this.libraryIds.has(mediaId),
      host,
      shadowRoot,
      mount,
      mediaId,
    };

    img.setAttribute(BADGE_ATTR, 'true');
    this.badges.set(img, state);
    this.renderBadge(state);
  }

  private renderBadge(state: BadgeState): void {
    render(
      h(MuseumPlaqueOverlay, {
        match: state.match,
        inLibrary: state.inLibrary,
        onReflect: () => this.handleReflect(state),
      }),
      state.mount
    );
  }

  private handleReflect(state: BadgeState): void {
    // Dispatch window event for Act II Poetic Capture canvas
    window.dispatchEvent(
      new CustomEvent('OPEN_CAPTURE_CANVAS', {
        detail: { mediaId: state.mediaId, match: state.match },
      })
    );

    // Dispatch background message
    sendMessage(MessageType.OPEN_CAPTURE_CANVAS, {
      mediaId: state.mediaId,
      match: state.match,
    }).catch((err) => {
      logger.warn('[Subsume] OPEN_CAPTURE_CANVAS message dispatch:', err);
    });
  }
}

// Backward compatibility export
export { MuseumPlaqueManager as PosterBadgeManager };
