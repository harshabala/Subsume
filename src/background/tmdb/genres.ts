import { BASE_URL, getTmdbApiKey, fetchWithRetry, makeBearerHeaders } from './client';

let GENRE_MAP: Record<number, string> = {};
let GENRE_MAP_LOADED = false;
let genreMapPromise: Promise<void> | null = null;

export async function loadGenreMap(): Promise<Record<number, string>> {
  if (GENRE_MAP_LOADED) return GENRE_MAP;
  if (!genreMapPromise) {
    genreMapPromise = (async () => {
      try {
        const key = getTmdbApiKey();
        const [movieRes, tvRes] = await Promise.all([
          fetchWithRetry(`${BASE_URL}/genre/movie/list?language=en-US`, 3, 500, makeBearerHeaders(key)),
          fetchWithRetry(`${BASE_URL}/genre/tv/list?language=en-US`, 3, 500, makeBearerHeaders(key)),
        ]);
        const movieData = await movieRes.json();
        const tvData = await tvRes.json();
        const map: Record<number, string> = {};
        for (const g of movieData.genres || []) {
          map[g.id] = g.name;
        }
        for (const g of tvData.genres || []) {
          map[g.id] = g.name;
        }
        GENRE_MAP = map;
        GENRE_MAP_LOADED = true;
      } catch (err) {
        console.error('[Subsume] Failed to load genre map:', err);
        genreMapPromise = null;
        throw err;
      }
    })();
  }
  await genreMapPromise;
  return GENRE_MAP;
}
