import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  searchOpenLibrary,
  resolveOpenLibraryIsbn,
  getOpenLibraryWork,
  getOpenLibraryEdition,
  clearOpenLibraryCache,
  extractOlId,
  toOpenLibraryWorkId,
  toOpenLibraryEditionId,
  coverUrlFromId,
  coverUrlFromIsbn,
} from '@/background/openLibrary';

import searchGatsby from './fixtures/openlibrary/search-gatsby.json';
import isbnEdition from './fixtures/openlibrary/isbn-9780743273565.json';
import workGatsby from './fixtures/openlibrary/work-OL468431W.json';
import editionGatsby from './fixtures/openlibrary/edition-OL24347578M.json';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

function mockFetchByUrl(routes: Record<string, Response | (() => Response)>): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    for (const [pattern, handler] of Object.entries(routes)) {
      if (url.includes(pattern)) {
        return typeof handler === 'function' ? handler() : handler;
      }
    }
    return jsonResponse({}, false, 404);
  });
}

beforeEach(() => {
  clearOpenLibraryCache();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ID normalization', () => {
  it('normalizes work keys and namespaced ids', () => {
    expect(extractOlId('/works/OL468431W')).toBe('OL468431W');
    expect(extractOlId('openlibrary_work_OL468431W')).toBe('OL468431W');
    expect(extractOlId('OL468431W')).toBe('OL468431W');
    expect(toOpenLibraryWorkId('/works/OL468431W')).toBe('openlibrary_work_OL468431W');
  });

  it('normalizes edition keys and namespaced ids', () => {
    expect(extractOlId('/books/OL24347578M')).toBe('OL24347578M');
    expect(extractOlId('openlibrary_edition_OL24347578M')).toBe('OL24347578M');
    expect(toOpenLibraryEditionId('OL24347578M')).toBe('openlibrary_edition_OL24347578M');
  });

  it('builds cover URLs', () => {
    expect(coverUrlFromId(8432047)).toBe(
      'https://covers.openlibrary.org/b/id/8432047-L.jpg'
    );
    expect(coverUrlFromIsbn('9780743273565')).toBe(
      'https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg'
    );
  });
});

describe('searchOpenLibrary', () => {
  it('maps a search hit to CatalogWork with provenance and namespaced id', async () => {
    const fetchMock = mockFetchByUrl({
      'search.json': jsonResponse(searchGatsby),
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchOpenLibrary({ query: 'The Great Gatsby', limit: 5 });

    expect(results).toHaveLength(1);
    const { work, matchScore } = results[0];
    expect(work.id).toBe('openlibrary_work_OL468431W');
    expect(work.medium).toBe('book');
    expect(work.canonicalTitle).toBe('The Great Gatsby');
    expect(work.bookDetails?.authors).toContain('F. Scott Fitzgerald');
    expect(work.firstReleaseYear).toBe(1925);
    expect(work.images.primary).toContain('8432047');
    expect(work.sourceProvenance.length).toBeGreaterThan(0);
    expect(work.sourceProvenance[0].provider).toBe('openlibrary');
    expect(work.sourceProvenance[0].fields).toContain('canonicalTitle');
    expect(matchScore).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://openlibrary.org/search.json?q='),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('returns empty array when no docs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ numFound: 0, docs: [] }))
    );
    const results = await searchOpenLibrary({ query: 'zzzznonexistent' });
    expect(results).toEqual([]);
  });

  it('returns empty array on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')));
    const results = await searchOpenLibrary({ query: 'Gatsby' });
    expect(results).toEqual([]);
  });

  it('returns empty for blank query without fetching', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await searchOpenLibrary({ query: '   ' })).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('resolveOpenLibraryIsbn', () => {
  it('resolves ISBN → edition → work with linked identities', async () => {
    const fetchMock = mockFetchByUrl({
      '/isbn/9780743273565.json': jsonResponse(isbnEdition),
      '/works/OL468431W.json': jsonResponse(workGatsby),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await resolveOpenLibraryIsbn('978-0-7432-7356-5');

    expect(result).not.toBeNull();
    expect(result!.work.id).toBe('openlibrary_work_OL468431W');
    expect(result!.work.medium).toBe('book');
    expect(result!.edition.id).toBe('openlibrary_edition_OL24347578M');
    expect(result!.edition.workId).toBe('openlibrary_work_OL468431W');
    expect(result!.edition.isbn13).toContain('9780743273565');
    expect(result!.edition.isbn10).toContain('0743273567');
    expect(result!.edition.publisher).toBe('Scribner');
    expect(result!.edition.format).toBe('paperback');
    expect(result!.edition.pageCount).toBe(180);
    expect(result!.edition.sourceProvenance[0].provider).toBe('openlibrary');
    expect(result!.work.sourceProvenance[0].provider).toBe('openlibrary');
    expect(result!.work.bookDetails?.defaultEditionId).toBe(
      'openlibrary_edition_OL24347578M'
    );
  });

  it('returns null for invalid ISBN without network', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await resolveOpenLibraryIsbn('1234567890123')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null on 404 edition', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({}, false, 404))
    );
    // Valid checksum ISBN that "does not exist" in our mock
    expect(await resolveOpenLibraryIsbn('9780743273565')).toBeNull();
  });

  it('returns null when edition has no works link', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          key: '/books/OL1M',
          title: 'Orphan Edition',
          works: [],
        })
      )
    );
    expect(await resolveOpenLibraryIsbn('9780743273565')).toBeNull();
  });
});

describe('getOpenLibraryWork', () => {
  it('returns mapped CatalogWork', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchByUrl({
        '/works/OL468431W.json': jsonResponse(workGatsby),
      })
    );

    const work = await getOpenLibraryWork('openlibrary_work_OL468431W');
    expect(work).not.toBeNull();
    expect(work!.id).toBe('openlibrary_work_OL468431W');
    expect(work!.canonicalTitle).toBe('The Great Gatsby');
    expect(work!.description).toContain('F. Scott Fitzgerald');
    expect(work!.images.primary).toContain('8432047');
    expect(work!.sourceProvenance[0].fields).toContain('description');
  });

  it('returns null on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false, 404)));
    expect(await getOpenLibraryWork('openlibrary_work_OL999999W')).toBeNull();
  });

  it('returns null for invalid work id shape', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await getOpenLibraryWork('not-a-work')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('getOpenLibraryEdition', () => {
  it('returns mapped BookEdition linked to work', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchByUrl({
        '/books/OL24347578M.json': jsonResponse(editionGatsby),
      })
    );

    const edition = await getOpenLibraryEdition('openlibrary_edition_OL24347578M');
    expect(edition).not.toBeNull();
    expect(edition!.id).toBe('openlibrary_edition_OL24347578M');
    expect(edition!.workId).toBe('openlibrary_work_OL468431W');
    expect(edition!.language).toBe('eng');
    expect(edition!.coverUrl).toContain('8432047');
  });

  it('returns null on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await getOpenLibraryEdition('OL24347578M')).toBeNull();
  });
});

describe('timeout / abort handling', () => {
  it('returns empty/null when fetch aborts (timeout)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          if (init?.signal?.aborted) {
            reject(err);
            return;
          }
          init?.signal?.addEventListener('abort', () => reject(err));
          // Never resolve — wait for abort from provider timeout (12s) would be slow;
          // instead abort immediately via signal if provided by immediately aborting.
        });
      })
    );

    // Force immediate abort by replacing AbortController behavior is hard;
    // simulate by rejecting with AbortError which fetchJson catches.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' })));

    expect(await searchOpenLibrary({ query: 'timeout' })).toEqual([]);
    expect(await getOpenLibraryWork('OL468431W')).toBeNull();
    expect(await resolveOpenLibraryIsbn('9780743273565')).toBeNull();
  });
});

describe('caching', () => {
  it('reuses search results without a second network call', async () => {
    const fetchMock = mockFetchByUrl({
      'search.json': jsonResponse(searchGatsby),
    });
    vi.stubGlobal('fetch', fetchMock);

    await searchOpenLibrary({ query: 'The Great Gatsby', limit: 5 });
    await searchOpenLibrary({ query: 'The Great Gatsby', limit: 5 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
