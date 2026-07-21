import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  searchGoogleBooks,
  resolveGoogleBooksIsbn,
  clearGoogleBooksCache,
  toGoogleBooksVolumeId,
  extractGoogleBooksVolumeId,
} from '@/background/googleBooks';

import searchGatsby from './fixtures/googlebooks/search-gatsby.json';
import isbnGatsby from './fixtures/googlebooks/isbn-9780743273565.json';

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
  clearGoogleBooksCache();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ID helpers', () => {
  it('namespaces volume ids', () => {
    expect(toGoogleBooksVolumeId('iXn5U2IzVHMC')).toBe('googlebooks_volume_iXn5U2IzVHMC');
    expect(toGoogleBooksVolumeId('googlebooks_volume_iXn5U2IzVHMC')).toBe(
      'googlebooks_volume_iXn5U2IzVHMC'
    );
  });

  it('extracts bare volume id', () => {
    expect(extractGoogleBooksVolumeId('googlebooks_volume_iXn5U2IzVHMC')).toBe('iXn5U2IzVHMC');
    expect(extractGoogleBooksVolumeId('iXn5U2IzVHMC')).toBe('iXn5U2IzVHMC');
  });
});

describe('searchGoogleBooks', () => {
  it('maps a volume hit to CatalogWork with googlebooks provenance', async () => {
    const fetchMock = mockFetchByUrl({
      'books/v1/volumes': jsonResponse(searchGatsby),
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchGoogleBooks('The Great Gatsby', 'test-key', 5);

    expect(results).toHaveLength(1);
    const { work, matchScore, editions } = results[0];
    expect(work.id).toBe('googlebooks_volume_iXn5U2IzVHMC');
    expect(work.medium).toBe('book');
    expect(work.canonicalTitle).toBe('The Great Gatsby');
    expect(work.bookDetails?.authors).toContain('F. Scott Fitzgerald');
    expect(work.firstReleaseYear).toBe(2004);
    expect(work.images.primary).toMatch(/^https:\/\//);
    expect(work.sourceProvenance[0].provider).toBe('googlebooks');
    expect(work.sourceProvenance[0].providerRecordId).toBe('iXn5U2IzVHMC');
    expect(work.sourceProvenance[0].fields).toContain('canonicalTitle');
    expect(work.externalIds[0].provider).toBe('googlebooks');
    expect(matchScore).toBeGreaterThan(0);
    expect(editions?.[0]?.isbn13).toContain('9780743273565');
    expect(editions?.[0]?.sourceProvenance[0].provider).toBe('googlebooks');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://www.googleapis.com/books/v1/volumes?'),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('key=test-key');
    expect(calledUrl).toContain('q=The+Great+Gatsby');
  });

  it('allows unauthenticated search without key param', async () => {
    const fetchMock = mockFetchByUrl({
      'books/v1/volumes': jsonResponse(searchGatsby),
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchGoogleBooks('Gatsby');
    expect(results).toHaveLength(1);
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).not.toContain('key=');
  });

  it('returns empty array on 403 (restricted quota)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'forbidden' }, false, 403))
    );
    const results = await searchGoogleBooks('Gatsby', 'bad-key');
    expect(results).toEqual([]);
  });

  it('returns empty array when no items', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ kind: 'books#volumes', totalItems: 0, items: [] }))
    );
    expect(await searchGoogleBooks('zzzznonexistent')).toEqual([]);
  });

  it('returns empty on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')));
    expect(await searchGoogleBooks('Gatsby')).toEqual([]);
  });

  it('returns empty for blank query without fetching', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await searchGoogleBooks('   ')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('resolveGoogleBooksIsbn', () => {
  it('resolves ISBN to work + edition', async () => {
    // URLSearchParams encodes colon as %3A
    const fetchMock = mockFetchByUrl({
      '9780743273565': jsonResponse(isbnGatsby),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await resolveGoogleBooksIsbn('978-0-7432-7356-5', 'test-key');

    expect(result).not.toBeNull();
    expect(result!.work.id).toBe('googlebooks_volume_iXn5U2IzVHMC');
    expect(result!.work.medium).toBe('book');
    expect(result!.work.canonicalTitle).toBe('The Great Gatsby');
    expect(result!.edition.workId).toBe(result!.work.id);
    expect(result!.edition.isbn13).toContain('9780743273565');
    expect(result!.edition.isbn10).toContain('0743273567');
    expect(result!.edition.publisher).toBe('Scribner');
    expect(result!.edition.pageCount).toBe(180);
    expect(result!.edition.sourceProvenance[0].provider).toBe('googlebooks');
    expect(result!.work.sourceProvenance[0].provider).toBe('googlebooks');
    expect(result!.work.bookDetails?.defaultEditionId).toBe(result!.edition.id);

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toMatch(/q=isbn(%3A|:)9780743273565/);
  });

  it('returns null for invalid ISBN without network', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await resolveGoogleBooksIsbn('1234567890123')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null on 403', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'forbidden' }, false, 403))
    );
    expect(await resolveGoogleBooksIsbn('9780743273565')).toBeNull();
  });
});
