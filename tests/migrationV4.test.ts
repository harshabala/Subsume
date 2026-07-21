import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MediaItem, LibraryItem, PersonItem } from '@/shared/types';
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

/** Prevent auto-seed from filling the DB during migration tests. */
vi.mock('@/background/seedData', () => ({
  SEED_MEDIA: [],
  SEED_LIBRARY: [],
  SEED_PEOPLE: [],
  SEED_PEOPLE_OBSOLETE_IDS: [],
  SEED_CATALOGUE_VERSION: 1,
  SEED_CATALOGUE_VERSION_KEY: 'subsume_seed_catalogue_version',
}));

const DB_NAME = 'subsume-db';

const sampleMedia: MediaItem = {
  id: 'tmdb_movie_42',
  canonicalTitle: 'Blade Runner',
  type: 'movie',
  year: 1982,
  genres: ['Sci-Fi'],
  ratings: [{ provider: 'tmdb', score: 8.1 }],
  providers: [{ provider: 'tmdb', externalId: '78' }],
  posterUrl: 'https://example.com/br.jpg',
  overview: 'A blade runner must pursue replicants.',
  runtimeMinutes: 117,
};

const sampleTv: MediaItem = {
  id: 'tmdb_tv_1396',
  canonicalTitle: 'Breaking Bad',
  type: 'tv',
  year: 2008,
  genres: ['Drama'],
  ratings: [],
  providers: [{ provider: 'tmdb', externalId: '1396' }],
  posterUrl: 'https://example.com/bb.jpg',
};

const libraryWatched: LibraryItem = {
  mediaId: 'tmdb_movie_42',
  status: 'watched',
  userRating: 9,
  sanctuaryIntent: 'keep_memory',
  emotionalRecall: 'The rain and neon never left me.',
  qualitativeNotes: 'Rewatched for the score.',
  notes: 'Director cut preferred.',
  awe: 80,
  melancholy: 60,
  addedAt: 1_000,
  updatedAt: 2_000,
};

const libraryToWatch: LibraryItem = {
  mediaId: 'tmdb_tv_1396',
  status: 'to-watch',
  sanctuaryIntent: 'wishlist',
  addedAt: 3_000,
  updatedAt: 3_000,
};

const libraryWatching: LibraryItem = {
  mediaId: 'tmdb_tv_1396',
  status: 'watching',
  sanctuaryIntent: 'revisit_this_month',
  addedAt: 3_000,
  updatedAt: 4_000,
};

const samplePerson: PersonItem = {
  id: '12345',
  name: 'Ridley Scott',
  role: 'director',
  knownFor: ['Blade Runner'],
  filmographyIds: ['tmdb_movie_42'],
  followedAt: 5_000,
  lastSyncedAt: 5_000,
};

async function openV3Db(): Promise<IDBPDatabase> {
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
  // Fresh chrome.storage.local mock (no migration flag).
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

describe('IndexedDB v4 multi-medium migration', () => {
  beforeEach(async () => {
    openConnections.length = 0;
    await resetStorageState();
  });

  afterEach(async () => {
    await closeTrackedConnections();
    vi.resetModules();
  });

  it('upgrades empty v3 DB to v4 with new stores and marks migration complete', async () => {
    const v3 = await openV3Db();
    expect(v3.objectStoreNames.contains('works')).toBe(false);
    v3.close();

    const storage = await loadStorage();
    const works = await storage.getAllWorks();
    const relationships = await storage.getAllRelationships();
    const creators = await storage.getAllCreators();

    expect(works).toEqual([]);
    expect(relationships).toEqual([]);
    expect(creators).toEqual([]);

    // New stores are usable.
    await storage.putWork({
      id: 'manual_work',
      medium: 'book',
      canonicalTitle: 'Test Book',
      genres: [],
      images: {},
      externalIds: [],
      creatorCredits: [],
      sourceProvenance: [],
      sourceConfidence: 'low',
      createdAt: 1,
      updatedAt: 1,
    });
    expect((await storage.getWork('manual_work'))?.canonicalTitle).toBe('Test Book');

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ [storage.MIGRATION_V4_COMPLETE_KEY]: true })
    );
  });

  it('migrates populated media + library + people into v4 stores', async () => {
    const v3 = await openV3Db();
    await v3.put('media', sampleMedia);
    await v3.put('media', sampleTv);
    await v3.put('library', libraryWatched);
    await v3.put('library', libraryToWatch);
    await v3.put('people', samplePerson);
    v3.close();

    const storage = await loadStorage();

    const works = await storage.getAllWorks();
    expect(works).toHaveLength(2);
    const blade = await storage.getWork('tmdb_movie_42');
    expect(blade?.medium).toBe('movie');
    expect(blade?.canonicalTitle).toBe('Blade Runner');
    expect(blade?.images.primary).toBe('https://example.com/br.jpg');
    expect(blade?.screenDetails?.runtimeMinutes).toBe(117);

    const rels = await storage.getAllRelationships();
    expect(rels).toHaveLength(2);

    const completed = await storage.getRelationship('tmdb_movie_42');
    expect(completed?.status).toBe('completed');
    expect(completed?.currentRating).toBe(9);
    expect(completed?.legacy?.emotionalRecall).toBe('The rain and neon never left me.');

    const planned = await storage.getRelationship('tmdb_tv_1396');
    expect(planned?.status).toBe('planned');

    const creators = await storage.getAllCreators();
    expect(creators).toHaveLength(1);
    expect(creators[0].id).toBe('tmdb_person_12345');
    expect(creators[0].name).toBe('Ridley Scott');
    expect(creators[0].knownForWorkIds).toEqual(['tmdb_movie_42']);

    // Legacy stores preserved.
    expect(await storage.getMediaItem('tmdb_movie_42')).toBeDefined();
    expect(await storage.getLibraryItem('tmdb_movie_42')).toBeDefined();
    expect(await storage.getPersonById('12345')).toBeDefined();

    const pairs = await storage.getArchivePairs();
    expect(pairs).toHaveLength(2);
    expect(pairs.every((p) => p.work && p.relationship)).toBe(true);
  });

  it('re-running migration is idempotent', async () => {
    const v3 = await openV3Db();
    await v3.put('media', sampleMedia);
    await v3.put('library', libraryWatched);
    await v3.put('people', samplePerson);
    v3.close();

    const storage = await loadStorage();
    const worksBefore = await storage.getAllWorks();
    const relsBefore = await storage.getAllRelationships();
    const creatorsBefore = await storage.getAllCreators();
    const reflectionsBefore = await storage.getReflectionsForWork('tmdb_movie_42');

    // Explicit second pass.
    await storage.migrateV3ToV4IfNeeded();

    expect(await storage.getAllWorks()).toHaveLength(worksBefore.length);
    expect(await storage.getAllRelationships()).toHaveLength(relsBefore.length);
    expect(await storage.getAllCreators()).toHaveLength(creatorsBefore.length);
    expect(await storage.getReflectionsForWork('tmdb_movie_42')).toHaveLength(
      reflectionsBefore.length
    );

    // Clear flag and re-run: still idempotent via puts / full-coverage check.
    await chrome.storage.local.set({ [storage.MIGRATION_V4_COMPLETE_KEY]: false });
    await storage.migrateV3ToV4IfNeeded();
    expect(await storage.getAllWorks()).toHaveLength(worksBefore.length);
    expect(await storage.getAllRelationships()).toHaveLength(relsBefore.length);
    expect(await storage.getAllCreators()).toHaveLength(creatorsBefore.length);
  });

  it('copies library when works are dual-written but relationships empty and flag is false', async () => {
    // Simulate dual-write of media→works without library→relationships.
    const storage = await loadStorage();
    await storage.putMediaItem(sampleMedia);
    expect(await storage.getWork('tmdb_movie_42')).toBeDefined();
    expect(await storage.getAllRelationships()).toHaveLength(0);

    // Write library only into the legacy store (skip dual-write path).
    const db = openConnections[openConnections.length - 1];
    await db.put('library', libraryWatched);
    expect(await storage.getAllRelationships()).toHaveLength(0);

    // Incomplete state must not be treated as done.
    await chrome.storage.local.set({ [storage.MIGRATION_V4_COMPLETE_KEY]: false });
    await storage.migrateV3ToV4IfNeeded();

    const rels = await storage.getAllRelationships();
    expect(rels).toHaveLength(1);
    expect(rels[0].workId).toBe('tmdb_movie_42');
    expect(rels[0].status).toBe('completed');

    // Reflections derived from library notes should also land.
    const reflections = await storage.getReflectionsForWork('tmdb_movie_42');
    expect(reflections.length).toBeGreaterThan(0);

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ [storage.MIGRATION_V4_COMPLETE_KEY]: true })
    );
  });

  it('maps legacy statuses correctly (to-watch→planned, watching→in_progress, watched→completed)', async () => {
    const abandonedLib: LibraryItem = {
      mediaId: 'tmdb_movie_42',
      status: 'abandoned',
      addedAt: 1,
      updatedAt: 2,
    };

    const v3 = await openV3Db();
    await v3.put('media', sampleMedia);
    await v3.put('media', sampleTv);
    await v3.put('library', libraryToWatch);
    v3.close();

    let storage = await loadStorage();
    expect((await storage.getRelationship('tmdb_tv_1396'))?.status).toBe('planned');

    await closeTrackedConnections();
    vi.resetModules();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
    const store: Record<string, unknown> = {};
    vi.mocked(chrome.storage.local.get).mockImplementation(async (keys?: string | string[] | null) => {
      if (typeof keys === 'string') return { [keys]: store[keys] };
      return { ...store };
    });
    vi.mocked(chrome.storage.local.set).mockImplementation(async (items: Record<string, unknown>) => {
      Object.assign(store, items);
    });

    const v3b = await openV3Db();
    await v3b.put('media', sampleTv);
    await v3b.put('library', libraryWatching);
    v3b.close();
    storage = await loadStorage();
    expect((await storage.getRelationship('tmdb_tv_1396'))?.status).toBe('in_progress');
    expect((await storage.getRelationship('tmdb_tv_1396'))?.sanctuaryIntent).toBe('return_soon');

    await closeTrackedConnections();
    vi.resetModules();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
    store[storage.MIGRATION_V4_COMPLETE_KEY] = undefined;

    const v3c = await openV3Db();
    await v3c.put('media', sampleMedia);
    await v3c.put('library', libraryWatched);
    v3c.close();
    storage = await loadStorage();
    expect((await storage.getRelationship('tmdb_movie_42'))?.status).toBe('completed');

    // Dual-write path for abandoned
    await storage.putLibraryItem(abandonedLib);
    expect((await storage.getRelationship('tmdb_movie_42'))?.status).toBe('abandoned');
  });

  it('creates reflections from emotionalRecall (and related note fields)', async () => {
    const v3 = await openV3Db();
    await v3.put('media', sampleMedia);
    await v3.put('library', libraryWatched);
    v3.close();

    const storage = await loadStorage();
    const reflections = await storage.getReflectionsForWork('tmdb_movie_42');

    const firstImpression = reflections.find((r) => r.kind === 'first_impression');
    expect(firstImpression?.body).toBe('The rain and neon never left me.');

    const later = reflections.filter((r) => r.kind === 'later_reflection');
    expect(later.some((r) => r.body.includes('Rewatched for the score'))).toBe(true);
    expect(later.some((r) => r.body.includes('Director cut preferred'))).toBe(true);

    // Experience created for non-to-watch statuses.
    const experiences = await storage.getExperiencesForWork('tmdb_movie_42');
    expect(experiences).toHaveLength(1);
    expect(experiences[0].status).toBe('completed');
    expect(experiences[0].kind).toBe('watch');

    // to-watch does not create an experience
    await storage.putMediaItem(sampleTv);
    await storage.putLibraryItem(libraryToWatch);
    expect(await storage.getExperiencesForWork('tmdb_tv_1396')).toHaveLength(0);
  });

  it('dual-writes media/library/people through existing public APIs', async () => {
    const storage = await loadStorage();

    await storage.putMediaItem(sampleMedia);
    expect((await storage.getWork('tmdb_movie_42'))?.canonicalTitle).toBe('Blade Runner');

    await storage.putLibraryItem(libraryWatched);
    expect((await storage.getRelationship('tmdb_movie_42'))?.status).toBe('completed');

    await storage.savePerson(samplePerson);
    const creators = await storage.getAllCreators();
    expect(creators.some((c) => c.id === 'tmdb_person_12345')).toBe(true);

    await storage.removeLibraryItem('tmdb_movie_42');
    expect(await storage.getRelationship('tmdb_movie_42')).toBeUndefined();

    await storage.deletePerson('12345');
    expect((await storage.getAllCreators()).find((c) => c.id === 'tmdb_person_12345')).toBeUndefined();
  });

  it('resolveCanonicalId follows id_redirects and getArchivePairs joins works', async () => {
    const storage = await loadStorage();
    await storage.putMediaItem(sampleMedia);
    await storage.putLibraryItem(libraryWatched);

    // No redirect → identity
    expect(await storage.resolveCanonicalId('tmdb_movie_42')).toBe('tmdb_movie_42');

    // Put a redirect via raw open after getDb has created stores.
    const db = openConnections[openConnections.length - 1];
    await db.put('id_redirects', {
      oldId: 'legacy_br',
      canonicalId: 'tmdb_movie_42',
      reason: 'migration',
      createdAt: Date.now(),
    });
    expect(await storage.resolveCanonicalId('legacy_br')).toBe('tmdb_movie_42');

    const pairs = await storage.getArchivePairs();
    expect(pairs).toHaveLength(1);
    expect(pairs[0].work.id).toBe('tmdb_movie_42');
    expect(pairs[0].relationship.workId).toBe('tmdb_movie_42');
  });
});
