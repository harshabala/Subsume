import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  MediaItem,
  LibraryItem,
  UserPreferences,
  PersonItem,
  WeeklyDigest,
  WatchAlert,
  ImportLibraryData,
  SanctuaryIntent,
} from '@/shared/types';
import { isValidPersonItem } from '@/shared/validation';
import { SEED_MEDIA, SEED_LIBRARY, SEED_PEOPLE } from './seedData';

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
}

const DB_NAME = 'subsume-db';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<SubsumeDB>> | null = null;

export async function seedDemoLibraryIfEmpty(): Promise<boolean> {
  const db = await getDb();
  const mediaCount = await db.count('media');
  if (mediaCount > 0) return false;
  await seedDatabaseIfEmpty(db);
  return true;
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
      },
    }).then(async (db) => {
      await seedDatabaseIfEmpty(db);
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
}

export async function putMediaItems(items: MediaItem[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('media', 'readwrite');
  for (const item of items) {
    await tx.store.put(item);
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
}

export async function getLibraryItem(mediaId: string): Promise<LibraryItem | undefined> {
  const db = await getDb();
  const item = await db.get('library', mediaId);
  return item ? normalizeLibraryItem(item) : undefined;
}

export async function removeLibraryItem(mediaId: string): Promise<void> {
  const db = await getDb();
  await db.delete('library', mediaId);
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

export async function exportLibraryData(): Promise<ImportLibraryData> {
  const db = await getDb();
  const tx = db.transaction(['library', 'media', 'people', 'alerts', 'preferences'], 'readonly');
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
  const result: ImportLibraryData = { library, media, people };
  if (alerts.length > 0) {
    result.alerts = alerts;
  }
  if (weeklyDigest) {
    result.weeklyDigest = weeklyDigest;
  }
  return result;
}

const VALID_LIBRARY_STATUSES = new Set(['to-watch', 'watching', 'watched', 'abandoned']);
const VALID_MEDIA_TYPES = new Set(['movie', 'tv']);
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

// Media IDs use provider-specific prefixes (see tvmaze.ts, recommendations.ts trakt fallback):
//   tmdb_(movie|tv)_<id>  — canonical TMDb records
//   tvmaze_tv_<id>        — TVmaze fallback metadata
//   trakt_trending_<slug> — Trakt trending recommendations
//   seed_<name>           — DEV-only demo seed data (seedData.ts)
const MEDIA_ID_PATTERN =
  /^(tmdb_(movie|tv)_\d+|tvmaze_tv_\d+|trakt_trending_[a-zA-Z0-9-]+|seed_[a-z0-9_]+)$/;

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

const VALID_ALERT_TYPES = new Set(['movie', 'tv', 'both']);

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

export async function importLibraryData(data: ImportLibraryData) {
  const db = await getDb();
  const tx = db.transaction(
    ['library', 'media', 'people', 'alerts', 'preferences'],
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
    await tx.done;
  } catch (err) {
    console.error('[Subsume] Import failed:', err);
    throw err;
  }
}


export async function getLibraryPage(
  limit: number,
  offset: number,
  type?: 'movie' | 'tv'
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
}

export async function deletePerson(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('people', id);
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


