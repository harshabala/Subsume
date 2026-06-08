/**
 * Injects compact rating + library badges directly on detected poster images.
 * Uses Shadow DOM for style isolation on arbitrary host pages.
 */

import { render, h } from 'preact';
import { sendMessage } from '@/shared/messages';
import { MessageType, MediaItem, MediaRating, PosterMatch, LibraryItem } from '@/shared/types';

const BADGE_ATTR = 'data-subsume-badge';
const WRAP_CLASS = 'subsume-poster-wrap';

type RatingProvider = 'imdb' | 'tmdb' | 'rt';

const RATING_PRIORITY: RatingProvider[] = ['imdb', 'tmdb', 'rt'];

const PROVIDER_META: Record<RatingProvider, { icon: string; label: string; format: (score: number) => string }> = {
  imdb: { icon: '⭐', label: 'IMDb', format: (s) => `${s}/10` },
  tmdb: { icon: '★', label: 'TMDb', format: (s) => s.toFixed(1) },
  rt: { icon: '🍅', label: 'RT', format: (s) => `${Math.round(s)}%` },
};

function pickDisplayRating(ratings: MediaRating[]): { provider: RatingProvider; score: number } | null {
  for (const provider of RATING_PRIORITY) {
    const rating = ratings.find((r) => r.provider === provider);
    if (rating && rating.score > 0) {
      return { provider, score: rating.score };
    }
  }
  return null;
}

function matchToMediaItem(match: PosterMatch): MediaItem {
  return {
    id: `tmdb_${match.type}_${match.tmdbId}`,
    canonicalTitle: match.title,
    type: match.type,
    year: match.year,
    genres: [],
    ratings: match.ratings,
    providers: [],
    posterUrl: match.posterPath || '',
  };
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

interface BadgeProps {
  match: PosterMatch;
  inLibrary: boolean;
  adding: boolean;
  onAdd: () => void;
}

function PosterBadgeOverlay({ match, inLibrary, adding, onAdd }: BadgeProps) {
  const displayRating = pickDisplayRating(match.ratings);
  const meta = displayRating ? PROVIDER_META[displayRating.provider] : null;

  return (
    <div className="subsume-badge-root">
      {displayRating && meta && (
        <div className="subsume-badge-rating" title={`${meta.label} rating`}>
          <span className="subsume-badge-provider">{meta.icon}</span>
          <span className="subsume-badge-score">{meta.format(displayRating.score)}</span>
        </div>
      )}

      <button
        type="button"
        className={`subsume-badge-action ${inLibrary ? 'in-library' : ''}`}
        disabled={inLibrary || adding}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!inLibrary && !adding) onAdd();
        }}
        title={inLibrary ? 'In your library' : 'Add to Subsume'}
      >
        {adding ? '…' : inLibrary ? '✓' : '+'}
      </button>
    </div>
  );
}

const BADGE_STYLES = `
  :host {
    all: initial;
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2147483646;
    font-family: 'Geist', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .subsume-badge-root {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .subsume-badge-rating {
    position: absolute;
    top: 6px;
    right: 6px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 3px 7px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.78);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    backdrop-filter: blur(4px);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
    pointer-events: auto;
  }

  .subsume-badge-provider {
    font-size: 10px;
    line-height: 1;
  }

  .subsume-badge-score {
    letter-spacing: -0.02em;
  }

  .subsume-badge-action {
    position: absolute;
    bottom: 4px;
    right: 4px;
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    border: none;
    border-radius: 50%;
    background: #c9a84c;
    color: #121212;
    font-size: 16px;
    font-weight: 800;
    line-height: 1;
    cursor: pointer;
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    transition: transform 0.15s ease, background 0.15s ease;
  }

  .subsume-badge-action:hover:not(:disabled) {
    transform: scale(1.08);
    background: #d4b860;
  }

  .subsume-badge-action.in-library {
    background: rgba(34, 197, 94, 0.9);
    color: #fff;
    cursor: default;
  }

  @media (prefers-reduced-motion: reduce) {
    .subsume-badge-action {
      transition: none;
    }
    .subsume-badge-action:hover:not(:disabled) {
      transform: none;
    }
  }

  .subsume-badge-action:disabled {
    opacity: 0.85;
    cursor: default;
  }
`;

interface BadgeState {
  match: PosterMatch;
  inLibrary: boolean;
  adding: boolean;
  host: HTMLElement;
  shadowRoot: ShadowRoot;
  mount: HTMLElement;
  mediaId: string;
}

export class PosterBadgeManager {
  private badges = new Map<HTMLImageElement, BadgeState>();
  private libraryIds = new Set<string>();

  constructor() {
    this.setupSyncListener();
  }

  private setupSyncListener(): void {
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (sender.id !== chrome.runtime.id) return;
      if (message?.type !== 'LIBRARY_UPDATED') return;

      const mediaId = message.mediaId || message.libraryItem?.mediaId;
      if (!mediaId) return;

      if (message.action === 'add' || message.action === 'update') {
        this.libraryIds.add(mediaId);
      } else if (message.action === 'remove') {
        this.libraryIds.delete(mediaId);
      }

      for (const state of this.badges.values()) {
        if (state.mediaId === mediaId) {
          state.inLibrary = message.action !== 'remove';
          this.renderBadge(state);
        }
      }
    });
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
      console.error('[Subsume] Failed to load library cache for poster badges:', err);
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
    style.textContent = BADGE_STYLES;
    shadowRoot.appendChild(style);

    const mount = document.createElement('div');
    shadowRoot.appendChild(mount);

    const state: BadgeState = {
      match,
      inLibrary: match.inLibrary || this.libraryIds.has(mediaId),
      adding: false,
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
      <PosterBadgeOverlay
        match={state.match}
        inLibrary={state.inLibrary}
        adding={state.adding}
        onAdd={() => this.handleAdd(state)}
      />,
      state.mount
    );
  }

  private async handleAdd(state: BadgeState): Promise<void> {
    if (state.inLibrary || state.adding) return;

    state.adding = true;
    this.renderBadge(state);

    try {
      const mediaItem = matchToMediaItem(state.match);
      await sendMessage(MessageType.ADD_TO_LIST, {
        mediaItem,
        type: state.match.type,
      });
      state.inLibrary = true;
      this.libraryIds.add(state.mediaId);
    } catch (err) {
      console.error('[Subsume] Failed to add from poster badge:', err);
    } finally {
      state.adding = false;
      this.renderBadge(state);
    }
  }
}