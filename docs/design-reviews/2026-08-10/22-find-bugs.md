# Find-bugs review — design P0 wave + high-risk UI/state/extension

**Date:** 2026-08-10  
**Repo:** Subsume  
**Branch:** `fix/design-p0-review-wave` @ `a5471b5`  
**Base:** `main` @ `e8a5287`  
**Method:** Skill `find-bugs` — attack-surface map, security checklist, branch vs main comparison (local HEAD vs raw `main` for key files), focused read of motion/state surfaces.  
**Scope:** Design P0 / open-issues A–H commits + residual high-risk UI/state/content-script patterns.

---

## Overall risk score

### **6.5 / 10** (10 = clean)

No Critical security findings in this wave (no new injection surfaces, no auth/session changes, Preact UI remains free of `dangerouslySetInnerHTML`). Residual risk is concentrated in **UI state machines** introduced or widened by motion work (accordion always-mount, dock async toggle, debounced save teardown) rather than classical XSS/CSRF.

---

## Top 3 bugs

| # | Severity | Confidence | File:line | Summary |
|---|----------|------------|-----------|---------|
| 1 | **High** | 0.88 | `src/ui/components/DetailModal.tsx:301–311` (+ `requestClose` ~347) | Pending notes/progress debounces are **cleared without flush** on unmount → data loss if user closes within debounce window. |
| 2 | **Medium** | 0.92 | `src/ui/components/DetailModal.tsx:759–765` (+ `ExperienceHistory` / `ReflectionTimeline` children) | Dossier accordion always mounts children (was `detailsExpanded &&`) → **IPC + work on every library modal open**, even when collapsed. |
| 3 | **Medium** | 0.90 | `src/content/dock.ts:483–487` | `saveNotes` always `toggle()`s on success → **re-expands** if user collapsed while save was in flight; animation lengthens the race. |

---

## Branch change set (reconstructed)

Local branch is **not pushed** to origin; full `git diff` was reconstructed from commit log + file-level compare to `main@e8a5287`.

### Commits on branch (11)

1. `fix(design): P0 review wave — solid CTAs, gold purge, motion hygiene`  
2. `feat(design): extend spacing ladder and soften shadows`  
3. `fix(design): shadow token motion parity with app tokens`  
4. `fix(a11y): focus-visible rings, tabular stats, decorative aria-hidden`  
5. `feat(ui): animate reflection dock expand and collapse`  
6. `fix(a11y): popup prefers-reduced-motion parity`  
7. `fix(design): scarce primary voltage on chips, protect danger semantics`  
8. `feat(ui): notice exit, onboarding step enter, alerts form motion`  
9. `feat(ui): animate DetailModal dossier accordion open and close`  
10. `docs(design): open-issues fix plan for review wave`  
11. `fix(ui): dock textarea focus ring and solid save CTA`

### Files reviewed (primary)

| File | Role in wave |
|------|----------------|
| `src/content/dock.ts` | Expand/collapse motion, solid save CTA, focus-visible |
| `src/ui/components/DetailModal.tsx` | Dossier + link accordion, focus trap filter |
| `src/ui/components/NoticeProvider.tsx` | Exit animation + timer hygiene |
| `src/ui/components/inline-notice.css` | Enter/exit keyframes + PRM |
| `src/ui/pages/Alerts.tsx` | Form enter/exit mount lifecycle |
| `src/ui/pages/Onboarding.tsx` | Step pane key for enter animation |
| `src/ui/styles/{popup,settings,onboarding,discovery-search}.css` | PRM, chips, focus |
| `src/styles/sanctuary.css` | Accordion CSS, solid CTAs, tabular nums |
| `src/shared/{tokens.css,shadowTokens.ts}` | Spacing ladder, motion parity, shadows |
| `src/content/{bookOverlay,hoverCard,overlay}.ts(x)` | Content-script CTA/hover residual |
| `tests/screenplayDock.test.ts`, `tests/detailModalExit.test.tsx` | Coverage gaps |

Also spot-checked: `ExperienceHistory.tsx`, `ReflectionTimeline.tsx`, product CTAs in `global.css` / `popup.css`.

---

## Phase 2 — Attack surface map (changed surfaces)

| Surface | Inputs / ops | Risk notes |
|---------|----------------|------------|
| Content dock | `chrome.storage.local` RMW for page reflections; host page DOM (Shadow) | TOCTOU on storage; async save + UI state |
| DetailModal | Library notes, tags, ratings, IPC (`GET_EXPERIENCES`, `GET_REFLECTIONS`, editions, relations) | Debounced writes; always-on child IPC after accordion change |
| NoticeProvider | In-app string messages | Timer races (improved this branch) |
| Alerts form | Alert criteria form state + `sendMessage` create/delete | Exit timer vs re-open |
| Shadow CSS injection | Static token CSS strings | No user-controlled CSS; low risk |
| Popup / sanctuary CSS | Theme tokens only | No state |

**Not in this wave:** background auth, OAuth, LLM keys, message allowlists (unchanged; still load-bearing for extension security overall).

---

## Phase 3 — Security checklist

| Check | Result |
|-------|--------|
| Injection (SQL/cmd/template/header) | **Clean** for this wave — no new query builders or dynamic eval |
| XSS | **Clean** — Preact text nodes; no `dangerouslySetInnerHTML` under `src/ui`; dock uses `textContent` / value |
| Authentication | **N/A** — no auth surface changes |
| Authorization / IDOR | **N/A** — local extension store only |
| CSRF | **N/A** — no cookie-session web API changes |
| Race conditions | **Issues** — dock save/toggle; storage RMW; note debounce teardown (see findings) |
| Session | **N/A** |
| Cryptography | **N/A** |
| Information disclosure | **Clean** — logger only; no new secret logging |
| DoS / unbounded ops | **Issue** — extra IPC per modal open via always-mounted dossier children |
| Business logic / state machines | **Issues** — accordion, notice exit (improved), alerts form exit, dock animation gen |

---

## Findings (severity-ordered)

### 1. DetailModal: debounced notes/progress discarded on close

- **File:Line:** `src/ui/components/DetailModal.tsx:301–311` (cleanup); `requestClose` ~347 does not flush  
- **Severity:** High  
- **Confidence:** 0.88  
- **Problem:** Unmount cleanup `clearTimeout`s `notesDebounceRef` and `progressDebounceRef` **without committing**. Closing the modal (Esc / backdrop / ×) within ~500ms of typing / ~400ms of progress edit drops the pending write.  
- **Evidence:** Cleanup only clears timers; `flushNotes()` exists for blur only and is not called from `requestClose` / `finishClose`. Same pattern on `main` (pre-existing) but still high-risk UI state on this design-heavy surface; accordion always-mount makes users more likely to edit then close without blur. No test covers “type then close within debounce.”  
- **Fix:** In `requestClose` / unmount: call `flushNotes()` and flush progress (mirror blur handlers). Prefer flush-on-close over cancel. Add a test with fake timers.  
- **References:** Data integrity / incomplete transaction on dialog dismiss.

### 2. DetailModal: always-mounted dossier fires IPC even when collapsed

- **File:Line:** `src/ui/components/DetailModal.tsx:759–765` (accordion always present); children include `ExperienceHistory` + `ReflectionTimeline`  
- **Severity:** Medium  
- **Confidence:** 0.92  
- **Problem:** On `main`, dossier body was `{detailsExpanded && (…)}`. Branch replaced this with CSS grid accordion that keeps the panel **mounted** under `inert` + `aria-hidden`. `ExperienceHistory` and `ReflectionTimeline` run `useEffect` → `GET_EXPERIENCES` / `GET_REFLECTIONS` on **every** open of a library DetailModal, even if the user never expands Dossier.  
- **Evidence:** Local render always includes accordion inner content when `libraryItem` is set; main used conditional mount. Children load unconditionally on mount (`ExperienceHistory.tsx:80–82`, `ReflectionTimeline.tsx:73–75`).  
- **Fix options:**  
  1. Mount heavy children only when `detailsExpanded` (or after first expand, keep mounted for exit anim).  
  2. Or gate loads: `enabled={detailsExpanded}` props on history/timeline.  
  Prefer (1) first-expand mount + CSS height anim on a shell, or keep shell mounted and lazy-mount content after expand.  
- **References:** Unnecessary work / client DoS of extension IPC.

### 3. Dock: `saveNotes` always toggles expanded state

- **File:Line:** `src/content/dock.ts:483–487`  
- **Severity:** Medium  
- **Confidence:** 0.90  
- **Problem:** Successful save always calls `this.toggle()`. If the user collapses (or expands) while `savePageReflection` is in flight, the async completion **flips** state incorrectly — classic “re-open after save while collapsed.” Exit animation (~180ms) + storage latency widens the window vs instant swap on `main`.  
- **Evidence:** `.then(() => { this.toggle(); })` with no check that dock is still expanded / save generation. Pre-existing pattern; motion makes it more observable.  
- **Fix:** `if (this.isExpandedState) { this.isExpandedState = false; this.render({ animate: true }); }` or `collapseAfterSave()` that only collapses when still expanded; ignore stale saves via save generation token.  
- **References:** Async UI race / TOCTOU of view state.

### 4. Link adaptation control: `aria-expanded` stuck false / button unmounts when open

- **File:Line:** `src/ui/components/DetailModal.tsx:666–677`  
- **Severity:** Medium (a11y)  
- **Confidence:** 0.85  
- **Problem:** “Link adaptation…” only renders when `!linkOpen` with hard-coded `aria-expanded={false}`. When open, the control disappears; only Cancel inside the accordion remains. Screen-reader expand/collapse affordance is incomplete vs dossier toggle (which stays mounted with live `aria-expanded`).  
- **Evidence:** Conditional render of the open control; dossier pattern at 746–757 is the correct model.  
- **Fix:** Keep a single toggle button always mounted; set `aria-expanded={linkOpen}` and `aria-controls={linkPanelId}`; use Cancel as secondary or same toggle.

### 5. Dock solid Save CTA hover reverts to translucent soft fill

- **File:Line:** `src/content/dock.ts:189–206`  
- **Severity:** Low–Medium (design / contrast regression)  
- **Confidence:** 0.80  
- **Problem:** P0 “solid CTA” applied default `background: var(--primary)` + white on-primary text, but `:hover` sets `background: var(--primary-soft)` (10% red). Hover washes the primary action and can fail contrast expectations just introduced by the solid-CTA fix.  
- **Evidence:** Contrast with popup/sanctuary primaries that hover to `--primary-hover` / `--primary-hover-bg` (solid darker red).  
- **Fix:** Hover → `var(--primary-hover)` or `--primary-hover-bg`; keep `color: var(--on-primary-fg)`.

### 6. Page reflection storage read-modify-write race

- **File:Line:** `src/content/dock.ts:28–38`  
- **Severity:** Medium  
- **Confidence:** 0.75  
- **Problem:** `get` → mutate object → `set` without merge/versioning. Concurrent saves (double-click Save, or future multi-tab) can clobber keys. Pre-existing; still high-risk extension storage pattern adjacent to this wave.  
- **Fix:** Serialize writes with a mutex/queue per store key, or use a single writer + in-memory cache; optionally `chrome.storage.session` transaction pattern.  
- **References:** TOCTOU / lost update.

### 7. Motion surfaces lack automated coverage

- **File:Line:** n/a (tests)  
- **Severity:** Low (quality / regression risk)  
- **Confidence:** 0.95  
- **Problem:** No tests for: dock enter/exit + gen cancel; NoticeProvider exit vs superseding notice; Alerts form exit/re-open; DetailModal accordion `inert` / focus trap filter; always-mount IPC. Existing `screenplayDock.test.ts` covers mount/toggle/save only; `detailModalExit.test.tsx` covers modal close only.  
- **Fix:** Fake timers + PRM matchMedia cases for each motion state machine.

### 8. Alerts form: `aria-expanded` false while panel still visible exiting

- **File:Line:** `src/ui/pages/Alerts.tsx:324–335`  
- **Severity:** Low  
- **Confidence:** 0.70  
- **Problem:** On close, `showForm` flips false immediately while `formMounted` stays true for exit animation → button label “Create alert” and `aria-expanded={false}` while the form is still on screen (~180ms).  
- **Fix:** Drive `aria-expanded` from `formMounted && !formExiting`, or keep expanded true until exit completes.

### 9. Residual design hygiene (not bugs; track only)

| Item | Notes |
|------|--------|
| Hover media incomplete | `@media (hover: hover)` on popup/sidebar/library/overlay; dock / many sanctuary hovers still unconditional |
| Gold naming | `.sanctuary-btn-gold`, `--accent-gold*` alias to red — hygiene only |
| Book plaque CTAs | Still soft-fill on hover (`bookOverlay.ts`) — intentional secondary chrome? |
| Shadow tokens | Missing some app-only tokens (`--on-primary-fg` etc.); dock uses fallbacks |

---

## Positive findings (wave improvements)

| Area | Why it helps |
|------|----------------|
| NoticeProvider timer IDs + exit path | Fixes classic “stale auto-dismiss clears new notice” race on `main` |
| Dock `animGen` + timer clear | Correctly cancels stale enter/exit rAF/timeouts on rapid toggle / destroy |
| Focus trap filters `inert` / zero-size | Matches always-mounted accordion |
| Popup nuclear PRM block | Parity with app shell |
| `transition: all` purge under `src/` | Verified zero matches |
| Solid primary CTAs (sanctuary / popup / settings) | Addresses P0 contrast risk |
| Danger tokens preserved for delete paths | Chip scarcity did not paint delete as brand primary |

---

## Phase 5 — Pre-conclusion audit

### Files reviewed completely (or full relevant sections)

- `dock.ts` (full)  
- `NoticeProvider.tsx` + `inline-notice.css` (full)  
- `DetailModal.tsx` (full local; full `main` compare)  
- `Alerts.tsx` (motion + render sections)  
- `Onboarding.tsx` (header + step shell)  
- `shadowTokens.ts` (full)  
- Accordion + PRM blocks in `sanctuary.css`  
- Popup PRM nuclear block; settings alerts form CSS  
- `ExperienceHistory` / `ReflectionTimeline` load effects  
- Dock + DetailModal exit tests  

### Checklist summary

- Injection / XSS / auth / crypto / session: **clean for this wave**  
- Races / business logic / DoS(IPC): **findings 1–3, 6**  
- A11y regressions: **findings 4, 8**  
- Design CTA contrast: **finding 5**

### Could not fully verify

- Exact unified `git diff --stat` (branch not on remote; no shell `git diff` tool in this agent) — reconstructed via commit log + raw `main` file compare.  
- Runtime Chrome behavior of `inert` on all focusable dossier controls (assumed OK for Chrome MV3 targets).  
- Full visual contrast measurement of every solid CTA under light theme.  
- Whether production `dist/` is rebuilt from this branch (review is source-level).

---

## Recommended fix priority

1. **Flush notes/progress on DetailModal close** (data loss)  
2. **Lazy-mount or gate dossier child IPC** (always-mount regression)  
3. **Dock save → collapse only if still expanded** (+ optional write queue)  
4. **Link adaptation toggle a11y**  
5. **Dock save hover solid**  
6. **Tests for motion state machines**

---

## Score rationale

| Band | Contribution |
|------|----------------|
| No Critical security in wave | + |
| High data-loss path still live on primary modal | − |
| Medium always-mount IPC regression introduced by accordion | − |
| Medium dock async state race (worsened by motion) | − |
| Notice timer hygiene improved | + |
| Motion gen counters generally sound | + |

**Final: 6.5 / 10**
