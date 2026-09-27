import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageType, type PersonItem, type UserPreferences } from '@/shared/types';
import type { CatalogWork, Creator } from '@/shared/catalogTypes';

vi.mock('@/background/tmdb', () => ({
  searchPerson: vi.fn(),
  fetchPersonDetails: vi.fn(),
  fetchPersonFilmography: vi.fn(),
}));
vi.mock('@/background/storage', () => ({
  getPreferences: vi.fn(),
  getPersonById: vi.fn(),
  savePerson: vi.fn(),
  deletePerson: vi.fn(),
  updatePersonSync: vi.fn(),
  getMediaItem: vi.fn(),
  getAllPeople: vi.fn(),
  putCreator: vi.fn(),
  putMediaItem: vi.fn(),
}));
vi.mock('@/background/openLibrary', () => ({
  searchOpenLibraryAuthors: vi.fn(),
  getOpenLibraryAuthorWorks: vi.fn(),
}));
vi.mock('@/background/handlers/utils', () => ({ broadcastMessage: vi.fn() }));
vi.mock('@/shared/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn() } }));

import { peopleHandlers } from '@/background/handlers/people';
import * as tmdb from '@/background/tmdb';
import * as storage from '@/background/storage';
import * as ol from '@/background/openLibrary';
import { broadcastMessage } from '@/background/handlers/utils';
import { logger } from '@/shared/logger';

const sender = {} as chrome.runtime.MessageSender;
const call = (type: MessageType, payload: unknown = {}) => peopleHandlers[type]!(payload, sender);
const prefs = (over: Partial<UserPreferences> = {}) => ({ tmdbApiKey: 'k', ...over }) as UserPreferences;
const OL_ID = 'openlibrary_author_OL1A';

const work = (id: string, authors?: string[]): CatalogWork => ({
  id,
  medium: 'book',
  canonicalTitle: `Book ${id}`,
  genres: [],
  images: {},
  externalIds: [],
  creatorCredits: [],
  bookDetails: authors ? ({ authors } as CatalogWork['bookDetails']) : undefined,
  sourceProvenance: [],
  sourceConfidence: 'high',
  createdAt: 0,
  updatedAt: 0,
});
const person = (over: Partial<PersonItem> = {}): PersonItem => ({
  id: 'p1',
  name: 'Person',
  role: 'director',
  knownFor: [],
  filmographyIds: [],
  followedAt: 1,
  lastSyncedAt: 0,
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('SEARCH_PERSON', () => {
  it('returns no results for a blank query without touching preferences', async () => {
    await expect(call(MessageType.SEARCH_PERSON, { query: '   ' })).resolves.toEqual({ results: [] });
    await expect(call(MessageType.SEARCH_PERSON, {})).resolves.toEqual({ results: [] });
    expect(storage.getPreferences).not.toHaveBeenCalled();
  });

  it('merges TMDb people and Open Library authors, deduplicating ids', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
    vi.mocked(tmdb.searchPerson).mockResolvedValue([
      { id: '1', name: 'A', knownForDepartment: 'Directing', profilePath: null, knownFor: [] },
      { id: '1', name: 'A dup', knownForDepartment: 'Directing', profilePath: null, knownFor: [] },
    ]);
    vi.mocked(ol.searchOpenLibraryAuthors).mockResolvedValue([
      { id: OL_ID, name: 'Le Guin', biography: 'Known for Earthsea · 1968', profileImageUrl: 'https://img' },
      { id: OL_ID, name: 'dup', biography: undefined },
      { id: 'openlibrary_author_OL2A', name: 'No bio' },
    ] as Creator[]);

    const res = (await call(MessageType.SEARCH_PERSON, { query: ' ursula ' })) as { results: unknown[] };
    expect(tmdb.searchPerson).toHaveBeenCalledWith('ursula', 'k');
    expect(res.results).toEqual([
      { id: '1', name: 'A', knownForDepartment: 'Directing', profilePath: null, knownFor: [] },
      {
        id: OL_ID,
        name: 'Le Guin',
        knownForDepartment: 'Author',
        profilePath: 'https://img',
        knownFor: [{ title: 'Earthsea', mediaType: 'book' }],
      },
      { id: 'openlibrary_author_OL2A', name: 'No bio', knownForDepartment: 'Author', profilePath: null, knownFor: [] },
    ]);
  });

  it('keeps going when TMDb or Open Library search fails', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
    vi.mocked(tmdb.searchPerson).mockRejectedValue(new Error('tmdb down'));
    vi.mocked(ol.searchOpenLibraryAuthors).mockRejectedValue(new Error('ol down'));
    await expect(call(MessageType.SEARCH_PERSON, { query: 'x' })).resolves.toEqual({ results: [] });
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it('skips Open Library when disabled, and reports a missing key when nothing can search', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ openLibraryEnabled: false, tmdbApiKey: undefined }));
    await expect(call(MessageType.SEARCH_PERSON, { query: 'x' })).resolves.toEqual({ error: 'TMDb API key not set' });
    expect(ol.searchOpenLibraryAuthors).not.toHaveBeenCalled();

    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ openLibraryEnabled: false }));
    vi.mocked(tmdb.searchPerson).mockResolvedValue([]);
    await expect(call(MessageType.SEARCH_PERSON, { query: 'x' })).resolves.toEqual({ results: [] });
  });
});

describe('FOLLOW_PERSON (Open Library authors)', () => {
  const req = {
    personId: OL_ID,
    name: 'Le Guin',
    knownForDepartment: 'Author',
    profilePath: 'https://covers/x.jpg',
    knownFor: [{ title: 'A' }, { title: 'B' }, { title: 'C' }, { title: 'D' }],
    role: 'writer',
  };

  it('returns alreadyFollowing for a known author', async () => {
    vi.mocked(storage.getPersonById).mockResolvedValue(person({ id: OL_ID }));
    await expect(call(MessageType.FOLLOW_PERSON, req)).resolves.toEqual({ alreadyFollowing: true });
  });

  it('stores works, the creator and the person, then broadcasts', async () => {
    vi.mocked(storage.getPersonById).mockResolvedValue(undefined);
    const works = Array.from({ length: 42 }, (_, i) => work(`w${i}`, i === 0 ? ['Le Guin'] : undefined));
    vi.mocked(ol.getOpenLibraryAuthorWorks).mockResolvedValue(works);

    await expect(call(MessageType.FOLLOW_PERSON, req)).resolves.toEqual({ success: true });

    expect(storage.putMediaItem).toHaveBeenCalledTimes(40);
    expect(vi.mocked(storage.putMediaItem).mock.calls[0][0]).toMatchObject({ id: 'w0', type: 'book', authors: ['Le Guin'] });
    const creator = vi.mocked(storage.putCreator).mock.calls[0][0];
    expect(creator).toMatchObject({
      id: OL_ID,
      roles: ['author'],
      biography: 'Known for A, B, C, D',
      profileImageUrl: 'https://covers/x.jpg',
      externalIds: [{ provider: 'openlibrary', externalId: 'OL1A', url: 'https://openlibrary.org/authors/OL1A' }],
    });
    expect(creator.knownForWorkIds).toHaveLength(42);
    expect(vi.mocked(storage.savePerson).mock.calls[0][0]).toMatchObject({ id: OL_ID, role: 'writer', knownFor: ['A', 'B', 'C'] });
    expect(broadcastMessage).toHaveBeenCalledWith({ type: 'FILMMAKERS_UPDATED', action: 'follow', personId: OL_ID });
  });

  it('still follows when the works fetch fails; drops non-http profile paths and missing knownFor', async () => {
    vi.mocked(storage.getPersonById).mockResolvedValue(undefined);
    vi.mocked(ol.getOpenLibraryAuthorWorks).mockRejectedValue(new Error('ol down'));
    await expect(
      call(MessageType.FOLLOW_PERSON, { ...req, profilePath: '/relative.jpg', knownFor: undefined }),
    ).resolves.toEqual({ success: true });
    const creator = vi.mocked(storage.putCreator).mock.calls[0][0];
    expect(creator.profileImageUrl).toBeUndefined();
    expect(creator.biography).toBeUndefined();
    expect(creator.knownForWorkIds).toEqual([]);
    expect(vi.mocked(storage.savePerson).mock.calls[0][0].knownFor).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith('[Subsume] Author works fetch failed:', expect.any(Error));

    vi.clearAllMocks();
    vi.mocked(ol.getOpenLibraryAuthorWorks).mockResolvedValue([]);
    await call(MessageType.FOLLOW_PERSON, { ...req, profilePath: null, knownFor: [] });
    expect(vi.mocked(storage.putCreator).mock.calls[0][0]).toMatchObject({ profileImageUrl: undefined, biography: undefined });
  });
});

describe('FOLLOW_PERSON (TMDb people)', () => {
  const req = {
    personId: '42',
    name: 'Agnès Varda',
    knownForDepartment: 'Directing',
    profilePath: '/v.jpg',
    knownFor: [{ title: 'Cléo' }, { title: 'Vagabond' }, { title: 'Faces' }, { title: 'Gleaners' }],
    role: 'director',
  };

  it('requires a TMDb key', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ tmdbApiKey: undefined }));
    await expect(call(MessageType.FOLLOW_PERSON, req)).rejects.toThrow('TMDb API key not set');
  });

  it('returns alreadyFollowing for a known person', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
    vi.mocked(storage.getPersonById).mockResolvedValue(person());
    await expect(call(MessageType.FOLLOW_PERSON, req)).resolves.toEqual({ alreadyFollowing: true });
  });

  it('saves the person and syncs the filmography in the background', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
    vi.mocked(storage.getPersonById).mockResolvedValue(undefined);
    vi.mocked(tmdb.fetchPersonDetails).mockResolvedValue({ biography: 'Bio' } as never);
    vi.mocked(tmdb.fetchPersonFilmography).mockResolvedValue([
      { tmdbId: '1', mediaType: 'movie' },
      { tmdbId: '2', mediaType: 'tv' },
    ] as never);

    await expect(call(MessageType.FOLLOW_PERSON, req)).resolves.toEqual({ success: true });
    expect(vi.mocked(storage.savePerson).mock.calls[0][0]).toMatchObject({
      id: '42',
      role: 'director',
      profileImageUrl: '/v.jpg',
      biography: 'Bio',
      knownFor: ['Cléo', 'Vagabond', 'Faces'],
    });
    await vi.waitFor(() => expect(storage.updatePersonSync).toHaveBeenCalledWith('42', ['tmdb_movie_1', 'tmdb_tv_2']));
    await vi.waitFor(() =>
      expect(broadcastMessage).toHaveBeenCalledWith({ type: 'FILMMAKERS_UPDATED', action: 'sync', personId: '42' }),
    );
    expect(broadcastMessage).toHaveBeenCalledWith({ type: 'FILMMAKERS_UPDATED', action: 'follow', personId: '42' });
  });

  it('logs a failed background filmography sync and stores a null profile path as undefined', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
    vi.mocked(storage.getPersonById).mockResolvedValue(undefined);
    vi.mocked(tmdb.fetchPersonDetails).mockResolvedValue({ biography: '' } as never);
    vi.mocked(tmdb.fetchPersonFilmography).mockRejectedValue(new Error('tmdb down'));
    await call(MessageType.FOLLOW_PERSON, { ...req, profilePath: null });
    expect(vi.mocked(storage.savePerson).mock.calls[0][0].profileImageUrl).toBeUndefined();
    await vi.waitFor(() =>
      expect(logger.warn).toHaveBeenCalledWith('[Subsume] Filmography sync failed for person', '42', expect.any(Error)),
    );
  });
});

describe('UNFOLLOW_PERSON', () => {
  it('is a no-op for unknown people and deletes + broadcasts for followed ones', async () => {
    vi.mocked(storage.getPersonById).mockResolvedValue(undefined);
    await expect(call(MessageType.UNFOLLOW_PERSON, { personId: 'x' })).resolves.toEqual({ success: true });
    expect(storage.deletePerson).not.toHaveBeenCalled();
    expect(broadcastMessage).not.toHaveBeenCalled();

    vi.mocked(storage.getPersonById).mockResolvedValue(person({ id: 'x' }));
    await call(MessageType.UNFOLLOW_PERSON, { personId: 'x' });
    expect(storage.deletePerson).toHaveBeenCalledWith('x');
    expect(broadcastMessage).toHaveBeenCalledWith({ type: 'FILMMAKERS_UPDATED', action: 'unfollow', personId: 'x' });
  });
});

describe('GET_FILMOGRAPHY', () => {
  it('returns empty for an unknown person', async () => {
    vi.mocked(storage.getPersonById).mockResolvedValue(undefined);
    await expect(call(MessageType.GET_FILMOGRAPHY, { personId: 'x' })).resolves.toEqual({ items: [], person: null });
  });

  it('resolves stored ids and drops missing media', async () => {
    vi.mocked(storage.getPersonById).mockResolvedValue(person({ filmographyIds: ['a', 'gone'] }));
    vi.mocked(storage.getMediaItem).mockImplementation(async (id) => (id === 'a' ? ({ id: 'a' } as never) : undefined));
    const res = (await call(MessageType.GET_FILMOGRAPHY, { personId: 'p1' })) as { items: unknown[] };
    expect(res.items).toEqual([{ id: 'a' }]);
  });

  it('fills an empty author bibliography from Open Library (max 50) and tolerates failures', async () => {
    const author = person({ id: OL_ID, filmographyIds: [] });
    vi.mocked(storage.getPersonById).mockResolvedValue(author);
    vi.mocked(ol.getOpenLibraryAuthorWorks).mockResolvedValue(
      Array.from({ length: 55 }, (_, i) => work(`w${i}`, i === 0 ? ['X'] : undefined)),
    );
    vi.mocked(storage.getMediaItem).mockImplementation(async (id) => ({ id }) as never);
    const res = (await call(MessageType.GET_FILMOGRAPHY, { personId: OL_ID })) as { items: unknown[] };
    expect(res.items).toHaveLength(50);
    expect(storage.updatePersonSync).toHaveBeenCalledWith(OL_ID, expect.arrayContaining(['w0', 'w49']));

    vi.mocked(storage.getPersonById).mockResolvedValue(person({ id: OL_ID, filmographyIds: [] }));
    vi.mocked(ol.getOpenLibraryAuthorWorks).mockRejectedValue(new Error('down'));
    await expect(call(MessageType.GET_FILMOGRAPHY, { personId: OL_ID })).resolves.toMatchObject({ items: [] });
    expect(logger.warn).toHaveBeenCalledWith('[Subsume] Author bibliography refresh failed:', expect.any(Error));
  });

  it('does not refetch an author who already has works', async () => {
    vi.mocked(storage.getPersonById).mockResolvedValue(person({ id: OL_ID, filmographyIds: ['w1'] }));
    vi.mocked(storage.getMediaItem).mockResolvedValue({ id: 'w1' } as never);
    await call(MessageType.GET_FILMOGRAPHY, { personId: OL_ID });
    expect(ol.getOpenLibraryAuthorWorks).not.toHaveBeenCalled();
  });
});

describe('SYNC_FILMOGRAPHY', () => {
  it('authors: unknown -> 0; syncs works and refreshes the creator; failures -> 0', async () => {
    vi.mocked(storage.getPersonById).mockResolvedValueOnce(undefined);
    await expect(call(MessageType.SYNC_FILMOGRAPHY, { personId: OL_ID })).resolves.toEqual({ synced: 0 });

    const author = person({ id: OL_ID, role: 'writer' });
    vi.mocked(storage.getPersonById).mockResolvedValue(author);
    vi.mocked(ol.getOpenLibraryAuthorWorks).mockResolvedValue(
      Array.from({ length: 51 }, (_, i) => work(`w${i}`, i === 0 ? ['X'] : undefined)),
    );
    await expect(call(MessageType.SYNC_FILMOGRAPHY, { personId: OL_ID })).resolves.toEqual({ synced: 50 });
    expect(storage.putCreator).toHaveBeenCalledWith(expect.objectContaining({ id: OL_ID, roles: ['author'] }));

    vi.mocked(storage.putCreator).mockClear();
    vi.mocked(storage.getPersonById).mockResolvedValueOnce(author).mockResolvedValueOnce(undefined);
    await expect(call(MessageType.SYNC_FILMOGRAPHY, { personId: OL_ID })).resolves.toEqual({ synced: 50 });
    expect(storage.putCreator).not.toHaveBeenCalled();

    vi.mocked(storage.getPersonById).mockResolvedValue(author);
    vi.mocked(ol.getOpenLibraryAuthorWorks).mockRejectedValue(new Error('down'));
    await expect(call(MessageType.SYNC_FILMOGRAPHY, { personId: OL_ID })).resolves.toEqual({ synced: 0 });
  });

  it('TMDb: requires a key, handles unknown people, and stores filmography ids', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ tmdbApiKey: undefined }));
    await expect(call(MessageType.SYNC_FILMOGRAPHY, { personId: '42' })).resolves.toEqual({ error: 'TMDb API key not set' });

    vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
    vi.mocked(storage.getPersonById).mockResolvedValue(undefined);
    await expect(call(MessageType.SYNC_FILMOGRAPHY, { personId: '42' })).resolves.toEqual({ synced: 0 });

    vi.mocked(storage.getPersonById).mockResolvedValue(person({ id: '42', role: 'director' }));
    vi.mocked(tmdb.fetchPersonFilmography).mockResolvedValue([{ tmdbId: '7', mediaType: 'movie' }] as never);
    await expect(call(MessageType.SYNC_FILMOGRAPHY, { personId: '42' })).resolves.toEqual({ synced: 1 });
    expect(tmdb.fetchPersonFilmography).toHaveBeenCalledWith('42', 'director', 'k');
    expect(storage.updatePersonSync).toHaveBeenCalledWith('42', ['tmdb_movie_7']);
  });
});

describe('GET_ALL_PEOPLE', () => {
  it('wraps the stored people', async () => {
    vi.mocked(storage.getAllPeople).mockResolvedValue([person()]);
    await expect(call(MessageType.GET_ALL_PEOPLE)).resolves.toEqual({ people: [person()] });
  });
});
