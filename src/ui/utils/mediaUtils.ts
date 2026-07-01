import { MediaItem } from '@/shared/types';

export function pickRating(media: MediaItem): string | null {
  const imdb = media.ratings.find((r) => r.provider === 'imdb');
  if (imdb) return `IMDb ${imdb.score}/10`;
  const tmdb = media.ratings.find((r) => r.provider === 'tmdb');
  if (tmdb) return `TMDb ${tmdb.score.toFixed(1)}`;
  return null;
}

export function platformsToAvailability(platforms: string[]) {
  return platforms.map((platform) => ({ region: '', platform }));
}
