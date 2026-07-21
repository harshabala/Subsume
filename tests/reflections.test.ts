import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageType } from '@/shared/types';
import type { Experience, Reflection } from '@/shared/catalogTypes';
import {
  putReflection,
  getReflectionsForWork,
  putExperience,
  getExperiencesForWork,
  putRelationship,
  getRelationship,
} from '@/background/storage';

vi.mock('@/background/context', () => ({
  invalidateProfileCache: vi.fn(),
}));

vi.mock('@/background/handlers/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/background/handlers/utils')>();
  return {
    ...actual,
    broadcastMessage: vi.fn().mockResolvedValue(undefined),
  };
});

import { reflectionHandlers } from '@/background/handlers/reflections';
import { libraryHandlers } from '@/background/handlers/library';

const sender = {} as chrome.runtime.MessageSender;
const workId = 'tmdb_movie_reflections_1';

describe('reflectionHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ADD_REFLECTION then GET_REFLECTIONS returns the entry sorted by createdAt asc', async () => {
    const add = reflectionHandlers[MessageType.ADD_REFLECTION]!;
    const get = reflectionHandlers[MessageType.GET_REFLECTIONS]!;

    const first = (await add(
      {
        workId,
        kind: 'first_impression',
        body: 'The rain never left me.',
      },
      sender,
    )) as Reflection;

    expect(first.id).toBeTruthy();
    expect(first.workId).toBe(workId);
    expect(first.kind).toBe('first_impression');
    expect(first.body).toBe('The rain never left me.');
    expect(typeof first.createdAt).toBe('number');

    // Ensure a slightly later timestamp for stable sort
    await new Promise((r) => setTimeout(r, 5));

    const second = (await add(
      {
        workId,
        kind: 'later_reflection',
        body: 'Years later, the neon still hums.',
      },
      sender,
    )) as Reflection;

    expect(second.id).not.toBe(first.id);

    const list = (await get({ workId }, sender)) as Reflection[];
    expect(list.length).toBeGreaterThanOrEqual(2);
    const ours = list.filter((r) => r.workId === workId && (r.id === first.id || r.id === second.id));
    expect(ours).toHaveLength(2);
    expect(ours[0].createdAt).toBeLessThanOrEqual(ours[1].createdAt);
    expect(ours.map((r) => r.body)).toEqual([
      'The rain never left me.',
      'Years later, the neon still hums.',
    ]);
  });

  it('append does not overwrite earlier reflections', async () => {
    const add = reflectionHandlers[MessageType.ADD_REFLECTION]!;
    const get = reflectionHandlers[MessageType.GET_REFLECTIONS]!;
    const id = 'ol_work_append_test';

    const a = (await add(
      { workId: id, kind: 'first_impression', body: 'First words on the page.' },
      sender,
    )) as Reflection;
    const b = (await add(
      { workId: id, kind: 'later_reflection', body: 'A second sitting, colder weather.' },
      sender,
    )) as Reflection;
    const c = (await add(
      {
        workId: id,
        kind: 'quotation',
        body: 'So we beat on, boats against the current',
        userEnteredQuote: {
          text: 'So we beat on, boats against the current',
          locationLabel: 'ch. 9',
        },
      },
      sender,
    )) as Reflection;

    const list = (await get({ workId: id }, sender)) as Reflection[];
    const ids = list.map((r) => r.id);
    expect(ids).toContain(a.id);
    expect(ids).toContain(b.id);
    expect(ids).toContain(c.id);

    const storedA = list.find((r) => r.id === a.id);
    expect(storedA?.body).toBe('First words on the page.');

    const quote = list.find((r) => r.id === c.id);
    expect(quote?.kind).toBe('quotation');
    expect(quote?.userEnteredQuote?.locationLabel).toBe('ch. 9');

    // Storage-level: three distinct rows for this work from these adds
    const fromStore = await getReflectionsForWork(id);
    const ourRows = fromStore.filter((r) => [a.id, b.id, c.id].includes(r.id));
    expect(ourRows).toHaveLength(3);
  });

  it('ADD_REFLECTION updates relationship latestReflectionExcerpt when present', async () => {
    const relWork = 'tmdb_movie_excerpt_rel';
    await putRelationship({
      workId: relWork,
      status: 'completed',
      addedAt: Date.now() - 1000,
      updatedAt: Date.now() - 1000,
    });

    const add = reflectionHandlers[MessageType.ADD_REFLECTION]!;
    await add(
      { workId: relWork, kind: 'later_reflection', body: 'The coda rewrote the whole film.' },
      sender,
    );

    const rel = await getRelationship(relWork);
    expect(rel?.latestReflectionExcerpt).toBe('The coda rewrote the whole film.');
  });

  it('UPDATE_EXPERIENCE updates progress by experienceId or workId', async () => {
    const expWork = 'ol_work_exp_progress';
    const experience: Experience = {
      id: 'exp_test_1',
      workId: expWork,
      kind: 'read',
      status: 'in_progress',
      createdAt: Date.now() - 5000,
      updatedAt: Date.now() - 5000,
      progress: { unit: 'page', value: 10, total: 300 },
    };
    await putExperience(experience);

    const update = reflectionHandlers[MessageType.UPDATE_EXPERIENCE]!;
    const byId = (await update(
      {
        experienceId: 'exp_test_1',
        progress: { unit: 'page', value: 42, total: 300 },
      },
      sender,
    )) as { updated: boolean; experience?: Experience };

    expect(byId.updated).toBe(true);
    expect(byId.experience?.progress?.value).toBe(42);

    const byWork = (await update(
      {
        workId: expWork,
        progress: { unit: 'percent', value: 50 },
        rating: 8,
      },
      sender,
    )) as { updated: boolean; experience?: Experience };

    expect(byWork.updated).toBe(true);
    expect(byWork.experience?.progress?.unit).toBe('percent');
    expect(byWork.experience?.progress?.value).toBe(50);
    expect(byWork.experience?.rating).toBe(8);

    const stored = await getExperiencesForWork(expWork);
    expect(stored[0].progress?.value).toBe(50);

    // Read-only fetch with workId alone
    const peek = (await update({ workId: expWork }, sender)) as {
      updated: boolean;
      experience?: Experience | null;
    };
    expect(peek.updated).toBe(false);
    expect(peek.experience?.progress?.value).toBe(50);
  });

  it('rejects invalid ADD_REFLECTION payloads', async () => {
    const add = reflectionHandlers[MessageType.ADD_REFLECTION]!;
    await expect(add({ workId: '', kind: 'later_reflection', body: 'x' }, sender)).rejects.toThrow();
    await expect(add({ workId: 'w', kind: 'nope', body: 'x' }, sender)).rejects.toThrow();
    await expect(add({ workId: 'w', kind: 'later_reflection', body: '   ' }, sender)).rejects.toThrow();
  });
});

describe('SET_USER_NOTES appends reflections without clobbering prior ones', () => {
  const mediaId = 'tmdb_movie_notes_append';

  beforeEach(async () => {
    vi.clearAllMocks();
    // Seed an explicit first reflection
    await putReflection({
      id: 'seed_first_ref',
      workId: mediaId,
      kind: 'first_impression',
      body: 'Original first impression stays.',
      createdAt: Date.now() - 10_000,
      updatedAt: Date.now() - 10_000,
    });

    const { putMediaItem, putLibraryItem } = await import('@/background/storage');
    await putMediaItem({
      id: mediaId,
      canonicalTitle: 'Notes Append Film',
      type: 'movie',
      year: 2020,
      genres: [],
      ratings: [],
      providers: [{ provider: 'tmdb', externalId: '1' }],
      posterUrl: '',
    });
    await putLibraryItem({
      mediaId,
      status: 'watched',
      sanctuaryIntent: 'keep_memory',
      addedAt: Date.now() - 10_000,
      updatedAt: Date.now() - 10_000,
      emotionalRecall: 'Original first impression stays.',
    });
  });

  it('saving new notes appends rather than removing the first impression', async () => {
    const handler = libraryHandlers[MessageType.SET_USER_NOTES]!;
    const result = await handler(
      {
        mediaId,
        notes: 'A later sitting under different light.',
        emotionalRecall: 'A later sitting under different light.',
      },
      sender,
    );

    expect(result).toEqual({ updated: true });

    const reflections = await getReflectionsForWork(mediaId);
    const first = reflections.find((r) => r.id === 'seed_first_ref');
    expect(first?.body).toBe('Original first impression stays.');

    const hasLater = reflections.some(
      (r) => r.body.includes('later sitting under different light'),
    );
    expect(hasLater).toBe(true);
    expect(reflections.length).toBeGreaterThanOrEqual(2);
  });
});
