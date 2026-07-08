# Seed Data Agent — Instruction Set

Use this document when another agent is asked to **fetch accurate metadata** for Subsume’s default extension catalogue and **write it into the codebase** so first-time users see a properly populated library.

The human operator will tell you **which titles and/or filmmakers** to fetch. Your job is to look up the correct data, format it exactly as Subsume expects, and land it in the seed TypeScript files.

---

## 1. Goal

Produce **verified, shippable seed catalogue entries** for the Subsume Chrome extension:

- Correct **poster**, **title**, **year**, **genres**
- **IMDb** and **Rotten Tomatoes** ratings (when available)
- **TMDb** rating
- **Brief synopsis** plus **crew/cast block** (director, writer, cinematographer, starring cast)
- Optional **filmmaker** (`PersonItem`) rows with filmography links

Deliverables are **TypeScript changes** in the repo — not a standalone JSON dump.

---

## 2. Repository & file map

| File | Purpose |
|------|---------|
| `src/shared/types.ts` | Canonical `MediaItem`, `LibraryItem`, `PersonItem` types |
| `src/background/seedData.ts` | Main catalogue: `SEED_MEDIA`, `SEED_LIBRARY`, `SEED_PEOPLE`, version |
| `src/background/seedIndianHighlights.ts` | Indian highlight titles + `HIGHLIGHT_LIBRARY` reflections |
| `src/background/storage.ts` | Merge/seed logic on install and version bump |
| `src/shared/mediaIds.ts` | Valid `id` patterns (`seed_*` slugs) |
| `docs/SEED_CATALOGUE.md` | Human-readable catalogue notes |

**Where to put new titles**

- Indian / highlight pack → `seedIndianHighlights.ts` (`INDIAN_HIGHLIGHT_MEDIA`)
- General / international canon → `seedData.ts` (`SEED_MEDIA` array, after spread of Indian highlights)
- Filmmakers → `seedData.ts` (`SEED_PEOPLE`)

After adding or correcting entries, **bump** `SEED_CATALOGUE_VERSION` in `seedData.ts` so existing users receive a merge on next extension load.

---

## 3. Data sources (priority order)

### Primary: TMDb

Use TMDb as the source of truth for identity, poster, year, genres, synopsis, and credits.

1. **Search** — `GET /3/search/movie` or `/search/tv` with title + year.
2. **Confirm match** — same title (or known alternate), correct year, correct language/origin for regional cinema.
3. **Details** — `GET /3/movie/{id}` or `/tv/{id}` with  
   `append_to_response=credits,external_ids`
4. **Poster** — use `poster_path` from the matched TMDb record only.  
   Full URL: `https://image.tmdb.org/t/p/w500{poster_path}`

### Secondary: OMDb (IMDb + Rotten Tomatoes)

Subsume’s runtime uses OMDb for IMDb/RT when the user has an API key. For **seed data**, embed ratings directly:

- OMDb: `GET https://www.omdbapi.com/?apikey=KEY&t={title}&y={year}&type=movie|series`
- Map `imdbRating` → `{ provider: 'imdb', score }` (0–10 scale)
- Map `Ratings[]` where `Source === 'Rotten Tomatoes'` → `{ provider: 'rt', score }` (0–100, strip `%`)

If OMDb has no RT score, omit the `rt` entry — do not guess.

### Verification cross-checks

Before writing an entry, confirm:

- [ ] TMDb `id` opens the correct film on themoviedb.org
- [ ] Poster thumbnail on TMDb matches the intended title (common failure: wrong regional remake, similarly named film, or reused `poster_path`)
- [ ] Release year matches the **theatrical/original** release, not a re-release or dub
- [ ] For Indian/regional titles: verify original-language title; use `canonicalTitle` as the English or most common display title Subsume should show
- [ ] IMDb ID from TMDb `external_ids.imdb_id` resolves to the same film

---

## 4. Type reference

### `MediaItem` (required seed fields)

```ts
interface MediaItem {
  id: string;                    // see §5
  canonicalTitle: string;        // display title
  originalTitle?: string;        // optional — non-English original
  type: 'movie' | 'tv';
  year: number;                  // 4-digit release year
  genres: string[];              // human-readable names, e.g. 'Drama', 'Thriller'
  ratings: MediaRating[];        // see §6
  providers: MediaExternalId[];  // see §7
  posterUrl: string;             // full TMDb w500 URL
  backdropUrl?: string;          // optional
  overview?: string;             // synopsis + crew block — see §8
  runtimeMinutes?: number;       // optional
  wikidataDirectorBio?: string;  // primary director display name
}
```

### `MediaRating`

```ts
{ provider: 'tmdb' | 'imdb' | 'rt', score: number, votes?: number }
```

| Provider | Scale | Example |
|----------|-------|---------|
| `tmdb` | 0–10 (one decimal) | `8.4` |
| `imdb` | 0–10 | `8.7` |
| `rt` | 0–100 (Tomatometer %) | `97` |

### `MediaExternalId` (providers array)

```ts
{ provider: 'tmdb' | 'imdb', externalId: string, url?: string }
```

Example:

```ts
providers: [
  { provider: 'tmdb', externalId: '12345', url: 'https://www.themoviedb.org/movie/12345' },
  { provider: 'imdb', externalId: 'tt0099878', url: 'https://www.imdb.com/title/tt0099878/' },
],
```

Always include **both** TMDb and IMDb when IDs are known.

### `LibraryItem` (per-title user state)

Built via `libraryEntryForSeed()` in `seedIndianHighlights.ts` for highlights, or mapped in `SEED_LIBRARY`.

Highlight titles can have rich demo state in `HIGHLIGHT_LIBRARY`:

```ts
{
  status: 'watched' | 'to-watch' | 'watching' | 'abandoned',
  userRating?: number,           // 1–10
  notes?: string,                 // personal reflection copy
  sanctuaryIntent?: 'keep_memory' | 'revisit_this_month' | 'wishlist',
}
```

Non-highlight seeds default to `to-watch` with no notes.

### `PersonItem` (filmmakers)

```ts
{
  id: 'tmdb_person_{tmdbPersonId}',   // e.g. 'tmdb_person_56531'
  name: string,
  role: 'director' | 'actor' | 'writer' | 'cinematographer' | ...,
  profileImageUrl?: string,           // https://image.tmdb.org/t/p/w300_and_h450_bestv2{profile_path}
  biography?: string,                 // 2–4 sentence bio
  knownFor: string[],                 // top 3 title strings
  filmographyIds: string[],           // seed media ids, e.g. ['seed_nayakan', 'seed_iruvar']
  followedAt: Date.now(),
  lastSyncedAt: Date.now(),
}
```

`filmographyIds` must use the same `id` strings as `MediaItem.id` entries you create.

---

## 5. ID conventions

Seed media IDs **must** match:

```
seed_[a-z0-9_]+
```

**Generate slugs** from the canonical English title:

| Title | ID |
|-------|-----|
| Nayakan | `seed_nayakan` |
| Everything Everywhere All at Once | `seed_everything_everywhere` |
| Oru Vadakkan Veeragatha | `seed_oru_vadakkan_veeragatha` |
| Drishyam (2013 Malayalam) | `seed_drishyam_ml` (disambiguate remakes) |

Rules:

- Lowercase, underscores, no special characters
- Keep IDs **stable** once shipped — changing an ID breaks merge for existing users
- Disambiguate remakes/language versions with suffixes (`_ml`, `_tamil`, `_hindi`)

Person IDs: `tmdb_person_{numeric TMDb person id}`.

---

## 6. Ratings — how to fetch and store

For each title, collect:

1. **TMDb** — `vote_average` and optional `vote_count` from movie/TV details
2. **IMDb** — from OMDb `imdbRating` or TMDb `external_ids.imdb_id` + OMDb
3. **Rotten Tomatoes** — from OMDb `Ratings` array only

Example:

```ts
ratings: [
  { score: 8.4, provider: 'tmdb', votes: 1200 },
  { score: 8.7, provider: 'imdb' },
  { score: 94, provider: 'rt' },
],
```

Do **not**:

- Copy TMDb score into IMDb slot
- Invent RT scores
- Use critic/user RT interchangeably — Tomatometer (critic %) only, consistent with OMDb

---

## 7. Poster rules

- Always construct from the matched record’s `poster_path`
- Use width `w500`: `https://image.tmdb.org/t/p/w500{poster_path}`
- If `poster_path` is `null`, set `posterUrl: ''` and flag for human review — do not substitute another film’s art
- **Manually open** the poster URL in a browser before committing

Known past failure: two titles sharing the same wrong `poster_path`. Each title must have its own verified path.

---

## 8. Overview & crew block format

Subsume stores crew/cast in `overview` as a **single string** (there are no separate director/actor columns on `MediaItem`). Follow this exact layout:

```
{1–3 sentence synopsis from TMDb, lightly edited for clarity}

• Directed by: {Director Name(s)}
• Written by: {Writer Name(s)}          // include when known
• Starring: {Lead cast, comma-separated, top 3–6}
• Cinematography: {DP name}             // from crew job "Director of Photography"
• Music by: {Composer}                  // optional but preferred for Indian cinema
```

Example:

```ts
overview:
  'A common man\'s struggle leads him to become a powerful don in Mumbai\'s slums.\n\n• Directed by: Mani Ratnam\n• Written by: Mani Ratnam, Balachandra Menon\n• Starring: Kamal Haasan, Saranya, Karthika\n• Cinematography: P. C. Sreeram\n• Music by: Ilaiyaraaja',
wikidataDirectorBio: 'Mani Ratnam',
```

**Crew extraction from TMDb credits**

| Role | TMDb `job` / `department` |
|------|---------------------------|
| Director | `job === 'Director'` |
| Writer | `Writing` department — `Screenplay`, `Story`, `Writer` |
| Cinematographer | `Director of Photography` |
| Composer | `Original Music Composer` or `Music` |
| Cast | `cast` — order by `order` field, take top billed |

Set `wikidataDirectorBio` to the **primary director’s display name** (first director if several).

---

## 9. Genres

Use **English genre names**, not TMDb numeric IDs.

From TMDb details `genres[].name`, e.g.:

```ts
genres: ['Crime', 'Drama'],
```

Keep 1–4 genres; prefer TMDb’s list order.

---

## 10. End-to-end agent workflow

### Step A — Receive assignment

The operator will provide something like:

- A list of **film titles** (with optional year/language hints), and/or
- A list of **filmmakers** whose filmographies should be seeded, and/or
- Instructions to **fix** specific existing seed entries

Do not invent the catalogue scope — only fetch what you are told.

### Step B — Resolve each title on TMDb

```
search → verify match → details + credits + external_ids
```

Document the chosen TMDb ID and IMDb ID in your working notes.

### Step C — Fetch ratings

```
TMDb vote_average + OMDb imdb/rt
```

### Step D — Build `MediaItem` object

Fill every field per §4–§9. Escape apostrophes in TypeScript strings (`\'`).

### Step E — Build `LibraryItem` / highlight state

- If the title is a **featured highlight**, add an entry to `HIGHLIGHT_LIBRARY` keyed by `media.id`
- Avoid **duplicate keys** in `HIGHLIGHT_LIBRARY` (one entry per id)
- Write reflection `notes` only when the operator provides copy or asks for placeholder demo reflections

### Step F — Build / update `PersonItem` rows

When seeding filmmakers:

1. Fetch TMDb person details + combined credits
2. Link `filmographyIds` to your `seed_*` media ids
3. Deduplicate against existing `SEED_PEOPLE` — merge filmography, don’t duplicate persons

### Step G — Write into repo

1. Add objects to the correct seed file(s)
2. Ensure `SEED_MEDIA` ordering is intentional (highlights first via spread, then canon)
3. `SEED_LIBRARY` is derived: `SEED_MEDIA.map((m, idx) => libraryEntryForSeed(m, idx))` — no manual duplicate unless you have a special case
4. Increment `SEED_CATALOGUE_VERSION` by 1

### Step H — Validate

```bash
cd /path/to/Subsume
npm test          # must pass
npm run build     # must succeed
```

Manual QA:

1. Load `dist/` in Chrome
2. Settings → Data → **Merge highlight catalogue** (or fresh profile)
3. Open 3–5 seeded titles — check poster, year, ratings chips (TMDb / IMDb / RT), synopsis, genres
4. Filmmakers page — filmography links resolve to the right titles

---

## 11. Complete worked example

**Assignment:** Seed *Nayakan* (1987, Tamil).

**Resolved IDs:** TMDb movie `10674`, IMDb `tt0096256`.

**Output fragment** (already in repo — use as formatting reference):

```ts
{
  id: 'seed_nayakan',
  canonicalTitle: 'Nayakan',
  type: 'movie',
  year: 1987,
  genres: ['Crime', 'Drama'],
  ratings: [
    { score: 8.5, provider: 'tmdb', votes: 450 },
    { score: 8.4, provider: 'imdb' },
    { score: 100, provider: 'rt' },
  ],
  providers: [
    { provider: 'tmdb', externalId: '10674', url: 'https://www.themoviedb.org/movie/10674' },
    { provider: 'imdb', externalId: 'tt0096256', url: 'https://www.imdb.com/title/tt0096256/' },
  ],
  posterUrl: 'https://image.tmdb.org/t/p/w500/i2QOxh6pwgy1MUF4bBYDVdPwbWa.jpg',
  overview:
    'A common man\'s struggle leads him to become a powerful don in Mumbai\'s slums.\n\n• Directed by: Mani Ratnam\n• Written by: Mani Ratnam, Balachandra Menon\n• Starring: Kamal Haasan, Saranya, Karthika\n• Cinematography: P. C. Sreeram\n• Music by: Ilaiyaraaja',
  wikidataDirectorBio: 'Mani Ratnam',
},
```

---

## 12. Bulk fetch script (optional)

You may use a small Node/Python script to call TMDb + OMDb and emit TypeScript fragments. If you do:

- Output **typed** `MediaItem` objects, not loose JSON
- Include a `--dry-run` review markdown table before writing files
- Rate-limit TMDb (≈40 req/10s) and OMDb (daily quota)
- Never commit API keys — read from env (`TMDB_API_KEY`, `OMDB_API_KEY`)

Suggested TMDb endpoints per title:

```
GET /3/search/movie?query={title}&year={year}
GET /3/movie/{id}?append_to_response=credits,external_ids
```

---

## 13. Merge behaviour (what happens after you ship)

Understanding this prevents bad assumptions:

| Event | Behaviour |
|-------|-----------|
| **First install** (empty DB) | All `SEED_MEDIA`, `SEED_LIBRARY`, `SEED_PEOPLE` written |
| **Version bump** (`SEED_CATALOGUE_VERSION`) | `mergeSeedCatalog()` adds missing media/library/people; updates highlight notes |
| **User already has a title** | Existing media row is **not** overwritten — corrections require a new id or a manual migration |
| **RESTORE_DEMO_LIBRARY / Merge highlight catalogue** | Same merge — safe for existing libraries |

**Implication:** If you fix wrong metadata for an already-shipped `id`, existing users keep the old row unless you ship a migration. For corrections, prefer updating in place only before public release, or bump version and add a one-time patch in `mergeSeedCatalog()` that `put`s the corrected `MediaItem`.

---

## 14. Quality checklist (per title)

| Check | Pass? |
|-------|-------|
| TMDb ID verified in browser | ☐ |
| Poster URL shows correct film | ☐ |
| Year matches original release | ☐ |
| `canonicalTitle` is correct display form | ☐ |
| `genres` are English names from TMDb | ☐ |
| `ratings` uses correct provider scales | ☐ |
| IMDb + TMDb in `providers` with URLs | ☐ |
| `overview` has synopsis + crew bullets | ☐ |
| `wikidataDirectorBio` set | ☐ |
| `id` is unique, stable `seed_*` slug | ☐ |
| Apostrophes escaped in TS strings | ☐ |
| `SEED_CATALOGUE_VERSION` bumped | ☐ |
| `npm test` && `npm run build` green | ☐ |

---

## 15. What NOT to do

- Do not scrape IMDb/RT HTML if API data is available
- Do not guess ratings or posters
- Do not use TMDb `id`-less search results without year verification
- Do not add titles the operator did not request
- Do not store crew only in comments — use `overview` format
- Do not change `MEDIA_ID_PATTERN` or invent non-`seed_` ids for catalogue entries
- Do not skip version bump after catalogue changes

---

## 16. Handoff template

When finished, report back to the operator:

```markdown
## Seed data run — {date}

**Catalogue version:** {N} → {N+1}
**Titles added/updated:** {count}

| ID | Title | Year | TMDb | IMDb | Poster OK |
|----|-------|------|------|------|-----------|
| seed_* | … | … | … | … | yes/no |

**Files changed:**
- src/background/seedData.ts
- src/background/seedIndianHighlights.ts (if applicable)

**Validation:** npm test ✅ | npm run build ✅
**Manual QA:** {notes}
```

---

## 17. API keys

The extension stores user TMDb/OMDb keys in preferences. For the **seed agent** running locally:

- Request keys from the operator, or use project `.env` if configured
- TMDb: https://www.themoviedb.org/settings/api
- OMDb: https://www.omdbapi.com/apikey.aspx

---

*Subsume repo:* https://github.com/harshabala/Subsume  
*Related doc:* `docs/SEED_CATALOGUE.md`