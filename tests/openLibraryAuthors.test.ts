import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  searchOpenLibraryAuthors,
  getOpenLibraryAuthorWorks,
  clearOpenLibraryCache,
  extractOlAuthorId,
  toOpenLibraryAuthorId,
} from '@/background/openLibrary';

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

const authorSearchFixture = {
  numFound: 1,
  docs: [
    {
      key: 'OL23919A',
      name: 'J. K. Rowling',
      birth_date: '31 July 1965',
      top_work: "Harry Potter and the Philosopher's Stone",
      work_count: 162,
      top_subjects: ['Fantasy'],
    },
  ],
};

const authorDetailFixture = {
  key: '/authors/OL23919A',
  name: 'J. K. Rowling',
  bio: { type: '/type/text', value: 'British author.' },
  photos: [12345],
};

const authorWorksFixture = {
  size: 2,
  entries: [
    {
      key: '/works/OL82563W',
      title: "Harry Potter and the Philosopher's Stone",
      covers: [10521270],
      first_publish_date: '1997',
      subjects: ['Fantasy'],
    },
    {
      key: '/works/OL82565W',
      title: 'Harry Potter and the Chamber of Secrets',
      first_publish_date: '1998',
    },
  ],
};

beforeEach(() => {
  clearOpenLibraryCache();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Open Library author id helpers', () => {
  it('normalizes author keys and namespaced ids', () => {
    expect(extractOlAuthorId('/authors/OL23919A')).toBe('OL23919A');
    expect(extractOlAuthorId('openlibrary_author_OL23919A')).toBe('OL23919A');
    expect(extractOlAuthorId('OL23919A')).toBe('OL23919A');
    expect(toOpenLibraryAuthorId('OL23919A')).toBe('openlibrary_author_OL23919A');
  });

  it('rejects non-author ids', () => {
    expect(extractOlAuthorId('OL468431W')).toBeNull();
    expect(extractOlAuthorId('openlibrary_work_OL468431W')).toBeNull();
  });
});

describe('searchOpenLibraryAuthors', () => {
  it('maps author search hits to Creator with openlibrary_author_ ids', async () => {
    const fetchMock = mockFetchByUrl({
      'search/authors.json': jsonResponse(authorSearchFixture),
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchOpenLibraryAuthors('rowling');

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('openlibrary_author_OL23919A');
    expect(results[0].name).toBe('J. K. Rowling');
    expect(results[0].roles).toContain('author');
    expect(results[0].externalIds[0]).toMatchObject({
      provider: 'openlibrary',
      externalId: 'OL23919A',
    });
    expect(results[0].biography).toContain("Harry Potter");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://openlibrary.org/search/authors.json?q='),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('returns empty array for blank query', async () => {
    const results = await searchOpenLibraryAuthors('  ');
    expect(results).toEqual([]);
  });

  it('returns empty array when API has no docs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ numFound: 0, docs: [] }))
    );
    const results = await searchOpenLibraryAuthors('zzzz-no-author');
    expect(results).toEqual([]);
  });
});

describe('getOpenLibraryAuthorWorks', () => {
  it('maps author works.json entries to CatalogWork list', async () => {
    const fetchMock = mockFetchByUrl({
      '/authors/OL23919A.json': jsonResponse(authorDetailFixture),
      '/authors/OL23919A/works.json': jsonResponse(authorWorksFixture),
    });
    vi.stubGlobal('fetch', fetchMock);

    const works = await getOpenLibraryAuthorWorks('openlibrary_author_OL23919A');

    expect(works).toHaveLength(2);
    expect(works[0].id).toBe('openlibrary_work_OL82563W');
    expect(works[0].medium).toBe('book');
    expect(works[0].canonicalTitle).toBe("Harry Potter and the Philosopher's Stone");
    expect(works[0].bookDetails?.authors).toContain('J. K. Rowling');
    expect(works[0].creatorCredits[0].role).toBe('author');
    expect(works[0].firstReleaseYear).toBe(1997);
    expect(works[1].id).toBe('openlibrary_work_OL82565W');
  });

  it('returns empty for invalid author id', async () => {
    const works = await getOpenLibraryAuthorWorks('not-an-author');
    expect(works).toEqual([]);
  });
});
