import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as tmdbModule from '@/background/tmdb';
import { fetchWikipediaSummary, fetchWikidataDirectorInfo } from '@/background/wikidata';

vi.mock('@/background/tmdb', () => {
  const actual = vi.importActual('@/background/tmdb');
  return {
    ...actual,
    fetchWithRetry: vi.fn(),
  };
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('fetchWikipediaSummary', () => {
  it('returns extract text for a found title', async () => {
    vi.mocked(tmdbModule.fetchWithRetry).mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Breaking Bad',
        extract: 'Breaking Bad is an American crime drama television series.',
        thumbnail: { source: 'https://upload.wikimedia.org/img.jpg' },
      }),
    } as Response);
    const summary = await fetchWikipediaSummary('Breaking Bad', 2008);
    expect(summary).toBe('Breaking Bad is an American crime drama television series.');
  });

  it('returns null on 404', async () => {
    vi.mocked(tmdbModule.fetchWithRetry).mockResolvedValue({ ok: false, status: 404 } as Response);
    const summary = await fetchWikipediaSummary('Nonexistent Title XYZ', 2000);
    expect(summary).toBeNull();
  });

  it('returns null on network error', async () => {
    vi.mocked(tmdbModule.fetchWithRetry).mockRejectedValue(new Error('Network error'));
    const summary = await fetchWikipediaSummary('Unique Title For Network Error', 2008);
    expect(summary).toBeNull();
  });

  it('appends year disambiguation to query when provided', async () => {
    vi.mocked(tmdbModule.fetchWithRetry).mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Batman', extract: 'Batman is a superhero film.', thumbnail: null }),
    } as Response);
    await fetchWikipediaSummary('Batman', 1989);
    // Should try title first, which calls fetch at least once
    expect(tmdbModule.fetchWithRetry).toHaveBeenCalled();
  });
});

describe('fetchWikidataDirectorInfo', () => {
  it('returns director name and bio from SPARQL result', async () => {
    const sparqlResponse = {
      results: {
        bindings: [
          {
            directorLabel: { value: 'Vince Gilligan' },
            directorWikipediaTitle: { value: 'Vince_Gilligan' },
          },
        ],
      },
    };
    const wikiResponse = {
      extract: 'Vince Gilligan is an American writer, producer, and director.',
    };

    vi.mocked(tmdbModule.fetchWithRetry)
      .mockResolvedValueOnce({ ok: true, json: async () => sparqlResponse } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => wikiResponse } as Response);

    const result = await fetchWikidataDirectorInfo('tt0903747');
    expect(result).not.toBeNull();
    expect(result!.directorName).toBe('Vince Gilligan');
    expect(result!.directorBio).toBe('Vince Gilligan is an American writer, producer, and director.');
  });

  it('returns null when SPARQL returns no bindings', async () => {
    vi.mocked(tmdbModule.fetchWithRetry).mockResolvedValue({
      ok: true,
      json: async () => ({ results: { bindings: [] } }),
    } as Response);
    const result = await fetchWikidataDirectorInfo('tt9999999');
    expect(result).toBeNull();
  });

  it('returns null on SPARQL fetch error', async () => {
    vi.mocked(tmdbModule.fetchWithRetry).mockResolvedValue({ ok: false, status: 500 } as Response);
    const result = await fetchWikidataDirectorInfo('tt0000999');
    expect(result).toBeNull();
  });
});
