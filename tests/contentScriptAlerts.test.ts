import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HoverCardManager } from '@/content/hoverCard';
import { BookPlaqueManager } from '@/content/bookOverlay';
import { ARCHIVE_UPDATE_ERROR } from '@/shared/productCopy';
import { getClosedShadowRoot } from '@/content/closedShadow';

vi.mock('@/shared/messages', () => ({
  sendMessage: vi.fn(),
}));

describe('Content Script Error Surfacing (Task 7)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('HoverCardManager surfaces ARCHIVE_UPDATE_ERROR with role="alert" upon failure', () => {
    const card = new HoverCardManager();
    // Access private showArchiveError
    (card as any).showArchiveError();

    const host = document.getElementById('subsume-hover-root');
    expect(host).not.toBeNull();
    const shadowRoot = getClosedShadowRoot(host!);
    expect(shadowRoot).toBeDefined();

    const alertEl = shadowRoot!.querySelector('[role="alert"]');
    expect(alertEl).not.toBeNull();
    expect(alertEl?.textContent?.trim()).toBe(ARCHIVE_UPDATE_ERROR);
    expect(alertEl?.className).toContain('subsume-error-alert');

    card.destroy();
  });

  it('BookPlaqueManager surfaces ARCHIVE_UPDATE_ERROR with role="alert" upon failure', () => {
    const manager = new BookPlaqueManager();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const plaque = document.createElement('div');
    plaque.className = 'book-plaque';
    shadow.appendChild(plaque);

    const mockState: any = {
      shadowRoot: shadow,
      host,
      anchor: host,
    };

    (manager as any).showPlaqueError(mockState);

    const alertEl = shadow.querySelector('[role="alert"]');
    expect(alertEl).not.toBeNull();
    expect(alertEl?.textContent?.trim()).toBe(ARCHIVE_UPDATE_ERROR);
    expect(alertEl?.className).toContain('plaque-error');

    manager.destroy();
  });
});
