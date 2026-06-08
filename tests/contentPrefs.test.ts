import { describe, it, expect } from 'vitest';
import { buildContentPrefs, isHostnameDisabled } from '@/background/contentPrefs';
import { UserPreferences } from '@/shared/types';

const SECRET_KEYS = ['tmdbApiKey', 'omdbApiKey', 'llmApiKey', 'llmProvider', 'llmEnabled'] as const;

function makePrefs(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return {
    favoriteGenres: ['Sci-Fi'],
    platforms: ['8'],
    region: 'US',
    llmEnabled: true,
    llmProvider: 'openai',
    llmApiKey: 'secret-llm-key',
    tmdbApiKey: 'secret-tmdb-key',
    omdbApiKey: 'secret-omdb-key',
    hoverCardsEnabled: true,
    posterOverlaysEnabled: true,
    disabledDomains: ['blocked.com'],
    detectionSensitivity: 'high',
    onboardingComplete: true,
    ...overrides,
  };
}

describe('buildContentPrefs', () => {
  it('returns only safe content preference fields', () => {
    const result = buildContentPrefs(makePrefs(), 'example.com');

    expect(result).toEqual({
      hoverCardsEnabled: true,
      posterOverlaysEnabled: true,
      detectionSensitivity: 'high',
      disabledDomains: ['blocked.com'],
      domainDisabled: false,
    });

    for (const key of SECRET_KEYS) {
      expect(result).not.toHaveProperty(key);
    }
  });

  it('does not leak API keys from the source preferences object', () => {
    const prefs = makePrefs();
    const result = buildContentPrefs(prefs, 'example.com');
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('secret-llm-key');
    expect(serialized).not.toContain('secret-tmdb-key');
    expect(serialized).not.toContain('secret-omdb-key');
  });

  it('disables features when hostname matches a disabled domain', () => {
    const result = buildContentPrefs(makePrefs(), 'blocked.com');

    expect(result.domainDisabled).toBe(true);
    expect(result.hoverCardsEnabled).toBe(false);
    expect(result.posterOverlaysEnabled).toBe(false);
  });

  it('honors hover card and poster overlay toggles independently', () => {
    const result = buildContentPrefs(
      makePrefs({ hoverCardsEnabled: false, posterOverlaysEnabled: true }),
      'example.com'
    );

    expect(result.hoverCardsEnabled).toBe(false);
    expect(result.posterOverlaysEnabled).toBe(true);
  });

  it('defaults detection sensitivity to medium when unset', () => {
    const result = buildContentPrefs(
      makePrefs({ detectionSensitivity: undefined as unknown as 'high' }),
      'example.com'
    );

    expect(result.detectionSensitivity).toBe('medium');
  });
});

describe('isHostnameDisabled', () => {
  it('matches exact hostnames and dot-prefixed subdomain rules', () => {
    expect(isHostnameDisabled('blocked.com', ['blocked.com'])).toBe(true);
    expect(isHostnameDisabled('example.com', ['.example.com'])).toBe(true);
    expect(isHostnameDisabled('www.example.com', ['.example.com'])).toBe(true);
    expect(isHostnameDisabled('news.example.com', ['example.com'])).toBe(true);
    expect(isHostnameDisabled('safe.com', ['blocked.com'])).toBe(false);
  });
});