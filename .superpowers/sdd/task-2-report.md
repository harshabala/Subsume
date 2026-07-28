# Task 2 Report — Cross-medium recommendations

**Status:** DONE  
**Branch:** `feat/books-expansion`  
**Date:** 2026-07-28

## Delivered

### Generator (`src/background/crossMediumRecommendations.ts`)
- Catalog-safe cross-medium recs (film/TV ↔ book).
- Pref gate via `enabled` option (false → empty, no I/O).
- **Pass 1:** Highly rated / watched library seeds → `adaptation_of` / `adapted_as` / `based_on` work relations → resolve linked `MediaItem` from media/works storage only (skip if missing).
- **Pass 2 (optional):** If no relation hit for a seed, catalog search:
  - book seed → discovery (screen)
  - screen seed → Open Library (books)
  - Only provider-returned works; `putMediaItem` before recommend.
- Human-readable bridge `explanation` on every item; `discoveryMode: 'cross_medium'`.

### Handler wiring
- `GET_RECOMMENDATIONS` appends cross-medium items when `prefs.crossMediumRecommendationsEnabled === true`.
- Dismissed works filtered; deduped against existing primary recs.
- Book catalog recs also tagged `discoveryMode: 'catalog'`.

### Types
- `Recommendation.discoveryMode?: 'catalog' | 'web_grounded' | 'cross_medium'`
- `Recommendation.seedTitle?: string`

### UI
- Recommendations page chips: **All | Screen | Books | Cross-medium** (Cross-medium chip only when pref is on).
- Client-side filter by medium / discoveryMode.
- Settings → Books & detection: **Cross-medium recommendations** toggle (default off).

### Tests
- `tests/crossMediumRecommendations.test.ts` (9 cases): pref off, relation hits both directions, missing catalog target, library exclude, candidate search catalog-only, no seeds, explanation helpers.

## Not in scope
- Web-grounded dispatch (Task 3).
- Detection threshold changes.
- Silent permanent relation creation from candidate search.

## Verification
- Focused: `crossMediumRecommendations`, `bookRecommendations`, `workRelations`, `recommendations-trakt` — green.
- Full suite: **71 files, 456 tests passed**.
- `tsc --noEmit` clean.

## Commit
- `feat(recs): cross-medium recommendations behind pref`

---

## Review fix pass (Important issues) — 2026-07-28

**Status:** DONE  
**Inputs:** task-2-review.md Important #1–#4 (no Criticals)

### Fixes

1. **UI group detection** (`Recommendations.tsx`, `Home.tsx`, `isGroupedRecommendationList` in `types.ts`)  
   Grouped vs flat no longer uses `'seedTitle' in item`. Guard requires `Array.isArray(item.recommendations)`. Flat cross-medium recs with optional `seedTitle` stay on the flat path.

2. **LLM grouped path no longer drops catalog/cross** (`handlers/recommendations.ts`)  
   When LLM returns `GroupedRecommendation[]`, handler still runs book catalog + cross-medium (pref on), merges into groups (by seed title for cross; “Related books” group for catalog), then returns groups. No early `return llmRecs`.

3. **Pass 2 book→screen match gate** (`crossMediumRecommendations.ts`)  
   `titleMatchScore` (≥ 0.5) before accepting `discoverySearch` hits; word-boundary aware so short titles like “It” do not match substrings inside unrelated film titles. OL screen→book path unchanged (`matchScore >= 0.5`).

4. **Generator `enabled` fail closed**  
   Default `enabled = false`; no I/O unless caller opts in. Handler still passes `enabled: true` when pref `=== true`.

### Tests
- `tests/crossMediumRecommendations.test.ts` — **14/14** (added: default disabled, book→screen title gate accept/reject, `titleMatchScore`, `isGroupedRecommendationList`)
- Also green: `bookRecommendations`, `recommendations-trakt`, `discoveryPages`, `llm`, `infra`, `types-extension`
- `tsc --noEmit` clean

### Commit
- `fix(recs): cross-medium review — group guard, LLM merge, match gate, fail-closed`
