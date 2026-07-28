# Subsume v0.3.0 — Books as a first-class medium (Phase 0–3 complete)

Multi-medium sanctuary: **films, shows, and books** in one private, local-first product.  
This release train closes the books expansion contract for **Phases 0–3** (domain → MVP → recommendations/dispatch/alerts → relations/experiences/imports). **FUTURE** media (comics, podcasts, games, social backend) remain out of scope.

## Status

| Track | State |
| :--- | :--- |
| Phase 0 — Domain foundation | **Done** |
| Phase 1 — Books MVP | **Done** |
| Phase 2 — Recs, dispatch, alerts | **Done** |
| Phase 3 — Relations, editions, stats, import | **Done** |
| FUTURE (beyond Phase 3) | Not started (by design) |

Version remains **0.3.0** for this completion train (see `package.json` / `manifest.json`).

---

## Phase 0 — Domain foundation

- `CatalogWork`, `LibraryRelationship`, `Creator`, `Experience`, `Reflection`, book editions
- Compatibility converters from legacy `MediaItem` / `LibraryItem` / `PersonItem`
- Medium-aware status labels (Want to read / Reading / Read / Did not finish)
- Shared emotional keys with book-specific display language
- IndexedDB **v4** stores + idempotent migration (old stores preserved)
- Dual-write so movie/TV flows keep working

## Phase 1 — Books MVP

- **Open Library** provider (search, ISBN → edition → work, covers, provenance)
- **ISBN** validation, conversion, extraction
- **Page detection (books):** JSON-LD Book, ISBN+context, domain adapters, title/author heuristics
- **Screen page detection:** JSON-LD + domain adapters + documentary kind (precision-first)
- **Detection harness:** 30 offline fixtures; full pipeline **27/30 correct medium (90%)**, **0 wrong medium**; residual 3 FNs intentional (weak blog mentions / non-title list hub)
- **Archive filters:** All | Screen | Books
- **Search:** Books chip + Open Library results
- Message types: `SEARCH_WORKS`, `RESOLVE_PAGE_CANDIDATE`, `ADD_TO_ARCHIVE`, etc.
- Content prefs: `detectBooks`, `detectScreenWorks`, `coverOverlaysEnabled`
- Manifest hosts: `openlibrary.org`, covers CDN
- Defaults: movies, TV, and books **enabled**
- Book **page plaques** (high-confidence only)
- **Google Books** optional provider + Settings key
- **Export/import v2** multi-medium (**no API keys** in export payload)
- Open Library **author** search/follow
- Reading **progress** (page/total) for books
- Appendable **ReflectionTimeline**; SET_USER_NOTES dual-writes reflections
- Abandon prompts for “Did not finish”
- Taste profile **screen vs reading** split in LLM prompts
- Archive collection labels medium-aware

## Phase 2 — Recommendations, dispatch, alerts

- LLM **capability registry** (honest catalog-only by default)
- Catalog validation for every LLM recommendation candidate
- Open Library catalog book recommendations from reading taste
- **Cross-medium recommendations** (film/TV ↔ book via work relations / catalog bridges) behind pref
- Recommendation dismiss feedback (local)
- Multi-medium **Subsume Dispatch** (opt-in weekly; screen + books; idempotent)
- Settings: Weekly selection toggle + Generate now
- **Web-grounded dispatch path** behind capability gate + user opt-in (see honesty limits)
- **Release Alerts** type Book (Open Library keyword/author)

## Phase 3 — Relations, experiences, polish

- Work relations: `adaptation_of` / `adapted_as` (user assert + optional Wikidata)
- DetailModal Related works + Link adaptation
- Read again / Watch again multi-session experiences
- Edition list + preferred edition (shared archive relationship; no destructive multi-work merge)
- Archive medium badges (Book / Film / Series)
- **Rating history** on library relationships (capped; DetailModal when history > 1)
- Book alert kinds: **translation** / **new edition** (best-effort OL signals — see honesty limits)
- Richer **book statistics** (finished, currently reading, abandoned, optional pages)
- Optional **Goodreads CSV import** (one-shot seed, not continuous sync)

---

## Honesty limits (read carefully)

These are product constraints, not temporary bugs:

| Topic | Reality in production |
| :--- | :--- |
| **Web search / “researched the web”** | Production uses **`NoopWebSearchAdapter`** → `supportsWebSearch: false` for all LLM providers until a real adapter is registered and functional. Dispatch stays **catalog-only** unless both capability and `webGroundedDispatchEnabled` are true. No false web-research claims. |
| **Translation / new-edition alerts** | **Best-effort** matching on Open Library language/edition signals when available. **Not** a complete or guaranteed alert surface for every translation or reprint. UI documents incompleteness. |
| **Goodreads import** | **Optional one-shot CSV** seed (cap 100 rows). **Not** continuous Goodreads sync, OAuth, or shelf parity. CSV is parsed **on device**; never sent to an LLM. |
| **Detection harness** | Full pipeline: **27/30** correct medium; **0** wrong medium. Three intentional false negatives preserve precision (blog prose / list hubs). Plaques stay high-confidence (≥0.85 books). |
| **Edition “merge”** | Preferred edition + sibling editions from catalogue — **not** automated destructive merge of two work IDs across providers. |
| **Export privacy** | Library export **excludes API keys** and preference secrets; media/library/works/editions/relationships only. |

Out of scope for this release train: StoryGraph productization, barcode/OCR, social features, backend, comics/podcasts/games, continuous Goodreads sync, promised-complete translation coverage.

---

## Docs

- `docs/SUBSUME_BOOKS_EXPANSION_INSTRUCTIONS.md` — target contract
- `docs/SUBSUME_BOOKS_EXPANSION_FULL_PACKAGE.md` — package + IA
- `docs/detection-accuracy-report.md` — harness metrics
- `docs/superpowers/plans/2026-07-28-books-expansion-100-complete.md` — Phase 0–3 completion plan
- `docs/PRIVACY.md` — privacy (local-first; exports without API keys)

## Tests

ISBN, Open Library fixtures, book detection, screen detection harness, migration v4, status labels, recommendations, dispatch capability gates, alerts, editions, stats, Goodreads import, export v2, plus existing suite.

```bash
npm ci && npm run typecheck && npm test && npm run build
# or: npm run ci
```

## Install

```bash
npm run build
# Load unpacked → dist/
```

## Privacy reminder

- No Subsume backend; library stays on device unless you opt into Drive backup.
- Optional API keys (TMDb, OMDb, Google Books, LLM) stay in local preferences.
- **Exports never include API keys.**
- Goodreads CSV import is local parse only.
