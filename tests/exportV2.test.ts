/**
 * Export/import schemaVersion 2 — multi-medium backup round-trip.
 * Spec: docs/SUBSUME_BOOKS_EXPANSION_INSTRUCTIONS.md §13.4
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MediaItem, LibraryItem } from '@/shared/types';
import type { CatalogWork, BookEdition, LibraryRelationship } from '@/shared/catalogTypes';
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

vi.mock('@/background/seedData', () => ({
  SEED_MEDIA: [],
  SEED_LIBRARY: [],
  SEED_PEOPLE: [],
  SEED_PEOPLE_OBSOLETE_IDS: [],
  SEED_CATALOGUE_VERSION: 1,
  SEED_CATALOGUE_VERSION_KEY: 'subsume_seed_catalogue_version',
}));

const DB_NAME = 'subsume-db';

const bookWork: CatalogWork = {
  id: 'openlibrary_work_OL468431W',
  medium: 'book',
  canonicalTitle: 'The Great Gatsby',
  firstReleaseYear: 1925,
  genres: [],
  images: { primary: 'https://covers.openlibrary.org/b/id/8432047-L.jpg' },
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
    defaultEditionId: 'openlibrary_edition_OL24347578M',
  },
  sourceProvenance: [
    {
      provider: 'openlibrary',
      providerRecordId: 'OL468431W',
      fields: ['canonicalTitle', 'medium'],
      fetchedAt: 1_000,
    },
  ],
  sourceConfidence: 'high',
  createdAt: 1_000,
  updatedAt: 1_000,
};

const bookEdition: BookEdition = {
  id: 'openlibrary_edition_OL24347578M',
  workId: 'openlibrary_work_OL468431W',
  title: 'The Great Gatsby',
  authors: ['F. Scott Fitzgerald'],
  isbn13: ['9780743273565'],
  providerIds: [
    {
      provider: 'openlibrary',
      externalId: 'OL24347578M',
    },
  ],
  sourceProvenance: [
    {
      provider: 'openlibrary',
      fields: ['title', 'workId'],
      fetchedAt: 1_000,
    },
  ],
  sourceConfidence: 'high',
};

const bookRelationship: LibraryRelationship = {
  workId: 'openlibrary_work_OL468431W',
  status: 'completed',
  addedAt: 2_000,
  updatedAt: 2_000,
  currentRating: 9,
  sanctuaryIntent: 'keep_memory',
  preferredEditionId: 'openlibrary_edition_OL24347578M',
};

const legacyMedia: MediaItem = {
  id: 'tmdb_movie_42',
  canonicalTitle: 'Blade Runner',
  type: 'movie',
  year: 1982,
  genres: ['Sci-Fi'],
  ratings: [],
  providers: [{ provider: 'tmdb', externalId: '78' }],
  posterUrl: 'https://example.com/br.jpg',
};

const legacyLibrary: LibraryItem = {
  mediaId: 'tmdb_movie_42',
  status: 'watched',
  sanctuaryIntent: 'keep_memory',
  addedAt: 3_000,
  updatedAt: 3_000,
};

const bookLegacyMedia: MediaItem = {
  id: 'openlibrary_work_OL468431W',
  canonicalTitle: 'The Great Gatsby',
  type: 'book',
  year: 1925,
  genres: [],
  ratings: [],
  providers: [{ provider: 'openlibrary', externalId: 'OL468431W' }],
  posterUrl: 'https://covers.openlibrary.org/b/id/8432047-L.jpg',
  authors: ['F. Scott Fitzgerald'],
};

const bookLegacyLibrary: LibraryItem = {
  mediaId: 'openlibrary_work_OL468431W',
  status: 'watched',
  sanctuaryIntent: 'keep_memory',
  userRating: 9,
  addedAt: 2_000,
  updatedAt: 2_000,
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

describe('Export / import v2 multi-medium', () => {
  beforeEach(async () => {
    openConnections.length = 0;
    await resetStorageState();
  });

  afterEach(async () => {
    await closeTrackedConnections();
    vi.resetModules();
  });

  it('export has schemaVersion 2 and exportedAt', async () => {
    const storage = await loadStorage();
    await storage.putMediaItem(legacyMedia);
    await storage.putLibraryItem(legacyLibrary);

    const exported = await storage.exportLibraryData();
    expect(exported.schemaVersion).toBe(2);
    expect(typeof exported.exportedAt).toBe('number');
    expect(exported.exportedAt).toBeGreaterThan(0);
    expect(exported.library).toHaveLength(1);
    expect(exported.media).toHaveLength(1);
  });

  it('export never includes API keys or preferences secrets', async () => {
    const storage = await loadStorage();
    await storage.savePreferences({
      ...(await storage.getPreferences()),
      tmdbApiKey: 'secret-tmdb-key',
      omdbApiKey: 'secret-omdb-key',
      llmApiKey: 'sk-secret',
      googleBooksApiKey: 'secret-gb-key',
    });
    await storage.putMediaItem(legacyMedia);
    await storage.putLibraryItem(legacyLibrary);

    const exported = await storage.exportLibraryData();
    const json = JSON.stringify(exported);

    expect(json).not.toContain('secret-tmdb-key');
    expect(json).not.toContain('secret-omdb-key');
    expect(json).not.toContain('sk-secret');
    expect(json).not.toContain('secret-gb-key');
    expect(exported).not.toHaveProperty('preferences');
    expect(exported).not.toHaveProperty('tmdbApiKey');
    expect(exported).not.toHaveProperty('googleBooksApiKey');
  });

  it('export includes works and bookEditions when populated', async () => {
    const storage = await loadStorage();
    await storage.putWork(bookWork);
    await storage.putEdition(bookEdition);
    await storage.putRelationship(bookRelationship);
    await storage.putMediaItem(bookLegacyMedia);
    await storage.putLibraryItem(bookLegacyLibrary);

    const exported = await storage.exportLibraryData();
    expect(exported.schemaVersion).toBe(2);
    expect(exported.works?.some((w) => w.id === bookWork.id)).toBe(true);
    expect(exported.bookEditions?.some((e) => e.id === bookEdition.id)).toBe(true);
    expect(exported.relationships?.some((r) => r.workId === bookWork.id)).toBe(true);
    // Legacy arrays still present
    expect(exported.library?.some((l) => l.mediaId === bookWork.id)).toBe(true);
    expect(exported.media?.some((m) => m.id === bookWork.id)).toBe(true);
  });

  it('reimport preserves book work from v2 export', async () => {
    const storage = await loadStorage();
    await storage.putWork(bookWork);
    await storage.putEdition(bookEdition);
    await storage.putRelationship(bookRelationship);
    await storage.putMediaItem(bookLegacyMedia);
    await storage.putLibraryItem(bookLegacyLibrary);

    const exported = await storage.exportLibraryData();

    // Wipe DB and reimport
    await resetStorageState();
    const storage2 = await loadStorage();
    await storage2.importLibraryData(exported);

    const work = await storage2.getWork(bookWork.id);
    expect(work).toBeDefined();
    expect(work?.canonicalTitle).toBe('The Great Gatsby');
    expect(work?.medium).toBe('book');
    expect(work?.bookDetails?.authors).toContain('F. Scott Fitzgerald');
    expect(work?.sourceProvenance[0]?.provider).toBe('openlibrary');

    const editions = await storage2.getEditionsForWork(bookWork.id);
    expect(editions.some((e) => e.id === bookEdition.id)).toBe(true);

    const rel = await storage2.getRelationship(bookWork.id);
    expect(rel?.status).toBe('completed');
    expect(rel?.currentRating).toBe(9);

    const media = await storage2.getMediaItem(bookWork.id);
    expect(media?.type).toBe('book');
    expect(media?.canonicalTitle).toBe('The Great Gatsby');
  });

  it('import still accepts legacy v1 export (no schemaVersion)', async () => {
    const storage = await loadStorage();
    const v1 = {
      library: [legacyLibrary],
      media: [legacyMedia],
      people: [],
    };
    await storage.importLibraryData(v1);

    const media = await storage.getMediaItem('tmdb_movie_42');
    expect(media?.canonicalTitle).toBe('Blade Runner');
    const lib = await storage.getLibraryItem('tmdb_movie_42');
    expect(lib?.status).toBe('watched');
  });
});
