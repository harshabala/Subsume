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

/** Resolves Settings genre IDs (e.g. '28') or names (e.g. 'Action') to display names. */
export function resolveGenreNames(genreIdsOrNames: string[]): string[] {
  return genreIdsOrNames.map((g) => GENRE_ID_TO_NAME.get(g) ?? g);
}