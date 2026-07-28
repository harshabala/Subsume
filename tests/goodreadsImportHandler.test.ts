/**
 * IMPORT_GOODREADS_CSV handler — resolve via Open Library, add to archive.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageType, type MediaItem } from '@/shared/types';
import { getLibraryItem, getMediaItem } from '@/background/storage';
import { bookHandlers } from '@/background/handlers/books';
import type { CatalogWork } from '@/shared/catalogTypes';
import * as openLibrary from '@/background/openLibrary';

vi.mock('@/background/openLibrary', () => ({
  searchOpenLibrary: vi.fn(),
  resolveOpenLibraryIsbn: vi.fn(),
  getOpenLibraryWork: vi.fn(),
  getOpenLibraryEditionsForWork: vi.fn(),
}));

vi.mock('@/background/googleBooks', () => ({
  searchGoogleBooks: vi.fn(),
}));

const sender = {} as chrome.runtime.MessageSender;

const gatsbyWork: CatalogWork = {
  id: 'openlibrary_work_OL468431W',
  medium: 'book',
  canonicalTitle: 'The Great Gatsby',
  firstReleaseYear: 1925,
  genres: ['Fiction'],
  images: { primary: 'https://covers.openlibrary.org/b/id/1-M.jpg' },
  externalIds: [
    {
      provider: 'openlibrary',
      externalId: 'OL468431W',
      url: 'https://openlibrary.org/works/OL468431W',
    },
  ],
  creatorCredits: [{ name: 'F. Scott Fitzgerald', role: 'author', order: 0 }],
  bookDetails: {
    authors: ['F. Scott Fitzgerald'],
    firstPublishedYear: 1925,
  },
  sourceProvenance: [
    {
      provider: 'openlibrary',
      fields: ['canonicalTitle'],
      fetchedAt: 1,
    },
  ],
  sourceConfidence: 'high',
  createdAt: 1,
  updatedAt: 1,
};

describe('IMPORT_GOODREADS_CSV', () => {
  const handler = bookHandlers[MessageType.IMPORT_GOODREADS_CSV]!;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves ISBN rows and maps status/rating into archive', async () => {
    vi.mocked(openLibrary.resolveOpenLibraryIsbn).mockResolvedValue({
      work: gatsbyWork,
      edition: {
        id: 'openlibrary_edition_OL1M',
        workId: gatsbyWork.id,
        title: gatsbyWork.canonicalTitle,
        isbn13: '9780743273565',
        sourceProvenance: [],
        createdAt: 1,
        updatedAt: 1,
      },
    });

    const csv = `Title,Author,ISBN13,My Rating,Exclusive Shelf,Date Read
"The Great Gatsby","F. Scott Fitzgerald",="9780743273565",5,read,2020/06/15
`;

    const result = (await handler({ csvText: csv }, sender)) as {
      imported: number;
      failed: number;
      results: Array<{ ok: boolean; mediaId?: string; status?: string }>;
    };

    expect(result.imported).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.results[0].ok).toBe(true);
    expect(result.results[0].mediaId).toBe(gatsbyWork.id);
    expect(result.results[0].status).toBe('watched');

    const media = await getMediaItem(gatsbyWork.id);
    expect(media?.canonicalTitle).toBe('The Great Gatsby');
    expect(media?.type).toBe('book');

    const lib = await getLibraryItem(gatsbyWork.id);
    expect(lib?.status).toBe('watched');
    expect(lib?.userRating).toBe(10);
    expect(lib?.contemplatedAt).toBeDefined();
  });

  it('falls back to title search when ISBN missing', async () => {
    vi.mocked(openLibrary.resolveOpenLibraryIsbn).mockResolvedValue(null);
    vi.mocked(openLibrary.searchOpenLibrary).mockResolvedValue([
      { work: gatsbyWork, matchScore: 0.9 },
    ]);

    const result = (await handler(
      {
        rows: [
          {
            rowIndex: 1,
            title: 'The Great Gatsby',
            author: 'F. Scott Fitzgerald',
            exclusiveShelf: 'to-read',
            myRating: 0,
          },
        ],
      },
      sender,
    )) as { imported: number; results: Array<{ status?: string }> };

    expect(result.imported).toBe(1);
    expect(openLibrary.searchOpenLibrary).toHaveBeenCalled();
    expect(result.results[0].status).toBe('to-watch');
  });

  it('records failure when catalog cannot resolve', async () => {
    vi.mocked(openLibrary.resolveOpenLibraryIsbn).mockResolvedValue(null);
    vi.mocked(openLibrary.searchOpenLibrary).mockResolvedValue([]);

    const result = (await handler(
      {
        rows: [{ rowIndex: 1, title: 'Obscure Unfindable Tome 999' }],
      },
      sender,
    )) as { imported: number; failed: number; results: Array<{ ok: boolean; error?: string }> };

    expect(result.imported).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.results[0].ok).toBe(false);
    expect(result.results[0].error).toMatch(/Open Library/i);
  });
});
