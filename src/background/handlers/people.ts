import { MessageHandlerMap } from '@/shared/messages';
import {
  MessageType,
  CrewRole,
  PersonItem,
  MediaItem,
} from '@/shared/types';
import {
  searchPerson,
  fetchPersonDetails,
  fetchPersonFilmography,
} from '../tmdb';
import {
  getPreferences,
  getPersonById,
  savePerson,
  deletePerson,
  updatePersonSync,
  getMediaItem,
  getAllPeople,
  putCreator,
} from '../storage';
import { creatorToPersonItem, isOpenLibraryAuthorId } from '@/shared/compatibility';
import type { Creator } from '@/shared/catalogTypes';
import { logger } from '@/shared/logger';
import { broadcastMessage } from './utils';

type PersonSearchResult = {
  id: string;
  name: string;
  knownForDepartment: string;
  profilePath: string | null;
  knownFor: Array<{ title: string; mediaType?: 'movie' | 'tv' | 'book' }>;
};

function creatorToSearchResult(creator: Creator): PersonSearchResult {
  const bioHint = creator.biography?.match(/Known for (.+?)(?:\s·|$)/);
  const knownForTitle = bioHint?.[1];
  return {
    id: creator.id,
    name: creator.name,
    knownForDepartment: 'Author',
    profilePath: creator.profileImageUrl ?? null,
    knownFor: knownForTitle
      ? [{ title: knownForTitle, mediaType: 'book' }]
      : [],
  };
}

async function searchOpenLibraryAuthorsAsPeople(query: string): Promise<PersonSearchResult[]> {
  try {
    const { searchOpenLibraryAuthors } = await import('../openLibrary');
    const creators = await searchOpenLibraryAuthors(query);
    return creators.map(creatorToSearchResult);
  } catch (err) {
    logger.warn('[Subsume] Open Library author search failed:', err);
    return [];
  }
}

export const peopleHandlers: MessageHandlerMap = {
  [MessageType.SEARCH_PERSON]: async (payload) => {
    const req = payload as { query: string };
    const query = (req.query || '').trim();
    if (!query) return { results: [] as PersonSearchResult[] };

    const prefs = await getPreferences();
    const results: PersonSearchResult[] = [];
    const seen = new Set<string>();

    // TMDb people (when key present)
    if (prefs.tmdbApiKey) {
      try {
        const tmdbResults = await searchPerson(query, prefs.tmdbApiKey);
        for (const r of tmdbResults) {
          if (seen.has(r.id)) continue;
          seen.add(r.id);
          results.push(r);
        }
      } catch (err) {
        logger.warn('[Subsume] TMDb person search failed:', err);
      }
    }

    // Open Library authors when books are enabled (default on)
    if (prefs.openLibraryEnabled !== false) {
      const authors = await searchOpenLibraryAuthorsAsPeople(query);
      for (const r of authors) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        results.push(r);
      }
    }

    if (results.length === 0 && !prefs.tmdbApiKey && prefs.openLibraryEnabled === false) {
      return { error: 'TMDb API key not set' };
    }

    return { results };
  },

  [MessageType.FOLLOW_PERSON]: async (payload) => {
    const req = payload as {
      personId: string;
      name: string;
      knownForDepartment: string;
      profilePath: string | null;
      knownFor: Array<{ title: string; mediaType?: 'movie' | 'tv' | 'book' }>;
      role: CrewRole;
    };

    // ── Open Library authors ──────────────────────────────────────────
    if (isOpenLibraryAuthorId(req.personId)) {
      const existing = await getPersonById(req.personId);
      if (existing) {
        return { alreadyFollowing: true };
      }

      const now = Date.now();
      let workIds: string[] = [];
      let biography: string | undefined;
      let profileImageUrl: string | undefined =
        req.profilePath && /^https?:\/\//i.test(req.profilePath)
          ? req.profilePath
          : undefined;

      try {
        const ol = await import('../openLibrary');
        const works = await ol.getOpenLibraryAuthorWorks(req.personId);
        workIds = works.map((w) => w.id);
        // Persist works lightly so filmography/archive views can resolve them
        const { putMediaItem } = await import('../storage');
        const { catalogWorkToMediaItem } = await import('@/shared/compatibility');
        for (const work of works.slice(0, 40)) {
          const media = catalogWorkToMediaItem(work);
          media.type = 'book';
          media.authors = work.bookDetails?.authors;
          await putMediaItem(media);
        }
      } catch (err) {
        logger.warn('[Subsume] Author works fetch failed:', err);
      }

      const creator: Creator = {
        id: req.personId,
        name: req.name,
        roles: ['author'],
        biography:
          biography ||
          (req.knownFor?.length
            ? `Known for ${req.knownFor.map((k) => k.title).join(', ')}`
            : undefined),
        profileImageUrl,
        knownForWorkIds: workIds,
        followedAt: now,
        lastSyncedAt: now,
        externalIds: [
          {
            provider: 'openlibrary',
            externalId: req.personId.replace(/^openlibrary_author_/, ''),
            url: `https://openlibrary.org/authors/${req.personId.replace(/^openlibrary_author_/, '')}`,
          },
        ],
      };

      await putCreator(creator);

      const personItem: PersonItem = creatorToPersonItem(creator);
      personItem.knownFor = (req.knownFor || []).map((k) => k.title).slice(0, 3);
      personItem.role = 'writer';
      await savePerson(personItem);

      broadcastMessage({
        type: 'FILMMAKERS_UPDATED',
        action: 'follow',
        personId: personItem.id,
      });

      return { success: true };
    }

    // ── TMDb people ───────────────────────────────────────────────────
    const prefs = await getPreferences();
    if (!prefs.tmdbApiKey) {
      throw new Error('TMDb API key not set');
    }

    const existing = await getPersonById(req.personId);
    if (existing) {
      return { alreadyFollowing: true };
    }

    const details = await fetchPersonDetails(req.personId, prefs.tmdbApiKey);
    const personItem: PersonItem = {
      id: req.personId,
      name: req.name,
      role: req.role,
      profileImageUrl: req.profilePath ?? undefined,
      biography: details.biography,
      knownFor: req.knownFor.map(k => k.title).slice(0, 3),
      filmographyIds: [],
      followedAt: Date.now(),
      lastSyncedAt: 0
    };

    await savePerson(personItem);

    // Fire and forget SYNC_FILMOGRAPHY logic (do not await)
    fetchPersonFilmography(req.personId, req.role, prefs.tmdbApiKey)
      .then(async (films) => {
        const tmdbIds = films.map(f => `tmdb_${f.mediaType}_${f.tmdbId}`);
        await updatePersonSync(req.personId, tmdbIds);
        broadcastMessage({
          type: 'FILMMAKERS_UPDATED',
          action: 'sync',
          personId: req.personId
        });
      })
      .catch((err) => {
        logger.warn('[Subsume] Filmography sync failed for person', req.personId, err);
      });

    broadcastMessage({
      type: 'FILMMAKERS_UPDATED',
      action: 'follow',
      personId: personItem.id
    });

    return { success: true };
  },

  [MessageType.UNFOLLOW_PERSON]: async (payload) => {
    const req = payload as { personId: string };
    // Guard: only delete and broadcast if the person is actually followed.
    // Without this check a spurious FILMMAKERS_UPDATED event fires for unknown IDs.
    const existing = await getPersonById(req.personId);
    if (!existing) {
      return { success: true };
    }
    await deletePerson(req.personId);
    broadcastMessage({
      type: 'FILMMAKERS_UPDATED',
      action: 'unfollow',
      personId: req.personId
    });
    return { success: true };
  },

  [MessageType.GET_FILMOGRAPHY]: async (payload) => {
    const req = payload as { personId: string };
    const person = await getPersonById(req.personId);
    if (!person) {
      return { items: [], person: null };
    }

    // For Open Library authors, resolve stored work ids (books)
    if (isOpenLibraryAuthorId(req.personId) && person.filmographyIds.length === 0) {
      try {
        const ol = await import('../openLibrary');
        const works = await ol.getOpenLibraryAuthorWorks(req.personId);
        const { putMediaItem } = await import('../storage');
        const { catalogWorkToMediaItem } = await import('@/shared/compatibility');
        const ids: string[] = [];
        for (const work of works.slice(0, 50)) {
          const media = catalogWorkToMediaItem(work);
          media.type = 'book';
          media.authors = work.bookDetails?.authors;
          await putMediaItem(media);
          ids.push(media.id);
        }
        await updatePersonSync(req.personId, ids);
        person.filmographyIds = ids;
      } catch (err) {
        logger.warn('[Subsume] Author bibliography refresh failed:', err);
      }
    }

    const items = await Promise.all(person.filmographyIds.map(getMediaItem));
    const validItems = items.filter((item): item is MediaItem => !!item);

    return { items: validItems, person };
  },

  [MessageType.SYNC_FILMOGRAPHY]: async (payload) => {
    const req = payload as { personId: string };

    if (isOpenLibraryAuthorId(req.personId)) {
      const person = await getPersonById(req.personId);
      if (!person) return { synced: 0 };
      try {
        const ol = await import('../openLibrary');
        const works = await ol.getOpenLibraryAuthorWorks(req.personId);
        const { putMediaItem, putCreator: putC } = await import('../storage');
        const { catalogWorkToMediaItem, personItemToCreator } = await import('@/shared/compatibility');
        const ids: string[] = [];
        for (const work of works.slice(0, 50)) {
          const media = catalogWorkToMediaItem(work);
          media.type = 'book';
          media.authors = work.bookDetails?.authors;
          await putMediaItem(media);
          ids.push(media.id);
        }
        await updatePersonSync(req.personId, ids);
        const updated = await getPersonById(req.personId);
        if (updated) {
          await putC(personItemToCreator(updated));
        }
        return { synced: ids.length };
      } catch (err) {
        logger.warn('[Subsume] Author bibliography sync failed:', err);
        return { synced: 0 };
      }
    }

    const prefs = await getPreferences();
    if (!prefs.tmdbApiKey) {
      return { error: 'TMDb API key not set' };
    }

    const person = await getPersonById(req.personId);
    if (!person) {
      return { synced: 0 };
    }

    const films = await fetchPersonFilmography(person.id, person.role, prefs.tmdbApiKey);
    const tmdbIds = films.map(f => `tmdb_${f.mediaType}_${f.tmdbId}`);
    await updatePersonSync(person.id, tmdbIds);

    return { synced: films.length };
  },

  [MessageType.GET_ALL_PEOPLE]: async () => {
    const people = await getAllPeople();
    return { people };
  },
};
