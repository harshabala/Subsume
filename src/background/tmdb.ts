import { setApiKey as clientSetApiKey } from './tmdb/client';
import { loadGenreMap } from './tmdb/genres';

export { POSTER_BASE_URL, fetchWithRetry, makeBearerHeaders } from './tmdb/client';
export { mapWatchProvidersResponse } from './tmdb/mappers';
export type { TmdbWatchProvidersResponse, MapWatchProvidersOptions } from './tmdb/mappers';
export { fetchWatchProviders } from './tmdb/streaming';
export { enrichMediaWithStreaming, enrichMediaWithOmdbRatings } from './tmdb/enrichment';
export { searchTitle, searchTitles, getLatestReleases } from './tmdb/search';
export { searchPerson, fetchPersonDetails, fetchPersonFilmography } from './tmdb/person';

export function setTmdbApiKey(key: string): void {
  clientSetApiKey(key);
  loadGenreMap().catch(() => {});
}
