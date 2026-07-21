/**
 * Book discovery plaques — Shadow DOM overlays near high-confidence
 * book detections on host pages (sanctuary aesthetic).
 *
 * Only attach after RESOLVE_PAGE_CANDIDATE succeeds for confidence ≥ 0.85.
 * Mid-band (0.65–0.84) is intentionally not auto-plaqued.
 */

import { sendMessage } from '@/shared/messages';
import { MessageType, type MediaItem } from '@/shared/types';
import { logger } from '@/shared/logger';
import { setupShadowStyles } from '@/shared/shadowTokens';
import { truncateForExcerpt } from '@/shared/textTruncate';
import { ADD_TO_ARCHIVE_LABEL, IN_ARCHIVE_LABEL } from '@/shared/productCopy';
import { attachClosedShadow, isTrustedGesture } from '@/content/closedShadow';

const HOST_ATTR = 'data-subsume-book-plaque';
const STACK_HOST_ID = 'subsume-book-plaque-stack';

export interface BookPlaqueMatch {
  mediaId: string;
  title: string;
  authors?: string[];
  year?: number;
  inLibrary: boolean;
  status?: string;
  /** Optional full media for archive add. */
  media?: MediaItem;
}

export type BookPlaqueAnchor =
  | HTMLElement
  | { top: number; left: number; width?: number; height?: number };

interface PlaqueState {
  match: BookPlaqueMatch;
  host: HTMLElement;
  shadowRoot: ShadowRoot;
  /** When anchored to an element (not fixed stack). */
  anchorEl: HTMLElement | null;
  /** Fixed stack mode uses a shared container. */
  stacked: boolean;
}

const PLAQUE_STYLES = `
  :host {
    all: initial;
    pointer-events: none;
    z-index: 2147483645;
    font-family: var(--font-ui);
  }

  .book-plaque {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-sm);
    max-width: 240px;
    padding: 6px 10px;
    border-radius: var(--radius-md);
    background: var(--bg-plaque);
    color: var(--text-artwork);
    border: 1px solid hsla(45, 80%, 55%, 0.28);
    backdrop-filter: blur(8px);
    box-shadow: var(--shadow-md);
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 500;
    line-height: 1.2;
    letter-spacing: 0.02em;
    pointer-events: auto;
    cursor: default;
    transition: background 280ms cubic-bezier(0.16, 1, 0.3, 1),
      border-color 280ms cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 280ms cubic-bezier(0.16, 1, 0.3, 1),
      transform 280ms cubic-bezier(0.16, 1, 0.3, 1);
    white-space: nowrap;
  }

  .book-plaque:hover {
    background: var(--bg-plaque-hover);
    border-color: hsla(45, 85%, 60%, 0.45);
    box-shadow: var(--shadow-lg);
    transform: translateY(-1px);
  }

  .plaque-star {
    color: var(--primary);
    font-weight: 600;
    flex-shrink: 0;
  }

  .plaque-dot {
    opacity: 0.45;
    flex-shrink: 0;
  }

  .plaque-action {
    position: relative;
    font-family: var(--font-editorial);
    font-size: 13px;
    font-weight: 600;
    color: var(--text-reflection);
    background: none;
    border: none;
    min-height: 44px;
    min-width: 44px;
    padding: 4px 8px;
    cursor: pointer;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    border-radius: var(--radius-sm);
  }

  /* Hit-slop expansion for dense plaque controls (Fitts) */
  .plaque-action::before {
    content: '';
    position: absolute;
    inset: -2px;
  }

  .plaque-action:hover {
    color: var(--primary-hover);
  }

  .plaque-action:focus-visible {
    color: var(--primary-hover);
    outline: 2px solid var(--accent-gold, var(--primary));
    outline-offset: 2px;
  }

  .plaque-archive-label {
    color: var(--primary);
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .plaque-title {
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-title);
    font-size: 11px;
    min-width: 0;
  }

  .plaque-add {
    position: relative;
    margin-left: 2px;
    min-height: 44px;
    min-width: 44px;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-restraint);
    background: transparent;
    color: var(--text-artwork);
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.03em;
    cursor: pointer;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    transition: border-color 200ms ease, color 200ms ease, background 200ms ease;
  }

  .plaque-add::before {
    content: '';
    position: absolute;
    inset: -2px;
  }

  .plaque-add:hover {
    border-color: hsla(45, 80%, 55%, 0.5);
    color: var(--text-reflection);
    background: var(--primary-soft);
  }

  .plaque-add:focus-visible {
    border-color: hsla(45, 80%, 55%, 0.5);
    color: var(--text-reflection);
    background: var(--primary-soft);
    outline: 2px solid var(--accent-gold, var(--primary));
    outline-offset: 2px;
  }

  .plaque-add:disabled {
    opacity: 0.5;
    cursor: default;
  }

  /* In-library open control — keyboard operable, Fitts min hit */
  .plaque-open {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-sm);
    min-height: 44px;
    min-width: 44px;
    max-width: 100%;
    padding: 4px 6px;
    margin: 0;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    box-sizing: border-box;
  }

  .plaque-open:hover .plaque-archive-label,
  .plaque-open:hover .plaque-title {
    color: var(--primary-hover);
  }

  .plaque-open:focus-visible {
    outline: 2px solid var(--accent-gold, var(--primary));
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .book-plaque {
      transition: none;
    }
    .book-plaque:hover {
      transform: none;
    }
  }
`;

function isHTMLElement(value: BookPlaqueAnchor): value is HTMLElement {
  return typeof HTMLElement !== 'undefined' && value instanceof HTMLElement;
}

function truncateTitle(title: string, max = 36): string {
  return truncateForExcerpt(title, max);
}

/**
 * Manager for book plaques on host pages.
 * Isolated from movie/TV MuseumPlaqueManager so poster scanning stays intact.
 */
export class BookPlaqueManager {
  private plaques: PlaqueState[] = [];
  private stackHost: HTMLElement | null = null;
  private stackShadow: ShadowRoot | null = null;
  private stackMount: HTMLElement | null = null;
  private stackCount = 0;

  /**
   * Attach a floating plaque near an element or at an absolute page rect.
   * When no usable in-flow anchor exists, pass a fixed rect (or call with
   * document.documentElement) to use the top-right page-level stack.
   */
  attachNear(anchor: BookPlaqueAnchor, match: BookPlaqueMatch): void {
    if (!match.mediaId || !match.title) return;
    if (this.plaques.some((p) => p.match.mediaId === match.mediaId)) return;

    // Prefer element anchors (covers, headings); otherwise stack top-right.
    if (isHTMLElement(anchor) && anchor !== document.documentElement && anchor !== document.body) {
      this.attachToElement(anchor, match);
      return;
    }

    if (!isHTMLElement(anchor) && typeof anchor.top === 'number' && typeof anchor.left === 'number') {
      // Explicit rect: absolute host at that position
      this.attachAtRect(anchor, match);
      return;
    }

    this.attachToStack(match);
  }

  destroy(): void {
    for (const state of this.plaques) {
      state.host.remove();
      if (state.anchorEl?.hasAttribute(HOST_ATTR)) {
        state.anchorEl.removeAttribute(HOST_ATTR);
      }
    }
    this.plaques = [];
    this.stackHost?.remove();
    this.stackHost = null;
    this.stackShadow = null;
    this.stackMount = null;
    this.stackCount = 0;
  }

  /** Number of active plaques (for tests / budgets). */
  get size(): number {
    return this.plaques.length;
  }

  private attachToElement(el: HTMLElement, match: BookPlaqueMatch): void {
    const positionParent = ensureRelativeHost(el);

    const host = document.createElement('div');
    host.setAttribute(HOST_ATTR, match.mediaId);
    host.style.cssText =
      'position:absolute;bottom:8px;right:8px;z-index:2147483645;pointer-events:none;width:auto;height:auto;';
    positionParent.appendChild(host);

    const shadowRoot = attachClosedShadow(host);
    setupShadowStyles(shadowRoot, PLAQUE_STYLES);

    const state: PlaqueState = {
      match: { ...match },
      host,
      shadowRoot,
      anchorEl: el,
      stacked: false,
    };
    this.plaques.push(state);
    this.renderPlaque(state);
  }

  private attachAtRect(
    rect: { top: number; left: number; width?: number; height?: number },
    match: BookPlaqueMatch
  ): void {
    const host = document.createElement('div');
    host.setAttribute(HOST_ATTR, match.mediaId);
    const w = rect.width ?? 0;
    const h = rect.height ?? 0;
    host.style.cssText = [
      'position:absolute',
      `top:${Math.max(0, rect.top + h - 40)}px`,
      `left:${Math.max(0, rect.left + Math.max(0, w - 220))}px`,
      'z-index:2147483645',
      'pointer-events:none',
    ].join(';');
    document.documentElement.appendChild(host);

    const shadowRoot = attachClosedShadow(host);
    setupShadowStyles(shadowRoot, PLAQUE_STYLES);

    const state: PlaqueState = {
      match: { ...match },
      host,
      shadowRoot,
      anchorEl: null,
      stacked: false,
    };
    this.plaques.push(state);
    this.renderPlaque(state);
  }

  private ensureStack(): { host: HTMLElement; mount: HTMLElement } {
    if (this.stackHost && this.stackMount && this.stackHost.isConnected) {
      return { host: this.stackHost, mount: this.stackMount };
    }

    const host = document.createElement('div');
    host.id = STACK_HOST_ID;
    host.setAttribute(HOST_ATTR, 'stack');
    host.style.cssText = [
      'position:fixed',
      'top:16px',
      'right:16px',
      'z-index:2147483645',
      'display:flex',
      'flex-direction:column',
      'align-items:flex-end',
      'gap:8px',
      'pointer-events:none',
      'max-width:min(280px,calc(100vw - 32px))',
    ].join(';');
    document.documentElement.appendChild(host);

    const shadowRoot = attachClosedShadow(host);
    setupShadowStyles(
      shadowRoot,
      `${PLAQUE_STYLES}
      .stack-root {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        pointer-events: none;
      }
      .stack-root > * {
        pointer-events: auto;
      }
      `
    );

    const mount = document.createElement('div');
    mount.className = 'stack-root';
    shadowRoot.appendChild(mount);

    this.stackHost = host;
    this.stackShadow = shadowRoot;
    this.stackMount = mount;
    return { host, mount };
  }

  private attachToStack(match: BookPlaqueMatch): void {
    const { host, mount } = this.ensureStack();
    const slot = document.createElement('div');
    slot.setAttribute('data-media-id', match.mediaId);
    mount.appendChild(slot);

    // Per-plaque mini shadow is overkill; render into stack slot with host styles.
    // Use a nested shadow on the slot for style isolation consistency with attachToElement.
    const plaqueHost = document.createElement('div');
    plaqueHost.setAttribute(HOST_ATTR, match.mediaId);
    plaqueHost.style.cssText = 'pointer-events:auto;';
    slot.appendChild(plaqueHost);

    const shadowRoot = attachClosedShadow(plaqueHost);
    setupShadowStyles(shadowRoot, PLAQUE_STYLES);

    const state: PlaqueState = {
      match: { ...match },
      host: plaqueHost,
      shadowRoot,
      anchorEl: null,
      stacked: true,
    };
    // Keep stack container so destroy removes it
    void host;
    this.stackCount += 1;
    this.plaques.push(state);
    this.renderPlaque(state);
  }

  private renderPlaque(state: PlaqueState): void {
    const { match } = state;
    const root = document.createElement('div');
    root.className = 'book-plaque';
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', `Subsume: ${match.title}`);

    if (match.inLibrary) {
      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'plaque-open';
      openBtn.setAttribute('aria-label', `Open ${match.title} in archive`);
      openBtn.title = `Open ${match.title}`;

      const label = document.createElement('span');
      label.className = 'plaque-archive-label';
      label.textContent = IN_ARCHIVE_LABEL;
      openBtn.appendChild(label);

      const title = document.createElement('span');
      title.className = 'plaque-title';
      title.textContent = truncateTitle(match.title);
      title.title = match.title;
      openBtn.appendChild(title);

      openBtn.addEventListener('click', (e) => {
        if (!isTrustedGesture(e)) return;
        e.preventDefault();
        e.stopPropagation();
        this.handleOpenDetail(state);
      });
      root.appendChild(openBtn);
    } else {
      const star = document.createElement('span');
      star.className = 'plaque-star';
      star.textContent = '★';
      star.setAttribute('aria-hidden', 'true');
      root.appendChild(star);

      const dot = document.createElement('span');
      dot.className = 'plaque-dot';
      dot.textContent = '·';
      dot.setAttribute('aria-hidden', 'true');
      root.appendChild(dot);

      const reflect = document.createElement('button');
      reflect.type = 'button';
      reflect.className = 'plaque-action';
      reflect.textContent = 'Reflect';
      reflect.title = 'Inscribe what stayed with you';
      reflect.addEventListener('click', (e) => {
        if (!isTrustedGesture(e)) return;
        e.preventDefault();
        e.stopPropagation();
        this.handleReflect(state);
      });
      root.appendChild(reflect);

      const title = document.createElement('span');
      title.className = 'plaque-title';
      title.textContent = truncateTitle(match.title);
      title.title = match.title;
      root.appendChild(title);

      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'plaque-add';
      add.textContent = 'Add';
      add.title = ADD_TO_ARCHIVE_LABEL;
      add.addEventListener('click', (e) => {
        if (!isTrustedGesture(e)) return;
        e.preventDefault();
        e.stopPropagation();
        void this.handleAdd(state, add);
      });
      root.appendChild(add);
    }

    // Clear previous children (keep only styles from setupShadowStyles)
    const existing = state.shadowRoot.querySelector('.book-plaque');
    existing?.remove();
    state.shadowRoot.appendChild(root);
  }

  private handleReflect(state: PlaqueState): void {
    const mediaId = state.match.mediaId;
    window.dispatchEvent(
      new CustomEvent('OPEN_CAPTURE_CANVAS', {
        detail: { mediaId, match: state.match },
      })
    );
    sendMessage(MessageType.OPEN_CAPTURE_CANVAS, { mediaId }).catch((err) => {
      logger.warn('[Subsume] Book plaque OPEN_CAPTURE_CANVAS failed:', err);
    });
  }

  private handleOpenDetail(state: PlaqueState): void {
    const mediaId = state.match.mediaId;
    sendMessage(MessageType.OPEN_DETAIL, { mediaId }).catch((err) => {
      logger.warn('[Subsume] Book plaque OPEN_DETAIL failed:', err);
    });
  }

  private async handleAdd(state: PlaqueState, button: HTMLButtonElement): Promise<void> {
    button.disabled = true;
    const { match } = state;
    try {
      if (match.media) {
        await sendMessage(MessageType.ADD_TO_ARCHIVE, {
          mediaItem: match.media,
          workId: match.mediaId,
          status: 'to-watch',
        });
      } else {
        await sendMessage(MessageType.ADD_TO_ARCHIVE, {
          workId: match.mediaId,
          status: 'to-watch',
        });
      }
      state.match = { ...state.match, inLibrary: true, status: 'to-watch' };
      this.renderPlaque(state);
    } catch (err) {
      button.disabled = false;
      logger.warn('[Subsume] Book plaque ADD_TO_ARCHIVE failed:', err);
    }
  }
}

/**
 * Ensure an anchor has a positioned ancestor we can place the plaque against.
 * For images, wrap like poster plaques; for other elements, use offsetParent or self.
 */
function ensureRelativeHost(el: HTMLElement): HTMLElement {
  if (el instanceof HTMLImageElement) {
    const parent = el.parentElement;
    if (parent?.classList.contains('subsume-book-wrap')) {
      return parent;
    }
    // Reuse poster wrap if present
    if (parent?.classList.contains('subsume-poster-wrap')) {
      return parent;
    }
    const wrap = document.createElement('span');
    wrap.className = 'subsume-book-wrap';
    wrap.style.cssText =
      'position:relative;display:inline-block;line-height:0;vertical-align:top;';
    el.parentNode?.insertBefore(wrap, el);
    wrap.appendChild(el);
    return wrap;
  }

  const style = el.style;
  const computed =
    typeof window !== 'undefined' && window.getComputedStyle
      ? window.getComputedStyle(el).position
      : style.position;
  if (!computed || computed === 'static') {
    el.style.position = 'relative';
  }
  return el;
}

/**
 * Best-effort anchor for a detection candidate without sending page HTML
 * to the background — only uses local DOM + candidate imageUrl/title.
 */
export function findBookPlaqueAnchor(candidate: {
  title?: string;
  imageUrl?: string;
}): HTMLElement | null {
  if (candidate.imageUrl) {
    try {
      const target = new URL(candidate.imageUrl, document.baseURI).href;
      const imgs = document.querySelectorAll('img');
      for (const img of imgs) {
        const src = img.currentSrc || img.src;
        if (!src) continue;
        if (src === target || src.includes(candidate.imageUrl) || candidate.imageUrl.includes(src)) {
          return img;
        }
        // Match on path basename when CDNs rewrite hosts
        const base = candidate.imageUrl.split('/').pop()?.split('?')[0];
        if (base && base.length > 8 && src.includes(base)) {
          return img;
        }
      }
    } catch {
      // ignore invalid URLs
    }
  }

  const title = (candidate.title || '').trim();
  if (title.length >= 3) {
    const needle = title.slice(0, Math.min(40, title.length)).toLowerCase();
    const imgs = document.querySelectorAll('img[alt]');
    for (const img of imgs) {
      const alt = (img.getAttribute('alt') || '').toLowerCase();
      if (alt.includes(needle) || needle.includes(alt.slice(0, 20))) {
        return img as HTMLImageElement;
      }
    }

    for (const sel of ['h1', 'h2', '[itemprop="name"]', '.bookTitle', '#bookTitle']) {
      const nodes = document.querySelectorAll(sel);
      for (const node of nodes) {
        const text = (node.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (text.includes(needle) || needle.includes(text.slice(0, 20))) {
          return node as HTMLElement;
        }
      }
    }

    // og:image as soft cover signal for page-level JSON-LD books
    const og = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
    if (og) {
      const imgs = document.querySelectorAll('img');
      for (const img of imgs) {
        const src = img.currentSrc || img.src;
        if (src && (src === og || src.includes(og) || og.includes(src))) {
          return img;
        }
      }
    }
  }

  return null;
}
