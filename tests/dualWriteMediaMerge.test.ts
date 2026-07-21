import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MediaItem } from '@/shared/types';
import type { CatalogWork, CreatorCredit, SourceProvenance } from '@/shared/catalogTypes';
import type { IDBPDatabase } from 'idb';

const openConnections: IDBPDatabase[] = [];

vi.mock('idb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('idb')>();
  return {
    ...actual,
    openDB: async (...args: Parameters<typeof actual.openDB>) => {
      const db = await actual.openDB(...args);
      openConnections.push(db);
      return db;
    },
  };
});

/** Avoid seed noise so dual-write assertions are deterministic. */
vi.mock('@/background/seedData', () => ({
  SEED_MEDIA: [],
  SEED_LIBRARY: [],
  SEED_PEOPLE: [],
  SEED_PEOPLE_OBSOLETE_IDS: [],
  SEED_CATALOGUE_VERSION: 1,
  SEED_CATALOGUE_VERSION_KEY: 'subsume_seed_catalogue_version',
}));

const DB_NAME = 'subsume-db';

const bookMedia: MediaItem = {
  id: 'ol_work_merge_gatsby',
  canonicalTitle: 'The Great Gatsby',
  type: 'book',
  year: 1925,
  genres: ['Fiction'],
  ratings: [],
  providers: [{ provider: 'openlibrary', externalId: 'OL468431W' }],
  posterUrl: 'https://example.com/gatsby.jpg',
  authors: ['F. Scott Fitzgerald'],
};

const sparseBookMedia: MediaItem = {
  id: 'ol_work_merge_gatsby',
  canonicalTitle: 'The Great Gatsby',
  type: 'book',
  year: 1925,
  genres: ['Fiction'],
  ratings: [],
  providers: [{ provider: 'openlibrary', externalId: 'OL468431W' }],
  posterUrl: 'https://example.com/gatsby.jpg',
  // no authors — mediaItemToCatalogWork would produce empty bookDetails.authors
};

async function closeTrackedConnections(): Promise<void> {
  while (openConnections.length > 0) {
    const db = openConnections.pop();
    db?.close();
  }
}

async function resetStorageState(): Promise<void> {
  await closeTrackedConnections();
  vi.resetModules();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
    request.onsuccess = () => resolve();
  });
  const store: Record<string, unknown> = {};
  vi.mocked(chrome.storage.local.get).mockImplementation(async (keys?: string | string[] | null) => {
    if (!keys) return { ...store };
    if (typeof keys === 'string') return { [keys]: store[keys] };
    if (Array.isArray(keys)) {
      const out: Record<string, unknown> = {};
      for (const k of keys) out[k] = store[k];
      return out;
    }
    return { ...store };
  });
  vi.mocked(chrome.storage.local.set).mockImplementation(async (items: Record<string, unknown>) => {
    Object.assign(store, items);
  });
}

async function loadStorage() {
  return import('@/background/storage');
}

describe('dualWriteMedia merge on existing works', () => {
  beforeEach(async () => {
    openConnections.length = 0;
    await resetStorageState();
  });

  afterEach(async () => {
    await closeTrackedConnections();
    vi.resetModules();
  });

  it('preserves bookDetails.authors when second putMediaItem has no authors', async () => {
    const storage = await loadStorage();

    await storage.putMediaItem(bookMedia);
    const afterFirst = await storage.getWork(bookMedia.id);
    expect(afterFirst?.bookDetails?.authors).toEqual(['F. Scott Fitzgerald']);
    const createdAt = afterFirst!.createdAt;

    await storage.putMediaItem(sparseBookMedia);
    const afterSecond = await storage.getWork(bookMedia.id);

    expect(afterSecond?.bookDetails?.authors).toEqual(['F. Scott Fitzgerald']);
    expect(afterSecond?.createdAt).toBe(createdAt);
  });

  it('preserves creatorCredits and sourceProvenance when conversion is empty/shallow', async () => {
    const storage = await loadStorage();

    await storage.putMediaItem(bookMedia);
    const base = (await storage.getWork(bookMedia.id))!;

    const credits: CreatorCredit[] = [
      { name: 'F. Scott Fitzgerald', role: 'author', order: 0 },
    ];
    const provenance: SourceProvenance[] = [
      {
        provider: 'openlibrary',
        providerRecordId: 'OL468431W',
        fields: ['canonicalTitle', 'authors', 'description', 'subjects', 'images'],
        fetchedAt: 1_700_000_000_000,
      },
      {
        provider: 'googlebooks',
        fields: ['publicRatings', 'pageCount'],
        fetchedAt: 1_700_000_100_000,
      },
    ];

    const enriched: CatalogWork = {
      ...base,
      creatorCredits: credits,
      bookDetails: {
        authors: ['F. Scott Fitzgerald'],
        firstPublishedYear: 1925,
        series: { name: 'Scribner Classics', position: 1 },
        primarySubjects: ['American literature'],
      },
      sourceProvenance: provenance,
      lastEnrichedAt: 1_700_000_100_000,
    };
    await storage.putWork(enriched);

    // Second dual-write from a sparse MediaItem conversion (empty credits, shallow provenance).
    await storage.putMediaItem(sparseBookMedia);
    const after = await storage.getWork(bookMedia.id);

    expect(after?.createdAt).toBe(base.createdAt);
    expect(after?.creatorCredits).toEqual(credits);
    expect(after?.bookDetails?.authors).toEqual(['F. Scott Fitzgerald']);
    expect(after?.bookDetails?.series).toEqual({ name: 'Scribner Classics', position: 1 });
    expect(after?.bookDetails?.primarySubjects).toEqual(['American literature']);
    expect(after?.sourceProvenance).toEqual(provenance);
    expect(after?.lastEnrichedAt).toBe(1_700_000_100_000);
    // Title/year from the put still apply
    expect(after?.canonicalTitle).toBe('The Great Gatsby');
  });

  it('applies richer bookDetails.authors from a second put when prior details were empty', async () => {
    const storage = await loadStorage();

    await storage.putMediaItem(sparseBookMedia);
    const afterSparse = await storage.getWork(sparseBookMedia.id);
    expect(afterSparse?.bookDetails?.authors ?? []).toEqual([]);

    await storage.putMediaItem(bookMedia);
    const afterRich = await storage.getWork(bookMedia.id);
    expect(afterRich?.bookDetails?.authors).toEqual(['F. Scott Fitzgerald']);
  });

  it('putMediaItems also merges existing works instead of wiping enrichment', async () => {
    const storage = await loadStorage();

    await storage.putMediaItem(bookMedia);
    const base = (await storage.getWork(bookMedia.id))!;
    await storage.putWork({
      ...base,
      creatorCredits: [{ name: 'F. Scott Fitzgerald', role: 'author' }],
      bookDetails: {
        authors: ['F. Scott Fitzgerald'],
        firstPublishedYear: 1925,
        defaultEditionId: 'ol_edition_merge_1',
      },
    });

    await storage.putMediaItems([sparseBookMedia]);
    const after = await storage.getWork(bookMedia.id);

    expect(after?.creatorCredits).toEqual([{ name: 'F. Scott Fitzgerald', role: 'author' }]);
    expect(after?.bookDetails?.authors).toEqual(['F. Scott Fitzgerald']);
    expect(after?.bookDetails?.defaultEditionId).toBe('ol_edition_merge_1');
    expect(after?.createdAt).toBe(base.createdAt);
  });
});
