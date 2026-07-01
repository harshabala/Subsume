import { ImportLibraryData, PersonItem } from './types';

const VALID_CREW_ROLES = new Set([
  'director', 'writer', 'cinematographer', 'actor',
  'composer', 'producer', 'editor',
]);

export function isValidPersonItem(p: unknown): p is PersonItem {
  if (!p || typeof p !== 'object') return false;
  const item = p as Record<string, unknown>;
  if (typeof item.id !== 'string' || !item.id) return false;
  if (typeof item.name !== 'string' || !item.name) return false;
  if (typeof item.role !== 'string' || !VALID_CREW_ROLES.has(item.role)) return false;
  if (!Array.isArray(item.knownFor) || !item.knownFor.every((k) => typeof k === 'string')) return false;
  if (!Array.isArray(item.filmographyIds) || !item.filmographyIds.every((id) => typeof id === 'string')) return false;
  if (!Number.isFinite(item.followedAt)) return false;
  if (!Number.isFinite(item.lastSyncedAt)) return false;
  if (item.profileImageUrl !== undefined && typeof item.profileImageUrl !== 'string') return false;
  if (item.biography !== undefined && typeof item.biography !== 'string') return false;
  return true;
}

export const validateImportData = (data: unknown): ImportLibraryData => {
  if (!data || typeof data !== 'object') {
    throw new Error('Import file must be a JSON object');
  }
  const d = data as Record<string, unknown>;

  if (d.library !== undefined && !Array.isArray(d.library)) {
    throw new Error('"library" must be an array');
  }
  if (d.media !== undefined && !Array.isArray(d.media)) {
    throw new Error('"media" must be an array');
  }
  if (d.people !== undefined && !Array.isArray(d.people)) {
    throw new Error('"people" must be an array');
  }
  if (d.alerts !== undefined && !Array.isArray(d.alerts)) {
    throw new Error('"alerts" must be an array');
  }
  if (d.weeklyDigest !== undefined && (typeof d.weeklyDigest !== 'object' || d.weeklyDigest === null)) {
    throw new Error('"weeklyDigest" must be an object');
  }

  const validStatuses = ['to-watch', 'watching', 'watched', 'abandoned'];
  const validTypes = ['movie', 'tv'];
  const validAlertTypes = ['movie', 'tv', 'both'];

  if (Array.isArray(d.library)) {
    for (let i = 0; i < d.library.length; i++) {
      const item = d.library[i];
      if (!item || typeof item !== 'object') {
        throw new Error(`library[${i}] is not an object`);
      }
      const l = item as Record<string, unknown>;
      if (typeof l.mediaId !== 'string') {
        throw new Error(`library[${i}].mediaId must be a string`);
      }
      if (!validStatuses.includes(l.status as string)) {
        throw new Error(`library[${i}].status must be one of: ${validStatuses.join(', ')}`);
      }
      if (typeof l.addedAt !== 'number') {
        throw new Error(`library[${i}].addedAt must be a number (timestamp)`);
      }
      if (typeof l.updatedAt !== 'number') {
        throw new Error(`library[${i}].updatedAt must be a number (timestamp)`);
      }
      if (l.userRating !== undefined && (typeof l.userRating !== 'number' || l.userRating < 1 || l.userRating > 10)) {
        throw new Error(`library[${i}].userRating must be a number between 1 and 10`);
      }
    }
  }

  if (Array.isArray(d.media)) {
    for (let i = 0; i < d.media.length; i++) {
      const item = d.media[i];
      if (!item || typeof item !== 'object') {
        throw new Error(`media[${i}] is not an object`);
      }
      const m = item as Record<string, unknown>;
      if (typeof m.id !== 'string') {
        throw new Error(`media[${i}].id must be a string`);
      }
      if (typeof m.canonicalTitle !== 'string') {
        throw new Error(`media[${i}].canonicalTitle must be a string`);
      }
      if (!validTypes.includes(m.type as string)) {
        throw new Error(`media[${i}].type must be "movie" or "tv"`);
      }
      if (typeof m.year !== 'number') {
        throw new Error(`media[${i}].year must be a number`);
      }
      if (!Array.isArray(m.genres)) {
        throw new Error(`media[${i}].genres must be an array of strings`);
      }
      if (!Array.isArray(m.ratings)) {
        throw new Error(`media[${i}].ratings must be an array`);
      }
      if (!Array.isArray(m.providers)) {
        throw new Error(`media[${i}].providers must be an array`);
      }
      if (typeof m.posterUrl !== 'string') {
        throw new Error(`media[${i}].posterUrl must be a string`);
      }
    }
  }

  if (Array.isArray(d.people)) {
    for (let i = 0; i < d.people.length; i++) {
      if (!isValidPersonItem(d.people[i])) {
        throw new Error(`people[${i}] is not a valid person item`);
      }
    }
  }

  if (Array.isArray(d.alerts)) {
    for (let i = 0; i < d.alerts.length; i++) {
      const item = d.alerts[i];
      if (!item || typeof item !== 'object') {
        throw new Error(`alerts[${i}] is not an object`);
      }
      const alert = item as Record<string, unknown>;
      if (typeof alert.id !== 'string') {
        throw new Error(`alerts[${i}].id must be a string`);
      }
      if (typeof alert.name !== 'string') {
        throw new Error(`alerts[${i}].name must be a string`);
      }
      if (typeof alert.enabled !== 'boolean') {
        throw new Error(`alerts[${i}].enabled must be a boolean`);
      }
      if (typeof alert.createdAt !== 'number') {
        throw new Error(`alerts[${i}].createdAt must be a number (timestamp)`);
      }
      if (alert.type !== undefined && !validAlertTypes.includes(alert.type as string)) {
        throw new Error(`alerts[${i}].type must be one of: ${validAlertTypes.join(', ')}`);
      }
      if (alert.genres !== undefined && !Array.isArray(alert.genres)) {
        throw new Error(`alerts[${i}].genres must be an array of strings`);
      }
      if (alert.platforms !== undefined && !Array.isArray(alert.platforms)) {
        throw new Error(`alerts[${i}].platforms must be an array of strings`);
      }
      if (alert.keyword !== undefined && typeof alert.keyword !== 'string') {
        throw new Error(`alerts[${i}].keyword must be a string`);
      }
      if (alert.lastNotifiedMediaIds !== undefined && !Array.isArray(alert.lastNotifiedMediaIds)) {
        throw new Error(`alerts[${i}].lastNotifiedMediaIds must be an array of strings`);
      }
    }
  }

  if (d.weeklyDigest) {
    const digest = d.weeklyDigest as Record<string, unknown>;
    if (typeof digest.generatedAt !== 'number') {
      throw new Error('weeklyDigest.generatedAt must be a number (timestamp)');
    }
    if (typeof digest.llmGenerated !== 'boolean') {
      throw new Error('weeklyDigest.llmGenerated must be a boolean');
    }
    if (!Array.isArray(digest.items)) {
      throw new Error('weeklyDigest.items must be an array');
    }
    for (let i = 0; i < digest.items.length; i++) {
      const item = digest.items[i];
      if (!item || typeof item !== 'object') {
        throw new Error(`weeklyDigest.items[${i}] is not an object`);
      }
      const entry = item as Record<string, unknown>;
      if (typeof entry.mediaId !== 'string') {
        throw new Error(`weeklyDigest.items[${i}].mediaId must be a string`);
      }
      if (typeof entry.title !== 'string') {
        throw new Error(`weeklyDigest.items[${i}].title must be a string`);
      }
      if (typeof entry.year !== 'number') {
        throw new Error(`weeklyDigest.items[${i}].year must be a number`);
      }
      if (!validTypes.includes(entry.type as string)) {
        throw new Error(`weeklyDigest.items[${i}].type must be "movie" or "tv"`);
      }
      if (typeof entry.reason !== 'string') {
        throw new Error(`weeklyDigest.items[${i}].reason must be a string`);
      }
      if (!Array.isArray(entry.platforms)) {
        throw new Error(`weeklyDigest.items[${i}].platforms must be an array of strings`);
      }
    }
  }

  return {
    library: d.library as ImportLibraryData['library'],
    media: d.media as ImportLibraryData['media'],
    people: d.people as ImportLibraryData['people'],
    alerts: d.alerts as ImportLibraryData['alerts'],
    weeklyDigest: d.weeklyDigest as ImportLibraryData['weeklyDigest'],
  };
};
