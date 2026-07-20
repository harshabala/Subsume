import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateTmdbKey, validateOmdbKey } from '@/ui/lib/validateKeys';

describe('validateTmdbKey', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns invalid without fetching when key is empty', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await validateTmdbKey('   ');

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/required/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns valid on 200 from authentication endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await validateTmdbKey('eyJ-test-token');

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/authentication',
      expect.objectContaining({
        headers: { Authorization: 'Bearer eyJ-test-token' },
      }),
    );
  });

  it('returns a helpful error on 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    );

    const result = await validateTmdbKey('bad-token');

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/API Read Access Token/i);
  });

  it('returns a network error when fetch throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    );

    const result = await validateTmdbKey('eyJ-token');

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/reach TMDb/i);
  });
});

describe('validateOmdbKey', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns invalid without fetching when key is empty', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await validateOmdbKey('');

    expect(result.valid).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns valid when Response is True', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ Response: 'True', Title: 'Inception' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await validateOmdbKey('good-key');

    expect(result.valid).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('omdbapi.com'),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('apikey=good-key'),
    );
  });

  it('returns invalid when Response is False for bad key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ Response: 'False', Error: 'Invalid API key!' }),
      }),
    );

    const result = await validateOmdbKey('bad-key');

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Invalid OMDb/i);
  });

  it('returns a network error when fetch throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('offline')),
    );

    const result = await validateOmdbKey('any-key');

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/reach OMDb/i);
  });
});
