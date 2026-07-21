/**
 * Act I Discovery Plaque Injection
 *
 * Injects Sleek Museum Catalogue Plaques encapsulated inside closed Shadow DOM
 * onto detected poster images on host webpages.
 */

import { render, h } from 'preact';
import { sendMessage } from '@/shared/messages';
import { MessageType, MediaRating, PosterMatch } from '@/shared/types';
import { logger } from '@/shared/logger';
import { setupShadowStyles } from '@/shared/shadowTokens';
import { attachClosedShadow, isTrustedGesture } from '@/content/closedShadow';

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
      'button',
      {
        type: 'button',
        className: 'museum-plaque',
        onClick: (e: MouseEvent) => {
          if (!isTrustedGesture(e)) return;
          e.preventDefault();
          e.stopPropagation();
          onReflect();
        },
        title: 'Inscribe what stayed with you after this screening',
        'aria-label': `Reflect on ${match.title}`,
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
    font-family: var(--font-ui);
  }

  .subsume-plaque-root {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .museum-plaque {
    position: absolute;
    bottom: var(--spacing-sm);
    right: var(--spacing-sm);
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-sm);
    min-height: 44px;
    min-width: 44px;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    background: var(--bg-plaque);
    color: var(--text-artwork);
    border: 1px solid var(--border-restraint);
    backdrop-filter: blur(8px);
    box-shadow: var(--shadow-md);
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.02em;
    cursor: pointer;
    pointer-events: auto;
    box-sizing: border-box;
    transition: background 280ms cubic-bezier(0.16, 1, 0.3, 1),
      border-color 280ms cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 280ms cubic-bezier(0.16, 1, 0.3, 1),
      color 280ms cubic-bezier(0.16, 1, 0.3, 1),
      transform 280ms cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
    white-space: nowrap;
  }

  .museum-plaque:hover {
    background: var(--bg-plaque-hover);
    color: var(--text-reflection);
    border-color: var(--border);
    box-shadow: var(--shadow-lg);
    transform: translateY(-1px);
  }

  .museum-plaque:focus-visible {
    outline: 2px solid var(--accent-gold, var(--primary));
    outline-offset: 2px;
  }

  .plaque-score {
    display: inline-block;
    color: var(--text-reflection);
    font-weight: 600;
  }

  .plaque-reveal {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-sm);
    max-width: 0;
    opacity: 0;
    transition: all 280ms cubic-bezier(0.16, 1, 0.3, 1);
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
    color: var(--text-reflection);
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

  attachBadge(img: HTMLImageElement, match: PosterMatch): void {
    if (img.hasAttribute(BADGE_ATTR)) return;

    const mediaId = `tmdb_${match.type}_${match.tmdbId}`;
    const wrapper = ensureWrapper(img);

    const host = document.createElement('div');
    host.setAttribute(BADGE_ATTR, 'true');
    host.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    wrapper.appendChild(host);

    const shadowRoot = attachClosedShadow(host);
    setupShadowStyles(shadowRoot, PLAQUE_STYLES);

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
