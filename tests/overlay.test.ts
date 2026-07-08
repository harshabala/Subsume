import { describe, it, expect, vi, afterEach } from 'vitest';
import { MuseumPlaqueManager, pickDisplayRating } from '@/content/overlay';
import { PosterMatch } from '@/shared/types';

describe('Act I Discovery Plaque Injection (overlay.ts)', () => {
  let captureListener: ((e: Event) => void) | null = null;

  afterEach(() => {
    if (captureListener) {
      window.removeEventListener('OPEN_CAPTURE_CANVAS', captureListener);
      captureListener = null;
    }
    document.body.innerHTML = '';
  });

  it('encapsulates museum plaques in open Shadow DOM and dispatches OPEN_CAPTURE_CANVAS on click', () => {
    const manager = new MuseumPlaqueManager();
    const img = document.createElement('img');
    document.body.appendChild(img);

    const match: PosterMatch = {
      tmdbId: '12345',
      title: 'Stalker',
      year: 1979,
      type: 'movie',
      posterPath: '/path.jpg',
      ratings: [{ provider: 'tmdb', score: 8.4 }],
      inLibrary: false,
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
    expect(revealSpan?.textContent).toContain('│Programme');

    // Check click dispatching OPEN_CAPTURE_CANVAS event
    const eventListener = vi.fn();
    captureListener = eventListener;
    window.addEventListener('OPEN_CAPTURE_CANVAS', eventListener);

    plaque.click();

    expect(eventListener).toHaveBeenCalledTimes(1);
    const customEvent = eventListener.mock.calls[0][0] as CustomEvent;
    expect(customEvent.detail.match.tmdbId).toBe('12345');
  });

  describe('pickDisplayRating', () => {
    it('respects provider priority order (imdb > tmdb > rt)', () => {
      const ratings = [
        { provider: 'rt' as const, score: 95 },
        { provider: 'tmdb' as const, score: 8.2 },
        { provider: 'imdb' as const, score: 8.5 },
      ];
      expect(pickDisplayRating(ratings)).toEqual({ provider: 'imdb', score: 8.5 });
    });

    it('normalizes scores > 10 by dividing by 10', () => {
      const ratings = [{ provider: 'tmdb' as const, score: 84 }];
      expect(pickDisplayRating(ratings)).toEqual({ provider: 'tmdb', score: 8.4 });
    });

    it('returns null as fallback when ratings are empty or missing', () => {
      expect(pickDisplayRating([])).toBeNull();
      expect(pickDisplayRating(undefined as any)).toBeNull();
      expect(pickDisplayRating([{ provider: 'imdb' as const, score: 0 }])).toBeNull();
    });
  });

  describe('destroy', () => {
    it('unmounts Preact roots and removes message listeners', () => {
      const manager = new MuseumPlaqueManager();
      const img = document.createElement('img');
      document.body.appendChild(img);

      const match: PosterMatch = {
        tmdbId: '54321',
        title: 'Solaris',
        year: 1972,
        type: 'movie',
        posterPath: '/solaris.jpg',
        ratings: [{ provider: 'imdb', score: 8.0 }],
        inLibrary: true,
      };

      manager.attachBadge(img, match);
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();

      manager.destroy();

      expect(chrome.runtime.onMessage.removeListener).toHaveBeenCalled();
      const wrapper = img.parentElement;
      const host = wrapper?.querySelector('div[data-subsume-badge]');
      expect(host).toBeNull();
    });
  });
});
