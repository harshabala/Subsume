import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  MediaItem,
  MediaType,
  LibraryItem,
  UserPreferences,
  PersonItem,
  WeeklyDigest,
  WatchAlert,
  ImportLibraryData,
  SanctuaryIntent,
} from '@/shared/types';
import type {
  CatalogWork,
  BookEdition,
  BookWorkDetails,
  LibraryRelationship,
  Experience,
  Reflection,
  Creator,
  WorkRelation,
  CatalogIdRedirect,
  ArchivePair,
  SourceProvenance,
} from '@/shared/catalogTypes';
import {
  mediaItemToCatalogWork,
  libraryItemToRelationship,
  libraryItemToReflections,
  libraryItemToExperience,
  personItemToCreator,
  mediaTypeToMedium,
} from '@/shared/compatibility';
import { isValidPersonItem } from '@/shared/validation';
import { MEDIA_ID_PATTERN } from '@/shared/mediaIds';
import {
  SEED_MEDIA,
  SEED_LIBRARY,
  SEED_PEOPLE,
  SEED_PEOPLE_OBSOLETE_IDS,
  SEED_CATALOGUE_VERSION,
  SEED_CATALOGUE_VERSION_KEY,
} from './seedData';

/**
 * Full catalogue rows re-applied on version bump for existing `seed_*` media.
 * Adds missing titles and refreshes poster/ratings/overview without touching user library rows.
 * (Previously only SEED_MEDIA_PATCHES touched a single poster; v5 ships full metadata refresh.)
 */
const SEED_MEDIA_PATCHES: (Partial<MediaItem> & { id: string })[] = SEED_MEDIA.map((m) => ({
  id: m.id,
  canonicalTitle: m.canonicalTitle,
  type: m.type,
  year: m.year,
  genres: m.genres,
  ratings: m.ratings,
  providers: m.providers,
  posterUrl: m.posterUrl,
  overview: m.overview,
  wikidataDirectorBio: m.wikidataDirectorBio,
  wikidataSummary: m.wikidataSummary,
}));

interface SubsumeDB extends DBSchema {
  media: {
    key: string;
    value: MediaItem;
    // Index to quickly look up if we already have this title/year
    indexes: { 'by-canonical': string };
  };
  library: {
    key: string;  // uses mediaId as key
    value: LibraryItem;
    indexes: {
      'by-status': string;
      'by-added': number;
      'by-updated': number;
    };
  };
  preferences: {
    key: 'user-prefs' | 'digest';
    value: UserPreferences | WeeklyDigest;
  };
  people: {
    key: string;
    value: PersonItem;
    indexes: {
      'by-followed': number;
      'by-name': string;
    };
  };
  alerts: {
    key: string;
    value: WatchAlert;
    indexes: {
      'by-created': number;
    };
  };
  // Multi-medium catalog stores (v4). Legacy media/library/people retained.
  works: {
    key: string;
    value: CatalogWork;
    indexes: {
      'by-medium': string;
      'by-canonical': string;
      'by-year': number;
    };
  };
  book_editions: {
    key: string;
    value: BookEdition;
    indexes: {
      'by-work': string;
      'by-isbn13': string;
    };
  };
  relationships: {
    key: string;
    value: LibraryRelationship;
    indexes: {
      'by-status': string;
      'by-intent': string;
      'by-added': number;
      'by-updated': number;
    };
  };
  experiences: {
    key: string;
    value: Experience;
    indexes: {
      'by-work': string;
    };
  };
  reflections: {
    key: string;
    value: Reflection;
    indexes: {
      'by-work': string;
      'by-created': number;
      'by-kind': string;
    };
  };
  creators: {
    key: string;
    value: Creator;
    indexes: {
      'by-followed': number;
      'by-name': string;
    };
  };
  work_relations: {
    key: string;
    value: WorkRelation;
    indexes: {
      'by-from': string;
      'by-to': string;
    };
  };
  id_redirects: {
    key: string;
    value: CatalogIdRedirect;
  };
}

const DB_NAME = 'subsume-db';
const DB_VERSION = 4;
/** chrome.storage.local flag set after v3→v4 domain migration completes. */
export const MIGRATION_V4_COMPLETE_KEY = 'subsume_migration_v4_complete';

let dbPromise: Promise<IDBPDatabase<SubsumeDB>> | null = null;

export async function seedDemoLibraryIfEmpty(): Promise<boolean> {
  const db = await getDb();
  const mediaCount = await db.count('media');
  if (mediaCount > 0) return false;
  await seedDatabaseIfEmpty(db);
  return true;
}

/** Add any missing catalogue titles, reflections, and filmmaker rows (safe for existing libraries). */
export async function mergeSeedCatalog(): Promise<{
  mediaAdded: number;
  libraryAdded: number;
  libraryUpdated: number;
  peopleUpserted: number;
}> {
  const db = await getDb();
  let mediaAdded = 0;
  let libraryAdded = 0;
  let libraryUpdated = 0;
  let peopleUpserted = 0;

  for (const m of SEED_MEDIA) {
    const existing = await db.get('media', m.id);
    if (!existing) {
      await db.put('media', m);
      await dualWriteMedia(db, m);
      mediaAdded++;
    }
  }

  for (const patch of SEED_MEDIA_PATCHES) {
    const existing = await db.get('media', patch.id);
    if (existing) {
      const { id: _id, ...fields } = patch;
      const merged = { ...existing, ...fields };
      await db.put('media', merged);
      await dualWriteMedia(db, merged);
      mediaAdded++;
    }
  }

  for (const item of SEED_LIBRARY) {
    const existing = await db.get('library', item.mediaId);
    if (!existing) {
      await db.put('library', item);
      await dualWriteLibrary(db, item);
      libraryAdded++;
    } else {
      const legacyNotes = (existing as unknown as Record<string, unknown>).userNotes;
      if (!existing.notes && typeof legacyNotes === 'string' && legacyNotes.length > 0) {
        const updated = {
          ...existing,
          notes: legacyNotes,
          updatedAt: Date.now(),
        };
        await db.put('library', updated);
        await dualWriteLibrary(db, updated);
        libraryUpdated++;
      } else if (item.notes && !existing.notes) {
        const updated = {
          ...existing,
          status: item.status ?? existing.status,
          userRating: item.userRating ?? existing.userRating,
          notes: item.notes,
          sanctuaryIntent: item.sanctuaryIntent ?? existing.sanctuaryIntent,
          updatedAt: Date.now(),
        };
        await db.put('library', updated);
        await dualWriteLibrary(db, updated);
        libraryUpdated++;
      }
    }
  }

  for (const person of SEED_PEOPLE) {
    const existing = await db.get('people', person.id);
    if (!existing) {
      await db.put('people', person);
      await dualWritePerson(db, person);
      peopleUpserted++;
    } else {
      // Catalogue identity is authoritative (name + face + filmography).
      const merged = {
        ...existing,
        name: person.name,
        role: person.role,
        filmographyIds: person.filmographyIds,
        knownFor: person.knownFor,
        biography: person.biography,
        profileImageUrl: person.profileImageUrl,
      };
      await db.put('people', merged);
      await dualWritePerson(db, merged);
      peopleUpserted++;
    }
  }

  // Drop mis-mapped person rows from older catalogue versions (wrong TMDb ids).
  for (const obsoleteId of SEED_PEOPLE_OBSOLETE_IDS) {
    const existing = await db.get('people', obsoleteId);
    if (existing) {
      await db.delete('people', obsoleteId);
    }
  }

  return { mediaAdded, libraryAdded, libraryUpdated, peopleUpserted };
}

/** Run on extension startup when catalogue version bumps (adds Indian highlights, etc.). */
export async function mergeSeedCatalogIfVersionBehind(): Promise<void> {
  const stored = await chrome.storage.local.get(SEED_CATALOGUE_VERSION_KEY);
  const current = typeof stored[SEED_CATALOGUE_VERSION_KEY] === 'number'
    ? stored[SEED_CATALOGUE_VERSION_KEY]
    : 0;
  if (current >= SEED_CATALOGUE_VERSION) return;
  await mergeSeedCatalog();
  await chrome.storage.local.set({ [SEED_CATALOGUE_VERSION_KEY]: SEED_CATALOGUE_VERSION });
}

async function seedDatabaseIfEmpty(db: IDBPDatabase<SubsumeDB>) {
  // Populate a starter sanctuary library on first install so new users see the archive vision.
  try {
    const mediaCount = await db.count('media');
    if (mediaCount === 0) {
      const tx = db.transaction(['media', 'library'], 'readwrite');
      const mediaStore = tx.objectStore('media');
      const libraryStore = tx.objectStore('library');
      
      for (const item of SEED_MEDIA) {
        await mediaStore.put(item);
      }
      for (const item of SEED_LIBRARY) {
        await libraryStore.put(item);
      }
      await tx.done;
    }

    const peopleCount = await db.count('people');
    if (peopleCount === 0) {
      const tx = db.transaction('people', 'readwrite');
      const peopleStore = tx.objectStore('people');
      for (const person of SEED_PEOPLE) {
        await peopleStore.put(person);
      }
      await tx.done;
    }
  } catch (err) {
    console.error('Failed to seed database:', err);
  }
}

function createV4Stores(db: IDBPDatabase<SubsumeDB>): void {
  if (!db.objectStoreNames.contains('works')) {
    const worksStore = db.createObjectStore('works', { keyPath: 'id' });
    worksStore.createIndex('by-medium', 'medium');
    worksStore.createIndex('by-canonical', 'canonicalTitle');
    worksStore.createIndex('by-year', 'firstReleaseYear');
  }

  if (!db.objectStoreNames.contains('book_editions')) {
    const editionsStore = db.createObjectStore('book_editions', { keyPath: 'id' });
    editionsStore.createIndex('by-work', 'workId');
    editionsStore.createIndex('by-isbn13', 'isbn13', { multiEntry: true });
  }

  if (!db.objectStoreNames.contains('relationships')) {
    const relStore = db.createObjectStore('relationships', { keyPath: 'workId' });
    relStore.createIndex('by-status', 'status');
    relStore.createIndex('by-intent', 'sanctuaryIntent');
    relStore.createIndex('by-added', 'addedAt');
    relStore.createIndex('by-updated', 'updatedAt');
  }

  if (!db.objectStoreNames.contains('experiences')) {
    const expStore = db.createObjectStore('experiences', { keyPath: 'id' });
    expStore.createIndex('by-work', 'workId');
  }

  if (!db.objectStoreNames.contains('reflections')) {
    const refStore = db.createObjectStore('reflections', { keyPath: 'id' });
    refStore.createIndex('by-work', 'workId');
    refStore.createIndex('by-created', 'createdAt');
    refStore.createIndex('by-kind', 'kind');
  }

  if (!db.objectStoreNames.contains('creators')) {
    const creatorsStore = db.createObjectStore('creators', { keyPath: 'id' });
    creatorsStore.createIndex('by-followed', 'followedAt');
    creatorsStore.createIndex('by-name', 'name');
  }

  if (!db.objectStoreNames.contains('work_relations')) {
    const wrStore = db.createObjectStore('work_relations', { keyPath: 'id' });
    wrStore.createIndex('by-from', 'fromWorkId');
    wrStore.createIndex('by-to', 'toWorkId');
  }

  if (!db.objectStoreNames.contains('id_redirects')) {
    db.createObjectStore('id_redirects', { keyPath: 'oldId' });
  }
}

/** Copy legacy media/library/people into v4 multi-medium stores. Idempotent puts. */
async function copyLegacyStoresToV4(db: IDBPDatabase<SubsumeDB>): Promise<void> {
  const allMedia = await db.getAll('media');
  for (const item of allMedia) {
    await db.put('works', mediaItemToCatalogWork(item));
  }

  const allLibrary = await db.getAll('library');
  for (const item of allLibrary) {
    await db.put('relationships', libraryItemToRelationship(item));

    const media = await db.get('media', item.mediaId);
    const medium = media ? mediaTypeToMedium(media.type) : 'movie';

    for (const reflection of libraryItemToReflections(item)) {
      await db.put('reflections', reflection);
    }

    const experience = libraryItemToExperience(item, medium);
    if (experience) {
      await db.put('experiences', experience);
    }
  }

  const allPeople = await db.getAll('people');
  for (const person of allPeople) {
    await db.put('creators', personItemToCreator(person));
  }
}

/**
 * Migrate v3 legacy stores into multi-medium v4 stores when needed.
 * Safe to call repeatedly: skips when the completion flag is set, or when
 * media→works, library→relationships, and people→creators are all covered.
 * Only sets `subsume_migration_v4_complete` after a full copy (or when nothing
 * remains to copy) — never after works-only dual-write coverage.
 */
export async function migrateV3ToV4IfNeeded(
  db?: IDBPDatabase<SubsumeDB>
): Promise<void> {
  const database = db ?? (await getDb());

  try {
    const flagBag = await chrome.storage.local.get(MIGRATION_V4_COMPLETE_KEY);
    if (flagBag[MIGRATION_V4_COMPLETE_KEY]) {
      return;
    }
  } catch {
    // chrome.storage may be unavailable in some test contexts; continue with count check.
  }

  if (!database.objectStoreNames.contains('works')) {
    return;
  }

  const mediaCount = await database.count('media');
  const worksCount = await database.count('works');
  const libraryCount = await database.count('library');
  const relationshipsCount = database.objectStoreNames.contains('relationships')
    ? await database.count('relationships')
    : 0;
  const peopleCount = await database.count('people');
  const creatorsCount = database.objectStoreNames.contains('creators')
    ? await database.count('creators')
    : 0;

  // All legacy domains already represented in v4 (including empty DB).
  // Do not treat worksCount >= mediaCount alone as complete — dual-write may
  // have filled works while library/people still need copying.
  const worksCovered = mediaCount === 0 || worksCount >= mediaCount;
  const relationshipsCovered =
    libraryCount === 0 || relationshipsCount >= libraryCount;
  const creatorsCovered = peopleCount === 0 || creatorsCount >= peopleCount;

  if (worksCovered && relationshipsCovered && creatorsCovered) {
    try {
      await chrome.storage.local.set({ [MIGRATION_V4_COMPLETE_KEY]: true });
    } catch {
      /* ignore */
    }
    return;
  }

  await copyLegacyStoresToV4(database);

  try {
    await chrome.storage.local.set({ [MIGRATION_V4_COMPLETE_KEY]: true });
  } catch {
    /* ignore */
  }
}

/**
 * Whether dual-write conversion produced an empty/shallow bookDetails payload.
 * Sparse MediaItem puts often omit authors and never carry series/subjects.
 */
function isShallowBookDetails(bd?: BookWorkDetails): boolean {
  if (!bd) return true;
  const noAuthors = !bd.authors || bd.authors.length === 0;
  const noExtra =
    !bd.series &&
    !(bd.primarySubjects && bd.primarySubjects.length > 0) &&
    !(bd.adaptationWorkIds && bd.adaptationWorkIds.length > 0) &&
    !bd.defaultEditionId;
  return noAuthors && noExtra;
}

/**
 * mediaItemToCatalogWork stamps a single generic provenance row; treat that as shallow
 * so enrichment from Open Library / Google Books is not wiped on every putMediaItem.
 */
function isShallowSourceProvenance(p: SourceProvenance[]): boolean {
  if (p.length === 0) return true;
  if (p.length === 1) {
    const fields = p[0]?.fields ?? [];
    return fields.length <= 3;
  }
  return false;
}

function mergeBookDetailsForDualWrite(
  incoming?: BookWorkDetails,
  existing?: BookWorkDetails,
): BookWorkDetails | undefined {
  if (isShallowBookDetails(incoming)) return existing ?? incoming;
  if (isShallowBookDetails(existing)) return incoming;
  return {
    authors: incoming!.authors.length > 0 ? incoming!.authors : existing!.authors,
    firstPublishedYear: incoming!.firstPublishedYear ?? existing!.firstPublishedYear,
    series: incoming!.series ?? existing!.series,
    primarySubjects:
      (incoming!.primarySubjects?.length ?? 0) > 0
        ? incoming!.primarySubjects
        : existing!.primarySubjects,
    adaptationWorkIds:
      (incoming!.adaptationWorkIds?.length ?? 0) > 0
        ? incoming!.adaptationWorkIds
        : existing!.adaptationWorkIds,
    defaultEditionId: incoming!.defaultEditionId ?? existing!.defaultEditionId,
  };
}

/**
 * Merge a MediaItem→CatalogWork conversion into an existing work so dual-write
 * does not wipe createdAt, creatorCredits, bookDetails, or sourceProvenance.
 */
function mergeDualWriteCatalogWork(incoming: CatalogWork, existing: CatalogWork): CatalogWork {
  const provenance =
    existing.sourceProvenance.length > 0 && isShallowSourceProvenance(incoming.sourceProvenance)
      ? existing.sourceProvenance
      : incoming.sourceProvenance.length > 0
        ? incoming.sourceProvenance
        : existing.sourceProvenance;

  return {
    ...incoming,
    createdAt: existing.createdAt,
    creatorCredits:
      incoming.creatorCredits.length > 0 ? incoming.creatorCredits : existing.creatorCredits,
    bookDetails: mergeBookDetailsForDualWrite(incoming.bookDetails, existing.bookDetails),
    sourceProvenance: provenance,
    lastEnrichedAt: existing.lastEnrichedAt ?? incoming.lastEnrichedAt,
  };
}

async function dualWriteMedia(db: IDBPDatabase<SubsumeDB>, item: MediaItem): Promise<void> {
  if (!db.objectStoreNames.contains('works')) return;
  const mapped = mediaItemToCatalogWork(item);
  const existing = await db.get('works', item.id);
  await db.put('works', existing ? mergeDualWriteCatalogWork(mapped, existing) : mapped);
}

async function dualWriteLibrary(db: IDBPDatabase<SubsumeDB>, item: LibraryItem): Promise<void> {
  if (!db.objectStoreNames.contains('relationships')) return;
  const mapped = libraryItemToRelationship(item);
  const existingRel = await db.get('relationships', item.mediaId);
  // Preserve multi-session / edition fields that live only on the relationship.
  await db.put('relationships', {
    ...mapped,
    preferredEditionId: item.preferredEditionId ?? existingRel?.preferredEditionId,
    currentExperienceId: existingRel?.currentExperienceId,
    latestReflectionExcerpt:
      existingRel?.latestReflectionExcerpt ?? mapped.latestReflectionExcerpt,
  });

  const media = await db.get('media', item.mediaId);
  const medium = media ? mediaTypeToMedium(media.type) : 'movie';

  if (db.objectStoreNames.contains('reflections')) {
    for (const reflection of libraryItemToReflections(item)) {
      await db.put('reflections', reflection);
    }
  }

  if (db.objectStoreNames.contains('experiences')) {
    const experience = libraryItemToExperience(item, medium);
    if (experience) {
      // Only seed a migrated experience if none exist yet (don't clobber multi-session).
      const existing = await db.getAllFromIndex('experiences', 'by-work', item.mediaId);
      if (existing.length === 0) {
        await db.put('experiences', experience);
      }
    }
  }
}

async function dualWritePerson(db: IDBPDatabase<SubsumeDB>, person: PersonItem): Promise<void> {
  if (!db.objectStoreNames.contains('creators')) return;
  await db.put('creators', personItemToCreator(person));
}

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<SubsumeDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          // Media Store
          const mediaStore = db.createObjectStore('media', { keyPath: 'id' });
          mediaStore.createIndex('by-canonical', 'canonicalTitle');

          // Library Store
          const libraryStore = db.createObjectStore('library', { keyPath: 'mediaId' });
          libraryStore.createIndex('by-status', 'status');
          libraryStore.createIndex('by-added', 'addedAt');
          libraryStore.createIndex('by-updated', 'updatedAt');

          // Preferences Store
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

        if (oldVersion < 4) {
          createV4Stores(db);
        }
      },
    }).then(async (db) => {
      // Seed legacy stores first so migration can copy them into v4 stores.
      await seedDatabaseIfEmpty(db);
      await migrateV3ToV4IfNeeded(db);
      return db;
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

// ─── Media Interface ─────────────────────────────────────────────────

export async function putMediaItem(item: MediaItem): Promise<void> {
  const db = await getDb();
  await db.put('media', item);
  await dualWriteMedia(db, item);
}

export async function putMediaItems(items: MediaItem[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['media', 'works'], 'readwrite');
  for (const item of items) {
    await tx.objectStore('media').put(item);
    const mapped = mediaItemToCatalogWork(item);
    const existing = await tx.objectStore('works').get(item.id);
    await tx.objectStore('works').put(
      existing ? mergeDualWriteCatalogWork(mapped, existing) : mapped,
    );
  }
  await tx.done;
}

export async function getMediaItem(id: string): Promise<MediaItem | undefined> {
  const db = await getDb();
  return db.get('media', id);
}

export async function findMediaByTitle(title: string, year?: number): Promise<MediaItem | undefined> {
  const db = await getDb();
  const tx = db.transaction('media', 'readonly');
  const index = tx.store.index('by-canonical');
  
  // A simple linear scan for now, since IndexedDB doesn't do multiple complex filters well.
  // We can optimize if the library gets massive.
  let cursor = await index.openCursor(IDBKeyRange.only(title));
  
  while (cursor) {
    if (!year || cursor.value.year === year) {
      return cursor.value;
    }
    cursor = await cursor.continue();
  }
  return undefined;
}

/** Fuzzy title search across IndexedDB media and seed catalogue data. */
export async function searchMediaByQuery(
  query: string,
  type?: MediaType,
  limit = 10
): Promise<MediaItem[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const db = await getDb();
  const allMedia = await db.getAll('media');
  const seenIds = new Set(allMedia.map((item) => item.id));
  const combined = [...allMedia, ...SEED_MEDIA.filter((item) => !seenIds.has(item.id))];

  return combined
    .filter((item) => {
      if (type && item.type !== type) return false;
      return item.canonicalTitle.toLowerCase().includes(normalized);
    })
    .slice(0, limit);
}

export async function getAllMediaMap(ids: string[]): Promise<Record<string, MediaItem>> {
  const db = await getDb();
  const tx = db.transaction('media', 'readonly');
  const map: Record<string, MediaItem> = {};
  
  await Promise.all(
    ids.map(async (id) => {
      const item = await tx.store.get(id);
      if (item) map[id] = item;
    })
  );
  
  return map;
}

// ─── Library Interface ───────────────────────────────────────────────

export async function putLibraryItem(item: LibraryItem): Promise<void> {
  const db = await getDb();
  normalizeLibraryItem(item);
  item.updatedAt = Date.now();
  await db.put('library', item);
  await dualWriteLibrary(db, item);
}

export async function getLibraryItem(mediaId: string): Promise<LibraryItem | undefined> {
  const db = await getDb();
  const item = await db.get('library', mediaId);
  return item ? normalizeLibraryItem(item) : undefined;
}

export async function removeLibraryItem(mediaId: string): Promise<void> {
  const db = await getDb();
  await db.delete('library', mediaId);
  if (db.objectStoreNames.contains('relationships')) {
    await db.delete('relationships', mediaId);
  }
}

export async function getAllLibraryItems(): Promise<LibraryItem[]> {
  const db = await getDb();
  const items = await db.getAll('library');
  return items.map(normalizeLibraryItem);
}

// ─── Preferences Interface ───────────────────────────────────────────

const DEFAULT_PREFS: UserPreferences = {
  favoriteGenres: [],
  platforms: ['8', '9'], // Netflix, Prime Video
  region: 'US',
  llmEnabled: false,
  hoverCardsEnabled: true,
  posterOverlaysEnabled: true,
  disabledDomains: [],
  detectionSensitivity: 'medium',
  theme: 'dark',
  screenplayDockEnabled: false,
  onboardingComplete: false,
  omdbApiKey: undefined,
  // Books expansion defaults (all media on)
  enabledMedia: { movie: true, tv: true, book: true },
  openLibraryEnabled: true,
  detectScreenWorks: true,
  detectBooks: true,
  coverOverlaysEnabled: true,
  crossMediumRecommendationsEnabled: false,
  recommendationPrivacyMode: 'summarized_reflections',
  dispatchEnabled: false,
  dispatchWeekday: 4, // Thursday (0 = Sunday)
  dispatchLocalTime: '19:00',
  dispatchMaxSearches: 5,
  dispatchWebSearchEnabled: false,
};

export async function getPreferences(): Promise<UserPreferences> {
  const db = await getDb();
  const prefs = await db.get('preferences', 'user-prefs');
  return { ...DEFAULT_PREFS, ...prefs };
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  const db = await getDb();
  await db.put('preferences', prefs, 'user-prefs');
}

export async function getWeeklyDigest(): Promise<WeeklyDigest | undefined> {
  const db = await getDb();
  const digest = await db.get('preferences', 'digest');
  return digest as WeeklyDigest | undefined;
}

export async function saveWeeklyDigest(digest: WeeklyDigest): Promise<void> {
  const db = await getDb();
  await db.put('preferences', digest, 'digest');
}

/**
 * Export library backup as SubsumeExportV2.
 * Includes legacy arrays AND multi-medium stores when populated.
 * NEVER includes preferences/API keys.
 */
export async function exportLibraryData(): Promise<ImportLibraryData> {
  const db = await getDb();
  const tx = db.transaction(
    [
      'library',
      'media',
      'people',
      'alerts',
      'preferences',
      'works',
      'book_editions',
      'relationships',
      'experiences',
      'reflections',
      'creators',
    ],
    'readonly'
  );

  const library = await tx.objectStore('library').getAll();
  const people = await tx.objectStore('people').getAll();
  const alerts = await tx.objectStore('alerts').getAll();
  const weeklyDigest = (await tx.objectStore('preferences').get('digest')) as
    | WeeklyDigest
    | undefined;

  const mediaStore = tx.objectStore('media');
  const mediaIds = library.map((l) => l.mediaId);
  const mediaMap: Record<string, MediaItem> = {};

  await Promise.all(
    mediaIds.map(async (id) => {
      const item = await mediaStore.get(id);
      if (item) mediaMap[id] = item;
    })
  );

  const media = Object.values(mediaMap);

  // Multi-medium stores (only include when non-empty to keep backups lean)
  const works = await tx.objectStore('works').getAll();
  const bookEditions = await tx.objectStore('book_editions').getAll();
  const relationships = await tx.objectStore('relationships').getAll();
  const experiences = await tx.objectStore('experiences').getAll();
  const reflections = await tx.objectStore('reflections').getAll();
  const creators = await tx.objectStore('creators').getAll();

  const result: ImportLibraryData = {
    schemaVersion: 2,
    exportedAt: Date.now(),
    library,
    media,
    people,
  };
  if (alerts.length > 0) {
    result.alerts = alerts;
  }
  if (weeklyDigest) {
    result.weeklyDigest = weeklyDigest;
  }
  if (works.length > 0) result.works = works;
  if (bookEditions.length > 0) result.bookEditions = bookEditions;
  if (relationships.length > 0) result.relationships = relationships;
  if (experiences.length > 0) result.experiences = experiences;
  if (reflections.length > 0) result.reflections = reflections;
  if (creators.length > 0) result.creators = creators;

  return result;
}

const VALID_LIBRARY_STATUSES = new Set(['to-watch', 'watching', 'watched', 'abandoned']);
const VALID_MEDIA_TYPES = new Set(['movie', 'tv', 'book']);
const VALID_SANCTUARY_INTENTS = new Set(['keep_memory', 'revisit_this_month', 'wishlist']);

export function intentForStatus(status: LibraryItem['status']): SanctuaryIntent {
  if (status === 'watched') return 'keep_memory';
  if (status === 'watching') return 'revisit_this_month';
  return 'wishlist';
}

export function normalizeLibraryItem(item: LibraryItem): LibraryItem {
  if (!item.sanctuaryIntent) {
    item.sanctuaryIntent = intentForStatus(item.status);
  }
  return item;
}

export function isValidLibraryItem(l: unknown): l is LibraryItem {
  if (!l || typeof l !== 'object') return false;
  const item = l as Record<string, unknown>;
  // Required string fields
  if (typeof item.mediaId !== 'string' || !item.mediaId) return false;
  // Status must be a known enum value
  if (!VALID_LIBRARY_STATUSES.has(item.status as string)) return false;
  // Timestamps must be finite numbers (guards against Infinity, NaN, strings)
  if (!Number.isFinite(item.addedAt) || !Number.isFinite(item.updatedAt)) return false;
  // Optional userRating must be a number in range 1–10
  if (item.userRating !== undefined) {
    if (typeof item.userRating !== 'number' || item.userRating < 1 || item.userRating > 10) return false;
  }
  if (item.sanctuaryIntent !== undefined) {
    if (!VALID_SANCTUARY_INTENTS.has(item.sanctuaryIntent as string)) return false;
  }
  return true;
}

export function isValidMediaItem(m: unknown): m is MediaItem {
  if (!m || typeof m !== 'object') return false;
  const item = m as Record<string, unknown>;
  if (typeof item.id !== 'string' || !MEDIA_ID_PATTERN.test(item.id)) return false;
  // type must be a valid MediaType
  if (!VALID_MEDIA_TYPES.has(item.type as string)) return false;
  // year must be a finite number
  if (typeof item.year !== 'number' || !Number.isFinite(item.year)) return false;
  return true;
}

const VALID_ALERT_TYPES = new Set(['movie', 'tv', 'both', 'book']);

export function isValidWatchAlert(a: unknown): a is WatchAlert {
  if (!a || typeof a !== 'object') return false;
  const item = a as Record<string, unknown>;
  if (typeof item.id !== 'string' || !item.id) return false;
  if (typeof item.name !== 'string' || !item.name) return false;
  if (typeof item.enabled !== 'boolean') return false;
  if (!Number.isFinite(item.createdAt)) return false;
  if (item.type !== undefined && !VALID_ALERT_TYPES.has(item.type as string)) return false;
  if (item.genres !== undefined && !Array.isArray(item.genres)) return false;
  if (item.platforms !== undefined && !Array.isArray(item.platforms)) return false;
  if (item.keyword !== undefined && typeof item.keyword !== 'string') return false;
  if (item.authorKeyword !== undefined && typeof item.authorKeyword !== 'string') return false;
  if (item.lastCheckedAt !== undefined && !Number.isFinite(item.lastCheckedAt)) return false;
  if (item.lastMatchAt !== undefined && !Number.isFinite(item.lastMatchAt)) return false;
  if (item.lastNotifiedMediaIds !== undefined && !Array.isArray(item.lastNotifiedMediaIds)) {
    return false;
  }
  return true;
}

function isValidWeeklyDigest(d: unknown): d is WeeklyDigest {
  if (!d || typeof d !== 'object') return false;
  const digest = d as Record<string, unknown>;
  if (!Number.isFinite(digest.generatedAt)) return false;
  if (typeof digest.llmGenerated !== 'boolean') return false;
  if (!Array.isArray(digest.items)) return false;
  return digest.items.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const entry = item as Record<string, unknown>;
    return (
      typeof entry.mediaId === 'string' &&
      typeof entry.title === 'string' &&
      typeof entry.year === 'number' &&
      VALID_MEDIA_TYPES.has(entry.type as string) &&
      typeof entry.reason === 'string' &&
      Array.isArray(entry.platforms)
    );
  });
}

function isValidCatalogWork(w: unknown): w is CatalogWork {
  if (!w || typeof w !== 'object') return false;
  const item = w as Record<string, unknown>;
  if (typeof item.id !== 'string' || !item.id) return false;
  if (typeof item.canonicalTitle !== 'string' || !item.canonicalTitle) return false;
  if (!['movie', 'tv', 'book'].includes(item.medium as string)) return false;
  return true;
}

function isValidBookEdition(e: unknown): e is BookEdition {
  if (!e || typeof e !== 'object') return false;
  const item = e as Record<string, unknown>;
  if (typeof item.id !== 'string' || !item.id) return false;
  if (typeof item.workId !== 'string' || !item.workId) return false;
  if (typeof item.title !== 'string' || !item.title) return false;
  return true;
}

function isValidRelationship(r: unknown): r is LibraryRelationship {
  if (!r || typeof r !== 'object') return false;
  const item = r as Record<string, unknown>;
  if (typeof item.workId !== 'string' || !item.workId) return false;
  if (typeof item.status !== 'string') return false;
  return true;
}

function isValidReflection(r: unknown): r is Reflection {
  if (!r || typeof r !== 'object') return false;
  const item = r as Record<string, unknown>;
  if (typeof item.id !== 'string' || !item.id) return false;
  if (typeof item.workId !== 'string' || !item.workId) return false;
  return true;
}

function isValidExperience(e: unknown): e is Experience {
  if (!e || typeof e !== 'object') return false;
  const item = e as Record<string, unknown>;
  if (typeof item.id !== 'string' || !item.id) return false;
  if (typeof item.workId !== 'string' || !item.workId) return false;
  return true;
}

function isValidCreator(c: unknown): c is Creator {
  if (!c || typeof c !== 'object') return false;
  const item = c as Record<string, unknown>;
  if (typeof item.id !== 'string' || !item.id) return false;
  if (typeof item.name !== 'string' || !item.name) return false;
  return true;
}

/**
 * Import library backup.
 * Accepts legacy v1 (no schemaVersion) and v2 multi-medium exports.
 * Imports works/relationships/reflections/editions/creators when present;
 * still imports legacy media/library/people.
 * Ignores any preferences or API key fields if present.
 */
export async function importLibraryData(data: ImportLibraryData) {
  const db = await getDb();
  const tx = db.transaction(
    [
      'library',
      'media',
      'people',
      'alerts',
      'preferences',
      'works',
      'book_editions',
      'relationships',
      'experiences',
      'reflections',
      'creators',
    ],
    'readwrite'
  );
  try {
    if (Array.isArray(data.media)) {
      for (const m of data.media) {
        if (isValidMediaItem(m)) {
          await tx.objectStore('media').put(m);
        } else {
          console.warn('[Subsume] Import skipped invalid media item:', m);
        }
      }
    }
    if (Array.isArray(data.library)) {
      for (const l of data.library) {
        if (isValidLibraryItem(l)) {
          await tx.objectStore('library').put(normalizeLibraryItem(l));
        } else {
          console.warn('[Subsume] Import skipped invalid library item:', l);
        }
      }
    }
    if (Array.isArray(data.people)) {
      for (const p of data.people) {
        if (isValidPersonItem(p)) {
          await tx.objectStore('people').put(p);
        } else {
          console.warn('[Subsume] Import skipped invalid person item:', p);
        }
      }
    }
    if (Array.isArray(data.alerts)) {
      for (const alert of data.alerts) {
        if (isValidWatchAlert(alert)) {
          await tx.objectStore('alerts').put(alert);
        } else {
          console.warn('[Subsume] Import skipped invalid watch alert:', alert);
        }
      }
    }
    if (data.weeklyDigest) {
      if (isValidWeeklyDigest(data.weeklyDigest)) {
        await tx.objectStore('preferences').put(data.weeklyDigest, 'digest');
      } else {
        console.warn('[Subsume] Import skipped invalid weekly digest:', data.weeklyDigest);
      }
    }

    // v2 multi-medium stores
    if (Array.isArray(data.works)) {
      for (const w of data.works) {
        if (isValidCatalogWork(w)) {
          await tx.objectStore('works').put(w);
        } else {
          console.warn('[Subsume] Import skipped invalid work:', w);
        }
      }
    }
    if (Array.isArray(data.bookEditions)) {
      for (const e of data.bookEditions) {
        if (isValidBookEdition(e)) {
          await tx.objectStore('book_editions').put(e);
        } else {
          console.warn('[Subsume] Import skipped invalid book edition:', e);
        }
      }
    }
    if (Array.isArray(data.relationships)) {
      for (const r of data.relationships) {
        if (isValidRelationship(r)) {
          await tx.objectStore('relationships').put(r);
        } else {
          console.warn('[Subsume] Import skipped invalid relationship:', r);
        }
      }
    }
    if (Array.isArray(data.experiences)) {
      for (const e of data.experiences) {
        if (isValidExperience(e)) {
          await tx.objectStore('experiences').put(e);
        } else {
          console.warn('[Subsume] Import skipped invalid experience:', e);
        }
      }
    }
    if (Array.isArray(data.reflections)) {
      for (const r of data.reflections) {
        if (isValidReflection(r)) {
          await tx.objectStore('reflections').put(r);
        } else {
          console.warn('[Subsume] Import skipped invalid reflection:', r);
        }
      }
    }
    if (Array.isArray(data.creators)) {
      for (const c of data.creators) {
        if (isValidCreator(c)) {
          await tx.objectStore('creators').put(c);
        } else {
          console.warn('[Subsume] Import skipped invalid creator:', c);
        }
      }
    }

    await tx.done;
    // Keep multi-medium stores in sync with imported legacy rows.
    await copyLegacyStoresToV4(db);
  } catch (err) {
    console.error('[Subsume] Import failed:', err);
    throw err;
  }
}


export async function getLibraryPage(
  limit: number,
  offset: number,
  type?: 'movie' | 'tv' | 'book'
): Promise<LibraryItem[]> {
  const db = await getDb();
  const tx = db.transaction(['library', 'media'], 'readonly');
  const libraryStore = tx.objectStore('library');
  const mediaStore = tx.objectStore('media');
  const index = libraryStore.index('by-added');
  
  const results: LibraryItem[] = [];
  let cursor = await index.openCursor(null, 'prev'); // Newest first
  
  let skipped = 0;
  while (cursor) {
    const libItem = cursor.value;
    
    // Check type if filtered
    let matchesType = true;
    if (type) {
      const mediaItem = await mediaStore.get(libItem.mediaId);
      matchesType = mediaItem?.type === type;
    }
    
    if (matchesType) {
      if (skipped < offset) {
        skipped++;
      } else {
        results.push(normalizeLibraryItem(libItem));
        if (results.length >= limit) {
          break;
        }
      }
    }
    
    cursor = await cursor.continue();
  }
  
  return results;
}

// ─── Filmmakers & Crew Interface ──────────────────────────────────────

export async function getAllPeople(): Promise<PersonItem[]> {
  const db = await getDb();
  const items = await db.getAllFromIndex('people', 'by-followed');
  return items.reverse(); // Newest followed first
}

export async function getPersonById(id: string): Promise<PersonItem | undefined> {
  const db = await getDb();
  return db.get('people', id);
}

export async function savePerson(person: PersonItem): Promise<void> {
  const db = await getDb();
  await db.put('people', person);
  await dualWritePerson(db, person);
}

export async function deletePerson(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('people', id);
  if (db.objectStoreNames.contains('creators')) {
    const creatorId = id.startsWith('tmdb_person_') ? id : `tmdb_person_${id}`;
    await db.delete('creators', creatorId);
    // Also try raw id in case it was stored without prefix in creators.
    if (creatorId !== id) {
      await db.delete('creators', id);
    }
  }
}

export async function updatePersonSync(id: string, filmographyIds: string[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('people', 'readwrite');
  const person = await tx.store.get(id);
  if (person) {
    person.filmographyIds = filmographyIds;
    person.lastSyncedAt = Date.now();
    await tx.store.put(person);
  }
  await tx.done;
  const updated = await getPersonById(id);
  if (updated) {
    await dualWritePerson(db, updated);
  }
}

// ─── Watch Alerts Interface ───────────────────────────────────────────

export async function getAllWatchAlerts(): Promise<WatchAlert[]> {
  const db = await getDb();
  const items = await db.getAllFromIndex('alerts', 'by-created');
  return items.reverse();
}

export async function getWatchAlert(id: string): Promise<WatchAlert | undefined> {
  const db = await getDb();
  return db.get('alerts', id);
}

export async function putWatchAlert(alert: WatchAlert): Promise<void> {
  const db = await getDb();
  await db.put('alerts', alert);
}

export async function deleteWatchAlert(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('alerts', id);
}

// ─── Multi-medium catalog Interface (v4) ──────────────────────────────

export async function putWork(work: CatalogWork): Promise<void> {
  const db = await getDb();
  await db.put('works', work);
}

export async function getWork(id: string): Promise<CatalogWork | undefined> {
  const db = await getDb();
  return db.get('works', id);
}

export async function getAllWorks(): Promise<CatalogWork[]> {
  const db = await getDb();
  return db.getAll('works');
}

export async function putRelationship(rel: LibraryRelationship): Promise<void> {
  const db = await getDb();
  await db.put('relationships', rel);
}

export async function getRelationship(workId: string): Promise<LibraryRelationship | undefined> {
  const db = await getDb();
  return db.get('relationships', workId);
}

export async function getAllRelationships(): Promise<LibraryRelationship[]> {
  const db = await getDb();
  return db.getAll('relationships');
}

export async function putEdition(edition: BookEdition): Promise<void> {
  const db = await getDb();
  await db.put('book_editions', edition);
}

export async function getEditionsForWork(workId: string): Promise<BookEdition[]> {
  const db = await getDb();
  return db.getAllFromIndex('book_editions', 'by-work', workId);
}

export async function putReflection(reflection: Reflection): Promise<void> {
  const db = await getDb();
  await db.put('reflections', reflection);
}

export async function getReflectionsForWork(workId: string): Promise<Reflection[]> {
  const db = await getDb();
  return db.getAllFromIndex('reflections', 'by-work', workId);
}

export async function putExperience(experience: Experience): Promise<void> {
  const db = await getDb();
  await db.put('experiences', experience);
}

export async function getExperience(id: string): Promise<Experience | undefined> {
  const db = await getDb();
  return db.get('experiences', id);
}

export async function getExperiencesForWork(workId: string): Promise<Experience[]> {
  const db = await getDb();
  return db.getAllFromIndex('experiences', 'by-work', workId);
}

export async function putCreator(creator: Creator): Promise<void> {
  const db = await getDb();
  await db.put('creators', creator);
}

export async function getAllCreators(): Promise<Creator[]> {
  const db = await getDb();
  return db.getAll('creators');
}

// ─── Work relations (adaptations / related works) ─────────────────────

export async function putWorkRelation(rel: WorkRelation): Promise<void> {
  const db = await getDb();
  await db.put('work_relations', rel);
}

/** Relations where this work is either the source (from) or target (to). */
export async function getWorkRelationsForWork(workId: string): Promise<WorkRelation[]> {
  const db = await getDb();
  const from = await db.getAllFromIndex('work_relations', 'by-from', workId);
  const to = await db.getAllFromIndex('work_relations', 'by-to', workId);
  const byId = new Map<string, WorkRelation>();
  for (const rel of from) byId.set(rel.id, rel);
  for (const rel of to) byId.set(rel.id, rel);
  return Array.from(byId.values());
}

export async function deleteWorkRelation(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('work_relations', id);
}

/** Resolve a possibly-legacy id through id_redirects; returns the input if no redirect. */
export async function resolveCanonicalId(oldId: string): Promise<string> {
  const db = await getDb();
  const redirect = await db.get('id_redirects', oldId);
  return redirect?.canonicalId ?? oldId;
}

/** Join relationships with their catalog works (and preferred edition when set). */
export async function getArchivePairs(): Promise<ArchivePair[]> {
  const db = await getDb();
  const relationships = await db.getAll('relationships');
  const pairs: ArchivePair[] = [];

  for (const relationship of relationships) {
    const work = await db.get('works', relationship.workId);
    if (!work) continue;

    let preferredEdition: BookEdition | undefined;
    if (relationship.preferredEditionId) {
      preferredEdition = await db.get('book_editions', relationship.preferredEditionId);
    }

    pairs.push({ relationship, work, preferredEdition });
  }

  return pairs;
}


