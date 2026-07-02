import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { applyThemePreference, watchSystemTheme } from '@/shared/theme';

function mockMatchMedia(matchesDark = true) {
  const listeners = new Map<string, (event: MediaQueryListEvent) => void>();
  const media = {
    matches: matchesDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: vi.fn((type: string, handler: (event: MediaQueryListEvent) => void) => {
      if (type === 'change') listeners.set('change', handler);
    }),
    removeEventListener: vi.fn((type: string, handler: (event: MediaQueryListEvent) => void) => {
      if (type === 'change' && listeners.get('change') === handler) {
        listeners.delete('change');
      }
    }),
  } as unknown as MediaQueryList;
  window.matchMedia = vi.fn().mockReturnValue(media);
  return media;
}

describe('applyThemePreference', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  });

  it('sets data-theme and color-scheme for light', () => {
    applyThemePreference('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('sets data-theme and color-scheme for dark', () => {
    applyThemePreference('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('removes data-theme for system preference', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    applyThemePreference('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(['light', 'dark']).toContain(document.documentElement.style.colorScheme);
  });
});

describe('watchSystemTheme', () => {
  afterEach(() => {
    watchSystemTheme('dark');
    vi.restoreAllMocks();
  });

  it('attaches a media-query listener only for system theme', () => {
    const media = mockMatchMedia(true);
    watchSystemTheme('system');
    expect(media.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('removes listener when switching away from system', () => {
    const media = mockMatchMedia(true);
    watchSystemTheme('system');
    watchSystemTheme('light');
    expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});