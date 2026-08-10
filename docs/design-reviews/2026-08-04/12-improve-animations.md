# Improve Animations — Subsume Motion Audit

**Date:** 2026-08-04  
**Repo:** `/Users/harshabalakrishnan/Subsume`  
**Skill:** `improve-animations` (survey + plans only; no source changes)  
**Commit stamp:** run `git rev-parse --short HEAD` at plan execution time  
**Motion quality score: 6.5 / 10**

---

## Score rationale

**6.5/10 — solid cinematic foundation, uneven high-frequency chrome.**

| Strengths | Gaps |
| --- | --- |
| CSS-first stack (no Framer Motion / springs) fits the “no bounce” brand | `transition: all` still on 12 high-traffic selectors |
| Shared tokens: `--ease-out`, `--ease-focus-pull`, `--ease-soft-settle`, curtain durations ≤300ms | Content/shadow overlays re-hardcode `cubic-bezier(0.16, 1, 0.3, 1)` and weak `ease` |
| DetailModal + PoeticCapture exit lifecycle (`closing` + `animationend` + PRM skip) | Layout-animating expand (`max-height`) and plaque reveal (`max-width`) |
| Press feedback `scale(0.97–0.98)` on sanctuary controls | Zero `@media (hover: hover) and (pointer: fine)` — touch gets sticky hover lifts |
| Global + local `prefers-reduced-motion` coverage | Popup search (highest frequency) still uses `transition: all` + view keyframe |
| First-paint stagger on library/discovery (capped, PRM-safe) | Token drift: `shadowTokens.ts` uses bare `ease`, not `--ease-out` |

Prior motion work (July 2026 plan: curtain exit, expandable reflection, recs crossfade, empty projector, soft-settle) landed well. Remaining leverage is **cleanup and cohesion on surfaces users hit dozens of times per day**, not new ceremony.

---

## Phase 1 — Recon

### Stack
- **UI:** Preact + Preact Router (Chrome extension: full UI + popup + content scripts)
- **Motion libraries:** none — plain CSS transitions/keyframes only
- **Component libraries:** none (no Radix / Base UI / Framer)
- **Motion source of truth:** `src/shared/tokens.css` + `CINEMATIC_JOURNAL_DESIGN_SPEC.md` §5

### Where motion lives

| Area | Paths |
| --- | --- |
| Tokens | `src/shared/tokens.css`, `src/shared/shadowTokens.ts` |
| App shell / modal sanctuary | `src/styles/sanctuary.css`, `src/ui/styles/poetic-sanctuary.css`, `src/ui/styles/global.css` |
| Pages | `src/ui/styles/{popup,library,discovery-*,recommendations,people,sidebar,layout,onboarding,settings*}.css` |
| Content overlays | `src/content/{overlay,bookOverlay,dock,hoverCard}.{ts,tsx}` |
| JS lifecycle | `DetailModal.tsx`, `PoeticCaptureCanvas.tsx`, `App.tsx` (nav drawer), `FilmGrain.tsx` |

### Conventions (extend, do not invent parallel systems)

```css
/* src/shared/tokens.css — canonical */
--duration-instant: 100ms;
--duration-fast: 130ms;
--duration-normal: 220ms;
--duration-slow: 260ms;
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-focus-pull: cubic-bezier(0.25, 1, 0.5, 1);
--ease-soft-settle: linear(…); /* no bounce */
--duration-soft-settle: 280ms;
--duration-curtain: 280ms;
--duration-curtain-close: 300ms;
--transition-fast: var(--duration-fast) var(--ease-out);
--transition-base: var(--duration-normal) ease; /* weak; plans may tighten */
```

**Personality:** Private cinematic sanctuary — restrained, ceremonial on rare moments, **no bounce, no continuous pulse on chrome**. High-frequency UI must stay crisp (≤220ms). Spec historically mentioned 450ms Slow Dolly; tokens deliberately cap at ≤300ms — **respect the token cap**, do not re-lengthen to 450ms.

### Frequency map

| Frequency | Surfaces | Motion budget |
| --- | --- | --- |
| **Very high** | Extension popup open/search/suggestions, museum plaques on host pages, library card hover | Minimal / interruptible; no layout thrash |
| **High** | Nav tabs, filter chips, settings toggles, people tabs | Color/border only; explicit properties |
| **Occasional** | DetailModal, PoeticCapture, side drawer, notices | Standard curtain 200–300ms |
| **Rare** | Onboarding, empty projector, save ceremony gold line | Soft-settle / one-shot allowed |

### Settled decisions (do not re-litigate)

1. **Curtain Close uses `ease-in` on modal exit** — documented in sanctuary/poetic CSS comments and the July motion plan. Emil prefers ease-out on exits; Subsume deliberately chose ease-in for “accelerating curtain.” Leave as-is unless product reopens §5.
2. **No spring physics / no bounce** — brand prohibition.
3. **`--duration-curtain: 280ms`** supersedes the 450ms figure in the older design-spec prose for shipping UI.
4. **Continuous skeleton/pulse on loading placeholders** is acceptable; continuous pulse on primary chrome is not (poetic loading pulse is loading-only — OK).

---

## Phase 2–3 — Vetted findings

Ordered by leverage (impact ÷ effort). Every row re-checked at file:line.

| # | Severity | Category | Location | Finding | Fix summary |
| --- | --- | --- | --- | --- | --- |
| 1 | **HIGH** | Performance | `popup.css:237,338,673,709`; `discovery-search.css:57`; `people.css:28,469,616`; `sidebar.css:63`; `layout.css:292`; `onboarding.css:153`; `overlay.ts:163` | **`transition: all`** on high-traffic interactive chrome (search inputs, pills, tabs, plaque reveal). Animates unintended layout/paint props under load. | Replace with explicit properties; prefer `var(--transition-fast)` / listed props only. |
| 2 | **HIGH** | Performance | `overlay.ts:157–169` | **Plaque reveal animates `max-width`** (`max-width: 0` → `120px`) via `transition: all`. Layout thrash on every host-page hover — highest-frequency surface after popup. | Reveal with `opacity` + `transform` (and optionally `clip-path` / fixed reserved space); drop width animation. |
| 3 | **MEDIUM** | Accessibility | Repo-wide: **zero** `@media (hover: hover) and (pointer: fine)` | Hover lifts (`translateY`, plaque lift, library card lift) fire on touch tap and stick until next touch. | Gate transform/hover motion under hover+fine-pointer; keep color/border feedback ungated. |
| 4 | **MEDIUM** | Performance / Interruptibility | `sanctuary.css:2799–2805` | Reflection expand/collapse transitions **`max-height`** (layout). Interruptible-ish but expensive and can feel mushy mid-toggle. | Prefer `grid-template-rows: 0fr` / `1fr` + opacity, or accept max-height but drop mask thrash; keep PRM instant. |
| 5 | **MEDIUM** | Cohesion & tokens | `shadowTokens.ts:67–68`; content scripts hardcoding `280ms cubic-bezier(0.16, 1, 0.3, 1)`; popup `0.2s` bare | Shadow/content stacks drift from app tokens (`ease` vs `--ease-out`, magic durations). | Align shadow tokens to `--ease-out`; use duration tokens or shared CSS var injection in content styles. |
| 6 | **MEDIUM** | Easing & duration | Many hovers use bare `ease` / `0.2s ease` (people, settings, recs chips) | Weak built-in easing on color/border is OK for hover, but **inconsistent** with `--transition-fast` (`130ms` + strong ease-out). Feels like two products. | Standardize interactive chrome to `var(--transition-fast)` for color/border/background; transform hover ≤160ms ease-out. |
| 7 | **MEDIUM** | Purpose & frequency | `popup.css:28–41` | **Every popup view switch** runs `popupSlide` keyframe (opacity + Y + scale). Popup is opened constantly; view switches (search ↔ log) are high-freq. | Soften: opacity-only 120–150ms, or animate only first open; no scale on internal view swaps. |
| 8 | **LOW** | Physicality | `hoverCard.tsx:630–658` | Hover card scales from **implicit center** (no `transform-origin` toward trigger). Enter is otherwise good (`scale(0.96)`, transition not keyframes). | Set `transform-origin` based on placement (above/below poster). |
| 9 | **LOW** | Cohesion | `global.css:254–276` vs sanctuary modal | Legacy `.modal-content` enter is translateY-only (no scale), no exit animation — dual modal systems. | Either deprecate legacy modal path or match sanctuary Slow Dolly enter/exit. |
| 10 | **LOW** | Accessibility | `global.css:606–614` | Nuclear PRM sets all animation/transition to `0.01ms` — correct aggressiveness for extension UI, but local PRM blocks that keep opacity feedback are finer. Prefer local when touching a file. | When editing a surface, prefer local PRM (keep opacity feedback) over relying on nuclear only. |

### Not findings (confirmed OK)

- Modal enter `scale(0.96)` — not `scale(0)`.
- DetailModal / PoeticCapture exit lifecycle + PRM skip.
- Library/discovery stagger capped at 6 × 40ms with PRM off.
- Save ceremony / aura soft-settle one-shots with `linear()` settle curve.
- Drawer uses **transitions** (interruptible) for open/close.
- Button `:active` scale 0.97–0.98 range.
- Spec ease-in curtain close (settled).

---

## Missed opportunities (additive)

1. **Route / page content swap** (`App.tsx` page switch) — content teleports. A 120–180ms opacity crossfade on `.page-content` (PRM: none) would reduce lobby jank without ceremony.
2. **Suggestion list appear/disappear** — items stagger in, but the list panel itself pops. One opacity + `translateY(4px)` on `.suggestions-list` (150ms, ease-out) would connect search → results.
3. **Status / filter chip selection** — many chips only change color; a 100–130ms background + border with `--ease-out` (already partially present) plus optional `scale(0.98)` active would improve press clarity where missing (people chips).
4. **First capture success** — save ceremony exists on detail/poetic; popup log-success is mostly static. A single 280ms soft-settle underline or aura flash on successful popup save would spend the rare-delight budget correctly.

---

## Top 5 implementation plans (for other agents)

Execute in order **1 → 2 → 3 → 4 → 5**. Plans are self-contained; executors need no prior chat context. **Do not implement from this document in the audit agent** — hand each plan to an implementer.

---

### Plan 001 — Kill `transition: all` on interactive chrome

- **Status:** TODO  
- **Severity:** HIGH  
- **Category:** Performance  
- **Estimated scope:** ~8 CSS files + 1 content TS string (~15 selectors)

#### Problem

`transition: all` forces the browser to interpolate every changed property (including layout). It appears on high-frequency controls:

```css
/* src/ui/styles/popup.css:237 — current */
.popup-recent-item {
  transition: all 0.2s;
}

/* src/ui/styles/popup.css:338 — current */
.search-input {
  transition: all 0.2s;
}

/* src/ui/styles/popup.css:673 — current */
.ext-notes-textarea {
  transition: all 0.2s;
}

/* src/ui/styles/popup.css:709 — current */
.intent-pill {
  transition: all 0.2s;
}

/* src/ui/styles/discovery-search.css:57 — current */
.discovery-search-filter {
  transition: all var(--transition-fast);
}

/* src/ui/styles/people.css:28,469,616 — current */
.people-tab,
.filmography-filter-chip,
.people-sanctuary-tab {
  transition: all 0.2s ease;
}

/* src/ui/styles/sidebar.css:63 — current */
.nav-tab-btn {
  transition: all 0.2s ease;
}

/* src/ui/styles/layout.css:292 — current */
.plaque-btn {
  transition: all 0.2s ease;
}

/* src/ui/styles/onboarding.css:153 — current */
.onboarding-cta {
  transition: all 220ms ease;
}
```

#### Target

Replace each with **explicit properties only**. Use repo tokens where the stylesheet already imports them:

```css
/* target pattern A — color/border chrome (tabs, chips, pills) */
transition:
  background-color var(--duration-fast, 130ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
  border-color var(--duration-fast, 130ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
  color var(--duration-fast, 130ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
  box-shadow var(--duration-fast, 130ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1));

/* target pattern B — inputs (border + shadow only) */
transition:
  border-color var(--duration-fast, 130ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
  box-shadow var(--duration-fast, 130ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1));

/* target pattern C — when transform press exists on same element */
transition:
  background-color var(--duration-fast, 130ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
  border-color var(--duration-fast, 130ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
  color var(--duration-fast, 130ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
  transform 160ms var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1));
```

**Selector mapping:**

| Selector | File | Pattern |
| --- | --- | --- |
| `.popup-recent-item` | `popup.css` | A |
| `.search-input` | `popup.css` | B |
| `.ext-notes-textarea` | `popup.css` | B |
| `.intent-pill` | `popup.css` | A (+ transform if active scale exists) |
| `.discovery-search-filter` | `discovery-search.css` | A |
| `.people-tab`, `.people-sanctuary-tab` | `people.css` | A |
| `.filmography-filter-chip` | `people.css` | A |
| `.nav-tab-btn` | `sidebar.css` | A |
| `.plaque-btn` | `layout.css` | A |
| `.onboarding-cta` | `onboarding.css` | A (background + border-color only) |

**Out of this plan:** `overlay.ts` plaque-reveal `transition: all` — handled in Plan 002 (different technique).

#### Repo conventions

- Prefer `var(--transition-fast)` when only one property, or expand to multi-property with `--duration-fast` + `--ease-out`.
- Exemplar already correct: `src/ui/styles/global.css:104–106` (`background-color`, `color`, `transform` with `--transition-fast`).
- Exemplar: `src/styles/sanctuary.css:98–101` explicit multi-property transitions.

#### Steps

1. In `src/ui/styles/popup.css`, replace the four `transition: all 0.2s` sites with patterns A/B as mapped above. Do not change hover colors or layout.
2. In `src/ui/styles/discovery-search.css`, replace `.discovery-search-filter` `transition: all var(--transition-fast)` with pattern A.
3. In `src/ui/styles/people.css`, replace three `transition: all 0.2s ease` with pattern A.
4. In `src/ui/styles/sidebar.css`, fix `.nav-tab-btn` to pattern A.
5. In `src/ui/styles/layout.css`, fix `.plaque-btn` to pattern A.
6. In `src/ui/styles/onboarding.css`, fix `.onboarding-cta` to `background` + `border-color` only (220ms → use `--duration-normal` or 130ms fast; prefer **130ms** for button chrome).
7. Grep `transition:\s*all` under `src/` — remaining hits should only be Plan 002’s overlay (or none).

#### Boundaries

- Do NOT change keyframes, durations of modals, or JS.
- Do NOT add dependencies.
- Do NOT “fix” curtain `ease-in` exits.
- If a selector also animates `transform` on `:active`/`:hover`, include `transform` in the list (pattern C).

#### Verification

- **Mechanical:** `rg 'transition:\s*all' src` → only intentional leftovers (ideally zero after Plan 002). `npm run typecheck`.
- **Feel check:** Popup search focus ring, intent pills, people tabs, nav tabs — color changes still smooth; no delayed layout jump when focusing inputs.
- **Done when:** No `transition: all` remains in `src/ui/styles/**` or onboarding; hover/focus still visibly eases.

---

### Plan 002 — Museum plaque reveal without layout animation

- **Status:** TODO  
- **Severity:** HIGH  
- **Category:** Performance  
- **Estimated scope:** 1 file (`src/content/overlay.ts` style string); optional mirror in `bookOverlay.ts` if similar

#### Problem

On every poster hover on Letterboxd/etc., the plaque expands action text by animating **width**:

```css
/* src/content/overlay.ts:157–169 — current */
.plaque-reveal {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  max-width: 0;
  opacity: 0;
  transition: all 280ms cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.museum-plaque:hover .plaque-reveal {
  max-width: 120px;
  opacity: 1;
}
```

`max-width` + `transition: all` = layout + paint on a hot path. Duration 280ms is also long for hover chrome (budget ≤160ms for hover feedback).

#### Target

```css
/* target — transform/opacity only; no max-width tween */
.plaque-reveal {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  opacity: 0;
  transform: translateX(-4px);
  /* collapse without layout tween: hide from interaction + a11y */
  max-width: 0;              /* instantaneous when not hovered — NOT transitioned */
  overflow: hidden;
  pointer-events: none;
  transition:
    opacity 150ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 150ms cubic-bezier(0.16, 1, 0.3, 1);
}

.museum-plaque:hover .plaque-reveal {
  opacity: 1;
  transform: translateX(0);
  max-width: 120px;          /* snap open so text can paint; only opacity/transform ease */
  pointer-events: auto;
}

@media (prefers-reduced-motion: reduce) {
  .museum-plaque, .plaque-reveal {
    transition: none;
  }
  .museum-plaque:hover {
    transform: none;
  }
  .museum-plaque:hover .plaque-reveal {
    transform: none;
  }
}
```

Also tighten the plaque shell hover transition (lines ~129–133) from **280ms → 150ms** on `transform` / color props (keep explicit property list; already mostly explicit).

If pure snap of `max-width` still feels janky, alternative target (still no width tween):

```css
.plaque-reveal {
  opacity: 0;
  transform: scale(0.96);
  transform-origin: left center;
  width: auto;
  /* use visibility + absolute so layout of plaque doesn't grow — only if design allows fixed plaque width */
}
```

Prefer the first target (snap max-width + fade/slide) unless visual QA says plaque size jump is worse than current — then reserve horizontal space with a min-width on the plaque always.

#### Repo conventions

- Content styles are template strings with duplicated tokens; hardcode `cubic-bezier(0.16, 1, 0.3, 1)` matching `--ease-out` (content shadow may not see app CSS vars for ease — check `shadowTokens.ts` injection).
- Exemplar of good content transition: `hoverCard.tsx:645` (opacity + transform only, 0.25s, same curve).
- Keep existing PRM block at `overlay.ts:183–190`.

#### Steps

1. Open `src/content/overlay.ts`, locate the injected CSS for `.plaque-reveal` and `.museum-plaque:hover .plaque-reveal`.
2. Remove `transition: all`; set explicit `opacity` + `transform` transitions at **150ms** with `cubic-bezier(0.16, 1, 0.3, 1)`.
3. Ensure `max-width` is **not** listed in `transition`.
4. Reduce `.museum-plaque` shell transition durations from 280ms → 150ms for hover lift (transform/color/border/shadow).
5. Scan `bookOverlay.ts` for the same max-width reveal pattern; if present, apply the same fix. (Current book plaque appears not to use max-width reveal — confirm; no-op if absent.)
6. Manually load a host page with plaques (or unit/style snapshot if tests cover overlay CSS string).

#### Boundaries

- Do NOT change badge positioning logic or match detection.
- Do NOT add Framer/WAAPI.
- Do NOT remove PRM handling.

#### Verification

- **Mechanical:** `rg 'transition:\s*all' src/content` → empty. `npm test -- overlay` (or full `npm test` if focused fails).
- **Feel check:** Hover plaque — action label appears within ~150ms; scrubbing hover on/off does not restart a sluggish width expand; DevTools Performance: no repeated layout on hover thrash.
- **PRM:** With reduced motion, no transform lift; label can appear instantly.
- **Done when:** Reveal uses opacity/transform only; max-width not transitioned; duration ≤160ms.

---

### Plan 003 — Gate hover motion for touch (`hover: hover` + `pointer: fine`)

- **Status:** TODO  
- **Severity:** MEDIUM  
- **Category:** Accessibility  
- **Estimated scope:** 4–6 CSS files (library, sanctuary media cards, content overlays, popup if any lift)

#### Problem

There is **no** `@media (hover: hover) and (pointer: fine)` anywhere under `src/`. Touch devices apply sticky `:hover` styles:

```css
/* src/ui/styles/library.css:54–57 — current */
.media-card:hover {
  border-color: var(--color-accent-border);
  transform: translateY(-3px);
  box-shadow: var(--shadow-card-hover);
}

/* src/content/overlay.ts:138–144 — current */
.museum-plaque:hover {
  ...
  transform: translateY(-1px);
}
```

Color/border feedback on hover is fine on touch; **transform lifts** are not.

#### Target

```css
/* target — split paint feedback vs motion */
.media-card:hover {
  border-color: var(--color-accent-border);
  box-shadow: var(--shadow-card-hover);
}

@media (hover: hover) and (pointer: fine) {
  .media-card:hover {
    transform: translateY(-3px);
  }
}

/* overlay plaque */
.museum-plaque:hover {
  background: var(--bg-plaque-hover);
  color: var(--text-reflection);
  border-color: var(--border);
  box-shadow: var(--shadow-lg);
  /* no transform here */
}

@media (hover: hover) and (pointer: fine) {
  .museum-plaque:hover {
    transform: translateY(-1px);
  }
}
```

Apply the same split anywhere `:hover` sets `transform:` (grep ` :hover` + `transform` under `src/`).

#### Repo conventions

- Keep `:active` press scales global (they are intentional feedback).
- PRM blocks that zero transforms on hover should remain.
- Exemplar philosophy: Emil — hover motion only when fine pointer.

#### Steps

1. `rg -n 'hover.*\n|transform:' src --glob '*.css'` and content style strings; list every `:hover` rule that sets `transform`.
2. For each, move `transform` into `@media (hover: hover) and (pointer: fine) { … }`. Leave background/border/color/shadow on the unguarded `:hover`.
3. Files to prioritize: `library.css`, `sanctuary-media-card.css` (if hover lift), `sanctuary.css` (card hovers), `overlay.ts`, `bookOverlay.ts`, `hoverCard.tsx` only if hover transform on non-card chrome.
4. Do not wrap color-only hovers — unnecessary churn.

#### Boundaries

- Do NOT remove hover affordances entirely.
- Do NOT change focus-visible outlines.
- Do NOT alter modal enter/exit transforms.

#### Verification

- **Mechanical:** `rg '@media \(hover: hover\)' src` → matches exist. `npm run typecheck`.
- **Feel check:** On desktop, library cards still lift. In Chrome DevTools device mode (touch), tap a card — it should **not** stay translated up after tap.
- **Done when:** All hover `transform`s are inside the hover+fine media query; paint hovers remain.

---

### Plan 004 — Align motion tokens across app + content shadow

- **Status:** TODO  
- **Severity:** MEDIUM  
- **Category:** Cohesion & tokens  
- **Estimated scope:** `tokens.css` (optional comment), `shadowTokens.ts`, content style strings that hardcode curves

#### Problem

App tokens use a strong ease-out; shadow/content stacks do not:

```ts
/* src/shared/shadowTokens.ts:67–68 — current */
--transition-fast: var(--duration-fast) ease;
--transition-base: var(--duration-normal) ease;
```

vs

```css
/* src/shared/tokens.css:67–68 — current */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--transition-fast: var(--duration-fast) var(--ease-out);
```

Content files also hardcode the cubic-bezier repeatedly (`overlay.ts`, `dock.ts`, `hoverCard.tsx`, `bookOverlay.ts`) at inconsistent durations (200–280ms).

#### Target

```ts
/* shadowTokens.ts — target (mirror app) */
--duration-fast: 130ms;
--duration-normal: 220ms;
--duration-slow: 260ms;
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-focus-pull: cubic-bezier(0.25, 1, 0.5, 1);
--transition-fast: var(--duration-fast) var(--ease-out);
--transition-base: var(--duration-normal) var(--ease-out);
```

In content CSS strings, prefer `var(--transition-fast)` / `var(--ease-out)` **when those vars are injected** into the shadow root. If a stylesheet is standalone, keep the literal `cubic-bezier(0.16, 1, 0.3, 1)` but standardize durations:

| Use | Duration |
| --- | --- |
| Hover color/border/transform | 130–150ms |
| Hover card show/hide | 200–250ms (already ~250ms — OK) |
| Modal/curtain | leave token-driven app CSS alone |

Optional token addition in `tokens.css` only if needed:

```css
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1); /* for on-screen morphs only */
```

Do **not** replace curtain exit ease-in with this.

#### Repo conventions

- Single source of truth: `tokens.css` for app; `shadowTokens.ts` must not invent weaker easings.
- Personality: strong ease-out for UI response; soft-settle only for rare ceremony.

#### Steps

1. Update `src/shared/shadowTokens.ts` motion block to include `--ease-out` and wire `--transition-fast` / `--transition-base` to it (match values above exactly).
2. Grep content scripts for `cubic-bezier(0.16, 1, 0.3, 1)` durations; where transition is hover chrome >160ms, clamp to 150ms.
3. Where shadow already injects tokens, replace hardcoded transitions with `var(--transition-fast)` for single-property cases.
4. Optionally set `--transition-base` in `tokens.css` to use `--ease-out` instead of bare `ease` for cohesion (small, global feel change — feel-check buttons).

#### Boundaries

- Do NOT change color tokens.
- Do NOT add new npm packages.
- Do NOT lengthen curtain durations.

#### Verification

- **Mechanical:** `rg 'transition-fast.*ease[^-]' src/shared/shadowTokens.ts` → no bare `ease` on fast. Build extension / `npm run build`.
- **Feel check:** Hover card and plaques still feel snappy; no rubber-band.
- **Done when:** shadowTokens matches app ease-out; content hover chrome ≤150ms.

---

### Plan 005 — Popup high-frequency motion diet

- **Status:** TODO  
- **Severity:** MEDIUM  
- **Category:** Purpose & frequency  
- **Estimated scope:** `src/ui/styles/popup.css` (+ optional `popup.tsx` class for first-open only)

#### Problem

Popup is the most opened surface. Every view activation runs a full entrance:

```css
/* src/ui/styles/popup.css:28–41 — current */
.popup-view {
  display: none;
  flex-direction: column;
  flex: 1;
  animation: popupSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes popupSlide {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
```

300ms + scale + Y on **every** tab/view switch is heavy for tens-of-times-per-day use. Suggestion stagger (already PRM-gated) is fine; the view animation is the problem.

#### Target

```css
/* target — opacity-only, shorter; no scale on view swap */
.popup-view {
  display: none;
  flex-direction: column;
  flex: 1;
}

.popup-view.active {
  display: flex;
  animation: popupViewIn 140ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes popupViewIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .popup-view.active {
    animation: none;
  }
  /* keep existing .suggestion-item / .popup-view PRM rules in sync */
}
```

Optional polish (only if `popup.tsx` already toggles a root class cleanly):

- First mount of `.popup-shell`: allow one `translateY(6px)` + opacity 180ms.
- Subsequent `.popup-view` switches: opacity only (class `popup-view--swap`).

If JS class split is too large, **opacity-only for all view shows** is enough for this plan.

Also ensure Plan 001 already fixed popup `transition: all`; if not, do those four selectors here as a dependency note.

#### Repo conventions

- High-frequency ≤220ms (prefer ≤150ms).
- PRM: no animation (existing block at `popup.css:402–409` and `654+`).
- Suggestion stagger 40ms × max 6 stays; do not remove.

#### Steps

1. Edit `popup.css`: replace `popupSlide` with opacity-only `popupViewIn` at **140ms**; attach animation to `.popup-view.active` not all `.popup-view`.
2. Update any PRM rules that reference `popupSlide` / `.popup-view { animation: none }`.
3. Do not change suggestion stagger keyframes.
4. Feel-check: open popup, switch between search and recent/log views rapidly — no stacking delay, no scale pop.

#### Boundaries

- Do NOT redesign popup layout.
- Do NOT remove suggestion enter animation (already correct frequency: only when results appear).
- Do NOT touch aura glow `@property` transitions in popup.

#### Verification

- **Mechanical:** `rg popupSlide src` → gone or unused. `npm test` (popup-related if any).
- **Feel check:** Rapid view switches feel instant; first open still readable (opacity fade OK). Animations panel at 10%: only opacity channel.
- **PRM:** no view animation.
- **Done when:** View transitions ≤150ms, opacity-only, PRM safe.

---

## Recommended execution order

| Order | Plan | Depends on | Why first |
| --- | --- | --- | --- |
| 1 | 001 `transition: all` purge (UI styles) | — | Highest blast radius / easiest win |
| 2 | 002 Plaque max-width | — (parallelizable with 001) | Hottest content path |
| 3 | 003 Hover media queries | Ideal after 002 (same overlay file) | Touch correctness |
| 4 | 004 Token alignment | After 001–002 reduce hardcoded curves | Prevents re-drift |
| 5 | 005 Popup view diet | After 001 (same file) | Frequency discipline |

**Parallel:** 001 and 002 can run in parallel on different files. 005 should wait for 001 if the same agent owns `popup.css`.

---

## Score path after plans

| After | Expected score |
| --- | --- |
| Plans 001–002 only | ~7.5/10 |
| Plans 001–005 | ~8.0–8.5/10 |
| + missed opportunities (route fade, suggestion panel) | ~8.5–9/10 |

Ceremony and modal lifecycle are already at “cinematic product” quality. The score gap is almost entirely **high-frequency restraint + performance hygiene**.

---

## Appendix — Grep anchors used

```text
transition: all          → 12 hits (ui styles + overlay)
ease-in                  → curtain exits only (settled)
prefers-reduced-motion   → widespread + global nuclear in global.css
scale(0)                 → none (good)
@media (hover: hover)    → zero hits (Plan 003)
max-height transition    → reflection expand (Plan backlog / optional after top 5)
framer-motion / motion.  → none
```

## Appendix — Personality reminder for executors

Subsume is a **private cinematic sanctuary**, not a playful consumer toy. Prefer:

- strong **ease-out** `cubic-bezier(0.16, 1, 0.3, 1)` for UI response  
- **focus-pull** `cubic-bezier(0.25, 1, 0.5, 1)` for ceremonial enters  
- **soft-settle** `linear()` only for rare save/aura moments  
- **never** bounce, never continuous pulse on primary chrome  
- UI motion **≤300ms** (prefer ≤160ms hover, ≤220ms chrome)

When in doubt, **delete motion** on high-frequency paths rather than add.
