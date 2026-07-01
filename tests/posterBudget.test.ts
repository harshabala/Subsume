import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  scanImages,
  resetPosterResolveBudgetForTests,
  getPosterResolveCountForOrigin,
} from '@/content/scanner';
import { MessageType } from '@/shared/types';

describe('poster resolve budget', () => {
  const origin = window.location.origin;

  beforeEach(() => {
    document.body.innerHTML = '';
    resetPosterResolveBudgetForTests();
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((_msg, cb) => {
      if (cb) cb({ success: true, data: { match: null } });
    });
  });

  function makePosterImage(index: number): HTMLImageElement {
    const img = document.createElement('img');
    img.alt = `Poster Budget Title ${index} (2024)`;
    img.src = `https://image.tmdb.org/t/p/w500/${1000 + index}.jpg`;
    img.width = 200;
    img.height = 300;
    document.body.appendChild(img);
    img.getBoundingClientRect = () =>
      ({ width: 200, height: 300, top: 0, left: 0, right: 200, bottom: 300 } as DOMRect);
    return img;
  }

  it('caps RESOLVE_POSTER calls at 10 per origin per session', async () => {
    for (let i = 0; i < 12; i++) {
      makePosterImage(i);
    }

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await scanImages('medium', () => {}, document.body);

    const resolveCalls = vi
      .mocked(chrome.runtime.sendMessage)
      .mock.calls.filter((call) => call[0]?.type === MessageType.RESOLVE_POSTER);

    expect(resolveCalls).toHaveLength(10);
    expect(getPosterResolveCountForOrigin(origin)).toBe(10);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Poster resolve budget exceeded')
    );

    warnSpy.mockRestore();
  });

  it('allows additional resolves after budget reset', async () => {
    for (let i = 0; i < 12; i++) {
      makePosterImage(i);
    }

    await scanImages('medium', () => {}, document.body);
    expect(getPosterResolveCountForOrigin(origin)).toBe(10);

    resetPosterResolveBudgetForTests();
    vi.mocked(chrome.runtime.sendMessage).mockClear();

    for (let i = 12; i < 14; i++) {
      makePosterImage(i);
    }

    await scanImages('medium', () => {}, document.body);

    const resolveCalls = vi
      .mocked(chrome.runtime.sendMessage)
      .mock.calls.filter((call) => call[0]?.type === MessageType.RESOLVE_POSTER);

    expect(resolveCalls.length).toBeGreaterThan(0);
    expect(getPosterResolveCountForOrigin(origin)).toBeLessThanOrEqual(10);
  });
});