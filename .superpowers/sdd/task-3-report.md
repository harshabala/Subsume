# Task 3 Report — Web-grounded dispatch path (honest capability)

**Status:** DONE  
**Branch:** `feat/books-expansion`  
**Date:** 2026-07-28

## Delivered

### Pref + Settings
- `UserPreferences.webGroundedDispatchEnabled?: boolean` (default `false` in storage).
- Legacy `dispatchWebSearchEnabled` still accepted as opt-in alias via `isWebGroundedDispatchOptIn`.
- Settings → Weekly selection: **Web-grounded dispatch** toggle with cost/privacy warning (provider billing, search intents from archive, no false web claims without capable adapter).

### Digest item shape
- `WeeklyDigestItem.discoveryMode?: 'catalog' | 'web_grounded'`
- `WeeklyDigestItem.citations?: DigestCitation[]` (`{ url; title? }`)
- Catalog path always tags `discoveryMode: 'catalog'`; never attaches citations.

### WebSearchAdapter (`src/shared/webSearchAdapter.ts`)
- Interface: `id`, `supportsWebSearch`, `search(query, options?)`.
- **NoopWebSearchAdapter** (production default): `supportsWebSearch: false`, empty results.
- Registry: `getActiveWebSearchAdapter` / `setActiveWebSearchAdapter` / `resetActiveWebSearchAdapter`.
- No live provider adapter registered in production (honest).

### Capability honesty (`src/shared/llmCapabilities.ts`)
- `getLlmProviderCapabilities` sets `supportsWebSearch` from **active adapter only**.
- Production Noop → `supportsWebSearch: false`, capabilities `['chat']`.
- Capable mock/real adapter → `supportsWebSearch: true`, capabilities `['chat', 'web_search']`.
- `canClaimWebResearch(provider, optIn)` requires both adapter support and user opt-in.

### Dispatch path (`src/background/dispatch.ts`)
- `generateSubsumeDispatch`: if `canClaimWebResearch(llmProvider, webGroundedOptIn)`, runs `buildWebGroundedCandidates`.
- Web path: bounded adapter searches → resolve titles via Open Library → store real works + citations + `discoveryMode: 'web_grounded'`.
- Never invents works: unresolved hits are skipped.
- Opt-in without capability → catalog-only (logged); no “researched the web” claim.

### Tests
- `tests/webGroundedDispatch.test.ts` (6): capability false → catalog-only; mock adapter → citations + `web_grounded`; opt-in false with adapter → no search; resolve path; unresolvable skip; mixed persist.
- `tests/dispatch.test.ts`: catalog `discoveryMode`; opt-in without adapter stays catalog.
- `tests/llmCapabilities.test.ts`: adapter registry flips capability; opt-in helper.

## Not in scope
- Live OpenAI/Anthropic/Gemini web_search adapter (register later when tool path is real).
- Tasks 4–8 (rating history, translation alerts, edition UX, stats, Goodreads import).

## Verification
- Focused: `webGroundedDispatch`, `dispatch`, `llmCapabilities` — green (32 tests).
- Full suite: **72 files, 473 tests passed**.
- `tsc --noEmit` clean.

## Commit
- `feat(dispatch): honest web-grounded path behind capability gate`

---

## Follow-up fix — OL resolve title gate (review Important #1)

**Date:** 2026-07-28  
**Finding:** `searchOpenLibrary` `matchScore` is rank-only (`1 - i * 0.05`). With `limit: 2`, top hits are always ≥ 0.95, so `if (!best || best.matchScore < 0.5)` never rejected a non-empty OL response. Web hits could attach `web_grounded` + citations to wrong catalog works.

**Fix:** In `buildWebGroundedCandidates`, pick first OL hit where `titleMatchScore(hit.title, work.canonicalTitle) ≥ 0.5` (reuse `titleMatchScore` from `crossMediumRecommendations`, same bar as Task 2 Pass 2). Empty OL / no title-close hit → skip (no invented works, no wrong citation pairing).

**Test:** `rejects high-rank OL hits whose titles do not match the web hit (title gate)` — rank-1 wrong title rejected; matching title accepted with citations.

### Verification
- `npx vitest run tests/webGroundedDispatch.test.ts tests/dispatch.test.ts` → **22/22 passed** (7 web + 15 dispatch)

### Commit
- `fix(dispatch): gate OL web resolve on titleMatchScore not rank`
