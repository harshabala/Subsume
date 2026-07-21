import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageType } from '@/shared/types';
import type { Experience } from '@/shared/catalogTypes';
import {
  putExperience,
  getExperiencesForWork,
  putMediaItem,
  putLibraryItem,
  getLibraryItem,
  getRelationship,
  putEdition,
  getEditionsForWork,
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
import { bookHandlers } from '@/background/handlers/books';

const sender = {} as chrome.runtime.MessageSender;

describe('CREATE_EXPERIENCE + GET_EXPERIENCES', () => {
  const workId = 'tmdb_movie_exp_session_1';

  beforeEach(async () => {
    vi.clearAllMocks();
    await putMediaItem({
      id: workId,
      canonicalTitle: 'Mulholland Drive',
      type: 'movie',
      year: 2001,
      genres: ['Mystery'],
      ratings: [],
      providers: [{ provider: 'tmdb', externalId: '1' }],
      posterUrl: '',
    });
    await putLibraryItem({
      mediaId: workId,
      status: 'watched',
      sanctuaryIntent: 'keep_memory',
      addedAt: Date.now() - 10_000,
      updatedAt: Date.now() - 10_000,
      userRating: 9,
    });
  });

  it('CREATE_EXPERIENCE starts a new in-progress watch session', async () => {
    const create = reflectionHandlers[MessageType.CREATE_EXPERIENCE]!;
    const first = (await create(
      { workId, kind: 'watch', status: 'in_progress' },
      sender,
    )) as Experience;

    expect(first.id).toBeTruthy();
    expect(first.workId).toBe(workId);
    expect(first.kind).toBe('watch');
    expect(first.status).toBe('in_progress');
    expect(first.startedAt).toBeTypeOf('number');

    const lib = await getLibraryItem(workId);
    expect(lib?.status).toBe('watching');

    const rel = await getRelationship(workId);
    expect(rel?.currentExperienceId).toBe(first.id);
    expect(rel?.status).toBe('in_progress');
  });

  it('GET_EXPERIENCES lists multiple sessions after reread/rewatch', async () => {
    const completed: Experience = {
      id: 'exp_prior_1',
      workId,
      kind: 'watch',
      status: 'completed',
      rating: 8,
      completedAt: Date.now() - 50_000,
      createdAt: Date.now() - 60_000,
      updatedAt: Date.now() - 50_000,
      progress: { unit: 'percent', value: 100 },
    };
    await putExperience(completed);

    const create = reflectionHandlers[MessageType.CREATE_EXPERIENCE]!;
    const second = (await create(
      { workId, kind: 'watch', status: 'in_progress' },
      sender,
    )) as Experience;

    expect(second.id).not.toBe(completed.id);

    const get = reflectionHandlers[MessageType.GET_EXPERIENCES]!;
    const list = (await get({ workId }, sender)) as Experience[];

    expect(list.length).toBeGreaterThanOrEqual(2);
    const ids = list.map((e) => e.id);
    expect(ids).toContain(completed.id);
    expect(ids).toContain(second.id);
    // Newest first
    expect(list[0].updatedAt).toBeGreaterThanOrEqual(list[1].updatedAt);

    const fromStore = await getExperiencesForWork(workId);
    expect(fromStore.length).toBeGreaterThanOrEqual(2);
  });

  it('CREATE_EXPERIENCE for books uses kind read by default', async () => {
    const bookId = 'openlibrary_work_OL_exp_book_1';
    await putMediaItem({
      id: bookId,
      canonicalTitle: 'The Great Gatsby',
      type: 'book',
      year: 1925,
      genres: [],
      ratings: [],
      providers: [{ provider: 'openlibrary', externalId: 'OL_exp_book_1' }],
      posterUrl: '',
      authors: ['F. Scott Fitzgerald'],
    });
    await putLibraryItem({
      mediaId: bookId,
      status: 'watched',
      addedAt: Date.now() - 1000,
      updatedAt: Date.now() - 1000,
    });

    const create = reflectionHandlers[MessageType.CREATE_EXPERIENCE]!;
    const exp = (await create({ workId: bookId }, sender)) as Experience;
    expect(exp.kind).toBe('read');
    expect(exp.status).toBe('in_progress');
  });

  it('rejects CREATE_EXPERIENCE without workId', async () => {
    const create = reflectionHandlers[MessageType.CREATE_EXPERIENCE]!;
    await expect(create({}, sender)).rejects.toThrow(/workId/);
  });
});

describe('SET_PREFERRED_EDITION + GET_BOOK_EDITIONS storage path', () => {
  const workId = 'openlibrary_work_OL468431W_pref';
  const editionId = 'openlibrary_edition_OL24347578M_pref';

  beforeEach(async () => {
    vi.clearAllMocks();
    await putMediaItem({
      id: workId,
      canonicalTitle: 'The Great Gatsby',
      type: 'book',
      year: 1925,
      genres: [],
      ratings: [],
      providers: [{ provider: 'openlibrary', externalId: 'OL468431W' }],
      posterUrl: '',
      authors: ['F. Scott Fitzgerald'],
    });
    await putLibraryItem({
      mediaId: workId,
      status: 'watching',
      addedAt: Date.now() - 1000,
      updatedAt: Date.now() - 1000,
    });
    await putEdition({
      id: editionId,
      workId,
      title: 'The Great Gatsby',
      authors: ['F. Scott Fitzgerald'],
      isbn13: ['9780743273565'],
      format: 'paperback',
      providerIds: [{ provider: 'openlibrary', externalId: 'OL24347578M' }],
      sourceProvenance: [
        {
          provider: 'openlibrary',
          fields: ['title', 'workId'],
          fetchedAt: Date.now(),
        },
      ],
      sourceConfidence: 'high',
    });
  });

  it('SET_PREFERRED_EDITION updates relationship, library, and media', async () => {
    const set = bookHandlers[MessageType.SET_PREFERRED_EDITION]!;
    const result = (await set(
      { workId, editionId },
      sender,
    )) as { updated: boolean; preferredEditionId: string };

    expect(result.updated).toBe(true);
    expect(result.preferredEditionId).toBe(editionId);

    const rel = await getRelationship(workId);
    expect(rel?.preferredEditionId).toBe(editionId);

    const lib = await getLibraryItem(workId);
    expect(lib?.preferredEditionId).toBe(editionId);

    const { getMediaItem } = await import('@/background/storage');
    const media = await getMediaItem(workId);
    expect(media?.preferredEditionId).toBe(editionId);
  });

  it('GET_BOOK_EDITIONS returns stored editions with preferred first', async () => {
    const secondId = 'openlibrary_edition_second_pref';
    await putEdition({
      id: secondId,
      workId,
      title: 'The Great Gatsby (Hardcover)',
      authors: ['F. Scott Fitzgerald'],
      format: 'hardcover',
      providerIds: [{ provider: 'openlibrary', externalId: 'second' }],
      sourceProvenance: [
        {
          provider: 'openlibrary',
          fields: ['title'],
          fetchedAt: Date.now(),
        },
      ],
      sourceConfidence: 'medium',
    });

    const set = bookHandlers[MessageType.SET_PREFERRED_EDITION]!;
    await set({ workId, editionId: secondId }, sender);

    const get = bookHandlers[MessageType.GET_BOOK_EDITIONS]!;
    const res = (await get({ workId }, sender)) as {
      editions: { id: string }[];
      preferredEditionId: string | null;
    };

    expect(res.editions.length).toBeGreaterThanOrEqual(2);
    expect(res.preferredEditionId).toBe(secondId);
    expect(res.editions[0].id).toBe(secondId);

    const stored = await getEditionsForWork(workId);
    expect(stored.some((e) => e.id === editionId)).toBe(true);
  });
});
