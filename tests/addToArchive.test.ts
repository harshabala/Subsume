import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageType, type MediaItem } from '@/shared/types';
import {
  putMediaItem,
  getMediaItem,
  getLibraryItem,
} from '@/background/storage';
import { bookHandlers } from '@/background/handlers/books';

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

const sampleBook: MediaItem = {
  id: 'openlibrary_work_OL468431W',
  canonicalTitle: 'The Great Gatsby',
  type: 'book',
  year: 1925,
  genres: ['Fiction'],
  ratings: [],
  providers: [{ provider: 'openlibrary', externalId: 'OL468431W' }],
  posterUrl: 'https://covers.openlibrary.org/b/id/1-M.jpg',
  authors: ['F. Scott Fitzgerald'],
};

describe('ADD_TO_ARCHIVE', () => {
  const handler = bookHandlers[MessageType.ADD_TO_ARCHIVE]!;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists media when mediaItem includes an id (plaque path)', async () => {
    const result = (await handler(
      { mediaItem: sampleBook, workId: sampleBook.id, status: 'to-watch' },
      sender,
    )) as { added: boolean; mediaId: string };

    expect(result).toEqual({ added: true, mediaId: sampleBook.id });

    const media = await getMediaItem(sampleBook.id);
    expect(media).toBeDefined();
    expect(media?.canonicalTitle).toBe('The Great Gatsby');
    expect(media?.type).toBe('book');

    const lib = await getLibraryItem(sampleBook.id);
    expect(lib).toBeDefined();
    expect(lib?.status).toBe('to-watch');
    expect(lib?.sanctuaryIntent).toBe('wishlist');
  });

  it('prefers existing DB media over sparse untrusted mediaItem blobs', async () => {
    await putMediaItem({
      ...sampleBook,
      overview: 'Trusted overview from catalog resolve',
      posterUrl: 'https://covers.openlibrary.org/b/id/enriched-L.jpg',
      authors: ['F. Scott Fitzgerald'],
    });

    const sparse: MediaItem = {
      id: sampleBook.id,
      canonicalTitle: 'Gatsby',
      type: 'book',
      year: 1925,
      genres: [],
      ratings: [],
      providers: [],
      posterUrl: '',
    };

    await handler({ mediaItem: sparse, status: 'to-watch' }, sender);

    const media = await getMediaItem(sampleBook.id);
    expect(media?.overview).toBe('Trusted overview from catalog resolve');
    expect(media?.posterUrl).toBe(
      'https://covers.openlibrary.org/b/id/enriched-L.jpg',
    );
    // Incoming non-empty title still applied via merge
    expect(media?.canonicalTitle).toBe('Gatsby');
  });

  it('rejects orphan workId when media is not in the store', async () => {
    await expect(
      handler(
        { workId: 'openlibrary_work_OL999999W', status: 'to-watch' },
        sender,
      ),
    ).rejects.toThrow(/media not found for workId/);

    const lib = await getLibraryItem('openlibrary_work_OL999999W');
    expect(lib).toBeUndefined();
  });

  it('accepts workId-only when media already exists in store', async () => {
    await putMediaItem(sampleBook);

    const result = (await handler(
      { workId: sampleBook.id, status: 'watching' },
      sender,
    )) as { added: boolean; mediaId: string };

    expect(result.added).toBe(true);
    expect(result.mediaId).toBe(sampleBook.id);

    const lib = await getLibraryItem(sampleBook.id);
    expect(lib?.status).toBe('watching');
  });

  it('rejects invalid mediaItem shapes', async () => {
    await expect(
      handler(
        {
          mediaItem: {
            id: 'javascript:alert(1)',
            type: 'book',
            year: 2020,
          },
          status: 'to-watch',
        },
        sender,
      ),
    ).rejects.toThrow(/Invalid media item/);

    await expect(
      handler(
        {
          mediaItem: {
            id: 'openlibrary_work_OL1W',
            // missing type/year
          },
          status: 'to-watch',
        },
        sender,
      ),
    ).rejects.toThrow(/Invalid media item/);
  });

  it('rejects invalid workId patterns', async () => {
    await expect(
      handler({ workId: 'not-a-real-id', status: 'to-watch' }, sender),
    ).rejects.toThrow(/Invalid workId/);
  });

  it('rejects invalid status values without writing library', async () => {
    const unique: MediaItem = {
      ...sampleBook,
      id: 'openlibrary_work_OL111111W',
      canonicalTitle: 'Never Stored On Bad Status',
    };
    await expect(
      handler({ mediaItem: unique, status: 'yeeted' }, sender),
    ).rejects.toThrow(/Invalid ADD_TO_ARCHIVE status/);

    expect(await getMediaItem(unique.id)).toBeUndefined();
    expect(await getLibraryItem(unique.id)).toBeUndefined();
  });

  it('preserves existing library status when re-adding without status', async () => {
    await putMediaItem(sampleBook);
    await handler({ mediaItem: sampleBook, status: 'watched' }, sender);

    await handler({ mediaItem: sampleBook }, sender);

    const lib = await getLibraryItem(sampleBook.id);
    expect(lib?.status).toBe('watched');
  });

  it('requires workId or mediaItem', async () => {
    await expect(handler({}, sender)).rejects.toThrow(
      /requires workId or mediaItem/,
    );
  });
});

describe('CHECK_ARCHIVE_STATUS', () => {
  const handler = bookHandlers[MessageType.CHECK_ARCHIVE_STATUS]!;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns inLibrary false for invalid mediaId/workId', async () => {
    await expect(
      handler({ mediaId: 'javascript:alert(1)' }, sender),
    ).resolves.toEqual({ inLibrary: false });
    await expect(
      handler({ workId: 'page_example.com' }, sender),
    ).resolves.toEqual({ inLibrary: false });
    await expect(handler({}, sender)).resolves.toEqual({ inLibrary: false });
  });

  it('returns scoped status when library item exists', async () => {
    await putMediaItem(sampleBook);
    await bookHandlers[MessageType.ADD_TO_ARCHIVE]!(
      { mediaItem: sampleBook, status: 'watched' },
      sender,
    );

    const result = await handler({ workId: sampleBook.id }, sender);
    expect(result).toEqual({
      inLibrary: true,
      status: 'watched',
      userRating: undefined,
    });
  });
});
