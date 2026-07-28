# Detection accuracy report

**Date:** 2026-07-25  
**Branch:** `feat/books-expansion`  
**Harness:** `tests/fixtures/detection/` (30 fixtures) + `tests/detectionHarness.test.ts`  
**Raw dump:** [`detection-harness-results.json`](./detection-harness-results.json)

## Scope

Offline fixture harness for page-level medium detection across:

| Bucket        | Count | Sources represented                                      |
|---------------|------:|----------------------------------------------------------|
| Books         | 8     | Amazon, Goodreads, Open Library, publisher, Google Books, Wikipedia, B&N, blog review |
| Movies        | 8     | IMDb, Letterboxd, RT, Netflix, Wikipedia, Prime Video, blog mention |
| Series (TV)   | 8     | IMDb, RT, Wikipedia, Netflix, Letterboxd list (non-title), TVMaze |
| Documentaries | 6     | IMDb (+ genre-less subnav), Letterboxd, Wikipedia, RT, Netflix |

Two modes:

- **baseline** — books pipeline only (pre–screen page detection)
- **full** — books + JSON-LD screen works + screen domain adapters

## Headline metrics

| Mode     | Detected | Correct medium | False negatives | Wrong medium |
|----------|---------:|---------------:|----------------:|-------------:|
| Baseline | 8/30     | **7/30 (23%)** | 22              | 1            |
| Full     | 27/30    | **27/30 (90%)**| 3               | **0**        |

### By expected medium (full)

| Medium        | Detected | Correct | Wrong medium |
|---------------|---------:|--------:|-------------:|
| book          | 7/8      | 7/8     | 0            |
| movie         | 7/8      | 7/8     | 0            |
| tv            | 7/8      | 7/8     | 0            |
| documentary   | 6/6      | 6/6     | 0            |

### Intentional false negatives (full)

These are **precision-preserving** misses, not regressions:

| Fixture ID              | Why FN is correct product behavior                                      |
|-------------------------|--------------------------------------------------------------------------|
| `book-blog-review`      | Weak prose mention; books stay high-confidence only for plaques          |
| `movie-blog-mention`    | Casual film name in a blog; no structured work signals                   |
| `series-letterboxd-list`| Letterboxd list hub (`/lists/`), not a title page (`/film/`)            |

### Wrong-medium history

- **Baseline:** `movie-wikipedia-blade-runner` was mis-read by book heuristics as a book (film wiki page without screen pipeline).
- **Full:** **0 wrong mediums**, including all six documentaries (none collapsed to bare `movie` for harness classification).

Documentaries still store as `medium=movie` with `screenKind=documentary` (product/storage model); the harness scores `classifiedAs === 'documentary'` via `screenKind`.

---

## Signal analysis

### Primary signal on successful detections (full)

| Primary signal   | Hits | Correct | Notes                                      |
|------------------|-----:|--------:|--------------------------------------------|
| `json_ld`        | 15   | 15      | Highest coverage when pages emit schema.org |
| `domain_adapter` | 11   | 11      | Rescues no-JSON-LD title pages + upgrades kinds |
| `isbn`           | 1    | 1       | Publisher page without full JSON-LD Book    |

### False-negative rate by signal *class* (baseline → full)

Baseline had **no screen pipeline**, so every movie/series/doc fixture was an FN for structured page detection (poster scanner is separate and out of scope here).

| Gap class                    | Baseline impact                         | Full status                                      |
|------------------------------|-----------------------------------------|--------------------------------------------------|
| Missing screen JSON-LD path  | ~22 screen FNs                          | Closed for Movie / TVSeries / VideoObject        |
| Missing domain adapters      | IMDb/Letterboxd/RT/Netflix/Prime zero   | Adapters cover title paths                       |
| Documentary vs movie         | N/A (no detection)                      | Genre / subnav / infobox upgrade → documentary   |
| Book blog heuristics         | 1 FN (intentional)                      | Unchanged — precision gate                       |
| Non-title pages              | N/A                                     | Still FN by design (list hubs, blog mentions)    |

**Highest false-negative rate by signal type (pre-fix):**

1. **Screen structured detection (JSON-LD + adapters) — 100% FN** on screen fixtures under baseline (architecture gap, not threshold).
2. **Book heuristics / weak prose** — high FN by design (`title_author_text` without ISBN/JSON-LD rarely reaches plaque floor).
3. **ISBN-only** — low FN on commerce pages; mid-band when title missing.

After the full pipeline, residual FNs are **not** from under-firing JSON-LD or adapters on title pages; they are non-title or weak-mention fixtures.

### Domains with zero coverage

**Baseline** (no successful detection on any fixture from host):

- `imdb.com`, `letterboxd.com`, `rottentomatoes.com`, `netflix.com`, `tvmaze.com`, `blog.example.com`

**Full:**

- `blog.example.com` only (both fixtures intentional FNs)

Note: `tvmaze.com` is covered via JSON-LD without a dedicated adapter. `amazon.com` book `/dp/` and video `/gp/video/` both work via separate book vs prime adapters.

---

## Confidence thresholds and precision/recall

### Books (existing)

| Band        | Score     | Product behavior                          |
|-------------|-----------|-------------------------------------------|
| Filtered    | &lt; 0.65 | Not returned                              |
| Mid         | 0.65–0.84 | Detected, **not** auto-plaqued            |
| High        | ≥ 0.85    | Eligible for resolve + plaque             |

Books are already **precision-first**. Lowering the plaque floor would increase FPs on blogs/reviews — **worse for trust** than missing a weak mention.

### Screen page detection (new)

| Constant                     | Value | Role                                      |
|------------------------------|-------|-------------------------------------------|
| `MIN_SCREEN_PAGE_CONFIDENCE` | 0.65  | Floor for reporting a page candidate      |
| Adapter / JSON-LD scores     | ~0.87–0.98 | Title pages land well above floor     |

Screen path was **not** gated the same way as book plaques historically because **there was no page-level screen detector** — only poster/grid scanners. The new pipeline uses the same 0.65 floor for candidate emission; UI plaques for screen titles are still diagnostic/future (content script logs only today).

### Is the threshold too conservative or too loose?

| Question | Finding |
|----------|---------|
| Suppressing true positives (too conservative)? | **No** on fixture title pages — adapters and JSON-LD sit ≥ 0.87. Residual FNs are non-title / blog. |
| Would lowering help books? | **No** — blog book remains correctly below gates; lowering risks wrong plaques. |
| Too loose for movies/series? | **Not on fixtures** — 0 wrong mediums. Risk surface is generic `og:type=video` or broad body text heuristics on non-title streaming pages. Prefer path gates (`/title/`, `/film/`, `/m/`, `/tv/`, `/gp/video/`) over score cuts. |
| Documentary misclassified as movie? | **Fixed** in harness: genre, IMDb subnav, Wikipedia infobox, Netflix body/og signals. |

**Tradeoff flag:** Do **not** silently lower `MIN_SCREEN_PAGE_CONFIDENCE` or book `HIGH_CONFIDENCE` without a precision suite. A wrong plaque is worse than a silent miss.

---

## How documentaries are distinguished

Schema.org almost always types docs as `Movie`. Subsume therefore uses:

1. **JSON-LD** — `genre` / `keywords` / title containing documentary signals → `screenKind: 'documentary'`, `medium: 'movie'`.
2. **IMDb adapter** — hero subnav text (`Documentary`) overrides JSON-LD that omitted the genre (`doc-imdb-neighbor`).
3. **Wikipedia adapter** — infobox/lead “documentary” (with camelCase cell fix) on film pages.
4. **Letterboxd / Netflix** — page text / og + film path.
5. **Merge** — when JSON-LD and adapter disagree, rank `documentary > tv > movie`.

---

## Ranked fixes (effort vs coverage)

Implemented top 3 are marked. Remaining items are backlog.

| Rank | Fix | Effort | Coverage gain | Precision risk |
|------|-----|--------|---------------|----------------|
| **1** | **JSON-LD screen works** (`Movie` / `TVSeries` / episode + documentary genre) | M | Unlocks most structured title pages; baseline→full +20 correct | Low if type-gated |
| **2** | **Domain adapters** (IMDb, Letterboxd, RT, Wikipedia film/TV, Netflix, Prime Video) | M–L | Rescues no-JSON-LD pages; path-gated hosts that were zero-coverage | Low if path-gated; medium if body-text-only |
| **3** | **Documentary kind upgrade** (genre + IMDb subnav + wiki infobox + merge rank) | S–M | 6/6 docs correct; eliminates movie FP for docs in UI copy | Low |
| 4 | Wire screen candidates to plaques / capture (UI) | M | User-visible parity with books | Medium — needs high-confidence gate ≥ 0.85 for auto-plaque |
| 5 | TVMaze / JustWatch / Mubi adapters | S each | Extra domains without JSON-LD | Low with path gates |
| 6 | Episode → series parent resolution | M | Better series UX on episode URLs | Low |
| 7 | Streaming SPA hydration retry | M | Live Netflix/Prime after client render | Medium (timing/noise) |
| 8 | Soft blog heuristics for screen | L | Would pick up blog mentions | **High FP** — not recommended for plaques |
| 9 | Lower confidence floors | S | More mid-band hits | **High** — flag only; do not ship casually |

### Precision/recall note on thresholds

If product later auto-plaques screen titles:

- Prefer **raising** effective plaque floor to **≥ 0.85** (mirror books), not lowering detection floor.
- Keep path + structured evidence requirements; do not treat bare title-string heuristics as plaque-worthy.

---

## Top 3 implemented (this work)

1. **`src/content/screenDetection/jsonLdScreen.ts`** — parse Movie/TVSeries/etc.; documentary via genre/keywords.
2. **`src/content/screenDetection/domainAdapters.ts`** — IMDb, Letterboxd, RT, Wikipedia, Netflix, Prime Video (`amazon.` prefix + `/gp/video/`).
3. **Documentary typing** — JSON-LD genre + IMDb subnav force-kind + Wikipedia infobox spacing fix + merge rank.

### Regression tests

- `tests/detectionHarness.test.ts` — 30-fixture inventory, baseline vs full, Free Solo doc, IMDb no-JSON-LD, Succession TVSeries.
- Fixtures under `tests/fixtures/detection/html/`.
- Content script logs screen hits in `src/content/index.ts` without weakening book gates.

### How to re-run

```bash
npx vitest run tests/detectionHarness.test.ts
node scripts/run-detection-harness.mjs   # fixture inventory
```

To refresh `docs/detection-harness-results.json`, run the dump helper (or extend the harness test) with the same evaluate/summarize APIs as the Vitest suite.

---

## Architecture snapshot

```
page load (content script)
├── detectBookCandidates        → JSON-LD Book / ISBN / book adapters / heuristics
│                                 floors: 0.65 return, 0.85 plaque
├── detectScreenPageCandidates  → JSON-LD screen + screen adapters
│                                 floor: 0.65; screenKind ∈ movie|tv|documentary
├── catalog regions + poster scan (grid/list UIs; separate from page-title detection)
└── hover text scanner (title mentions; separate precision model)
```

**Root cause of baseline failure:** books had a full page pipeline; screen media relied on poster/grid scanning only — no title-page JSON-LD/adapter path, so IMDb/Letterboxd/RT/Netflix/docs all scored as non-detected for medium classification.
