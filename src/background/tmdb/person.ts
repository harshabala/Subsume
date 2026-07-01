import { CrewRole, MediaItem } from '@/shared/types';
import { BASE_URL, POSTER_BASE_URL, fetchWithRetry, makeBearerHeaders } from './client';
import { getAllMediaMap, putMediaItems } from '../storage';

/**
 * Searches TMDb for a person (actor/crew).
 */
export async function searchPerson(
  query: string,
  apiKey: string
): Promise<Array<{
  id: string;
  name: string;
  knownForDepartment: string;
  profilePath: string | null;
  knownFor: Array<{ title: string; mediaType: 'movie' | 'tv' }>;
}>> {
  const url = `${BASE_URL}/search/person?query=${encodeURIComponent(query)}&include_adult=false`;
  const res = await fetchWithRetry(url, 3, 500, makeBearerHeaders(apiKey));
  if (!res.ok) throw new Error(`TMDb Person search API error: ${res.status}`);
  const data = await res.json();
  
  return (data.results || []).map((p: any) => {
    const knownFor = (p.known_for || []).map((kf: any) => ({
      title: (kf.media_type === 'movie' ? kf.title : kf.name) || 'Unknown Title',
      mediaType: kf.media_type as 'movie' | 'tv'
    }));
    
    return {
      id: p.id?.toString() || '',
      name: p.name || 'Unknown Name',
      knownForDepartment: p.known_for_department || '',
      profilePath: p.profile_path || null,
      knownFor
    };
  });
}

/**
 * Fetches standard details for a person.
 */
export async function fetchPersonDetails(
  personId: string,
  apiKey: string
): Promise<{ biography: string; biographyData?: string; birthday: string; profilePath: string | null }> {
  const url = `${BASE_URL}/person/${personId}`;
  const res = await fetchWithRetry(url, 3, 500, makeBearerHeaders(apiKey));
  if (!res.ok) throw new Error(`TMDb Person Details API error: ${res.status}`);
  const data = await res.json();
  return {
    biography: data.biography || '',
    birthday: data.birthday || '',
    profilePath: data.profile_path || null,
  };
}

/**
 * Fetches complete filmography of a person, filtering by their CrewRole.
 */
export async function fetchPersonFilmography(
  personId: string,
  role: CrewRole,
  apiKey: string
): Promise<Array<{
  tmdbId: string;
  title: string;
  year: number;
  mediaType: 'movie' | 'tv';
  posterPath: string | null;
  voteAverage: number;
}>> {
  const personAuthOpts = makeBearerHeaders(apiKey);
  const [movieRes, tvRes] = await Promise.all([
    fetchWithRetry(`${BASE_URL}/person/${personId}/movie_credits?language=en-US`, 3, 500, personAuthOpts),
    fetchWithRetry(`${BASE_URL}/person/${personId}/tv_credits?language=en-US`, 3, 500, personAuthOpts),
  ]);

  if (!movieRes.ok) throw new Error(`TMDb movie credits error: ${movieRes.status}`);
  if (!tvRes.ok) throw new Error(`TMDb tv credits error: ${tvRes.status}`);

  const movieData = await movieRes.json();
  const tvData = await tvRes.json();

  let rawMovieItems: any[] = [];
  let rawTvItems: any[] = [];

  if (role === 'actor') {
    rawMovieItems = movieData.cast || [];
    rawTvItems = tvData.cast || [];
  } else {
    let jobTitles: string[] = [];
    if (role === 'director') jobTitles = ['Director'];
    else if (role === 'writer') jobTitles = ['Screenplay', 'Writer', 'Story'];
    else if (role === 'cinematographer') jobTitles = ['Director of Photography'];
    else if (role === 'composer') jobTitles = ['Original Music Composer'];
    else if (role === 'editor') jobTitles = ['Editor'];
    else if (role === 'producer') jobTitles = ['Producer'];

    rawMovieItems = (movieData.crew || []).filter((c: any) => jobTitles.includes(c.job));
    rawTvItems = (tvData.crew || []).filter((c: any) => jobTitles.includes(c.job));
  }

  const movies = rawMovieItems.map((item: any) => {
    const releaseDate = item.release_date || '';
    const year = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : 0;
    return {
      tmdbId: item.id?.toString() || '',
      title: item.title || 'Unknown Title',
      year: isNaN(year) ? 0 : year,
      mediaType: 'movie' as const,
      posterPath: item.poster_path || null,
      voteAverage: item.vote_average || 0
    };
  });

  const tvs = rawTvItems.map((item: any) => {
    const firstAirDate = item.first_air_date || '';
    const year = firstAirDate ? parseInt(firstAirDate.substring(0, 4), 10) : 0;
    return {
      tmdbId: item.id?.toString() || '',
      title: item.name || 'Unknown Title',
      year: isNaN(year) ? 0 : year,
      mediaType: 'tv' as const,
      posterPath: item.poster_path || null,
      voteAverage: item.vote_average || 0
    };
  });

  const combined = [...movies, ...tvs];
  const seen = new Set<string>();
  const deduped: Array<{
    tmdbId: string;
    title: string;
    year: number;
    mediaType: 'movie' | 'tv';
    posterPath: string | null;
    voteAverage: number;
  }> = [];

  for (const item of combined) {
    if (!seen.has(item.tmdbId)) {
      seen.add(item.tmdbId);
      deduped.push(item);
    }
  }

  deduped.sort((a, b) => b.year - a.year);

  const mediaIds = deduped.map((item) => `tmdb_${item.mediaType}_${item.tmdbId}`);
  const existingMap = await getAllMediaMap(mediaIds);
  const newItems: MediaItem[] = [];

  for (const item of deduped) {
    const mediaId = `tmdb_${item.mediaType}_${item.tmdbId}`;
    if (!existingMap[mediaId]) {
      newItems.push({
        id: mediaId,
        canonicalTitle: item.title,
        type: item.mediaType,
        year: item.year,
        genres: [],
        ratings: [
          {
            provider: 'tmdb',
            score: item.voteAverage,
            votes: 0,
          },
        ],
        providers: [
          {
            provider: 'tmdb',
            externalId: item.tmdbId,
            url: `https://www.themoviedb.org/${item.mediaType}/${item.tmdbId}`,
          },
        ],
        posterUrl: item.posterPath ? `${POSTER_BASE_URL}${item.posterPath}` : '',
        overview: '',
      });
    }
  }

  if (newItems.length > 0) {
    await putMediaItems(newItems);
  }

  return deduped;
}
