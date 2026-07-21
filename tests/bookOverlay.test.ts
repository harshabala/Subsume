import { describe, it, expect, vi, afterEach } from 'vitest';
import { BookPlaqueManager, findBookPlaqueAnchor } from '@/content/bookOverlay';
import type { BookPlaqueMatch } from '@/content/bookOverlay';
import {
  getClosedShadowRoot,
  dispatchTrustedClick,
} from '@/content/closedShadow';
import { MessageType } from '@/shared/types';

function plaqueShadow(host: Element | null): ShadowRoot | undefined {
  return host instanceof HTMLElement ? getClosedShadowRoot(host) : undefined;
}

describe('BookPlaqueManager (bookOverlay.ts)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.querySelectorAll('[data-subsume-book-plaque]').forEach((n) => n.remove());
    document.getElementById('subsume-book-plaque-stack')?.remove();
    vi.mocked(chrome.runtime.sendMessage).mockReset();
  });

  const baseMatch = (overrides: Partial<BookPlaqueMatch> = {}): BookPlaqueMatch => ({
    mediaId: 'openlibrary_work_OL123W',
    title: 'The Great Gatsby',
    authors: ['F. Scott Fitzgerald'],
    year: 1925,
    inLibrary: false,
    ...overrides,
  });

  it('creates a manager, attaches a plaque in closed Shadow DOM, and destroy cleans DOM', () => {
    const manager = new BookPlaqueManager();
    const img = document.createElement('img');
    img.src = 'https://example.com/gatsby.jpg';
    document.body.appendChild(img);

    manager.attachNear(img, baseMatch());

    expect(manager.size).toBe(1);
    const host = document.querySelector('[data-subsume-book-plaque]') as HTMLElement | null;
    expect(host).not.toBeNull();
    // Closed mode: host.shadowRoot is null to the page
    expect(host?.shadowRoot).toBeNull();
    const shadow = plaqueShadow(host);
    expect(shadow).toBeDefined();

    const plaque = shadow?.querySelector('.book-plaque');
    expect(plaque).not.toBeNull();
    expect(plaque?.textContent).toContain('★');
    expect(plaque?.textContent).toContain('Reflect');
    expect(plaque?.textContent).toContain('Gatsby');

    manager.destroy();

    expect(manager.size).toBe(0);
    expect(document.querySelector('[data-subsume-book-plaque]')).toBeNull();
    expect(document.getElementById('subsume-book-plaque-stack')).toBeNull();
  });

  it('shows In archive state when match.inLibrary is true', () => {
    const manager = new BookPlaqueManager();
    const el = document.createElement('h1');
    el.textContent = 'Beloved';
    document.body.appendChild(el);

    manager.attachNear(el, baseMatch({ title: 'Beloved', inLibrary: true, status: 'watched' }));

    const host = document.querySelector('[data-subsume-book-plaque]') as HTMLElement | null;
    const plaque = plaqueShadow(host)?.querySelector('.book-plaque');
    expect(plaque?.textContent).toContain('In archive');
    expect(plaque?.textContent).toContain('Beloved');
    expect(plaque?.querySelector('.plaque-add')).toBeNull();

    manager.destroy();
  });

  it('stacks page-level plaques when anchor is documentElement', () => {
    const manager = new BookPlaqueManager();
    manager.attachNear(document.documentElement, baseMatch({ mediaId: 'book_1', title: 'Book One' }));
    manager.attachNear(document.documentElement, baseMatch({ mediaId: 'book_2', title: 'Book Two' }));

    expect(manager.size).toBe(2);
    const stack = document.getElementById('subsume-book-plaque-stack');
    expect(stack).not.toBeNull();
    expect(stack?.shadowRoot).toBeNull();
    expect(getClosedShadowRoot(stack!)).toBeDefined();

    manager.destroy();
    expect(document.getElementById('subsume-book-plaque-stack')).toBeNull();
  });

  it('dedupes by mediaId', () => {
    const manager = new BookPlaqueManager();
    const el = document.createElement('div');
    document.body.appendChild(el);
    manager.attachNear(el, baseMatch());
    manager.attachNear(el, baseMatch());
    expect(manager.size).toBe(1);
    manager.destroy();
  });

  it('dispatches OPEN_CAPTURE_CANVAS on trusted Reflect click', () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((_msg, cb) => {
      if (typeof cb === 'function') cb({ success: true, data: { success: true } });
      return true as unknown as void;
    });

    const manager = new BookPlaqueManager();
    const el = document.createElement('div');
    document.body.appendChild(el);
    manager.attachNear(el, baseMatch());

    const host = document.querySelector('[data-subsume-book-plaque]') as HTMLElement | null;
    const reflect = plaqueShadow(host)?.querySelector('.plaque-action') as HTMLButtonElement;
    expect(reflect).not.toBeNull();
    dispatchTrustedClick(reflect);

    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
    const sent = vi.mocked(chrome.runtime.sendMessage).mock.calls[0][0] as {
      type: string;
      payload: { mediaId: string };
    };
    expect(sent.type).toBe(MessageType.OPEN_CAPTURE_CANVAS);
    expect(sent.payload.mediaId).toBe('openlibrary_work_OL123W');

    manager.destroy();
  });

  it('Add sends ADD_TO_ARCHIVE with to-watch status on trusted click', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((_msg, cb) => {
      if (typeof cb === 'function') cb({ success: true, data: { added: true } });
      return true as unknown as void;
    });

    const manager = new BookPlaqueManager();
    const el = document.createElement('div');
    document.body.appendChild(el);
    const media = {
      id: 'openlibrary_work_OL123W',
      canonicalTitle: 'The Great Gatsby',
      type: 'book' as const,
      year: 1925,
      genres: [],
      ratings: [],
      cast: [],
      directors: [],
      createdAt: 0,
      updatedAt: 0,
    };
    manager.attachNear(el, baseMatch({ media }));

    const host = document.querySelector('[data-subsume-book-plaque]') as HTMLElement | null;
    const add = plaqueShadow(host)?.querySelector('.plaque-add') as HTMLButtonElement;
    dispatchTrustedClick(add);

    // allow async handler
    await vi.waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalled();
    });

    const archiveCall = vi
      .mocked(chrome.runtime.sendMessage)
      .mock.calls.map((c) => c[0] as { type: string; payload: Record<string, unknown> })
      .find((m) => m.type === MessageType.ADD_TO_ARCHIVE);

    expect(archiveCall).toBeDefined();
    expect(archiveCall?.payload.status).toBe('to-watch');
    expect(archiveCall?.payload.workId).toBe('openlibrary_work_OL123W');

    manager.destroy();
  });

  it('ignores untrusted Add click (no ADD_TO_ARCHIVE)', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((_msg, cb) => {
      if (typeof cb === 'function') cb({ success: true, data: { added: true } });
      return true as unknown as void;
    });

    const manager = new BookPlaqueManager();
    const el = document.createElement('div');
    document.body.appendChild(el);
    manager.attachNear(
      el,
      baseMatch({
        media: {
          id: 'openlibrary_work_OL123W',
          canonicalTitle: 'The Great Gatsby',
          type: 'book',
          year: 1925,
          genres: [],
          ratings: [],
          cast: [],
          directors: [],
          createdAt: 0,
          updatedAt: 0,
        },
      })
    );

    const host = document.querySelector('[data-subsume-book-plaque]') as HTMLElement | null;
    const add = plaqueShadow(host)?.querySelector('.plaque-add') as HTMLButtonElement;
    // jsdom .click() / dispatchEvent produce isTrusted=false
    add.click();

    // Give async handler a chance if it wrongly fired
    await new Promise((r) => setTimeout(r, 30));

    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    manager.destroy();
  });

  it('ignores untrusted Reflect click', () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((_msg, cb) => {
      if (typeof cb === 'function') cb({ success: true, data: { success: true } });
      return true as unknown as void;
    });

    const manager = new BookPlaqueManager();
    const el = document.createElement('div');
    document.body.appendChild(el);
    manager.attachNear(el, baseMatch());

    const host = document.querySelector('[data-subsume-book-plaque]') as HTMLElement | null;
    const reflect = plaqueShadow(host)?.querySelector('.plaque-action') as HTMLButtonElement;
    reflect.click();

    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    manager.destroy();
  });
});

describe('findBookPlaqueAnchor', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('matches img by imageUrl', () => {
    const img = document.createElement('img');
    img.src = 'https://covers.openlibrary.org/b/id/123-L.jpg';
    document.body.appendChild(img);

    const found = findBookPlaqueAnchor({
      title: 'Gatsby',
      imageUrl: 'https://covers.openlibrary.org/b/id/123-L.jpg',
    });
    expect(found).toBe(img);
  });

  it('matches heading by title text', () => {
    const h1 = document.createElement('h1');
    h1.textContent = 'The Great Gatsby';
    document.body.appendChild(h1);

    const found = findBookPlaqueAnchor({ title: 'The Great Gatsby' });
    expect(found).toBe(h1);
  });

  it('returns null when no signal', () => {
    expect(findBookPlaqueAnchor({ title: 'Obscure Unmatched Title XYZ' })).toBeNull();
  });
});
