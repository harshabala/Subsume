import { describe, it, expect, vi } from 'vitest';

vi.mock('idb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('idb')>();
  return { ...actual, openDB: vi.fn(actual.openDB) };
});

import { openDB, deleteDB } from 'idb';

describe('getDb opening', () => {
  it('retries after a failed open, and upgrades a v3 database that already has some v4 stores', async () => {
    await deleteDB('subsume-db');
    // A partially upgraded v3 database: legacy stores plus every v4 store already present.
    const actual = (await vi.importActual<typeof import('idb')>('idb')).openDB;
    const legacy = await actual('subsume-db', 3, {
      upgrade(db) {
        for (const name of ['media', 'library', 'preferences', 'people', 'alerts']) db.createObjectStore(name);
        for (const name of ['works', 'book_editions', 'relationships', 'experiences', 'reflections', 'creators', 'work_relations', 'id_redirects']) {
          db.createObjectStore(name);
        }
      },
    });
    legacy.close();

    const storage = await import('@/background/storage');
    vi.mocked(openDB).mockRejectedValueOnce(new Error('blocked'));
    await expect(storage.getDb()).rejects.toThrow('blocked');

    const db = await storage.getDb();
    expect(db.version).toBe(4);
    expect(db.objectStoreNames.contains('works')).toBe(true);
    expect(await storage.getDb()).toBe(db);
  });
});
