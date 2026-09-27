import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as storage from '@/background/storage';
import {
  SEED_LIBRARY,
  SEED_MEDIA,
  SEED_PEOPLE,
  SEED_PEOPLE_OBSOLETE_IDS,
  SEED_CATALOGUE_VERSION,
  SEED_CATALOGUE_VERSION_KEY,
} from '@/background/seedData';
import type { LibraryItem, MediaItem, PersonItem, UserPreferences, WatchAlert } from '@/shared/types';

const { getDb } = storage;

async function clearStores(...names: string[]) {
  const db = await getDb();
  for (const name of names) await db.clear(name as never);
}

const media = (id: string, over: Partial<MediaItem> = {}): MediaItem => ({
  id,
  canonicalTitle: `Title ${id}`,
  type: 'movie',
  year: 2000,
  genres: [],
  ratings: [],
  providers: [],
  ...over,
});
const lib = (mediaId: string, over: Partial<LibraryItem> = {}) =>
  ({ mediaId, status: 'watched', addedAt: 1, updatedAt: 1, ...over }) as LibraryItem;

afterEach(() => vi.restoreAllMocks());

describe('demo seeding', () => {
  beforeEach(() => clearStores('library', 'media', 'people', 'relationships', 'works', 'creators'));

  it('logs and keeps an empty library when seeding fails', async () => {
    const db = await getDb();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const realTx = db.transaction.bind(db);
    vi.spyOn(db, 'transaction').mockImplementation(((stores: unknown, ...rest: unknown[]) => {
      if (Array.isArray(stores) && stores.includes('library') && stores.includes('media')) throw new Error('tx failed');
      return (realTx as (...a: unknown[]) => unknown)(stores, ...rest);
    }) as never);
    await expect(storage.seedDemoLibraryIfEmpty()).resolves.toBe(true);
    expect(err).toHaveBeenCalledWith('Failed to seed database:', expect.any(Error));
    expect(await db.count('library')).toBe(0);
  });

  it('seeds once, keeps existing people, and is a no-op for a non-empty library', async () => {
    const db = await getDb();
    await db.put('people', SEED_PEOPLE[0]);
    await expect(storage.seedDemoLibraryIfEmpty()).resolves.toBe(true);
    expect(await db.count('library')).toBe(SEED_LIBRARY.length);
    expect(await db.count('people')).toBe(1);
    await expect(storage.seedDemoLibraryIfEmpty()).resolves.toBe(false);
  });

  it('seeds filmmakers too when none are followed', async () => {
    await expect(storage.seedDemoLibraryIfEmpty()).resolves.toBe(true);
    expect(await (await getDb()).count('people')).toBe(SEED_PEOPLE.length);
  });
});

describe('mergeSeedCatalog', () => {
  beforeEach(() => clearStores('library', 'media', 'people', 'relationships', 'works', 'creators', 'reflections', 'experiences'));

  it('adds missing catalogue rows into an empty database', async () => {
    const out = await storage.mergeSeedCatalog();
    expect(out.mediaAdded).toBeGreaterThanOrEqual(SEED_MEDIA.length);
    expect(out.libraryAdded).toBe(SEED_LIBRARY.length);
    expect(out.peopleUpserted).toBe(SEED_PEOPLE.length);
  });

  it('backfills notes from legacy userNotes or seed notes, merges people, drops obsolete ids', async () => {
    const db = await getDb();
    const withSeedNotes = SEED_LIBRARY.find((l) => l.notes);
    const other = SEED_LIBRARY.find((l) => l !== withSeedNotes)!;
    expect(withSeedNotes).toBeDefined();
    await db.put('library', { ...withSeedNotes!, notes: undefined, userRating: undefined, status: undefined as never, sanctuaryIntent: undefined });
    await db.put('library', { ...other, notes: undefined, userNotes: 'legacy words' } as never);
    const legacyNoNotes = SEED_LIBRARY.find((l) => l !== withSeedNotes && l !== other && !l.notes);
    if (legacyNoNotes) await db.put('library', { ...legacyNoNotes, notes: 'kept' });
    await db.put('people', { ...SEED_PEOPLE[0], name: 'Old Name' });
    await db.put('people', { id: SEED_PEOPLE_OBSOLETE_IDS[0], name: 'Wrong', role: 'actor', knownFor: [], filmographyIds: [], followedAt: 1, lastSyncedAt: 0 } as PersonItem);

    const out = await storage.mergeSeedCatalog();
    expect(out.libraryUpdated).toBeGreaterThanOrEqual(2);
    expect((await db.get('library', other.mediaId))!.notes).toBe('legacy words');
    const reseeded = (await db.get('library', withSeedNotes!.mediaId))!;
    expect(reseeded.notes).toBe(withSeedNotes!.notes);
    expect(reseeded.status).toBe(withSeedNotes!.status);
    expect((await db.get('people', SEED_PEOPLE[0].id))!.name).toBe(SEED_PEOPLE[0].name);
    expect(await db.get('people', SEED_PEOPLE_OBSOLETE_IDS[0])).toBeUndefined();
  });

  it('keeps existing status/rating/intent when the seed row has none', async () => {
    const db = await getDb();
    const target = SEED_LIBRARY.find((l) => l.notes)!;
    const saved = { ...target };
    // Temporarily blank the seed row's optional fields to exercise the fallbacks
    Object.assign(target, { status: undefined, userRating: undefined, sanctuaryIntent: undefined });
    try {
      await db.put('library', { ...saved, notes: undefined, status: 'watching', userRating: 3, sanctuaryIntent: 'wishlist' });
      await storage.mergeSeedCatalog();
      expect(await db.get('library', target.mediaId)).toMatchObject({ status: 'watching', userRating: 3, sanctuaryIntent: 'wishlist' });
    } finally {
      Object.assign(target, saved);
    }
  });

  it('can skip library rows', async () => {
    const out = await storage.mergeSeedCatalog({ includeLibrary: false });
    expect(out.libraryAdded).toBe(0);
  });

  it('mergeSeedCatalogIfVersionBehind runs once per catalogue version', async () => {
    await chrome.storage.local.set({ [SEED_CATALOGUE_VERSION_KEY]: 'garbage' });
    await storage.mergeSeedCatalogIfVersionBehind();
    expect((await chrome.storage.local.get(SEED_CATALOGUE_VERSION_KEY))[SEED_CATALOGUE_VERSION_KEY]).toBe(SEED_CATALOGUE_VERSION);
    const db = await getDb();
    await db.clear('media');
    await storage.mergeSeedCatalogIfVersionBehind();
    expect(await db.count('media')).toBe(0);
  });
});

describe('store fallbacks when multi-medium stores are missing', () => {
  it('putMediaItem, putLibraryItem and savePerson write legacy stores only', async () => {
    const db = await getDb();
    await clearStores('works', 'relationships', 'creators');
    const realContains = db.objectStoreNames.contains.bind(db.objectStoreNames);
    const contains = vi
      .spyOn(db.objectStoreNames, 'contains')
      .mockImplementation((name: string) => !['works', 'relationships', 'creators'].includes(name) && realContains(name));
    await storage.putMediaItem(media('tmdb_movie_fb1'));
    await storage.putLibraryItem(lib('tmdb_movie_fb1'));
    await storage.savePerson({ id: 'tmdb_person_fb', name: 'P', role: 'actor', knownFor: [], filmographyIds: [], followedAt: 1, lastSyncedAt: 0 });
    await storage.deletePerson('tmdb_person_fb');
    contains.mockRestore();
    expect(await db.get('media', 'tmdb_movie_fb1')).toBeDefined();
    expect(await db.get('works', 'tmdb_movie_fb1')).toBeUndefined();
    expect(await db.get('relationships', 'tmdb_movie_fb1')).toBeUndefined();
    expect(await db.get('creators', 'tmdb_person_fb')).toBeUndefined();
  });
});

describe('media queries', () => {
  beforeEach(() => clearStores('media', 'works'));

  it('putMediaItems merges into existing works', async () => {
    await storage.putMediaItems([media('tmdb_movie_pm1')]);
    await storage.putMediaItems([media('tmdb_movie_pm1', { overview: 'second' })]);
    expect((await storage.getMediaItem('tmdb_movie_pm1'))!.overview).toBe('second');
  });

  it('findMediaByTitle honours the year and skips mismatches', async () => {
    await storage.putMediaItem(media('tmdb_movie_a', { canonicalTitle: 'Solaris', year: 1972 }));
    await storage.putMediaItem(media('tmdb_movie_b', { canonicalTitle: 'Solaris', year: 2002 }));
    expect((await storage.findMediaByTitle('Solaris', 2002))!.id).toBe('tmdb_movie_b');
    expect(await storage.findMediaByTitle('Solaris', 1990)).toBeUndefined();
    expect((await storage.findMediaByTitle('Solaris'))!.id).toMatch(/tmdb_movie_/);
  });

  it('searchMediaByQuery searches stored and seed media by type', async () => {
    await expect(storage.searchMediaByQuery('   ')).resolves.toEqual([]);
    await storage.putMediaItem(media('tmdb_tv_q', { canonicalTitle: 'Queen Show', type: 'tv' }));
    const tv = await storage.searchMediaByQuery('queen', 'tv');
    expect(tv.map((m) => m.id)).toContain('tmdb_tv_q');
    expect(tv.every((m) => m.type === 'tv')).toBe(true);
    const seedTitle = SEED_MEDIA[0].canonicalTitle.slice(0, 4);
    const all = await storage.searchMediaByQuery(seedTitle, undefined, 2);
    expect(all.length).toBeGreaterThan(0);
    expect(all.length).toBeLessThanOrEqual(2);
  });
});

describe('preferences key migration', () => {
  it('re-encrypts plaintext keys and preserves undecryptable ciphertext (flat and apiKeys)', async () => {
    const db = await getDb();
    await db.put(
      'preferences',
      {
        ...storage.DEFAULT_PREFS,
        tmdbApiKey: 'plain-tmdb',
        omdbApiKey: 'enc:v1:not-real-ciphertext',
        apiKeys: { openai: 'plain-openai', anthropic: 'enc:v1:broken', gemini: 'enc:v1:also-broken' },
      } as unknown as UserPreferences,
      'user-prefs',
    );
    const prefs = await storage.getPreferences();
    expect(prefs.tmdbApiKey).toBe('plain-tmdb');
    expect(prefs.omdbApiKey).toBeUndefined();
    const raw = (await db.get('preferences', 'user-prefs')) as unknown as Record<string, unknown>;
    expect(String(raw.tmdbApiKey)).toMatch(/^enc:v1:/);
    expect(raw.omdbApiKey).toBe('enc:v1:not-real-ciphertext');
    expect((raw.apiKeys as Record<string, string>).anthropic).toBe('enc:v1:broken');
    expect((raw.apiKeys as Record<string, string>).openai).toMatch(/^enc:v1:/);
  });

  it('keeps a missing undecryptable path out of the write-back and survives write failures', async () => {
    const db = await getDb();
    await db.put('preferences', { ...storage.DEFAULT_PREFS, tmdbApiKey: 'plain' } as UserPreferences, 'user-prefs');
    const put = vi.spyOn(db, 'put').mockRejectedValueOnce(new Error('quota'));
    await expect(storage.getPreferences()).resolves.toMatchObject({ tmdbApiKey: 'plain' });
    put.mockRestore();
  });
});

describe('export / import', () => {
  beforeEach(() =>
    clearStores('library', 'media', 'people', 'alerts', 'works', 'book_editions', 'relationships', 'experiences', 'reflections', 'creators', 'work_relations'),
  );

  it('export includes every populated multi-medium store', async () => {
    const db = await getDb();
    await storage.putMediaItem(media('tmdb_movie_ex'));
    await storage.putLibraryItem(lib('tmdb_movie_ex', { notes: 'a note' }));
    await db.put('library', lib('tmdb_movie_orphan'));
    await storage.putWatchAlert({ id: 'al1', name: 'A', enabled: true, createdAt: 1 } as WatchAlert);
    await storage.saveWeeklyDigest({ generatedAt: 1, items: [], llmGenerated: false });
    await storage.putEdition({ id: 'ed1', workId: 'tmdb_movie_ex', title: 'Ed' } as never);
    await storage.putCreator({ id: 'c1', name: 'C', roles: [], knownForWorkIds: [], externalIds: [] } as never);
    await storage.putWorkRelation({ id: 'wr1', fromWorkId: 'a', toWorkId: 'b', relation: 'based_on', confidence: 'user_asserted', sourceProvider: 'user', createdAt: 1 });
    await storage.putExperience({ id: 'x1', workId: 'tmdb_movie_ex', kind: 'watch', status: 'completed', createdAt: 1, updatedAt: 1 } as never);
    const data = await storage.exportLibraryData();
    expect(data.media!.map((m) => m.id)).toEqual(['tmdb_movie_ex']);
    for (const key of ['alerts', 'weeklyDigest', 'works', 'bookEditions', 'relationships', 'experiences', 'reflections', 'creators', 'workRelations']) {
      expect(data, key).toHaveProperty(key);
    }
  });

  it('import validates every collection and skips invalid rows', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const validMedia = media('tmdb_movie_imp');
    await storage.importLibraryData({
      media: [validMedia, { id: 'bad' }],
      library: [lib('tmdb_movie_imp', { sanctuaryIntent: undefined }), { mediaId: '' }],
      people: [{ id: 'tmdb_person_9', name: 'P', role: 'actor', knownFor: [], filmographyIds: [], followedAt: 1, lastSyncedAt: 0 }, { id: 1 }],
      alerts: [{ id: 'al', name: 'A', enabled: true, createdAt: 1 }, {}],
      weeklyDigest: { generatedAt: 1, llmGenerated: false, items: [{ mediaId: 'm', title: 't', year: 1, type: 'movie', reason: 'r', platforms: [] }] },
      works: [{ id: 'w', canonicalTitle: 'W', medium: 'book' }, { id: 'w2', canonicalTitle: 'W', medium: 'game' }],
      bookEditions: [{ id: 'e', workId: 'w', title: 'E' }, { id: 'e2' }],
      relationships: [{ workId: 'w', status: 'planned' }, { workId: 'w' }],
      experiences: [{ id: 'x', workId: 'w' }, { id: 'x2' }],
      reflections: [{ id: 'r', workId: 'w' }, null],
      creators: [{ id: 'c', name: 'C' }, { id: 'c2' }],
      workRelations: [{ id: 'wr', fromWorkId: 'a', toWorkId: 'b', relation: 'sequel_to' }, { id: 'wr2', fromWorkId: 'a', toWorkId: 'b', relation: 'loves' }],
    } as never);
    expect(warn).toHaveBeenCalledTimes(12);
    const db = await getDb();
    expect((await db.get('library', 'tmdb_movie_imp'))!.sanctuaryIntent).toBe('keep_memory');
    expect(await db.get('work_relations', 'wr')).toBeDefined();

    await storage.importLibraryData({ weeklyDigest: { generatedAt: 'x' } } as never);
    expect(warn).toHaveBeenLastCalledWith('[Subsume] Import skipped invalid weekly digest:', { generatedAt: 'x' });
  });

  it('import rethrows storage failures', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exploding = {
      get media(): never {
        throw new Error('store gone');
      },
    };
    await expect(storage.importLibraryData(exploding as never)).rejects.toThrow('store gone');
    expect(err).toHaveBeenCalledWith('[Subsume] Import failed:', expect.any(Error));
  });
});

describe('validators', () => {
  it('isValidLibraryItem', () => {
    const ok = lib('m');
    expect(storage.isValidLibraryItem(ok)).toBe(true);
    expect(storage.isValidLibraryItem(null)).toBe(false);
    expect(storage.isValidLibraryItem({ ...ok, mediaId: 3 })).toBe(false);
    expect(storage.isValidLibraryItem({ ...ok, status: 'nope' })).toBe(false);
    expect(storage.isValidLibraryItem({ ...ok, addedAt: Infinity })).toBe(false);
    expect(storage.isValidLibraryItem({ ...ok, updatedAt: 'x' })).toBe(false);
    expect(storage.isValidLibraryItem({ ...ok, userRating: 0 })).toBe(false);
    expect(storage.isValidLibraryItem({ ...ok, userRating: 11 })).toBe(false);
    expect(storage.isValidLibraryItem({ ...ok, userRating: '5' })).toBe(false);
    expect(storage.isValidLibraryItem({ ...ok, userRating: 5, sanctuaryIntent: 'wishlist' })).toBe(true);
    expect(storage.isValidLibraryItem({ ...ok, sanctuaryIntent: 'someday' })).toBe(false);
  });

  it('isValidMediaItem', () => {
    const ok = media('tmdb_movie_1');
    expect(storage.isValidMediaItem(ok)).toBe(true);
    expect(storage.isValidMediaItem('x')).toBe(false);
    expect(storage.isValidMediaItem({ ...ok, id: 'bad id' })).toBe(false);
    expect(storage.isValidMediaItem({ ...ok, id: 5 })).toBe(false);
    expect(storage.isValidMediaItem({ ...ok, type: 'game' })).toBe(false);
    expect(storage.isValidMediaItem({ ...ok, year: '2000' })).toBe(false);
    expect(storage.isValidMediaItem({ ...ok, year: NaN })).toBe(false);
    expect(storage.isValidMediaItem({ ...ok, year: 1700 })).toBe(false);
    expect(storage.isValidMediaItem({ ...ok, year: 2200 })).toBe(false);
    expect(storage.isValidMediaItem({ ...ok, canonicalTitle: '  ' })).toBe(false);
    expect(storage.isValidMediaItem({ ...ok, canonicalTitle: 5 })).toBe(false);
    expect(storage.isValidMediaItem({ ...ok, canonicalTitle: 'x'.repeat(501) })).toBe(false);
    expect(storage.isValidMediaItem({ ...ok, ratings: 'x' })).toBe(false);
    expect(storage.isValidMediaItem({ ...ok, providers: {} })).toBe(false);
    expect(storage.isValidMediaItem({ ...ok, ratings: undefined, providers: undefined })).toBe(true);
  });

  it('isValidWatchAlert', () => {
    const ok = { id: 'a', name: 'A', enabled: true, createdAt: 1 };
    expect(storage.isValidWatchAlert(ok)).toBe(true);
    expect(storage.isValidWatchAlert(undefined)).toBe(false);
    const bad: Array<Record<string, unknown>> = [
      { id: '' },
      { name: '' },
      { enabled: 'yes' },
      { createdAt: NaN },
      { type: 'podcast' },
      { genres: 'x' },
      { platforms: 'x' },
      { keyword: 1 },
      { authorKeyword: 1 },
      { alertTypes: 'x' },
      { alertTypes: ['new_release', 'gossip'] },
      { alertTypes: [1] },
      { lastCheckedAt: 'x' },
      { lastMatchAt: 'x' },
      { lastNotifiedMediaIds: 'x' },
    ];
    for (const patch of bad) expect(storage.isValidWatchAlert({ ...ok, ...patch }), JSON.stringify(patch)).toBe(false);
    expect(
      storage.isValidWatchAlert({
        ...ok,
        type: 'book',
        genres: [],
        platforms: [],
        keyword: 'k',
        authorKeyword: 'a',
        alertTypes: ['news'],
        lastCheckedAt: 1,
        lastMatchAt: 1,
        lastNotifiedMediaIds: [],
      }),
    ).toBe(true);
  });

  it('import-only validators reject malformed digests and rows', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const item = { mediaId: 'm', title: 't', year: 1, type: 'movie', reason: 'r', platforms: [] };
    const digests = [
      'x',
      { generatedAt: 1, llmGenerated: 'no', items: [] },
      { generatedAt: 1, llmGenerated: false, items: 'x' },
      { generatedAt: 1, llmGenerated: false, items: [null] },
      ...['mediaId', 'title', 'year', 'type', 'reason', 'platforms'].map((k) => ({
        generatedAt: 1,
        llmGenerated: false,
        items: [{ ...item, [k]: k === 'type' ? 'game' : 5 === 5 && k === 'year' ? 'x' : k === 'platforms' ? 'x' : 5 }],
      })),
    ];
    for (const d of digests) await storage.importLibraryData({ weeklyDigest: d } as never);
    expect(warn).toHaveBeenCalledTimes(digests.length);

    warn.mockClear();
    await storage.importLibraryData({
      works: ['x', { id: '', canonicalTitle: 'W', medium: 'book' }, { id: 'w', canonicalTitle: '', medium: 'book' }],
      bookEditions: [null, { id: 'e', workId: '', title: 't' }, { id: 'e', workId: 'w', title: '' }],
      relationships: ['x', { workId: '', status: 'x' }],
      experiences: ['x', { id: 'x', workId: '' }],
      reflections: ['x', { id: '', workId: 'w' }, { id: 'r', workId: '' }],
      creators: ['x', { id: '', name: 'n' }],
      workRelations: ['x', { id: '', fromWorkId: 'a', toWorkId: 'b', relation: 'sequel_to' }, { id: 'r', fromWorkId: '', toWorkId: 'b', relation: 'sequel_to' }, { id: 'r', fromWorkId: 'a', toWorkId: '', relation: 'sequel_to' }],
    } as never);
    expect(warn).toHaveBeenCalledTimes(19);
  });
});

describe('paging, people and alerts', () => {
  beforeEach(() => clearStores('library', 'media', 'people', 'alerts', 'creators'));

  it('getLibraryPage pages newest first, filters by type, and normalizes intents', async () => {
    const db = await getDb();
    for (let i = 0; i < 5; i++) {
      const id = `tmdb_${i % 2 ? 'tv' : 'movie'}_${i}`;
      await db.put('media', media(id, { type: i % 2 ? 'tv' : 'movie' }));
      await db.put('library', lib(id, { addedAt: i, sanctuaryIntent: undefined }));
    }
    await db.put('library', lib('tmdb_movie_nomedia', { addedAt: 10 }));
    const page = await storage.getLibraryPage(2, 1);
    expect(page.map((l) => l.mediaId)).toEqual(['tmdb_movie_4', 'tmdb_tv_3']);
    expect(page[0].sanctuaryIntent).toBe('keep_memory');
    const tv = await storage.getLibraryPage(10, 0, 'tv');
    expect(tv.map((l) => l.mediaId)).toEqual(['tmdb_tv_3', 'tmdb_tv_1']);
    const movies = await storage.getLibraryPage(10, 1, 'movie');
    expect(movies.map((l) => l.mediaId)).toEqual(['tmdb_movie_2', 'tmdb_movie_0']);
  });

  it('people: newest first, delete removes both creator id forms, sync updates only known people', async () => {
    const person = (id: string, followedAt: number): PersonItem =>
      ({ id, name: id, role: 'director', knownFor: [], filmographyIds: [], followedAt, lastSyncedAt: 0 }) as PersonItem;
    await storage.savePerson(person('tmdb_person_1', 1));
    await storage.savePerson(person('42', 2));
    expect((await storage.getAllPeople()).map((p) => p.id)).toEqual(['42', 'tmdb_person_1']);

    const db = await getDb();
    await db.put('creators', { id: 'tmdb_person_42', name: 'x' } as never);
    await db.put('creators', { id: '42', name: 'x' } as never);
    await storage.deletePerson('42');
    expect(await db.get('creators', 'tmdb_person_42')).toBeUndefined();
    expect(await db.get('creators', '42')).toBeUndefined();
    await storage.deletePerson('tmdb_person_1');
    expect(await storage.getPersonById('tmdb_person_1')).toBeUndefined();

    await storage.savePerson(person('tmdb_person_7', 3));
    await storage.updatePersonSync('tmdb_person_7', ['tmdb_movie_1']);
    expect((await storage.getPersonById('tmdb_person_7'))!.filmographyIds).toEqual(['tmdb_movie_1']);
    await storage.updatePersonSync('tmdb_person_missing', ['x']);
    expect(await storage.getPersonById('tmdb_person_missing')).toBeUndefined();
  });

  it('alerts: newest first, get and delete', async () => {
    await storage.putWatchAlert({ id: 'a1', name: 'A', enabled: true, createdAt: 1 } as WatchAlert);
    await storage.putWatchAlert({ id: 'a2', name: 'B', enabled: true, createdAt: 2 } as WatchAlert);
    expect((await storage.getAllWatchAlerts()).map((a) => a.id)).toEqual(['a2', 'a1']);
    expect((await storage.getWatchAlert('a1'))!.name).toBe('A');
    await storage.deleteWatchAlert('a1');
    expect(await storage.getWatchAlert('a1')).toBeUndefined();
  });

  it('creators and archive pairs', async () => {
    await storage.putCreator({ id: 'cr', name: 'C', roles: [], knownForWorkIds: [], externalIds: [] } as never);
    expect((await storage.getAllCreators()).map((c) => c.id)).toContain('cr');
  });
});

describe('guards for missing multi-medium stores', () => {
  const hide = async (hidden: string[]) => {
    const db = await getDb();
    const realContains = db.objectStoreNames.contains.bind(db.objectStoreNames);
    return vi
      .spyOn(db.objectStoreNames, 'contains')
      .mockImplementation((name: string) => !hidden.includes(name) && realContains(name));
  };

  it('mergeSeedCatalog skips dual-writes when works/relationships/creators are absent', async () => {
    await clearStores('library', 'media', 'people', 'works', 'relationships', 'creators');
    const spy = await hide(['works', 'relationships', 'creators']);
    const out = await storage.mergeSeedCatalog();
    spy.mockRestore();
    expect(out.libraryAdded).toBe(SEED_LIBRARY.length);
    expect(await (await getDb()).count('works')).toBe(0);
  });

  it('library dual-write skips reflection/experience seeding when those stores are absent', async () => {
    await clearStores('library', 'media', 'relationships', 'reflections', 'experiences');
    const spy = await hide(['reflections', 'experiences']);
    await storage.mergeSeedCatalog();
    spy.mockRestore();
    const db = await getDb();
    expect(await db.count('relationships')).toBe(SEED_LIBRARY.length);
    expect(await db.count('reflections')).toBe(0);
  });

  it('removeLibraryItem skips missing stores and tolerates cascade errors', async () => {
    const db = await getDb();
    await db.put('library', lib('tmdb_movie_rm'));
    const spy = await hide(['relationships', 'experiences', 'reflections']);
    await storage.removeLibraryItem('tmdb_movie_rm');
    spy.mockRestore();
    expect(await db.get('library', 'tmdb_movie_rm')).toBeUndefined();

    const idx = vi.spyOn(db, 'getAllFromIndex').mockRejectedValueOnce(new Error('index gone'));
    await expect(storage.removeLibraryItem('tmdb_movie_rm')).resolves.toBeUndefined();
    idx.mockRestore();
  });

  it('migrateV3ToV4IfNeeded returns early without works, and treats absent relationships/creators as empty', async () => {
    const db = await getDb();
    let spy = await hide(['works']);
    await storage.migrateV3ToV4IfNeeded(db);
    spy.mockRestore();
    expect((await chrome.storage.local.get(storage.MIGRATION_V4_COMPLETE_KEY))[storage.MIGRATION_V4_COMPLETE_KEY]).toBeUndefined();

    // Nothing left to copy, so the migration only counts (treating hidden stores as empty) and completes
    await clearStores('library', 'people', 'media');
    spy = await hide(['relationships', 'creators']);
    await storage.migrateV3ToV4IfNeeded(db);
    spy.mockRestore();
    expect((await chrome.storage.local.get(storage.MIGRATION_V4_COMPLETE_KEY))[storage.MIGRATION_V4_COMPLETE_KEY]).toBe(true);
  });
});

describe('misc storage reads', () => {
  it('library writes for works without stored media seed a movie experience', async () => {
    await clearStores('experiences', 'reflections');
    await storage.putLibraryItem(lib('tmdb_movie_nomedia_x', { notes: 'first thoughts' }));
    const db = await getDb();
    const [exp] = await db.getAllFromIndex('experiences', 'by-work', 'tmdb_movie_nomedia_x');
    expect(exp.kind).toBe('watch');
  });

  it('export omits empty multi-medium collections', async () => {
    await clearStores('library', 'media', 'people', 'alerts', 'preferences', 'works', 'book_editions', 'relationships', 'experiences', 'reflections', 'creators', 'work_relations');
    const data = await storage.exportLibraryData();
    expect(Object.keys(data).sort()).toEqual(['exportedAt', 'library', 'media', 'people', 'schemaVersion']);
  });

  it('getWeeklyDigest round-trips', async () => {
    await storage.saveWeeklyDigest({ generatedAt: 5, items: [], llmGenerated: true });
    await expect(storage.getWeeklyDigest()).resolves.toMatchObject({ generatedAt: 5 });
  });

  it('getAllMediaMap skips unknown ids', async () => {
    await storage.putMediaItem(media('tmdb_movie_map'));
    await expect(storage.getAllMediaMap(['tmdb_movie_map', 'tmdb_movie_nope'])).resolves.toEqual({
      tmdb_movie_map: expect.objectContaining({ id: 'tmdb_movie_map' }),
    });
  });

  it('getArchivePairs skips relationships without works and attaches preferred editions', async () => {
    const db = await getDb();
    await clearStores('relationships', 'works', 'book_editions');
    await db.put('relationships', { workId: 'ghost', status: 'planned', addedAt: 1, updatedAt: 1 } as never);
    await db.put('relationships', { workId: 'w1', status: 'planned', addedAt: 1, updatedAt: 1, preferredEditionId: 'e1' } as never);
    await db.put('relationships', { workId: 'w2', status: 'planned', addedAt: 1, updatedAt: 1 } as never);
    await db.put('works', { id: 'w1', canonicalTitle: 'W1', medium: 'book' } as never);
    await db.put('works', { id: 'w2', canonicalTitle: 'W2', medium: 'book' } as never);
    await db.put('book_editions', { id: 'e1', workId: 'w1', title: 'E1' } as never);
    const pairs = await storage.getArchivePairs();
    expect(pairs.map((p) => [p.work.id, p.preferredEdition?.id])).toEqual([
      ['w1', 'e1'],
      ['w2', undefined],
    ]);
  });

  it('import validators check edition and experience ids', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await storage.importLibraryData({
      bookEditions: [{ id: '', workId: 'w', title: 't' }],
      experiences: [{ id: '', workId: 'w' }],
    } as never);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('dual-write merge helpers', () => {
  const work = (over: Record<string, unknown> = {}) =>
    ({
      id: 'w',
      medium: 'book',
      canonicalTitle: 'W',
      genres: [],
      images: {},
      externalIds: [],
      creatorCredits: [],
      sourceProvenance: [],
      sourceConfidence: 'high',
      createdAt: 1,
      updatedAt: 1,
      ...over,
    }) as never;
  const prov = (fields: string[]) => ({ provider: 'x', fetchedAt: 1, fields });

  it('keeps rich existing provenance and credits, prefers rich incoming ones', () => {
    const credit = { creatorId: 'c', role: 'author' };
    const keep = storage.mergeDualWriteCatalogWork(
      work({ sourceProvenance: [], createdAt: 9 }),
      work({ sourceProvenance: [prov(['a'])], creatorCredits: [credit], lastEnrichedAt: 3, createdAt: 2 }),
    ) as unknown as Record<string, unknown>;
    expect(keep).toMatchObject({ sourceProvenance: [prov(['a'])], creatorCredits: [credit], createdAt: 2, lastEnrichedAt: 3 });

    const richIncoming = storage.mergeDualWriteCatalogWork(
      work({ sourceProvenance: [prov(['a']), prov(['b'])], creatorCredits: [credit], lastEnrichedAt: 5 }),
      work({ sourceProvenance: [prov(['z'])] }),
    ) as unknown as Record<string, unknown>;
    expect(richIncoming).toMatchObject({ sourceProvenance: [prov(['a']), prov(['b'])], creatorCredits: [credit], lastEnrichedAt: 5 });

    const deepSingle = storage.mergeDualWriteCatalogWork(
      work({ sourceProvenance: [prov(['a', 'b', 'c', 'd'])] }),
      work({ sourceProvenance: [prov(['z'])] }),
    ) as unknown as { sourceProvenance: unknown[] };
    expect(deepSingle.sourceProvenance).toEqual([prov(['a', 'b', 'c', 'd'])]);

    const shallowSingle = storage.mergeDualWriteCatalogWork(
      work({ sourceProvenance: [{ provider: 'x', fetchedAt: 1 }] }),
      work({ sourceProvenance: [prov(['z'])] }),
    ) as unknown as { sourceProvenance: unknown[] };
    expect(shallowSingle.sourceProvenance).toEqual([prov(['z'])]);

    const bothEmpty = storage.mergeDualWriteCatalogWork(work({ sourceProvenance: [] }), work({ sourceProvenance: [] })) as unknown as {
      sourceProvenance: unknown[];
    };
    expect(bothEmpty.sourceProvenance).toEqual([]);
  });

  it('merges book details field by field', () => {
    const rich = { authors: ['A'], firstPublishedYear: 1, series: 's', primarySubjects: ['p'], adaptationWorkIds: ['x'], defaultEditionId: 'd' };
    expect(storage.mergeBookDetailsForDualWrite(undefined, rich as never)).toBe(rich);
    expect(storage.mergeBookDetailsForDualWrite(undefined, undefined)).toBeUndefined();
    expect(storage.mergeBookDetailsForDualWrite(rich as never, { authors: [] } as never)).toBe(rich);
    expect(
      storage.mergeBookDetailsForDualWrite({ authors: [], series: 'new' } as never, rich as never),
    ).toEqual({ ...rich, series: 'new' });
    expect(
      storage.mergeBookDetailsForDualWrite(
        { authors: ['B'], firstPublishedYear: 2, primarySubjects: ['q'], adaptationWorkIds: ['y'], defaultEditionId: 'e' } as never,
        rich as never,
      ),
    ).toEqual({ authors: ['B'], firstPublishedYear: 2, series: 's', primarySubjects: ['q'], adaptationWorkIds: ['y'], defaultEditionId: 'e' });
    expect(
      storage.mergeBookDetailsForDualWrite({ authors: [], primarySubjects: [], adaptationWorkIds: [], defaultEditionId: 'e' } as never, rich as never),
    ).toMatchObject({ primarySubjects: ['p'], adaptationWorkIds: ['x'], defaultEditionId: 'e' });
  });
});
