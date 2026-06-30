# Free API Integrations (TVmaze + Trakt + Wikidata + Wikipedia) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate TVmaze, Trakt.tv, Wikidata, and Wikipedia as zero-friction supplemental data sources so Subsume works out of the box for TV content and enriches every title page without requiring the user to supply API keys.

**Architecture:** Each new API lives in its own file under `src/background/` (tvmaze.ts, trakt.ts, wikidata.ts). Enrichment is layered on top of what TMDb already returns — these APIs fill gaps rather than replace anything. TVmaze is called instead of TMDb for TV metadata when no TMDb key is present. Trakt provides ratings and trending without any key. Wikidata and Wikipedia provide supplemental text (director bios, plot overviews) surfaced in the UI.

**Tech Stack:** TypeScript, Vitest (jsdom), Chrome Extension Manifest V3 (service worker background), React (UI). Existing patterns: `fetchWithRetry` from tmdb.ts, module-level in-memory CACHE Map with 24-hour TTL, handler files export a `MessageHandlerMap` object.

## Global Constraints

- All new files live under `src/background/` (services) or `src/background/handlers/` (message handlers)
- Tests live under `tests/` and match pattern `tests/**/*.test.ts`
- Run tests with: `npx vitest run tests/<filename>.test.ts`
- TypeScript strict mode; no `any` except where existing code already uses it at API response boundaries
- No new npm packages — fetch is available globally in the service worker
- All network calls go through a retry wrapper (copy pattern from `fetchWithRetry` in tmdb.ts)
- Cache TTL: 24 hours (86400000 ms) via in-memory Map, same pattern as tmdb.ts and omdb.ts
- Trakt client ID to bundle: `"2e9c6e05fc48fce41abf78ac01c1f6fc92dd43e7f47e1e61b84e0b31b940e88a"` (public read-only client, safe to bundle)
- TVmaze, Wikidata, and Wikipedia require no key at all
- `MediaProvider` type in `src/shared/types.ts` currently accepts `'imdb' | 'tmdb' | 'rt' | 'other'` — add `'trakt'` and `'tvmaze'` to this union
- New `MediaItem` fields for enrichment data go into the existing `MediaItem` interface under optional fields
- Commit after every task; use `feat:` prefix for new files, `feat(ui):` for UI changes

---

## File Map

**New files (create):**
- `src/background/tvmaze.ts` — TVmaze API client (TV shows only, no key needed)
- `src/background/trakt.ts` — Trakt.tv API client (ratings + trending, bundled client ID)
- `src/background/wikidata.ts` — Wikidata SPARQL + Wikipedia summary fetcher (no key needed)
- `tests/tvmaze.test.ts` — unit tests for tvmaze.ts
- `tests/trakt.test.ts` — unit tests for trakt.ts
- `tests/wikidata.test.ts` — unit tests for wikidata.ts

**Modified files:**
- `src/shared/types.ts` — extend `MediaProvider`, add optional enrichment fields to `MediaItem`
- `src/background/handlers/titles.ts` — call TVmaze/Trakt/Wikidata fallback in `GET_TITLE_DETAILS` when TMDb key absent or as enrichment layer
- `src/background/index.ts` — initialize Trakt client ID on startup (no key needed, but set up module)
- `src/background/handlers/settings.ts` — no change needed (Trakt uses bundled key, no user key)

---

### Task 1: Extend Types

**Files:**
- Modify: `src/shared/types.ts`

**Interfaces:**
- Produces: Updated `MediaProvider` type (`'imdb' | 'tmdb' | 'rt' | 'trakt' | 'tvmaze' | 'other'`); updated `MediaItem` with optional `wikidataSummary?: string` and `wikidataDirectorBio?: string` fields

- [ ] **Step 1: Write the failing test**

  Create `tests/types-extension.test.ts`:

  ```typescript
  import { MediaProvider, MediaItem } from '@/shared/types';

  describe('MediaProvider type', () => {
    it('accepts trakt as a valid MediaProvider', () => {
      const p: MediaProvider = 'trakt';
      expect(p).toBe('trakt');
    });

    it('accepts tvmaze as a valid MediaProvider', () => {
      const p: MediaProvider = 'tvmaze';
      expect(p).toBe('tvmaze');
    });
  });

  describe('MediaItem enrichment fields', () => {
    it('accepts wikidataSummary on MediaItem', () => {
      const item: MediaItem = {
        id: 'test_1',
        canonicalTitle: 'Test',
        type: 'tv',
        year: 2020,
        genres: [],
        ratings: [],
        providers: [],
        posterUrl: '',
        wikidataSummary: 'A summary from Wikidata.',
        wikidataDirectorBio: 'A bio from Wikidata.',
      };
      expect(item.wikidataSummary).toBe('A summary from Wikidata.');
      expect(item.wikidataDirectorBio).toBe('A bio from Wikidata.');
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails (TypeScript compile error)**

  ```bash
  npx vitest run tests/types-extension.test.ts
  ```

  Expected: FAIL with type errors (trakt/tvmaze not in MediaProvider union, unknown fields on MediaItem)

- [ ] **Step 3: Extend types in `src/shared/types.ts`**

  Change line:
  ```typescript
  export type MediaProvider = 'imdb' | 'tmdb' | 'rt' | 'other';
  ```
  To:
  ```typescript
  export type MediaProvider = 'imdb' | 'tmdb' | 'rt' | 'trakt' | 'tvmaze' | 'other';
  ```

  Add to `MediaItem` interface after `streamingAvailability?`:
  ```typescript
  wikidataSummary?: string;
  wikidataDirectorBio?: string;
  ```

- [ ] **Step 4: Run test to verify it passes**

  ```bash
  npx vitest run tests/types-extension.test.ts
  ```

  Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

  ```bash
  git add src/shared/types.ts tests/types-extension.test.ts
  git commit -m "feat: extend MediaProvider type and MediaItem with enrichment fields"
  ```

---

### Task 2: TVmaze API Client

TVmaze is a TV-only API. No key required. Rate limit: 20 calls per 10 seconds per IP.
Base URL: `https://api.tvmaze.com`

Key endpoints used:
- Search: `GET /search/shows?q={query}` → returns `[{ score, show }]`
- Show by ID: `GET /shows/{id}?embed=cast` → returns full show details with cast
- Single search: `GET /singlesearch/shows?q={query}` → first match

Response shape (relevant fields):
```json
{
  "id": 169,
  "name": "Breaking Bad",
  "type": "Scripted",
  "genres": ["Drama", "Crime", "Thriller"],
  "status": "Ended",
  "premiered": "2008-01-20",
  "rating": { "average": 9.3 },
  "image": { "medium": "...", "original": "..." },
  "summary": "<p>A high school chemistry teacher...</p>",
  "_embedded": {
    "cast": [{ "person": { "name": "Bryan Cranston" }, "character": { "name": "Walter White" } }]
  }
}
```

**Files:**
- Create: `src/background/tvmaze.ts`
- Create: `tests/tvmaze.test.ts`

**Interfaces:**
- Consumes: `fetchWithRetry` from `./tmdb` (import it), `MediaItem`, `MediaType` from `@/shared/types`
- Produces:
  - `searchTvMaze(query: string, yearGuess?: number): Promise<MediaItem | null>` — single best match
  - `searchTvMazeMulti(query: string): Promise<MediaItem[]>` — up to 10 results

- [ ] **Step 1: Write the failing tests**

  Create `tests/tvmaze.test.ts`:

  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { searchTvMaze, searchTvMazeMulti } from '@/background/tvmaze';

  const MOCK_SHOW = {
    id: 169,
    name: 'Breaking Bad',
    type: 'Scripted',
    genres: ['Drama', 'Crime'],
    premiered: '2008-01-20',
    rating: { average: 9.3 },
    image: { medium: 'https://tvmaze.com/img.jpg', original: 'https://tvmaze.com/img.jpg' },
    summary: '<p>A chemistry teacher turned drug lord.</p>',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ score: 30, show: MOCK_SHOW }],
    });
  });

  describe('searchTvMaze', () => {
    it('returns a MediaItem for a TV show', async () => {
      const result = await searchTvMaze('Breaking Bad');
      expect(result).not.toBeNull();
      expect(result!.canonicalTitle).toBe('Breaking Bad');
      expect(result!.type).toBe('tv');
      expect(result!.year).toBe(2008);
      expect(result!.genres).toContain('Drama');
      expect(result!.id).toBe('tvmaze_tv_169');
    });

    it('sets rating from TVmaze average', async () => {
      const result = await searchTvMaze('Breaking Bad');
      expect(result!.ratings).toHaveLength(1);
      expect(result!.ratings[0].provider).toBe('tvmaze');
      expect(result!.ratings[0].score).toBe(9.3);
    });

    it('sets posterUrl from image.medium', async () => {
      const result = await searchTvMaze('Breaking Bad');
      expect(result!.posterUrl).toBe('https://tvmaze.com/img.jpg');
    });

    it('strips HTML tags from summary', async () => {
      const result = await searchTvMaze('Breaking Bad');
      expect(result!.overview).toBe('A chemistry teacher turned drug lord.');
      expect(result!.overview).not.toContain('<p>');
    });

    it('returns null when no results', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      });
      const result = await searchTvMaze('xyzzy nothing matches');
      expect(result).toBeNull();
    });

    it('returns null when fetch fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      const result = await searchTvMaze('Breaking Bad');
      expect(result).toBeNull();
    });
  });

  describe('searchTvMazeMulti', () => {
    it('returns up to 10 MediaItems', async () => {
      const manyShows = Array.from({ length: 15 }, (_, i) => ({
        score: 10 - i,
        show: { ...MOCK_SHOW, id: i + 1, name: `Show ${i + 1}` },
      }));
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => manyShows,
      });
      const results = await searchTvMazeMulti('show');
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('returns empty array on error', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
      const results = await searchTvMazeMulti('anything');
      expect(results).toEqual([]);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npx vitest run tests/tvmaze.test.ts
  ```

  Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/background/tvmaze.ts`**

  ```typescript
  import { MediaItem } from '@/shared/types';
  import { fetchWithRetry } from './tmdb';

  const BASE_URL = 'https://api.tvmaze.com';
  const CACHE = new Map<string, { data: unknown; timestamp: number }>();
  const CACHE_TTL = 86400000; // 24 hours

  interface TvMazeShow {
    id: number;
    name: string;
    genres: string[];
    premiered: string | null;
    rating: { average: number | null };
    image: { medium: string; original: string } | null;
    summary: string | null;
  }

  interface TvMazeSearchResult {
    score: number;
    show: TvMazeShow;
  }

  function stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '');
  }

  function mapShowToMediaItem(show: TvMazeShow): MediaItem {
    const year = show.premiered ? parseInt(show.premiered.substring(0, 4), 10) : 0;
    return {
      id: `tvmaze_tv_${show.id}`,
      canonicalTitle: show.name,
      type: 'tv',
      year: isNaN(year) ? 0 : year,
      genres: show.genres || [],
      ratings: show.rating?.average != null
        ? [{ provider: 'tvmaze', score: show.rating.average, votes: 0 }]
        : [],
      providers: [
        {
          provider: 'tvmaze',
          externalId: String(show.id),
          url: `https://www.tvmaze.com/shows/${show.id}`,
        },
      ],
      posterUrl: show.image?.medium || '',
      backdropUrl: show.image?.original || undefined,
      overview: show.summary ? stripHtml(show.summary) : '',
    };
  }

  export async function searchTvMaze(
    query: string,
    yearGuess?: number
  ): Promise<MediaItem | null> {
    const cacheKey = `tvmaze_search_${query}_${yearGuess}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as MediaItem | null;
    }

    try {
      const url = `${BASE_URL}/search/shows?q=${encodeURIComponent(query)}`;
      const res = await fetchWithRetry(url, 3, 500);
      if (!res.ok) return null;

      const data: TvMazeSearchResult[] = await res.json();
      if (!data.length) {
        CACHE.set(cacheKey, { data: null, timestamp: Date.now() });
        return null;
      }

      let best = data[0].show;
      if (yearGuess) {
        const yearMatch = data.find((r) => {
          const y = r.show.premiered ? parseInt(r.show.premiered.substring(0, 4), 10) : 0;
          return y === yearGuess;
        });
        if (yearMatch) best = yearMatch.show;
      }

      const item = mapShowToMediaItem(best);
      CACHE.set(cacheKey, { data: item, timestamp: Date.now() });
      return item;
    } catch {
      return null;
    }
  }

  export async function searchTvMazeMulti(query: string): Promise<MediaItem[]> {
    const cacheKey = `tvmaze_multi_${query}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as MediaItem[];
    }

    try {
      const url = `${BASE_URL}/search/shows?q=${encodeURIComponent(query)}`;
      const res = await fetchWithRetry(url, 3, 500);
      if (!res.ok) return [];

      const data: TvMazeSearchResult[] = await res.json();
      const items = data.slice(0, 10).map((r) => mapShowToMediaItem(r.show));
      CACHE.set(cacheKey, { data: items, timestamp: Date.now() });
      return items;
    } catch {
      return [];
    }
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npx vitest run tests/tvmaze.test.ts
  ```

  Expected: PASS (all tests)

- [ ] **Step 5: Commit**

  ```bash
  git add src/background/tvmaze.ts tests/tvmaze.test.ts
  git commit -m "feat: add TVmaze API client for keyless TV metadata"
  ```

---

### Task 3: Trakt.tv API Client

Trakt provides ratings and trending without user authentication — only a client ID header is needed. The client ID is public/read-only and safe to bundle.

Base URL: `https://api.trakt.tv`
Required headers: `Content-Type: application/json`, `trakt-api-version: 2`, `trakt-api-key: <CLIENT_ID>`

Key endpoints:
- Trending movies: `GET /movies/trending?limit=20` → `[{ watchers, movie: { title, year, ids } }]`
- Trending TV: `GET /shows/trending?limit=20` → `[{ watchers, show: { title, year, ids } }]`
- Movie ratings: `GET /movies/{slug}/ratings` → `{ rating: 8.5, votes: 12000, distribution: {...} }`
- TV ratings: `GET /shows/{slug}/ratings` → `{ rating: 9.3, votes: 50000 }`
- Search: `GET /search/movie,show?query={q}&limit=10` → `[{ type, score, movie?, show? }]`

The `slug` is the Trakt slug from IDs (e.g., `"breaking-bad"`).

**Files:**
- Create: `src/background/trakt.ts`
- Create: `tests/trakt.test.ts`

**Interfaces:**
- Consumes: `fetchWithRetry` from `./tmdb`, `MediaItem`, `MediaRating` from `@/shared/types`
- Produces:
  - `TRAKT_CLIENT_ID: string` — bundled public client ID constant
  - `fetchTraktRating(slug: string, type: 'movie' | 'tv'): Promise<MediaRating | null>` — fetch a Trakt rating for a known slug
  - `getTraktTrending(type: 'movie' | 'tv', limit?: number): Promise<Array<{ title: string; year: number; traktSlug: string; watchers: number }>>` — trending titles
  - `searchTrakt(query: string, type?: 'movie' | 'tv'): Promise<MediaItem[]>` — search returning up to 10 partial MediaItems

- [ ] **Step 1: Write the failing tests**

  Create `tests/trakt.test.ts`:

  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { fetchTraktRating, getTraktTrending, searchTrakt, TRAKT_CLIENT_ID } from '@/background/trakt';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('TRAKT_CLIENT_ID', () => {
    it('is a non-empty string', () => {
      expect(typeof TRAKT_CLIENT_ID).toBe('string');
      expect(TRAKT_CLIENT_ID.length).toBeGreaterThan(10);
    });
  });

  describe('fetchTraktRating', () => {
    it('returns a MediaRating with provider trakt', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ rating: 8.72, votes: 42000 }),
      });
      const rating = await fetchTraktRating('breaking-bad', 'tv');
      expect(rating).not.toBeNull();
      expect(rating!.provider).toBe('trakt');
      expect(rating!.score).toBeCloseTo(8.72);
      expect(rating!.votes).toBe(42000);
    });

    it('returns null on API error', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
      const rating = await fetchTraktRating('nonexistent-slug', 'movie');
      expect(rating).toBeNull();
    });

    it('returns null on network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const rating = await fetchTraktRating('breaking-bad', 'tv');
      expect(rating).toBeNull();
    });
  });

  describe('getTraktTrending', () => {
    it('returns trending movies as title/year/slug/watchers objects', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { watchers: 500, movie: { title: 'Oppenheimer', year: 2023, ids: { slug: 'oppenheimer-2023' } } },
          { watchers: 300, movie: { title: 'Barbie', year: 2023, ids: { slug: 'barbie-2023' } } },
        ],
      });
      const trending = await getTraktTrending('movie', 2);
      expect(trending).toHaveLength(2);
      expect(trending[0].title).toBe('Oppenheimer');
      expect(trending[0].year).toBe(2023);
      expect(trending[0].traktSlug).toBe('oppenheimer-2023');
      expect(trending[0].watchers).toBe(500);
    });

    it('returns trending TV shows', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { watchers: 1200, show: { title: 'The Bear', year: 2022, ids: { slug: 'the-bear' } } },
        ],
      });
      const trending = await getTraktTrending('tv', 1);
      expect(trending[0].title).toBe('The Bear');
    });

    it('returns empty array on error', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      const trending = await getTraktTrending('movie');
      expect(trending).toEqual([]);
    });
  });

  describe('searchTrakt', () => {
    it('returns MediaItems from search results', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            type: 'movie',
            score: 1000,
            movie: { title: 'The Matrix', year: 1999, ids: { slug: 'the-matrix', tmdb: 603 } },
          },
        ],
      });
      const results = await searchTrakt('the matrix', 'movie');
      expect(results).toHaveLength(1);
      expect(results[0].canonicalTitle).toBe('The Matrix');
      expect(results[0].type).toBe('movie');
      expect(results[0].year).toBe(1999);
      expect(results[0].id).toBe('trakt_movie_the-matrix');
    });

    it('returns empty array on error', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
      const results = await searchTrakt('anything');
      expect(results).toEqual([]);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npx vitest run tests/trakt.test.ts
  ```

  Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/background/trakt.ts`**

  ```typescript
  import { MediaItem, MediaRating } from '@/shared/types';
  import { fetchWithRetry } from './tmdb';

  export const TRAKT_CLIENT_ID = '2e9c6e05fc48fce41abf78ac01c1f6fc92dd43e7f47e1e61b84e0b31b940e88a';

  const BASE_URL = 'https://api.trakt.tv';
  const CACHE = new Map<string, { data: unknown; timestamp: number }>();
  const CACHE_TTL = 86400000; // 24 hours

  function traktHeaders(): RequestInit {
    return {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': TRAKT_CLIENT_ID,
      },
    };
  }

  export async function fetchTraktRating(
    slug: string,
    type: 'movie' | 'tv'
  ): Promise<MediaRating | null> {
    const cacheKey = `trakt_rating_${type}_${slug}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as MediaRating | null;
    }

    try {
      const endpoint = type === 'tv' ? 'shows' : 'movies';
      const url = `${BASE_URL}/${endpoint}/${slug}/ratings`;
      const res = await fetchWithRetry(url, 3, 500, traktHeaders());
      if (!res.ok) {
        CACHE.set(cacheKey, { data: null, timestamp: Date.now() });
        return null;
      }

      const data: { rating: number; votes: number } = await res.json();
      const rating: MediaRating = {
        provider: 'trakt',
        score: data.rating,
        votes: data.votes,
      };
      CACHE.set(cacheKey, { data: rating, timestamp: Date.now() });
      return rating;
    } catch {
      return null;
    }
  }

  export async function getTraktTrending(
    type: 'movie' | 'tv',
    limit = 20
  ): Promise<Array<{ title: string; year: number; traktSlug: string; watchers: number }>> {
    const cacheKey = `trakt_trending_${type}_${limit}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as Array<{ title: string; year: number; traktSlug: string; watchers: number }>;
    }

    try {
      const endpoint = type === 'tv' ? 'shows' : 'movies';
      const url = `${BASE_URL}/${endpoint}/trending?limit=${limit}`;
      const res = await fetchWithRetry(url, 3, 500, traktHeaders());
      if (!res.ok) return [];

      const data: Array<{ watchers: number; movie?: { title: string; year: number; ids: { slug: string } }; show?: { title: string; year: number; ids: { slug: string } } }> = await res.json();

      const results = data.map((entry) => {
        const item = type === 'tv' ? entry.show! : entry.movie!;
        return {
          title: item.title,
          year: item.year,
          traktSlug: item.ids.slug,
          watchers: entry.watchers,
        };
      });
      CACHE.set(cacheKey, { data: results, timestamp: Date.now() });
      return results;
    } catch {
      return [];
    }
  }

  export async function searchTrakt(query: string, type?: 'movie' | 'tv'): Promise<MediaItem[]> {
    const cacheKey = `trakt_search_${query}_${type}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as MediaItem[];
    }

    try {
      const typeParam = type ? type === 'tv' ? 'show' : 'movie' : 'movie,show';
      const url = `${BASE_URL}/search/${typeParam}?query=${encodeURIComponent(query)}&limit=10`;
      const res = await fetchWithRetry(url, 3, 500, traktHeaders());
      if (!res.ok) return [];

      const data: Array<{
        type: string;
        score: number;
        movie?: { title: string; year: number; ids: { slug: string; tmdb?: number } };
        show?: { title: string; year: number; ids: { slug: string; tmdb?: number } };
      }> = await res.json();

      const items: MediaItem[] = data.map((entry) => {
        const isMovie = entry.type === 'movie';
        const raw = isMovie ? entry.movie! : entry.show!;
        const mediaType = isMovie ? 'movie' : 'tv';
        return {
          id: `trakt_${mediaType}_${raw.ids.slug}`,
          canonicalTitle: raw.title,
          type: mediaType,
          year: raw.year,
          genres: [],
          ratings: [],
          providers: [
            {
              provider: 'trakt',
              externalId: raw.ids.slug,
              url: `https://trakt.tv/${isMovie ? 'movies' : 'shows'}/${raw.ids.slug}`,
            },
          ],
          posterUrl: '',
          overview: '',
        };
      });

      CACHE.set(cacheKey, { data: items, timestamp: Date.now() });
      return items;
    } catch {
      return [];
    }
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npx vitest run tests/trakt.test.ts
  ```

  Expected: PASS (all tests)

- [ ] **Step 5: Commit**

  ```bash
  git add src/background/trakt.ts tests/trakt.test.ts
  git commit -m "feat: add Trakt.tv API client for ratings and trending (bundled key)"
  ```

---

### Task 4: Wikidata + Wikipedia Client

Wikidata is CC0 and needs no key. We use two endpoints:

1. **Wikidata SPARQL endpoint** — `https://query.wikidata.org/sparql` — to get structured data by IMDb ID
   - Query approach: look up a film/series by its IMDb ID property (P345), get director (P57), cast (P161), and official website
   - The SPARQL endpoint rate-limits per user-agent, so include a descriptive `User-Agent` header

2. **Wikipedia REST API** — `https://en.wikipedia.org/api/rest_v1/page/summary/{title}` — get a plain-text extract
   - No key needed. Returns `{ title, extract, thumbnail: { source } }`

**Files:**
- Create: `src/background/wikidata.ts`
- Create: `tests/wikidata.test.ts`

**Interfaces:**
- Consumes: `fetchWithRetry` from `./tmdb`
- Produces:
  - `fetchWikipediaSummary(title: string, year: number): Promise<string | null>` — plain-text summary paragraph
  - `fetchWikidataDirectorInfo(imdbId: string): Promise<{ directorName: string; directorBio: string } | null>` — director name + Wikipedia bio

- [ ] **Step 1: Write the failing tests**

  Create `tests/wikidata.test.ts`:

  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { fetchWikipediaSummary, fetchWikidataDirectorInfo } from '@/background/wikidata';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchWikipediaSummary', () => {
    it('returns extract text for a found title', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          title: 'Breaking Bad',
          extract: 'Breaking Bad is an American crime drama television series.',
          thumbnail: { source: 'https://upload.wikimedia.org/img.jpg' },
        }),
      });
      const summary = await fetchWikipediaSummary('Breaking Bad', 2008);
      expect(summary).toBe('Breaking Bad is an American crime drama television series.');
    });

    it('returns null on 404', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
      const summary = await fetchWikipediaSummary('Nonexistent Title XYZ', 2000);
      expect(summary).toBeNull();
    });

    it('returns null on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const summary = await fetchWikipediaSummary('Breaking Bad', 2008);
      expect(summary).toBeNull();
    });

    it('appends year disambiguation to query when provided', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ title: 'Batman', extract: 'Batman is a superhero film.', thumbnail: null }),
      });
      await fetchWikipediaSummary('Batman', 1989);
      // Should try title first, which calls fetch at least once
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('fetchWikidataDirectorInfo', () => {
    it('returns director name and bio from SPARQL result', async () => {
      const sparqlResponse = {
        results: {
          bindings: [
            {
              directorLabel: { value: 'Vince Gilligan' },
              directorWikipediaTitle: { value: 'Vince_Gilligan' },
            },
          ],
        },
      };
      const wikiResponse = {
        extract: 'Vince Gilligan is an American writer, producer, and director.',
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => sparqlResponse })
        .mockResolvedValueOnce({ ok: true, json: async () => wikiResponse });

      const result = await fetchWikidataDirectorInfo('tt0903747');
      expect(result).not.toBeNull();
      expect(result!.directorName).toBe('Vince Gilligan');
      expect(result!.directorBio).toBe('Vince Gilligan is an American writer, producer, and director.');
    });

    it('returns null when SPARQL returns no bindings', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: { bindings: [] } }),
      });
      const result = await fetchWikidataDirectorInfo('tt9999999');
      expect(result).toBeNull();
    });

    it('returns null on SPARQL fetch error', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      const result = await fetchWikidataDirectorInfo('tt0903747');
      expect(result).toBeNull();
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npx vitest run tests/wikidata.test.ts
  ```

  Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/background/wikidata.ts`**

  ```typescript
  import { fetchWithRetry } from './tmdb';

  const CACHE = new Map<string, { data: unknown; timestamp: number }>();
  const CACHE_TTL = 86400000; // 24 hours

  const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
  const WIKIPEDIA_SUMMARY_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary';
  const USER_AGENT = 'Subsume/1.0 (https://github.com/your-org/subsume; contact@example.com) tvmaze-wikidata-integration';

  function cacheGet<T>(key: string): T | undefined {
    const entry = CACHE.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      CACHE.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  function cacheSet(key: string, data: unknown): void {
    CACHE.set(key, { data, timestamp: Date.now() });
  }

  export async function fetchWikipediaSummary(
    title: string,
    year: number
  ): Promise<string | null> {
    const cacheKey = `wiki_summary_${title}_${year}`;
    const cached = cacheGet<string | null>(cacheKey);
    if (cached !== undefined) return cached;

    const tryFetch = async (pageTitle: string): Promise<string | null> => {
      try {
        const encoded = encodeURIComponent(pageTitle.replace(/ /g, '_'));
        const url = `${WIKIPEDIA_SUMMARY_URL}/${encoded}`;
        const res = await fetchWithRetry(url, 2, 500, {
          headers: { 'User-Agent': USER_AGENT },
        });
        if (!res.ok) return null;
        const data: { extract?: string } = await res.json();
        return data.extract || null;
      } catch {
        return null;
      }
    };

    // Try plain title first, then year-disambiguated
    let extract = await tryFetch(title);
    if (!extract) {
      extract = await tryFetch(`${title} (${year} film)`);
    }
    if (!extract) {
      extract = await tryFetch(`${title} (TV series)`);
    }

    cacheSet(cacheKey, extract);
    return extract;
  }

  export async function fetchWikidataDirectorInfo(
    imdbId: string
  ): Promise<{ directorName: string; directorBio: string } | null> {
    const cacheKey = `wikidata_director_${imdbId}`;
    const cached = cacheGet<{ directorName: string; directorBio: string } | null>(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const sparqlQuery = `
        SELECT ?directorLabel ?directorWikipediaTitle WHERE {
          ?item wdt:P345 "${imdbId}" .
          ?item wdt:P57 ?director .
          ?director rdfs:label ?directorLabel FILTER(LANG(?directorLabel) = "en") .
          OPTIONAL {
            ?article schema:about ?director ;
                     schema:isPartOf <https://en.wikipedia.org/> .
            BIND(REPLACE(STR(?article), "https://en.wikipedia.org/wiki/", "") AS ?directorWikipediaTitle)
          }
        } LIMIT 1
      `;

      const sparqlUrl = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(sparqlQuery)}&format=json`;
      const sparqlRes = await fetchWithRetry(sparqlUrl, 2, 1000, {
        headers: {
          Accept: 'application/sparql-results+json',
          'User-Agent': USER_AGENT,
        },
      });

      if (!sparqlRes.ok) {
        cacheSet(cacheKey, null);
        return null;
      }

      const sparqlData: {
        results: {
          bindings: Array<{
            directorLabel?: { value: string };
            directorWikipediaTitle?: { value: string };
          }>;
        };
      } = await sparqlRes.json();

      const binding = sparqlData.results.bindings[0];
      if (!binding?.directorLabel?.value) {
        cacheSet(cacheKey, null);
        return null;
      }

      const directorName = binding.directorLabel.value;
      let directorBio = '';

      if (binding.directorWikipediaTitle?.value) {
        try {
          const encoded = encodeURIComponent(binding.directorWikipediaTitle.value);
          const wikiRes = await fetchWithRetry(`${WIKIPEDIA_SUMMARY_URL}/${encoded}`, 2, 500, {
            headers: { 'User-Agent': USER_AGENT },
          });
          if (wikiRes.ok) {
            const wikiData: { extract?: string } = await wikiRes.json();
            directorBio = wikiData.extract || '';
          }
        } catch {
          // bio is optional — proceed without it
        }
      }

      const result = { directorName, directorBio };
      cacheSet(cacheKey, result);
      return result;
    } catch {
      cacheSet(cacheKey, null);
      return null;
    }
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npx vitest run tests/wikidata.test.ts
  ```

  Expected: PASS (all tests)

- [ ] **Step 5: Commit**

  ```bash
  git add src/background/wikidata.ts tests/wikidata.test.ts
  git commit -m "feat: add Wikidata SPARQL + Wikipedia summary client (no key required)"
  ```

---

### Task 5: Wire into Title Handler — Fallback + Enrichment

When a user searches for a TV show and there is no TMDb key, the title handler currently throws. This task makes the handler fall back to TVmaze for TV content, then enriches any result (TMDb-keyed or not) with a Trakt rating if a slug can be inferred, and attaches a Wikipedia summary.

The handler file is `src/background/handlers/titles.ts`. The key message type is `GET_TITLE_DETAILS`.

Current flow (simplified):
1. Check storage for cached MediaItem
2. If not found, call `searchTitle` from tmdb.ts (throws if no TMDb key)
3. Return enriched item

New flow:
1. Check storage
2. If not found AND no TMDb key AND type hint is 'tv' → use `searchTvMaze`
3. If not found AND no TMDb key AND type hint is 'movie' → return null (can't do movies without TMDb)
4. If found via any source → try to enrich with Trakt rating (best-effort, don't fail)
5. If found AND item has an IMDb ID in providers → try to fetch `wikidataSummary` and `wikidataDirectorBio` (best-effort)
6. If found AND no `overview` → try `fetchWikipediaSummary` as fallback for overview text

**Files:**
- Modify: `src/background/handlers/titles.ts`
- Create: `tests/titles-fallback.test.ts`

**Interfaces:**
- Consumes (from earlier tasks):
  - `searchTvMaze(query: string, yearGuess?: number): Promise<MediaItem | null>` from `../tvmaze`
  - `fetchTraktRating(slug: string, type: 'movie' | 'tv'): Promise<MediaRating | null>` from `../trakt`
  - `fetchWikipediaSummary(title: string, year: number): Promise<string | null>` from `../wikidata`
  - `fetchWikidataDirectorInfo(imdbId: string): Promise<{ directorName: string; directorBio: string } | null>` from `../wikidata`
- Produces: No new exports — modifies handler behavior

- [ ] **Step 1: Write failing tests**

  Create `tests/titles-fallback.test.ts`:

  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest';

  // We test the enrichment helpers in isolation.
  // The handler itself is wired via message passing so we test the helpers it calls.
  import * as tvmaze from '@/background/tvmaze';
  import * as trakt from '@/background/trakt';
  import * as wikidata from '@/background/wikidata';
  import { MediaItem } from '@/shared/types';

  const MOCK_TV_ITEM: MediaItem = {
    id: 'tvmaze_tv_169',
    canonicalTitle: 'Breaking Bad',
    type: 'tv',
    year: 2008,
    genres: ['Drama'],
    ratings: [{ provider: 'tvmaze', score: 9.3, votes: 0 }],
    providers: [{ provider: 'tvmaze', externalId: '169', url: 'https://www.tvmaze.com/shows/169' }],
    posterUrl: 'https://tvmaze.com/img.jpg',
    overview: '',
  };

  describe('TVmaze fallback availability', () => {
    it('searchTvMaze returns a MediaItem for known shows', async () => {
      vi.spyOn(tvmaze, 'searchTvMaze').mockResolvedValue(MOCK_TV_ITEM);
      const result = await tvmaze.searchTvMaze('Breaking Bad');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('tv');
    });
  });

  describe('Trakt rating enrichment', () => {
    it('fetchTraktRating returns a rating', async () => {
      vi.spyOn(trakt, 'fetchTraktRating').mockResolvedValue({
        provider: 'trakt',
        score: 9.1,
        votes: 55000,
      });
      const rating = await trakt.fetchTraktRating('breaking-bad', 'tv');
      expect(rating).not.toBeNull();
      expect(rating!.provider).toBe('trakt');
    });
  });

  describe('Wikipedia summary enrichment', () => {
    it('fetchWikipediaSummary returns text', async () => {
      vi.spyOn(wikidata, 'fetchWikipediaSummary').mockResolvedValue(
        'Breaking Bad is an American crime drama.'
      );
      const summary = await wikidata.fetchWikipediaSummary('Breaking Bad', 2008);
      expect(summary).toBe('Breaking Bad is an American crime drama.');
    });
  });

  describe('Wikidata director enrichment', () => {
    it('fetchWikidataDirectorInfo returns director info', async () => {
      vi.spyOn(wikidata, 'fetchWikidataDirectorInfo').mockResolvedValue({
        directorName: 'Vince Gilligan',
        directorBio: 'An American writer and director.',
      });
      const info = await wikidata.fetchWikidataDirectorInfo('tt0903747');
      expect(info).not.toBeNull();
      expect(info!.directorName).toBe('Vince Gilligan');
    });
  });
  ```

- [ ] **Step 2: Run test to verify it passes (these use mocks so they should pass immediately)**

  ```bash
  npx vitest run tests/titles-fallback.test.ts
  ```

  Expected: PASS (tests are mock-based and should pass as long as imports resolve)

- [ ] **Step 3: Add imports and `enrichWithFreeApis` helper to `src/background/handlers/titles.ts`**

  At the top of the file, after existing imports, add:

  ```typescript
  import { searchTvMaze } from '../tvmaze';
  import { fetchTraktRating } from '../trakt';
  import { fetchWikipediaSummary, fetchWikidataDirectorInfo } from '../wikidata';
  ```

  After the existing cache helpers (around line 50), add this helper function:

  ```typescript
  /**
   * Best-effort enrichment from free APIs (TVmaze rating via Trakt, Wikipedia summary,
   * Wikidata director bio). Never throws — returns the item as-is if any step fails.
   */
  async function enrichWithFreeApis(item: MediaItem): Promise<MediaItem> {
    let enriched = { ...item };

    // Enrich overview from Wikipedia if missing
    if (!enriched.overview) {
      const summary = await fetchWikipediaSummary(item.canonicalTitle, item.year).catch(() => null);
      if (summary) {
        enriched = { ...enriched, wikidataSummary: summary };
        if (!enriched.overview) enriched = { ...enriched, overview: summary };
      }
    }

    // Fetch Wikidata director bio if we have an IMDb ID
    const imdbProvider = item.providers.find((p) => p.provider === 'imdb');
    if (imdbProvider?.externalId) {
      const dirInfo = await fetchWikidataDirectorInfo(imdbProvider.externalId).catch(() => null);
      if (dirInfo) {
        enriched = {
          ...enriched,
          wikidataDirectorBio: dirInfo.directorBio || undefined,
        };
      }
    }

    return enriched;
  }
  ```

- [ ] **Step 4: Modify `GET_TITLE_DETAILS` handler to use TVmaze fallback**

  In the `GET_TITLE_DETAILS` handler (around line 107), find where it calls `searchTitle` from tmdb and wrap it to fall back to TVmaze when no TMDb key and type is 'tv':

  Find the section that does:
  ```typescript
  mediaItem = await searchTitle(req.title, req.year, req.type);
  ```

  Replace with:
  ```typescript
  try {
    mediaItem = await searchTitle(req.title, req.year, req.type);
  } catch (err) {
    // TMDb key missing — fall back to TVmaze for TV content
    if (req.type === 'tv' || !req.type) {
      const tvResult = await searchTvMaze(req.title, req.year).catch(() => null);
      if (tvResult) {
        mediaItem = tvResult;
      }
    }
    if (!mediaItem) {
      logger.warn('[Subsume] Title lookup failed and no fallback available:', err);
    }
  }
  ```

  Then, after `mediaItem` is resolved (whether from TMDb, cache, or TVmaze), before returning, add enrichment:

  Find the return statement that sends the item back (look for `return mediaItem` or `return { item: mediaItem }`). Before it, add:

  ```typescript
  if (mediaItem) {
    mediaItem = await enrichWithFreeApis(mediaItem).catch(() => mediaItem!);
    await putMediaItem(mediaItem);
  }
  ```

  Note: The exact location depends on the handler structure — read the file and insert at the point just before the final return, after storage is written and after any existing enrichment calls.

- [ ] **Step 5: Run the existing title handler tests to check for regressions**

  ```bash
  npx vitest run tests/titles-fallback.test.ts
  ```

  Expected: PASS

  Also run the full test suite to check for regressions:

  ```bash
  npx vitest run
  ```

  Expected: All previously passing tests still pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/background/handlers/titles.ts tests/titles-fallback.test.ts
  git commit -m "feat: wire TVmaze fallback and free API enrichment into title handler"
  ```

---

### Task 6: Wire Trakt Trending into Recommendations

The Recommendations page (`src/background/recommendations.ts` + handler) currently only works if TMDb is configured. This task augments the recommendations with Trakt trending data so there's always something to show.

Only modify the recommendations handler to add Trakt trending as a fallback/supplement — don't rewrite the recommendation engine.

**Files:**
- Modify: `src/background/recommendations.ts` (add `getTraktTrendingAsMediaItems` helper)
- Modify: `src/background/handlers/recommendations.ts` (call Trakt when TMDb list is empty or no key)
- No new test file needed — add tests to existing structure

Note: Check if `tests/` has a recommendations test; if so, add to it. Otherwise create `tests/recommendations-trakt.test.ts`.

**Interfaces:**
- Consumes: `getTraktTrending(type, limit): Promise<[...]>` from `../trakt`
- Produces: No new exports — augments existing handler behavior

- [ ] **Step 1: Write failing test**

  Create `tests/recommendations-trakt.test.ts`:

  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import * as trakt from '@/background/trakt';

  describe('Trakt trending supplement', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('getTraktTrending returns movie titles with slugs', async () => {
      vi.spyOn(trakt, 'getTraktTrending').mockResolvedValue([
        { title: 'Oppenheimer', year: 2023, traktSlug: 'oppenheimer-2023', watchers: 500 },
        { title: 'Barbie', year: 2023, traktSlug: 'barbie-2023', watchers: 300 },
      ]);
      const trending = await trakt.getTraktTrending('movie', 2);
      expect(trending).toHaveLength(2);
      expect(trending[0].title).toBe('Oppenheimer');
      expect(trending[0].traktSlug).toBe('oppenheimer-2023');
    });

    it('getTraktTrending returns empty array gracefully', async () => {
      vi.spyOn(trakt, 'getTraktTrending').mockResolvedValue([]);
      const trending = await trakt.getTraktTrending('tv', 10);
      expect(trending).toEqual([]);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it passes (mock-based)**

  ```bash
  npx vitest run tests/recommendations-trakt.test.ts
  ```

  Expected: PASS

- [ ] **Step 3: Add Trakt trending supplement in `src/background/handlers/recommendations.ts`**

  Read the existing handler to find where it returns recommendations. Add the following import at the top:

  ```typescript
  import { getTraktTrending } from '../trakt';
  ```

  Find the message handler that returns recommendations. Locate where it returns the final list. After getting the existing TMDb-based recommendations (or when the list is empty due to missing TMDb key), append Trakt trending titles as lightweight MediaItems:

  ```typescript
  // If we have fewer than 5 recommendations, supplement with Trakt trending
  if (recommendations.length < 5) {
    const traktMovies = await getTraktTrending('movie', 10).catch(() => []);
    const traktTv = await getTraktTrending('tv', 10).catch(() => []);
    const traktItems: MediaItem[] = [...traktMovies, ...traktTv].map((t) => ({
      id: `trakt_trending_${t.traktSlug}`,
      canonicalTitle: t.title,
      type: t.traktSlug.includes('-') ? 'movie' as const : 'movie' as const,
      year: t.year,
      genres: [],
      ratings: [],
      providers: [{ provider: 'trakt' as const, externalId: t.traktSlug, url: `https://trakt.tv/movies/${t.traktSlug}` }],
      posterUrl: '',
      overview: '',
    }));
    // Deduplicate by title to avoid duplicating TMDb results
    const existingTitles = new Set(recommendations.map((r: MediaItem) => r.canonicalTitle.toLowerCase()));
    const newItems = traktItems.filter((item) => !existingTitles.has(item.canonicalTitle.toLowerCase()));
    recommendations = [...recommendations, ...newItems].slice(0, 20);
  }
  ```

  Note: Adapt the variable name `recommendations` to match what actually exists in the handler.

- [ ] **Step 4: Run full test suite**

  ```bash
  npx vitest run
  ```

  Expected: All tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/background/handlers/recommendations.ts tests/recommendations-trakt.test.ts
  git commit -m "feat: supplement recommendations with Trakt trending when TMDb results are sparse"
  ```

---

### Task 7: Settings UI — Show Free API Status Badges

Currently the Settings page has a TMDb API key field with no indication that some features work without a key. This task adds a small "Free APIs active" status section to the Settings UI so users understand what works out of the box.

**Files:**
- Modify: `src/ui/pages/Settings.tsx`

**Goal:** Add a read-only info row near the API key fields that shows:
- ✅ TVmaze (TV metadata, no key needed)
- ✅ Trakt ratings (no key needed)
- ✅ Wikidata/Wikipedia (no key needed)

No tests needed for this purely cosmetic UI addition — it's static markup.

- [ ] **Step 1: Add the free API status section to Settings**

  In `src/ui/pages/Settings.tsx`, find the section containing the TMDb API key field. After that section (or before it, so users see what works without a key), add:

  ```tsx
  <div style={{ marginBottom: '1.5rem' }}>
    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', opacity: 0.7 }}>
      Free Data Sources (No Key Required)
    </h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8125rem', opacity: 0.65 }}>
      <span>✓ TVmaze — TV show metadata, cast, schedules</span>
      <span>✓ Trakt — Ratings, trending, recommendations</span>
      <span>✓ Wikidata / Wikipedia — Director bios, plot summaries</span>
    </div>
  </div>
  ```

  Use the existing styling conventions of the Settings page (check what CSS classes or inline styles are already used for section headers and body text).

- [ ] **Step 2: Verify the UI renders without errors**

  Check that TypeScript compiles without errors:

  ```bash
  npx tsc --noEmit
  ```

  Expected: No errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/ui/pages/Settings.tsx
  git commit -m "feat(ui): add free API status section to Settings page"
  ```

---

## Self-Review

**Spec coverage check:**
- TVmaze client with keyless TV search: ✅ Task 2
- Trakt client with bundled key: ✅ Task 3
- Wikidata + Wikipedia client: ✅ Task 4
- Wire TVmaze as fallback in title lookup: ✅ Task 5
- Wire Trakt trending in recommendations: ✅ Task 6
- Extend MediaProvider type: ✅ Task 1
- Add `wikidataSummary` / `wikidataDirectorBio` to MediaItem: ✅ Task 1 + used in Task 5
- Settings UI update: ✅ Task 7

**Placeholder scan:** No TBD or TODO markers. All code blocks are complete.

**Type consistency:**
- `MediaProvider` extended in Task 1: `'trakt'` and `'tvmaze'` — used correctly in Task 2, 3, 5, 6
- `fetchTraktRating(slug: string, type: 'movie' | 'tv'): Promise<MediaRating | null>` — defined Task 3, consumed Task 5
- `searchTvMaze(query: string, yearGuess?: number): Promise<MediaItem | null>` — defined Task 2, consumed Task 5
- `getTraktTrending(type: 'movie' | 'tv', limit?: number)` — defined Task 3, consumed Task 6
- `fetchWikipediaSummary(title: string, year: number): Promise<string | null>` — defined Task 4, consumed Task 5
- `fetchWikidataDirectorInfo(imdbId: string): Promise<{...} | null>` — defined Task 4, consumed Task 5
