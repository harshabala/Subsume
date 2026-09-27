import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageType, type UserPreferences } from '@/shared/types';

vi.mock('@/background/storage', () => ({ getPreferences: vi.fn(), savePreferences: vi.fn() }));
vi.mock('@/background/tmdb', () => ({ setTmdbApiKey: vi.fn() }));
vi.mock('@/background/omdb', () => ({ setOmdbApiKey: vi.fn() }));
vi.mock('@/background/googleBooks', () => ({ setGoogleBooksApiKey: vi.fn() }));
vi.mock('@/background/dataSources', () => ({ getFreeDataSourceStatuses: vi.fn(() => ['status']) }));
vi.mock('@/background/dispatch', () => ({ reconcileDispatchAlarm: vi.fn() }));
vi.mock('@/background/activationHooks', () => ({ healFirstInscriptionIfLibraryNonEmpty: vi.fn() }));
vi.mock('@/shared/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn() } }));

import { settingHandlers } from '@/background/handlers/settings';
import { getPreferences, savePreferences } from '@/background/storage';
import { setTmdbApiKey } from '@/background/tmdb';
import { setOmdbApiKey } from '@/background/omdb';
import { setGoogleBooksApiKey } from '@/background/googleBooks';
import { reconcileDispatchAlarm } from '@/background/dispatch';
import { healFirstInscriptionIfLibraryNonEmpty } from '@/background/activationHooks';
import { logger } from '@/shared/logger';

const sender = {} as chrome.runtime.MessageSender;
const call = (type: MessageType, payload?: unknown) => settingHandlers[type]!(payload, sender);

const valid = (over: Partial<UserPreferences> = {}): UserPreferences =>
  ({
    favoriteGenres: ['18'],
    platforms: ['8'],
    region: 'US',
    llmEnabled: false,
    hoverCardsEnabled: true,
    posterOverlaysEnabled: true,
    disabledDomains: [],
    detectionSensitivity: 'medium',
    onboardingComplete: true,
    ...over,
  }) as UserPreferences;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPreferences).mockResolvedValue(
    valid({ tmdbApiKey: 'tmdb-secret-1234', llmApiKey: 'sk-abcdefgh9876', omdbApiKey: 'abc', googleBooksApiKey: undefined }),
  );
});

describe('GET_PREFERENCES / GET_FULL_PREFERENCES', () => {
  it('strips every API key for content scripts', async () => {
    const out = (await call(MessageType.GET_PREFERENCES)) as Record<string, unknown>;
    expect(out).not.toHaveProperty('tmdbApiKey');
    expect(out).not.toHaveProperty('llmApiKey');
    expect(out.region).toBe('US');
  });

  it('masks keys by default, reveals on request, and survives a failed heal', async () => {
    vi.mocked(healFirstInscriptionIfLibraryNonEmpty).mockRejectedValueOnce(new Error('db'));
    const masked = (await call(MessageType.GET_FULL_PREFERENCES)) as UserPreferences;
    expect(masked).toMatchObject({ tmdbApiKey: '...1234', llmApiKey: 'sk-...9876', omdbApiKey: 'abc', googleBooksApiKey: undefined });
    const revealed = (await call(MessageType.GET_FULL_PREFERENCES, { revealKeys: true })) as UserPreferences;
    expect(revealed.tmdbApiKey).toBe('tmdb-secret-1234');
  });
});

describe('SET_PREFERENCES', () => {
  it('merges, keeps stored keys when the UI echoes masked ones, and applies keys', async () => {
    await expect(
      call(MessageType.SET_PREFERENCES, { tmdbApiKey: '...1234', omdbApiKey: 'new-omdb', region: 'GB', theme: undefined }),
    ).resolves.toEqual({ updated: true });
    const saved = vi.mocked(savePreferences).mock.calls[0][0];
    expect(saved).toMatchObject({ tmdbApiKey: 'tmdb-secret-1234', omdbApiKey: 'new-omdb', region: 'GB' });
    expect(setTmdbApiKey).toHaveBeenCalledWith('tmdb-secret-1234');
    expect(setOmdbApiKey).toHaveBeenCalledWith('new-omdb');
    expect(setGoogleBooksApiKey).toHaveBeenCalledWith('');
    expect(reconcileDispatchAlarm).toHaveBeenCalledWith(saved);
  });

  it('clears missing keys to empty strings and logs a failed alarm reconcile', async () => {
    vi.mocked(getPreferences).mockResolvedValue(valid());
    vi.mocked(reconcileDispatchAlarm).mockRejectedValueOnce(new Error('alarms'));
    await call(MessageType.SET_PREFERENCES, {});
    expect(setTmdbApiKey).toHaveBeenCalledWith('');
    expect(setOmdbApiKey).toHaveBeenCalledWith('');
    expect(logger.warn).toHaveBeenCalledWith('[Subsume] reconcileDispatchAlarm after prefs save failed:', expect.any(Error));
  });

  it.each([
    ['favoriteGenres', ['a', 1]],
    ['platforms', 'x'],
    ['region', 5],
    ['llmEnabled', 'yes'],
    ['llmProvider', 'cohere'],
    ['llmApiKey', 5],
    ['llmSecondaryApiKey', 5],
    ['tmdbApiKey', 5],
    ['omdbApiKey', 5],
    ['googleBooksApiKey', 5],
    ['hoverCardsEnabled', 1],
    ['posterOverlaysEnabled', 1],
    ['disabledDomains', [1]],
    ['detectionSensitivity', 'max'],
    ['onboardingComplete', 'no'],
    ['theme', 'neon'],
  ])('rejects an invalid %s', async (field, value) => {
    await expect(call(MessageType.SET_PREFERENCES, { [field]: value })).rejects.toThrow('Invalid preferences payload');
    expect(savePreferences).not.toHaveBeenCalled();
  });

  it('accepts every valid optional enum and key', async () => {
    await expect(
      call(MessageType.SET_PREFERENCES, {
        llmProvider: 'anthropic',
        llmApiKey: 'k',
        llmSecondaryApiKey: 'k2',
        googleBooksApiKey: 'g',
        theme: 'system',
      }),
    ).resolves.toEqual({ updated: true });
  });

  it('rejects when stored preferences are missing entirely', async () => {
    vi.mocked(getPreferences).mockResolvedValue(null as never);
    // mergePreferences spreads null into {}, which then fails the shape check
    await expect(call(MessageType.SET_PREFERENCES, {})).rejects.toThrow('Invalid preferences payload');
  });
});

describe('content preferences', () => {
  it('GET_POSTER_PREFS and GET_CONTENT_PREFS respect disabled domains', async () => {
    vi.mocked(getPreferences).mockResolvedValue(valid({ disabledDomains: ['blocked.test'] }));
    const poster = (await call(MessageType.GET_POSTER_PREFS, { hostname: 'site.test' })) as Record<string, unknown>;
    expect(poster).toEqual({ overlaysEnabled: true, detectionSensitivity: 'medium' });
    const content = (await call(MessageType.GET_CONTENT_PREFS, { hostname: 'blocked.test' })) as Record<string, unknown>;
    expect(content.posterOverlaysEnabled).toBe(false);
  });

  it('GET_FREE_DATA_SOURCE_STATUS delegates', async () => {
    await expect(call(MessageType.GET_FREE_DATA_SOURCE_STATUS)).resolves.toEqual(['status']);
  });
});
