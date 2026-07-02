import type { ThemePreference } from './types';

function resolvedColorScheme(theme: ThemePreference): 'light' | 'dark' {
  if (theme === 'light') return 'light';
  if (theme === 'dark') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyThemePreference(theme: ThemePreference = 'dark'): void {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
  root.style.colorScheme = resolvedColorScheme(theme);
}

let systemThemeListener: ((event: MediaQueryListEvent) => void) | null = null;

/** Re-apply when OS theme changes while preference is "system". */
export function watchSystemTheme(preference: ThemePreference): void {
  if (systemThemeListener) {
    window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', systemThemeListener);
    systemThemeListener = null;
  }
  if (preference !== 'system') return;

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  systemThemeListener = () => applyThemePreference('system');
  media.addEventListener('change', systemThemeListener);
}