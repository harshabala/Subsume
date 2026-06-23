# Subsume — Shippable Polish Design

**Date:** 2026-06-23
**Status:** Approved (pending spec review)
**Scope owner:** harshabalakrishnan

## Goal

Close the "functional → portfolio-shippable" gap for the Subsume Chrome extension.
The extension is feature-complete and passing (66 tests, `tsc` clean, builds), but a
new user lands in a dead app and there is no CI or UI test coverage. This push makes
Subsume a strong **portfolio / local** artifact. **Chrome Web Store distribution and a
real product screenshot are explicitly deferred.**

## In Scope

1. **Onboarding wizard** — multi-step flow that captures and validates API keys so a new
   user reaches a working app instead of an empty one.
2. **UI smoke-test layer** — pragmatic render-and-interact tests for the highest-value
   untested surfaces.
3. **CI/CD pipeline** — GitHub Actions running type-check, tests, and build on push/PR.

## Out of Scope

- Chrome Web Store packaging, listing assets, account, and publishing.
- README product screenshot (placeholder stays).
- Live LLM key validation (format check only — see §1).
- The rejected background `VALIDATE_API_KEY` message (validation is UI-side — see §1).
- Removing the stale `pnpm-lock.yaml` (unrelated cleanup).

## Global Constraints

- TypeScript strict; `npx tsc --noEmit` must stay green.
- All new UI tests run under the existing vitest + jsdom setup; no real network calls.
- The README invariant "API keys are handled by the extension, not arbitrary web pages"
  is preserved: validation runs only on the **options page** (extension origin), never in
  a content script. The options page may fetch TMDb/OMDb directly because those hosts are
  already in `manifest.json` `host_permissions`, so CORS does not apply.
- No new dependencies beyond the two test libraries named in §2.
- `App.tsx` onboarding gate stays keyed on `prefs.onboardingComplete`; the wizard's job is
  to populate keys before flipping that flag.

---

## §1 — Onboarding Wizard + Key Validation

### Behavior

`src/ui/pages/Onboarding.tsx` is rebuilt from a single welcome splash into a stepped flow.
`App.tsx:191` continues to render `<Onboarding onComplete={completeOnboarding} />` when
`!prefs.onboardingComplete` — unchanged.

| Step | Content | Gate to advance |
|---|---|---|
| 1. Welcome | Condensed hero + feature grid (reuse existing copy) | Next (always) |
| 2. TMDb key | Text input, "Validate & continue", link to themoviedb.org/settings/api | **Required** — must pass live validation |
| 3. OMDb key | Text input, "Validate", **Skip** | Optional; validated only if a value is entered |
| 4. LLM provider + key | Provider `<select>` (openai/anthropic/gemini) + key input, **Skip** | Optional; format check only |
| 5. Done | Confirmation; writes prefs; calls `onComplete` | — |

### State and persistence

- Wizard holds local component state: `step` (1–5) and an in-progress draft of
  `{ tmdbApiKey, omdbApiKey, llmProvider, llmApiKey }`.
- A step-dot progress indicator with Back / Next navigation.
- Keys are written **once** at the "Done" step via a single `SET_PREFERENCES` message that
  merges the draft into existing prefs and sets:
  - `tmdbApiKey`, and `omdbApiKey` / `llmApiKey` / `llmProvider` when provided,
  - `llmEnabled: true` **iff** an LLM key was saved,
  - `onboardingComplete: true`.
- Closing the dashboard mid-wizard leaves `onboardingComplete=false`, so the flow cleanly
  restarts on next open. No partial persistence.

### Validation helper

New file `src/ui/lib/validateKeys.ts`, self-contained, **does not import** the background
`tmdb.ts` (which carries module-level state). Each function returns
`Promise<{ valid: boolean; error?: string }>`:

- `validateTmdbKey(key)` → `GET https://api.themoviedb.org/3/authentication`
  with header `Authorization: Bearer ${key}`. `200` → `{valid:true}`; `401` → invalid with
  a friendly message; network/other → `{valid:false, error}`.
- `validateOmdbKey(key)` → `GET https://www.omdbapi.com/?apikey=${key}&i=tt3896198`.
  JSON `Response === "True"` → valid; `Response === "False"` → invalid (surface `Error`
  field).
- **No** LLM network call. LLM key is checked for presence + a light format heuristic
  (e.g. OpenAI keys start with `sk-`); a malformed-looking key shows an inline warning but
  does not block. A wrong-but-well-formed key surfaces at first real recommendation.

### Error states

- Validation in flight → button shows a loading state, input disabled.
- TMDb invalid → inline error under the field, stay on step 2.
- OMDb invalid → inline error; user may fix or Skip.
- Validation request throws (offline) → inline "Couldn't reach TMDb — check your
  connection" message; do not advance.

---

## §2 — UI Smoke-Test Layer

### Infrastructure changes

- Add devDependencies: `@testing-library/preact`, `@testing-library/jest-dom`.
- `vitest.config.ts`: widen `include` from `['tests/**/*.test.ts']` to
  `['tests/**/*.test.ts', 'tests/**/*.test.tsx']`.
- `tests/setup.ts`: add `import '@testing-library/jest-dom/vitest';` (keep existing
  `fake-indexeddb/auto` + chrome mock unchanged).
- UI tests mock the message layer with `vi.mock('../src/shared/messages')` returning canned
  `ExtensionResponse<T>` objects, and mock `validateKeys.ts` for the wizard. No real
  network or live `chrome.runtime`.

### Test targets (pragmatic high-value set)

| File under test | Smoke assertions |
|---|---|
| `Onboarding.tsx` | Renders welcome; blocked advance on invalid TMDb key; advances on valid; Skip works on optional steps; "Done" dispatches `SET_PREFERENCES` with `onboardingComplete:true` |
| `Settings.tsx` | Renders; key fields present/masked; save dispatches `SET_PREFERENCES` |
| `Library.tsx` | Renders items from mocked `GET_LIBRARY`; search input filters the rendered list |
| `DetailModal.tsx` | Renders title/rating; editing rating/notes triggers the save path |
| `posterBadge.tsx` + `hoverCard.tsx` | Mount into a container and render badge / metadata without throwing |

These are **smoke** tests — render + key interaction, not exhaustive coverage. Goal is to
catch regressions on the riskiest untested surfaces, not 100% coverage.

---

## §3 — CI/CD Pipeline

New file `.github/workflows/ci.yml`:

- **Triggers:** `push` and `pull_request` targeting `main`.
- **Job:** single job, `ubuntu-latest`, Node 20 LTS, `actions/setup-node` with npm cache.
- **Steps:** `npm ci` → `npx tsc --noEmit` → `npm test` → `npm run build`.
- Uses the existing `package-lock.json` (project scripts are npm-based).
- Add a CI status badge to the top of `README.md`.

---

## Build Order (for the implementation plan)

1. **Onboarding wizard + `validateKeys.ts`** (feature first).
2. **Test infra + UI smoke tests** (so they cover the new wizard).
3. **CI workflow + README badge** (green pipeline over the finished work).

## Success Criteria

- New user can complete onboarding, supply a validated TMDb key, and reach a working
  dashboard with data.
- Optional OMDb / LLM steps can be completed or skipped.
- `npm test` passes including the new `.test.tsx` smoke tests.
- `npx tsc --noEmit` clean; `npm run build` succeeds.
- CI workflow runs type-check + tests + build on push/PR and reports status via README badge.
