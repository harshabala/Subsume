import { describe, it, expect, vi } from 'vitest';
import { MuseumPlaqueManager } from '@/content/overlay';

describe('Act I Discovery Plaque Injection (overlay.ts)', () => {
  it('encapsulates museum plaques in open Shadow DOM and dispatches OPEN_CAPTURE_CANVAS on click', () => {
    const manager = new MuseumPlaqueManager();
    const img = document.createElement('img');
    document.body.appendChild(img);

    const match = {
      tmdbId: 12345,
      title: 'Stalker',
      year: 1979,
      type: 'movie' as const,
      ratings: [{ provider: 'tmdb' as const, score: 8.4 }],
      confidence: 0.9,
    };

    manager.attachBadge(img, match);

    // Check wrapper & shadow host
    const wrapper = img.parentElement;
    expect(wrapper).not.toBeNull();
    const host = wrapper?.querySelector('div[data-subsume-badge]');
    expect(host).not.toBeNull();

    // Check open shadow root
    const shadowRoot = host?.shadowRoot;
    expect(shadowRoot).not.toBeNull();

    // Check plaque rendering inside shadow root
    const plaque = shadowRoot?.querySelector('.museum-plaque') as HTMLElement;
    expect(plaque).not.toBeNull();

    // Check idle consensus baseline
    const scoreSpan = plaque?.querySelector('.plaque-score');
    expect(scoreSpan?.textContent).toContain('★ 8.4');

    // Check reveal text
    const revealSpan = plaque?.querySelector('.plaque-reveal');
    expect(revealSpan?.textContent).toContain('│Reflect');

    // Check click dispatching OPEN_CAPTURE_CANVAS event
    const eventListener = vi.fn();
    window.addEventListener('OPEN_CAPTURE_CANVAS', eventListener);

    plaque.click();

    expect(eventListener).toHaveBeenCalledTimes(1);
    const customEvent = eventListener.mock.calls[0][0] as CustomEvent;
    expect(customEvent.detail.match.tmdbId).toBe(12345);

    window.removeEventListener('OPEN_CAPTURE_CANVAS', eventListener);
  });
});
