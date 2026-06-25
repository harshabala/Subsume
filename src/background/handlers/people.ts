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
} from '../storage';
import { broadcastMessage } from './utils';

export const peopleHandlers: MessageHandlerMap = {
  [MessageType.SEARCH_PERSON]: async (payload) => {
    const req = payload as { query: string };
    const prefs = await getPreferences();
    if (!prefs.tmdbApiKey) {
      return { error: 'TMDb API key not set' };
    }
    const results = await searchPerson(req.query, prefs.tmdbApiKey);
    return { results };
  },

  [MessageType.FOLLOW_PERSON]: async (payload) => {
    const req = payload as {
      personId: string;
      name: string;
      knownForDepartment: string;
      profilePath: string | null;
      knownFor: Array<{ title: string; mediaType: 'movie' | 'tv' }>;
      role: CrewRole;
    };

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
      .catch(() => {});

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

    const items = await Promise.all(person.filmographyIds.map(getMediaItem));
    const validItems = items.filter((item): item is MediaItem => !!item);

    return { items: validItems, person };
  },

  [MessageType.SYNC_FILMOGRAPHY]: async (payload) => {
    const req = payload as { personId: string };
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
