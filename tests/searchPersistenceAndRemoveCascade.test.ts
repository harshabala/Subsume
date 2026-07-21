/**
 * Task 6: SEARCH_WORKS must not spam putMediaItem; remove cascades reflections;
 * dualWriteLibrary seeds reflections only when none exist.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageType, type MediaItem, type LibraryItem } from '@/shared/types';
import type { CatalogWork } from '@/shared/catalogTypes';
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

const sampleWork: CatalogWork = {
  id: 'openlibrary_work_OL468431W',
  medium: 'book',
  canonicalTitle: 'The Great Gatsby',
  genres: ['Fiction'],
  images: { posterUrl: 'https://covers.openlibrary.org/b/id/1-M.jpg' },
  externalIds: [{ provider: 'openlibrary', externalId: 'OL468431W' }],
  creatorCredits: [],
  bookDetails: { authors: ['F. Scott Fitzgerald'] },
  sourceProvenance: [],
  sourceConfidence: 'high',
  createdAt: 1,
  updatedAt: 1,
};

vi.mock('@/background/openLibrary', () => ({
  searchOpenLibrary: vi.fn(),
  resolveOpenLibraryIsbn: vi.fn(),
  getOpenLibraryWork: vi.fn(),
  getOpenLibraryEditionsForWork: vi.fn(),
}));

vi.mock('@/background/googleBooks', () => ({
  searchGoogleBooks: vi.fn(),
}));

const DB_NAME = 'subsume-db';
const sender = {} as chrome.runtime.MessageSender;

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

async function mediaCount(storage: Awaited<ReturnType<typeof loadStorage>>): Promise<number> {
  // searchMediaByQuery with empty returns []; use openDB via getAllMediaMap-like path
  // by putting a sentinel and counting via raw connection after ensure open.
  const db = openConnections[openConnections.length - 1];
  if (!db) {
    // Force open
    await storage.getMediaItem('__force_open__');
  }
  const conn = openConnections[openConnections.length - 1];
  const all = await conn.getAll('media');
  return all.length;
}

describe('SEARCH_WORKS persistence', () => {
  beforeEach(async () => {
    openConnections.length = 0;
    await resetStorageState();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await closeTrackedConnections();
    vi.resetModules();
  });

  it('returns search hits without growing media store count', async () => {
    const { searchOpenLibrary } = await import('@/background/openLibrary');
    vi.mocked(searchOpenLibrary).mockResolvedValue([
      { matchScore: 0.95, work: sampleWork },
      {
        matchScore: 0.8,
        work: {
          ...sampleWork,
          id: 'openlibrary_work_OL999W',
          canonicalTitle: 'Another Book',
        },
      },
    ]);

    const storage = await loadStorage();
    // Touch DB so connection is tracked
    await storage.getMediaItem('nonexistent');
    const before = await mediaCount(storage);

    const { bookHandlers } = await import('@/background/handlers/books');
    const handler = bookHandlers[MessageType.SEARCH_WORKS]!;
    const result = (await handler(
      { query: 'Gatsby', medium: 'book', limit: 10 },
      sender,
    )) as { works: MediaItem[] };

    expect(result.works).toHaveLength(2);
    expect(result.works[0].id).toBe('openlibrary_work_OL468431W');
    expect(result.works[0].canonicalTitle).toBe('The Great Gatsby');
    expect(result.works[0].type).toBe('book');

    const after = await mediaCount(storage);
    expect(after).toBe(before);

    // Hits must not be written to media store
    expect(await storage.getMediaItem('openlibrary_work_OL468431W')).toBeUndefined();
    expect(await storage.getMediaItem('openlibrary_work_OL999W')).toBeUndefined();
  });
});

describe('removeLibraryItem cascade', () => {
  beforeEach(async () => {
    openConnections.length = 0;
    await resetStorageState();
  });

  afterEach(async () => {
    await closeTrackedConnections();
    vi.resetModules();
  });

  it('deletes relationship, experiences, and reflections for workId', async () => {
    const storage = await loadStorage();
    const mediaId = 'tmdb_movie_cascade_42';

    const media: MediaItem = {
      id: mediaId,
      canonicalTitle: 'Cascade Film',
      type: 'movie',
      year: 1999,
      genres: [],
      ratings: [],
      providers: [{ provider: 'tmdb', externalId: '42' }],
      posterUrl: '',
    };
    await storage.putMediaItem(media);

    const lib: LibraryItem = {
      mediaId,
      status: 'watched',
      sanctuaryIntent: 'keep_memory',
      addedAt: Date.now() - 5000,
      updatedAt: Date.now() - 5000,
      emotionalRecall: 'First impression that should seed a reflection.',
      userRating: 8,
    };
    await storage.putLibraryItem(lib);

    // Ensure dual-write seeded reflections / experiences
    let reflections = await storage.getReflectionsForWork(mediaId);
    expect(reflections.length).toBeGreaterThan(0);
    expect(await storage.getRelationship(mediaId)).toBeDefined();

    // Add an extra user reflection + experience
    await storage.putReflection({
      id: 'user_ref_extra',
      workId: mediaId,
      kind: 'later_reflection',
      body: 'A second sitting.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await storage.putExperience({
      id: 'exp_extra_session',
      workId: mediaId,
      kind: 'watch',
      status: 'completed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    reflections = await storage.getReflectionsForWork(mediaId);
    const experiences = await storage.getExperiencesForWork(mediaId);
    expect(reflections.length).toBeGreaterThanOrEqual(2);
    expect(experiences.length).toBeGreaterThanOrEqual(1);

    await storage.removeLibraryItem(mediaId);

    expect(await storage.getLibraryItem(mediaId)).toBeUndefined();
    expect(await storage.getRelationship(mediaId)).toBeUndefined();
    expect(await storage.getReflectionsForWork(mediaId)).toEqual([]);
    expect(await storage.getExperiencesForWork(mediaId)).toEqual([]);
    // Media catalog row intentionally kept
    expect(await storage.getMediaItem(mediaId)).toBeDefined();
  });
});

describe('dualWriteLibrary reflection seed-if-empty', () => {
  beforeEach(async () => {
    openConnections.length = 0;
    await resetStorageState();
  });

  afterEach(async () => {
    await closeTrackedConnections();
    vi.resetModules();
  });

  it('does not rewrite existing reflections on subsequent putLibraryItem', async () => {
    const storage = await loadStorage();
    const mediaId = 'tmdb_movie_refl_seed';

    await storage.putMediaItem({
      id: mediaId,
      canonicalTitle: 'Seed Film',
      type: 'movie',
      year: 2001,
      genres: [],
      ratings: [],
      providers: [{ provider: 'tmdb', externalId: '1' }],
      posterUrl: '',
    });

    await storage.putLibraryItem({
      mediaId,
      status: 'watched',
      sanctuaryIntent: 'keep_memory',
      addedAt: Date.now() - 10_000,
      updatedAt: Date.now() - 10_000,
      emotionalRecall: 'Original first impression.',
    });

    const firstPass = await storage.getReflectionsForWork(mediaId);
    expect(firstPass.length).toBeGreaterThan(0);
    const originalBody = firstPass.find((r) => r.body.includes('Original'))?.body;
    expect(originalBody).toBe('Original first impression.');

    // User-edited / extra reflection that must survive dual-write
    await storage.putReflection({
      id: firstPass[0].id,
      workId: mediaId,
      kind: 'first_impression',
      body: 'Edited first impression — must not be overwritten.',
      createdAt: firstPass[0].createdAt,
      updatedAt: Date.now(),
    });

    await storage.putLibraryItem({
      mediaId,
      status: 'watched',
      sanctuaryIntent: 'keep_memory',
      addedAt: Date.now() - 10_000,
      updatedAt: Date.now(),
      emotionalRecall: 'Different text that would have overwritten migrated id.',
      qualitativeNotes: 'Would also add a second migrated reflection.',
    });

    const after = await storage.getReflectionsForWork(mediaId);
    const edited = after.find((r) => r.id === firstPass[0].id);
    expect(edited?.body).toBe('Edited first impression — must not be overwritten.');
    // No new migrated later_reflection from qualitativeNotes
    expect(after.every((r) => !r.body.includes('Would also add'))).toBe(true);
  });
});
