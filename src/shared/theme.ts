import type { ThemePreference } from './types';

export function applyThemePreference(theme: ThemePreference = 'dark'): void {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}