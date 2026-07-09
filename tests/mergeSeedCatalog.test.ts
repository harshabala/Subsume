import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MediaItem, LibraryItem } from '@/shared/types';
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

const {
  mediaAlpha,
  mediaBeta,
  mediaDrishyam,
  libraryAlpha,
  libraryBeta,
} = vi.hoisted(() => {
  const mediaAlpha: MediaItem = {
    id: 'seed_alpha',
    canonicalTitle: 'Alpha Film',
    type: 'movie',
    year: 2020,
    genres: ['Drama'],
    ratings: [{ provider: 'tmdb', score: 8 }],
    providers: [],
    posterUrl: 'https://example.com/alpha-seed.jpg',
  };

  const mediaBeta: MediaItem = {
    id: 'seed_beta',
    canonicalTitle: 'Beta Film',
    type: 'movie',
    year: 2021,
    genres: ['Comedy'],
    ratings: [{ provider: 'tmdb', score: 7 }],
    providers: [],
    posterUrl: 'https://example.com/beta-seed.jpg',
  };

  const mediaDrishyam: MediaItem = {
    id: 'seed_drishyam_ml',
    canonicalTitle: 'Drishyam',
    type: 'movie',
    year: 2013,
    genres: ['Drama', 'Thriller'],
    ratings: [{ provider: 'tmdb', score: 8.5 }],
    providers: [],
    posterUrl: 'https://example.com/drishyam-seed.jpg',
  };

  const libraryAlpha: LibraryItem = {
    mediaId: 'seed_alpha',
    status: 'watched',
    notes: 'Seed reflection for alpha',
    userRating: 9,
    sanctuaryIntent: 'keep_memory',
    addedAt: 1_000,
    updatedAt: 1_000,
  };

  const libraryBeta: LibraryItem = {
    mediaId: 'seed_beta',
    status: 'to-watch',
    addedAt: 2_000,
    updatedAt: 2_000,
  };

  return { mediaAlpha, mediaBeta, mediaDrishyam, libraryAlpha, libraryBeta };
});

vi.mock('@/background/seedData', () => ({
  SEED_MEDIA: [mediaAlpha, mediaBeta, mediaDrishyam],
  SEED_LIBRARY: [libraryAlpha, libraryBeta],
  SEED_PEOPLE: [],
  SEED_PEOPLE_OBSOLETE_IDS: ['tmdb_person_56531', 'tmdb_person_147079'],
  SEED_CATALOGUE_VERSION: 99,
  SEED_CATALOGUE_VERSION_KEY: 'subsume_seed_catalogue_version',
}));

const DB_NAME = 'subsume-db';

const SENTINEL_MEDIA: MediaItem = {
  id: 'sentinel_skip_auto_seed',
  canonicalTitle: 'Sentinel',
  type: 'movie',
  year: 2000,
  genres: [],
  ratings: [],
  providers: [],
  posterUrl: '',
};

async function openFreshDbWithSchema(): Promise<IDBPDatabase> {
  const { openDB } = await import('idb');
  return openDB(DB_NAME, 3, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const mediaStore = db.createObjectStore('media', { keyPath: 'id' });
        mediaStore.createIndex('by-canonical', 'canonicalTitle');
        const libraryStore = db.createObjectStore('library', { keyPath: 'mediaId' });
        libraryStore.createIndex('by-status', 'status');
        libraryStore.createIndex('by-added', 'addedAt');
        libraryStore.createIndex('by-updated', 'updatedAt');
        db.createObjectStore('preferences');
      }
      if (oldVersion < 2) {
        const peopleStore = db.createObjectStore('people', { keyPath: 'id' });
        peopleStore.createIndex('by-followed', 'followedAt');
        peopleStore.createIndex('by-name', 'name');
      }
      if (oldVersion < 3) {
        const alertsStore = db.createObjectStore('alerts', { keyPath: 'id' });
        alertsStore.createIndex('by-created', 'createdAt');
      }
    },
  });
}

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
}

async function loadStorage() {
  return import('@/background/storage');
}

/** Opens a catalogue DB without triggering storage auto-seed. */
async function prepareCatalogueDb(options?: {
  media?: MediaItem[];
  library?: LibraryItem[];
}) {
  const db = await openFreshDbWithSchema();

  const media = options?.media ?? [SENTINEL_MEDIA];
  for (const item of media) {
    await db.put('media', item);
  }
  for (const item of options?.library ?? []) {
    await db.put('library', item);
  }

  db.close();
  return loadStorage();
}

describe('mergeSeedCatalog', () => {
  beforeEach(async () => {
    openConnections.length = 0;
    await resetStorageState();
  });

  afterEach(async () => {
    await closeTrackedConnections();
    vi.resetModules();
  });

  it('adds missing SEED_MEDIA to empty DB', async () => {
    const storage = await prepareCatalogueDb();

    const result = await storage.mergeSeedCatalog();

    // 3 new catalogue rows + 3 full metadata refreshes for those same seed ids
    expect(result.mediaAdded).toBe(6);
    expect(result.libraryAdded).toBe(2);

    const alpha = await storage.getMediaItem('seed_alpha');
    const beta = await storage.getMediaItem('seed_beta');
    expect(alpha?.canonicalTitle).toBe('Alpha Film');
    expect(beta?.canonicalTitle).toBe('Beta Film');
  });

  it('refreshes existing seed_* catalogue metadata (posters, titles, overview)', async () => {
    const staleAlpha: MediaItem = {
      ...mediaAlpha,
      canonicalTitle: 'Stale Alpha Title',
      posterUrl: 'https://example.com/user-alpha.jpg',
      overview: 'Stale synopsis should be replaced by catalogue',
    };
    const staleDrishyam: MediaItem = {
      ...mediaDrishyam,
      posterUrl: 'https://example.com/old-drishyam.jpg',
    };

    const storage = await prepareCatalogueDb({
      media: [staleAlpha, staleDrishyam, SENTINEL_MEDIA],
    });

    const result = await storage.mergeSeedCatalog();

    const alpha = await storage.getMediaItem('seed_alpha');
    const drishyam = await storage.getMediaItem('seed_drishyam_ml');
    const sentinel = await storage.getMediaItem('sentinel_skip_auto_seed');

    expect(alpha).toMatchObject({
      canonicalTitle: 'Alpha Film',
      posterUrl: 'https://example.com/alpha-seed.jpg',
    });
    expect(drishyam?.posterUrl).toBe('https://example.com/drishyam-seed.jpg');
    // Non-seed rows are never rewritten by catalogue merge
    expect(sentinel?.canonicalTitle).toBe('Sentinel');
    // beta newly added + alpha/drishyam/beta refreshed (3) = 1 + 3
    expect(result.mediaAdded).toBe(4);
  });

  it('adds library entry with notes when missing', async () => {
    const storage = await prepareCatalogueDb({
      media: [mediaAlpha, mediaBeta, SENTINEL_MEDIA],
    });

    const result = await storage.mergeSeedCatalog();

    const alphaEntry = await storage.getLibraryItem('seed_alpha');
    const betaEntry = await storage.getLibraryItem('seed_beta');

    expect(result.libraryAdded).toBe(2);
    expect(alphaEntry?.notes).toBe('Seed reflection for alpha');
    expect(betaEntry?.notes).toBeUndefined();
  });

  it('does not overwrite existing notes when user already has notes', async () => {
    const storage = await prepareCatalogueDb({
      media: [mediaAlpha, SENTINEL_MEDIA],
      library: [
        {
          mediaId: 'seed_alpha',
          status: 'watched',
          notes: 'My personal thoughts',
          addedAt: 5_000,
          updatedAt: 5_000,
        },
      ],
    });

    const result = await storage.mergeSeedCatalog();

    const entry = await storage.getLibraryItem('seed_alpha');
    expect(entry?.notes).toBe('My personal thoughts');
    expect(result.libraryUpdated).toBe(0);
  });

  it('migrates legacy userNotes field to notes when notes empty', async () => {
    const storage = await prepareCatalogueDb({
      media: [mediaAlpha, SENTINEL_MEDIA],
      library: [
        {
          mediaId: 'seed_alpha',
          status: 'watched',
          userNotes: 'Legacy reflection from older builds',
          addedAt: 5_000,
          updatedAt: 5_000,
        } as LibraryItem & { userNotes: string },
      ],
    });

    const result = await storage.mergeSeedCatalog();

    const entry = await storage.getLibraryItem('seed_alpha');
    expect(entry?.notes).toBe('Legacy reflection from older builds');
    expect(result.libraryUpdated).toBe(1);
  });
});