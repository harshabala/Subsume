export const AVAILABLE_GENRES = [
  { id: '28', name: 'Action' },
  { id: '16', name: 'Animation' },
  { id: '35', name: 'Comedy' },
  { id: '99', name: 'Documentary' },
  { id: '18', name: 'Drama' },
  { id: '14', name: 'Fantasy' },
  { id: '27', name: 'Horror' },
  { id: '10749', name: 'Romance' },
  { id: '878', name: 'Sci-Fi' },
  { id: '53', name: 'Thriller' },
] as const;

const GENRE_ID_TO_NAME = new Map(AVAILABLE_GENRES.map((g) => [g.id, g.name]));

/** TMDb API names that differ from our Settings labels. */
const GENRE_ALIASES: Record<string, string[]> = {
  'Sci-Fi': ['Science Fiction'],
  'Science Fiction': ['Sci-Fi'],
};

function normalizeGenreKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Resolves Settings genre IDs (e.g. '28') or names (e.g. 'Action') to display names. */
export function resolveGenreNames(genreIdsOrNames: string[]): string[] {
  return genreIdsOrNames.map((g) => GENRE_ID_TO_NAME.get(g) ?? g);
}

/** True when two genre labels refer to the same genre (handles TMDb vs Settings naming). */
export function genresMatch(a: string, b: string): boolean {
  if (normalizeGenreKey(a) === normalizeGenreKey(b)) return true;
  const aliasesA = GENRE_ALIASES[a] ?? [];
  const aliasesB = GENRE_ALIASES[b] ?? [];
  return (
    aliasesA.some((alias) => normalizeGenreKey(alias) === normalizeGenreKey(b)) ||
    aliasesB.some((alias) => normalizeGenreKey(alias) === normalizeGenreKey(a))
  );
}

/** True when any media genre matches any of the target genre names. */
export function hasGenreMatch(targetGenres: string[], mediaGenres: string[]): boolean {
  if (targetGenres.length === 0) return true;
  return targetGenres.some((target) =>
    mediaGenres.some((mediaGenre) => genresMatch(target, mediaGenre))
  );
}