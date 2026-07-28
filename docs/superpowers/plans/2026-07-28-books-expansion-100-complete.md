# Books Expansion — 100% Phase 0–3 Completion Plan

**Branch:** `feat/books-expansion`  
**Contract:** `docs/SUBSUME_BOOKS_EXPANSION_INSTRUCTIONS.md` §18 (Phases 0–3 only; **not** FUTURE)  
**Date:** 2026-07-28  
**Method:** Subagent-driven development (implement → review → ledger)

## Already delivered (do not re-implement)

Phase 0 domain/types/migration; Phase 1 books MVP (OL, ISBN, detection, archive filters, search, plaques, Google Books key, export v2 foundation); Phase 2 authors, catalog book recs, capability registry, catalog dispatch, book alerts, rec feedback; Phase 3 relations, experience history, reflection timeline, edition picker. Full suite green (~447 tests).

## Global constraints

1. Local-first; never invent catalog works via LLM.
2. False-positive plaques worse than misses — keep book high-confidence ≥0.85; screen detection floor 0.65; do not lower casually.
3. Preserve movie/TV dual-write and IndexedDB migrations.
4. No FUTURE media (comics, podcasts, games, social, backend).
5. Web-grounded claims only when `canClaimWebResearch(provider, optIn)` is true; otherwise catalog-only.
6. Tests for every new detector, alert type, import, rec path, dispatch path.
7. Commit after each task with conventional message; keep changes focused.

## Remaining tasks

### Task 1 — Land screen detection + harness (Workstream E completeness)

**Files:** untracked `src/content/screenDetection/*`, `detectionHarness.ts`, fixtures, tests, docs, `src/content/index.ts` wiring.

**Deliver:**
- Commit all screen page detection (JSON-LD + domain adapters + documentary kind).
- Commit 30-fixture harness + Vitest suite + accuracy report.
- Ensure `npm test` includes detection harness (11+ tests) and full suite stays green.

**Done when:** detection files tracked; `tests/detectionHarness.test.ts` green; content logs screen hits without weakening book gates.

### Task 2 — Cross-medium recommendations (Phase 2)

**Deliver:**
- When `crossMediumRecommendationsEnabled` is true, generate cross-medium suggestions:
  - film/TV ↔ book via existing work relations (`adaptation_of` / `adapted_as`) and high-rated seeds;
  - optional OL search for “source novel” style bridges only when a catalog work resolves.
- UI: Recommendations medium chips `Screen | Books | Cross-medium` (or filter); Settings toggle already has pref — wire it if missing.
- Each cross-medium item must resolve to a real `workId`/`mediaId`, include bridge explanation, `discoveryMode: 'cross_medium'` if type allows, or equivalent field on recommendation payload.
- When pref is false, never inject cross-medium items.

**Tests:** unit/integration for generator + pref gate; no invented titles.

### Task 3 — Web-grounded dispatch path (Phase 2)

**Deliver:**
- Pref: `webGroundedDispatchEnabled` (default false) + Settings copy warning (cost/privacy).
- Extend `WeeklyDigestItem` (or parallel field) with optional `citations?: { url: string; title?: string }[]` and `discoveryMode?: 'catalog' | 'web_grounded'`.
- In `generateSubsumeDispatch`: if `canClaimWebResearch(llmProvider, webGroundedDispatchEnabled)`, call a dedicated web path; else catalog-only (current behavior).
- **Honest capability:** Keep `supportsWebSearch: false` for providers until a real tool path exists **OR** implement a minimal, testable web-search adapter for one provider (e.g. OpenAI Responses web_search if key present) that stores citations. If no live API in CI, mock the search adapter in tests and leave production `supportsWebSearch` true only when the adapter is registered and functional.
- Preferred approach for ship: implement `WebSearchAdapter` interface + `NoopWebSearchAdapter` (supportsWebSearch false) + optional `OpenAiWebSearchAdapter` behind feature flag; wire dispatch to use adapter; tests cover catalog-only and mock web-grounded with citations; production remains catalog-only until adapter returns supportsWebSearch true.

**Done when:** tests prove catalog-only when capability false; mock web path attaches citations; no false “researched the web” claims without capability.

### Task 4 — Rating history (Phase 3)

**Deliver:**
- Persist rating changes on library relationships: when `SET_USER_RATING` changes rating, append `{ rating, at }` to a history array on `LibraryItem` / relationship (cap e.g. 50 entries).
- DetailModal: show compact rating history (or under ExperienceHistory section) when history length > 1.
- Migration-safe: optional field; no schema version bump if optional object field on existing store is OK (IndexedDB free-form).

**Tests:** library handler records history; UI smoke optional.

### Task 5 — Translation / new-edition alert types (Phase 3 + §11)

**Deliver:**
- Extend `WatchAlert` (alias docs as ReleaseAlert conceptually; keep message names for compatibility) with optional `alertTypes?: Array<'new_release'|'adaptation'|'translation'|'new_edition'|'news'>` and/or book-specific flags.
- Book alert matching: when type book and alertTypes includes translation/new_edition, match Open Library results that indicate edition/language signals when available (best-effort; do not promise completeness — document in UI).
- Alerts UI: optional checkboxes for book alert kinds.

**Tests:** matching helpers for keyword + author + alertTypes filter.

### Task 6 — Edition reconciliation UX (Phase 3)

**Deliver:**
- In DetailModal book edition section: show edition list with language/ISBN/publisher; set preferred edition (exists).
- Add “Use as preferred” clarity + note that editions share one archive relationship (copy).
- If two catalog works share ISBN linkage and user asserts merge is not available, add **manual preferred edition only** (full automated merge of two work IDs is out of Phase 1 non-goals — Phase 3 “merge UI” = pick preferred + show siblings from `GET_BOOK_EDITIONS`, not destructive work merge unless already present).

**Tests:** SET_PREFERRED_EDITION + GET_BOOK_EDITIONS still green; add UI-facing unit if pure helpers extracted.

### Task 7 — Richer book statistics (Phase 3)

**Deliver:**
- Stats page: books finished (status read/watched), currently reading count, abandoned (did not finish), optional total pages from progress when present.
- Keep literary tone; no chart library required.

**Tests:** pure stats computation helper unit test.

### Task 8 — Optional Goodreads CSV import (Phase 3 “imports from user exports”)

**Deliver:**
- Settings or Library: “Import Goodreads CSV” file picker.
- Parse Goodreads export columns (Title, Author, ISBN13, My Rating, Exclusive Shelf, Date Read) best-effort.
- Resolve via Open Library ISBN/title; add to archive with mapped status (read/to-read/currently-reading).
- Never send CSV to LLM; local parse only.
- Cap import batch (e.g. 100 rows) with progress/error summary.
- Document non-goals: not a full Goodreads sync.

**Tests:** pure CSV row parser + status mapping with fixture string.

### Task 9 — Docs + release notes for Phase 0–3 complete

**Deliver:**
- Update `RELEASE_NOTES_v0.3.0.md` (or add v0.3.x notes) reflecting Phase 2–3 completion and remaining honesty limits (web search, alert completeness).
- Short section in README if needed.
- Ensure privacy doc still accurate (no API keys in exports).

### Task 10 — Final verification

**Deliver:**
- `npm run typecheck && npm test && npm run build`
- Fix any failures.
- Progress ledger complete; branch ready for finishing skill / PR.

## Out of scope (FUTURE or explicit non-goals)

Goodreads continuous sync, StoryGraph import productization, barcode/OCR, social, backend, comics/podcasts/games, full automated work-id merge across providers, promised complete translation alerts.
