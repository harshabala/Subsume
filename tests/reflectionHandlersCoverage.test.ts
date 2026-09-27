import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageType, type LibraryItem, type MediaItem } from '@/shared/types';
import type { Experience, LibraryRelationship, Reflection } from '@/shared/catalogTypes';

vi.mock('@/background/storage', () => ({
  getExperience: vi.fn(),
  getExperiencesForWork: vi.fn(),
  getLibraryItem: vi.fn(),
  getMediaItem: vi.fn(),
  getReflectionsForWork: vi.fn(),
  getRelationship: vi.fn(),
  putExperience: vi.fn(),
  putLibraryItem: vi.fn(),
  putMediaItem: vi.fn(),
  putReflection: vi.fn(),
  putRelationship: vi.fn(),
}));
vi.mock('@/background/context', () => ({ invalidateProfileCache: vi.fn() }));
vi.mock('@/shared/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn() } }));

import { reflectionHandlers } from '@/background/handlers/reflections';
import * as storage from '@/background/storage';
import { invalidateProfileCache } from '@/background/context';

const sender = {} as chrome.runtime.MessageSender;
const call = (type: MessageType, payload: unknown) => reflectionHandlers[type]!(payload, sender);
const book = (over: Partial<MediaItem> = {}) =>
  ({ id: 'bk', canonicalTitle: 'B', type: 'book', year: 1, genres: [], ratings: [], providers: [], ...over }) as MediaItem;
const rel = (over: Partial<LibraryRelationship> = {}) =>
  ({ workId: 'w', status: 'planned', addedAt: 5, updatedAt: 5, ...over }) as LibraryRelationship;
const lib = (over: Partial<LibraryItem> = {}) => ({ mediaId: 'w', status: 'to-watch', addedAt: 7, ...over }) as LibraryItem;
const exp = (over: Partial<Experience> = {}): Experience =>
  ({ id: 'e1', workId: 'w', kind: 'watch', status: 'in_progress', createdAt: 1, updatedAt: 1, ...over }) as Experience;
const lastPut = <T>(fn: unknown) => {
  const calls = vi.mocked(fn as (x: T) => unknown).mock.calls;
  return calls[calls.length - 1][0] as T;
};

beforeEach(() => {
  vi.clearAllMocks();
  for (const fn of [storage.getExperience, storage.getLibraryItem, storage.getMediaItem, storage.getRelationship]) {
    vi.mocked(fn).mockResolvedValue(undefined as never);
  }
  vi.mocked(storage.getExperiencesForWork).mockResolvedValue([]);
});

describe('CREATE_EXPERIENCE', () => {
  it('requires a workId', async () => {
    await expect(call(MessageType.CREATE_EXPERIENCE, null)).rejects.toThrow('workId is required');
    await expect(call(MessageType.CREATE_EXPERIENCE, { workId: 3 })).rejects.toThrow('workId is required');
  });

  it('infers read for books and Open Library ids, honours an explicit kind', async () => {
    vi.mocked(storage.getMediaItem).mockResolvedValue(book({ preferredEditionId: 'ed-pref' }));
    const a = (await call(MessageType.CREATE_EXPERIENCE, { workId: 'bk' })) as Experience;
    expect(a).toMatchObject({ kind: 'read', status: 'in_progress', editionId: 'ed-pref' });
    expect(a.startedAt).toBeTypeOf('number');

    vi.mocked(storage.getMediaItem).mockResolvedValue(undefined);
    const b = (await call(MessageType.CREATE_EXPERIENCE, { workId: 'openlibrary_work_1', kind: 'watch' })) as Experience;
    expect(b.kind).toBe('watch');
    const c = (await call(MessageType.CREATE_EXPERIENCE, { workId: 'openlibrary_work_1', kind: 'bogus' })) as Experience;
    expect(c.kind).toBe('read');
    const d = (await call(MessageType.CREATE_EXPERIENCE, { workId: 'tmdb_movie_1', kind: 'read' })) as Experience;
    expect(d.kind).toBe('read');
    const e = (await call(MessageType.CREATE_EXPERIENCE, { workId: 'tmdb_movie_1' })) as Experience;
    expect(e.kind).toBe('watch');
  });

  it('maps statuses (legacy and modern), timestamps and trimmed edition ids', async () => {
    const planned = (await call(MessageType.CREATE_EXPERIENCE, { workId: 'w', status: 'to-watch', editionId: '  ' })) as Experience;
    expect(planned).toMatchObject({ status: 'planned', startedAt: undefined, completedAt: undefined, abandonedAt: undefined });
    const done = (await call(MessageType.CREATE_EXPERIENCE, { workId: 'w', status: 'completed', editionId: ' ed1 ' })) as Experience;
    expect(done.editionId).toBe('ed1');
    expect(done.completedAt).toBeTypeOf('number');
    const dropped = (await call(MessageType.CREATE_EXPERIENCE, { workId: 'w', status: 'abandoned' })) as Experience;
    expect(dropped.abandonedAt).toBeTypeOf('number');
    const junk = (await call(MessageType.CREATE_EXPERIENCE, { workId: 'w', status: 'nonsense' })) as Experience;
    expect(junk.status).toBe('in_progress');
  });

  it('writes relationship and library, preserving existing fields', async () => {
    vi.mocked(storage.getRelationship).mockResolvedValue(
      rel({ sanctuaryIntent: 'keep_close', preferredEditionId: 'rel-ed', currentRating: 8 }) as never,
    );
    vi.mocked(storage.getLibraryItem).mockResolvedValue(lib({ userRating: 9, sanctuaryIntent: 'keep_close', preferredEditionId: 'lib-ed' }));
    await call(MessageType.CREATE_EXPERIENCE, { workId: 'w', status: 'watched' });
    expect(lastPut<LibraryRelationship>(storage.putRelationship)).toMatchObject({
      addedAt: 5,
      sanctuaryIntent: 'keep_close',
      preferredEditionId: 'rel-ed',
      currentRating: 8,
    });
    expect(lastPut<LibraryItem>(storage.putLibraryItem)).toMatchObject({
      status: 'watched',
      addedAt: 7,
      userRating: 9,
      sanctuaryIntent: 'keep_close',
      preferredEditionId: 'lib-ed',
    });
    expect(invalidateProfileCache).toHaveBeenCalled();
  });

  it('defaults intent for new in-progress and planned sessions', async () => {
    await call(MessageType.CREATE_EXPERIENCE, { workId: 'w' });
    expect(lastPut<LibraryRelationship>(storage.putRelationship).sanctuaryIntent).toBe('return_soon');
    expect(lastPut<LibraryItem>(storage.putLibraryItem).sanctuaryIntent).toBe('revisit_this_month');
    await call(MessageType.CREATE_EXPERIENCE, { workId: 'w', status: 'planned' });
    expect(lastPut<LibraryRelationship>(storage.putRelationship).sanctuaryIntent).toBeUndefined();
    expect(lastPut<LibraryItem>(storage.putLibraryItem).sanctuaryIntent).toBeUndefined();
  });
});

describe('GET_EXPERIENCES / GET_REFLECTIONS', () => {
  it('require a workId', async () => {
    await expect(call(MessageType.GET_EXPERIENCES, {})).rejects.toThrow('workId is required');
    await expect(call(MessageType.GET_REFLECTIONS, { workId: ' ' })).rejects.toThrow('workId is required');
    await expect(call(MessageType.GET_REFLECTIONS, null)).rejects.toThrow('workId is required');
  });

  it('sort experiences newest first with stable tie-breaks', async () => {
    vi.mocked(storage.getExperiencesForWork).mockResolvedValue([
      exp({ id: 'a', updatedAt: 1, createdAt: 1 }),
      exp({ id: 'b', updatedAt: 2, createdAt: 1 }),
      exp({ id: 'c', updatedAt: 1, createdAt: 3 }),
      exp({ id: 'd', updatedAt: 1, createdAt: 1 }),
    ]);
    const out = (await call(MessageType.GET_EXPERIENCES, { workId: 'w' })) as Experience[];
    expect(out.map((e) => e.id)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('sort reflections oldest first, by id on ties', async () => {
    vi.mocked(storage.getReflectionsForWork).mockResolvedValue([
      { id: 'b', createdAt: 1 },
      { id: 'a', createdAt: 1 },
      { id: 'c', createdAt: 0 },
    ] as Reflection[]);
    const out = (await call(MessageType.GET_REFLECTIONS, { workId: 'w' })) as Reflection[];
    expect(out.map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('ADD_REFLECTION', () => {
  it('validates the payload', async () => {
    await expect(call(MessageType.ADD_REFLECTION, null)).rejects.toThrow('Invalid ADD_REFLECTION');
    await expect(call(MessageType.ADD_REFLECTION, { workId: 'w', kind: 'quotation', body: 5 })).rejects.toThrow();
    await expect(call(MessageType.ADD_REFLECTION, { workId: 'w', kind: 'rant', body: 'x' })).rejects.toThrow();
  });

  it('stores optional fields and a truncated excerpt on the relationship', async () => {
    vi.mocked(storage.getRelationship).mockResolvedValue(rel() as never);
    const long = 'x'.repeat(400);
    const r = (await call(MessageType.ADD_REFLECTION, {
      workId: 'w',
      kind: 'quotation',
      body: long,
      title: ' T ',
      spoiler: false,
      experienceId: ' e1 ',
      userEnteredQuote: { text: ' q ', locationLabel: ' p. 4 ' },
    })) as Reflection;
    expect(r).toMatchObject({ title: 'T', spoiler: false, experienceId: 'e1', userEnteredQuote: { text: 'q', locationLabel: 'p. 4' } });
    const excerpt = lastPut<LibraryRelationship>(storage.putRelationship).latestReflectionExcerpt!;
    expect(excerpt).toHaveLength(280);
    expect(excerpt.endsWith('…')).toBe(true);
  });

  it('ignores blank optional fields and quotes', async () => {
    const r = (await call(MessageType.ADD_REFLECTION, {
      workId: 'w',
      kind: 'idea_spark',
      body: 'short',
      title: '  ',
      experienceId: ' ',
      userEnteredQuote: { text: '  ' },
    })) as Reflection;
    expect(r).not.toHaveProperty('title');
    expect(r).not.toHaveProperty('experienceId');
    expect(r).not.toHaveProperty('userEnteredQuote');
    expect(storage.putRelationship).not.toHaveBeenCalled();

    const q = (await call(MessageType.ADD_REFLECTION, {
      workId: 'w',
      kind: 'quotation',
      body: 'b',
      userEnteredQuote: { text: 'line', locationLabel: '  ' },
    })) as Reflection;
    expect(q.userEnteredQuote).toEqual({ text: 'line', locationLabel: undefined });
    const q2 = (await call(MessageType.ADD_REFLECTION, { workId: 'w', kind: 'quotation', body: 'b', userEnteredQuote: { text: 3 } })) as Reflection;
    expect(q2).not.toHaveProperty('userEnteredQuote');
  });

  it('keeps short excerpts intact', async () => {
    vi.mocked(storage.getRelationship).mockResolvedValue(rel() as never);
    await call(MessageType.ADD_REFLECTION, { workId: 'w', kind: 'first_impression', body: '  short  ' });
    expect(lastPut<LibraryRelationship>(storage.putRelationship).latestReflectionExcerpt).toBe('short');
  });
});

describe('UPDATE_EXPERIENCE', () => {
  it('needs an experience or work id', async () => {
    await expect(call(MessageType.UPDATE_EXPERIENCE, null)).resolves.toEqual({ updated: false, reason: 'experienceId_or_workId_required' });
  });

  it('read-only calls return the latest experience or null', async () => {
    vi.mocked(storage.getExperiencesForWork).mockResolvedValue([exp({ id: 'old', updatedAt: 1 }), exp({ id: 'new', updatedAt: 2 })]);
    await expect(call(MessageType.UPDATE_EXPERIENCE, { workId: 'w' })).resolves.toMatchObject({ updated: false, experience: { id: 'new' } });
    vi.mocked(storage.getExperiencesForWork).mockResolvedValue([]);
    await expect(call(MessageType.UPDATE_EXPERIENCE, { experienceId: 'nope' })).resolves.toEqual({ updated: false, experience: null });
  });

  it('reports not_found for a mutation on an unknown experience without a work', async () => {
    await expect(call(MessageType.UPDATE_EXPERIENCE, { experienceId: 'nope', rating: 5 })).resolves.toEqual({ updated: false, reason: 'not_found' });
  });

  it('creates a new experience from a work id, validating progress and rating', async () => {
    vi.mocked(storage.getMediaItem).mockResolvedValue(book({ id: 'w' }));
    const out = (await call(MessageType.UPDATE_EXPERIENCE, {
      workId: 'w',
      progress: { unit: 'page', value: -3, total: 320 },
      rating: 7.3,
      editionId: ' ed ',
    })) as { experience: Experience };
    expect(out.experience).toMatchObject({
      kind: 'read',
      status: 'in_progress',
      rating: 7.5,
      editionId: 'ed',
      progress: { unit: 'page', value: 0, total: 320 },
    });
    expect(out.experience.id).toMatch(/^exp_w_/);
    expect(storage.putMediaItem).toHaveBeenCalledWith(expect.objectContaining({ pageCount: 320 }));
    expect(storage.putLibraryItem).not.toHaveBeenCalled();
  });

  it('keeps previous progress/rating when the new values are invalid', async () => {
    vi.mocked(storage.getExperience).mockResolvedValue(
      exp({ progress: { unit: 'percent', value: 10, total: 100 }, rating: 6, editionId: 'keep', format: 'print' } as never),
    );
    const bad = [
      { progress: { unit: 'minutes', value: 5 } },
      { progress: { unit: 'percent', value: Number.NaN } },
      { progress: { unit: 'percent', value: '5' } },
      { progress: 'lots' },
      { rating: 11 },
      { rating: -1 },
      { rating: Number.POSITIVE_INFINITY },
      { rating: '5' as never },
      { editionId: '  ' },
    ];
    for (const patch of bad) {
      const out = (await call(MessageType.UPDATE_EXPERIENCE, { experienceId: 'e1', ...patch })) as { experience: Experience };
      expect(out.experience).toMatchObject({ progress: { unit: 'percent', value: 10, total: 100 }, rating: 6, editionId: 'keep', format: 'print' });
    }
  });

  it('progress totals: keeps the old total when omitted, drops zero, and accepts each unit', async () => {
    vi.mocked(storage.getExperience).mockResolvedValue(exp({ progress: { unit: 'chapter', value: 1, total: 12 } } as never));
    for (const unit of ['percent', 'page', 'chapter', 'episode'] as const) {
      const out = (await call(MessageType.UPDATE_EXPERIENCE, { experienceId: 'e1', progress: { unit, value: 2 } })) as { experience: Experience };
      expect(out.experience.progress).toEqual({ unit, value: 2, total: 12 });
    }
    const zero = (await call(MessageType.UPDATE_EXPERIENCE, { experienceId: 'e1', progress: { unit: 'page', value: 2, total: 0 } })) as { experience: Experience };
    expect(zero.experience.progress!.total).toBeUndefined();
    vi.mocked(storage.getExperience).mockResolvedValue(exp());
    const none = (await call(MessageType.UPDATE_EXPERIENCE, { experienceId: 'e1', progress: { unit: 'page', value: 2, total: Number.NaN } })) as { experience: Experience };
    expect(none.experience.progress!.total).toBeUndefined();
    expect(storage.putMediaItem).not.toHaveBeenCalled();
  });

  it('status changes sync relationship and library, keeping existing values', async () => {
    vi.mocked(storage.getExperience).mockResolvedValue(exp({ startedAt: 100, createdAt: 50 }));
    vi.mocked(storage.getRelationship).mockResolvedValue(rel({ currentRating: 4, preferredEditionId: 'rel-ed' }) as never);
    vi.mocked(storage.getLibraryItem).mockResolvedValue(lib({ userRating: 3, preferredEditionId: 'lib-ed' }));
    const out = (await call(MessageType.UPDATE_EXPERIENCE, { experienceId: 'e1', status: 'watched' })) as { experience: Experience };
    expect(out.experience).toMatchObject({ status: 'completed', startedAt: 100, createdAt: 50 });
    expect(out.experience.completedAt).toBeTypeOf('number');
    expect(lastPut<LibraryRelationship>(storage.putRelationship)).toMatchObject({
      status: 'completed',
      currentExperienceId: 'e1',
      currentRating: 4,
      preferredEditionId: 'rel-ed',
    });
    expect(lastPut<LibraryItem>(storage.putLibraryItem)).toMatchObject({ status: 'watched', addedAt: 7, userRating: 3, preferredEditionId: 'lib-ed' });
    expect(invalidateProfileCache).toHaveBeenCalled();
  });

  it('status changes without relationship/library create fresh rows and prefer new values', async () => {
    vi.mocked(storage.getExperience).mockResolvedValue(exp({ completedAt: 11, abandonedAt: 22 }));
    const out = (await call(MessageType.UPDATE_EXPERIENCE, { experienceId: 'e1', status: 'abandoned', rating: 2, editionId: 'ed' })) as { experience: Experience };
    expect(out.experience).toMatchObject({ status: 'abandoned', abandonedAt: 22, completedAt: 11 });
    expect(storage.putRelationship).not.toHaveBeenCalled();
    expect(lastPut<LibraryItem>(storage.putLibraryItem)).toMatchObject({ userRating: 2, preferredEditionId: 'ed' });

    vi.mocked(storage.getRelationship).mockResolvedValue(rel() as never);
    await call(MessageType.UPDATE_EXPERIENCE, { experienceId: 'e1', status: 'completed', rating: 9, editionId: 'ed2' });
    expect(lastPut<LibraryRelationship>(storage.putRelationship)).toMatchObject({ currentRating: 9, preferredEditionId: 'ed2' });
    expect(lastPut<Experience>(storage.putExperience).completedAt).toBe(11);
  });

  it('fresh experiences: planned has no start; completed/abandoned stamp now; openlibrary ids read', async () => {
    const planned = (await call(MessageType.UPDATE_EXPERIENCE, { workId: 'openlibrary_w', status: 'planned' })) as { experience: Experience };
    expect(planned.experience).toMatchObject({ kind: 'read', startedAt: undefined });
    const done = (await call(MessageType.UPDATE_EXPERIENCE, { workId: 'm', status: 'completed' })) as { experience: Experience };
    expect(done.experience.completedAt).toBeTypeOf('number');
    expect(done.experience.kind).toBe('watch');
    const dropped = (await call(MessageType.UPDATE_EXPERIENCE, { workId: 'm', status: 'abandoned' })) as { experience: Experience };
    expect(dropped.experience.abandonedAt).toBeTypeOf('number');
  });

  it('does not persist page totals for non-books or unknown media', async () => {
    await call(MessageType.UPDATE_EXPERIENCE, { workId: 'openlibrary_w', progress: { unit: 'page', value: 1, total: 10 } });
    vi.mocked(storage.getMediaItem).mockResolvedValue(book({ type: 'movie' }));
    await call(MessageType.UPDATE_EXPERIENCE, { workId: 'm', progress: { unit: 'page', value: 1, total: 10 } });
    expect(storage.putMediaItem).not.toHaveBeenCalled();
  });
});
