# Improve Animations — Subsume Motion Audit

**Date:** 2026-08-10  
**Repo:** `/Users/harshabalakrishnan/Subsume`  
**Commit:** `a5471b5`  
**Skill:** `improve-animations` (survey + plans only; no source changes)  
**Motion quality score: 7.5 / 10**

---

## Score rationale

**7.5/10 — strong cinematic system; remaining debt is high-frequency chrome and layout thrash, not missing ceremony.**

| Strengths (shipped since 2026-08-04) | Remaining gaps |
| --- | --- |
| **Zero** `transition: all` in `src/` | Plaque reveal still animates **`max-width`** on host-page hover |
| Shared tokens: `--ease-out`, `--ease-focus-pull`, `--ease-soft-settle`, curtain ≤300ms | Hover **lifts** still mostly ungated (only library/popup/sidebar partial) |
| DetailModal dossier accordion: `grid-template-rows` + PRM | Reflection expand still **`max-height`** + mask thrash |
| DetailModal / PoeticCapture exit lifecycle + PRM skip | Popup **every view switch** runs 300ms scale+Y keyframe |
| Notice enter **and** exit; alerts form enter/exit; dock enter/exit | Magic `0.2s ease` / hardcoded cubics vs `--transition-fast` drift |
| Library media-card hover gated; shadow tokens parity on motion | Hardcover spine details still hard mount/unmount |
| Press scale 0.97–0.98 on sanctuary chrome; no `scale(0)` | Hover card scales from center; content hover duration uses curtain (280ms) |

Prior audits (2026-07-09 plan, 2026-08-04 improve-animations) landed the ceremonial layer well. **Do not re-litigate** settled decisions below. Highest leverage now is **performance + high-freq restraint**, then cohesion.

---

## Phase 1 — Recon

### Stack
- **UI:** Preact + Preact Router (Chrome extension: full UI + popup + content scripts)
- **Motion libraries:** none — plain CSS transitions/keyframes only
- **Component libraries:** none (no Radix / Base UI / Framer / springs)
- **Motion source of truth:** `src/shared/tokens.css` + content inject via `src/shared/shadowTokens.ts`

### Where motion lives

| Area | Paths |
| --- | --- |
| Tokens | `src/shared/tokens.css`, `src/shared/shadowTokens.ts` |
| App shell / modal sanctuary | `src/styles/sanctuary.css`, `src/ui/styles/poetic-sanctuary.css`, `src/ui/styles/global.css` |
| Pages | `src/ui/styles/{popup,library,discovery-*,recommendations,people,sidebar,layout,onboarding,settings*,app-nav}.css` |
| Content overlays | `src/content/{overlay,bookOverlay,dock,hoverCard}.{ts,tsx}` |
| JS lifecycle | `DetailModal.tsx`, `PoeticCaptureCanvas.tsx`, `App.tsx` (drawer), `NoticeProvider.tsx`, `Alerts.tsx`, `FilmGrain.tsx` |

### Conventions (extend — do not invent parallel systems)

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
--duration-curtain-close: 220ms;
--transition-fast: var(--duration-fast) var(--ease-out);
--transition-base: var(--duration-normal) ease; /* weak; prefer --ease-out on intentional motion */
```

**Personality:** Private cinematic sanctuary — restrained, ceremonial on rare moments, **no bounce, no continuous pulse on chrome**. High-frequency UI must stay crisp (≤220ms). Token cap supersedes older design-spec 450ms Slow Dolly prose.

### Frequency map

| Frequency | Surfaces | Motion budget |
| --- | --- | --- |
| **Very high** | Extension popup open/search/suggestions, museum plaques on host pages, library/archive card hover | Minimal / interruptible; **no layout thrash**; hover lifts gated |
| **High** | Nav tabs, filter chips, settings toggles, people cards | Color/border only or ≤160ms transform; explicit properties |
| **Occasional** | DetailModal, PoeticCapture, side drawer, notices, alerts form, dock | Standard curtain 200–300ms |
| **Rare** | Onboarding, empty projector, save ceremony, popup log-success | Soft-settle / one-shot allowed |

### Settled decisions (do not re-litigate)

1. **Curtain exit uses ease-out family** (`--ease-focus-pull`) — tokens comment: exit same ease family, not ease-in. Leave as-is.
2. **No spring physics / no bounce** — brand prohibition.
3. **`--duration-curtain: 280ms` / `--duration-curtain-close: 220ms`** are the shipping caps — do not re-lengthen to 450ms.
4. **Continuous skeleton/pulse on loading placeholders** is acceptable; continuous pulse on primary chrome is not.
5. **Primary route remounts** (`App.tsx` `renderPage`) — prior find-animation-opportunities correctly rejected full-page route animation (high frequency). Do not add page-shell drama.
6. **Filter refilter restagger** on archive intent chips — rejected as high-freq; first-paint stagger only.

---

## Phase 2–3 — Vetted findings

Ordered by leverage (impact ÷ effort). Every row re-checked at file:line on `a5471b5`.

| # | Severity | Category | Location | Finding | Fix summary |
| --- | --- | --- | --- | --- | --- |
| 1 | **HIGH** | Performance | `src/content/overlay.ts:157–171` | **Plaque reveal animates `max-width`** (`0` → `120px`) on every host-page hover — layout thrash on the highest-frequency content surface. | Reveal with `opacity` + `transform` (and/or `clip-path` / fixed reserved space); drop width animation. Keep hover gate. |
| 2 | **HIGH** | Accessibility | `sanctuary.css:329–333`; `people.css:91–94`; `overlay.ts:138–144`; `bookOverlay.ts:79–84`; `dock.ts:74–78`; `sanctuary.css:1985–1986`; hoverCard button lifts | **Hover lifts** (`translateY`) fire on touch and can stick. Only library `.media-card`, some popup, sidebar, and plaque-reveal are gated. | Gate **transform** hover motion under `@media (hover: hover) and (pointer: fine)`; keep color/border feedback ungated. |
| 3 | **MEDIUM** | Purpose & frequency | `src/ui/styles/popup.css:28–42` | **Every popup view switch** runs `popupSlide` (opacity + Y + scale, **0.3s**). Popup is opened constantly; internal search↔log swaps are high-freq. | Soften to opacity-only **120–150ms** `var(--ease-out)`, or first-open only; drop scale on internal view swaps. |
| 4 | **MEDIUM** | Performance / Interruptibility | `src/styles/sanctuary.css:2852–2880` | Reflection expand/collapse transitions **`max-height`** + mask thrash. Dossier accordion already uses better `grid-template-rows` pattern. | Prefer `grid-template-rows: 0fr`/`1fr` + opacity (match `.sanctuary-detail-accordion`); keep PRM instant. |
| 5 | **MEDIUM** | Easing & duration / Cohesion | Plaques use `--duration-curtain` (280ms) for **hover**; many surfaces use bare `0.2s ease` / `0.15s` without tokens (`settings.css`, `app-nav.css`, `people.css`, `popup.css`, content hoverCard hardcodes) | Hover chrome feels slower or weaker than sanctuary buttons using `--transition-fast` (130ms + strong ease-out). | Interactive chrome: color/border/`background` → `var(--transition-fast)`; hover transform ≤160ms ease-out; content scripts use injected duration tokens, not curtain. |
| 6 | **MEDIUM** | Physicality | `src/content/hoverCard.tsx:630–659` | Hover card enter/exit is good (`scale(0.96)`, transitions not keyframes) but **no `transform-origin` toward trigger**; durations hardcoded (`0.25s` / `0.18s`) not tokens. | Set `transform-origin` from placement (above/below poster); map durations to `--duration-curtain` / `--duration-curtain-close` (or normal/fast). |
| 7 | **LOW** | Cohesion | `src/ui/styles/global.css:254–276` vs sanctuary modal | Legacy `.modal-content` enter is translateY-only, no exit — dual modal systems if still reachable. | Confirm callers; either deprecate path or match sanctuary Slow Dolly enter/exit. |
| 8 | **LOW** | Cohesion | `HardcoverSpineCard.tsx:177–179` | Hardcover details panel still **conditional mount** with no accordion class (DetailModal already fixed). | Reuse `.sanctuary-detail-accordion` pattern on spine details. |

### Not findings (confirmed OK)

- Modal enter `scale(0.96)` — not `scale(0)`.
- DetailModal / PoeticCapture exit lifecycle + PRM skip.
- Detail dossier accordion: `grid-template-rows` + visibility delay + PRM.
- Library/discovery stagger capped (first 6 × 40ms) with PRM off.
- Save ceremony / aura soft-settle one-shots with `linear()` settle curve.
- Drawer uses **transitions** (interruptible) for open/close.
- Button `:active` scale 0.97–0.98 range on sanctuary chrome.
- Notice exit lifecycle (`NoticeProvider` + `inline-notice--exiting`).
- Alerts form enter/exit keyframes ≤180ms.
- Onboarding step enter (rare; enter-only is acceptable; exit optional polish).
- Dock pill/card enter/exit transform+opacity ≤220ms.
- `transition: all` — **none remaining** (prior HIGH finding closed).
- Shadow token motion vars now match app (`--ease-out`, curtain durations).

---

## Missed opportunities (additive)

1. **Hardcover spine details expand** (`HardcoverSpineCard.tsx` + `.hardcover-details-panel`) — hard mount; mirror DetailModal accordion (finding #8). Occasional, high clarity payoff.
2. **Popup log-success** (`.log-success-overlay`) — opacity-only fade; rare delight moment can add soft-settle gold line / icon scale **0.96→1** over `--duration-soft-settle` once (PRM: opacity only).
3. **Settings section panel swap** — content teleports when changing section. Soft enter only: opacity + `translateY(4px)` over `--duration-normal` / `--ease-out`; **no exit delay** so rapid section clicks stay interruptible. Do not animate section nav chips beyond color/border.
4. **Dock press feedback** — toggle/save lack `:active { transform: scale(0.97) }` with `transition: transform var(--duration-fast) var(--ease-out)`.

---

## Top plans (for other agents)

Execute in order **001 → 002 → 003 → 004 → 005**. Plans are self-contained; executors need no prior chat context. **Do not implement from this document in the audit agent** — hand each plan to an implementer.

**Top 3 by leverage:** Plan 001 (plaque max-width), Plan 002 (hover:fine gates), Plan 003 (popup view soften).

---

### Plan 001 — Kill plaque `max-width` layout animation

- **Status:** TODO  
- **Commit:** `a5471b5`  
- **Severity:** HIGH  
- **Category:** Performance  
- **Estimated scope:** 1 file (`src/content/overlay.ts`), ~40 lines CSS string

#### Problem

Museum plaque “Reveal” text animates layout on every hover over posters on host pages (Netflix, etc.) — the highest-frequency content-script surface.

```css
/* src/content/overlay.ts:157–171 — current */
.plaque-reveal {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  max-width: 0;
  opacity: 0;
  transition: max-width var(--duration-curtain-close) var(--ease-out), opacity var(--duration-curtain-close) var(--ease-out);
  overflow: hidden;
}

@media (hover: hover) and (pointer: fine) {
  .museum-plaque:hover .plaque-reveal {
    max-width: 120px;
    opacity: 1;
  }
}
```

Animating `max-width` forces layout + paint every hover. Emil / performance bar: **animate `transform` and `opacity` only**.

#### Target

```css
/* target — transform + opacity only; no max-width transition */
.plaque-reveal {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  opacity: 0;
  transform: translateX(-4px);
  /* Keep off-layout when hidden: clip without animating width */
  max-width: 0;
  overflow: hidden;
  pointer-events: none;
  transition:
    opacity var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
  /* max-width snaps (no transition) when reveal opens — set only on hover state */
}

@media (hover: hover) and (pointer: fine) {
  .museum-plaque:hover .plaque-reveal {
    max-width: 120px; /* instantaneous; not in transition list */
    opacity: 1;
    transform: translateX(0);
    pointer-events: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .museum-plaque,
  .plaque-reveal {
    transition: none;
  }
  .museum-plaque:hover {
    transform: none;
  }
}
```

Also shorten plaque **chrome** hover transitions from curtain (280ms) to fast/normal:

```css
/* target for .museum-plaque transition list */
transition:
  background var(--duration-fast) var(--ease-out),
  border-color var(--duration-fast) var(--ease-out),
  box-shadow var(--duration-fast) var(--ease-out),
  color var(--duration-fast) var(--ease-out),
  transform var(--duration-fast) var(--ease-out);
```

#### Repo conventions to follow

- Duration/easing tokens already injected via `SHADOW_TOKEN_CSS` in `src/shared/shadowTokens.ts` (`--duration-fast`, `--ease-out`).
- Exemplar of hover-gated transform: `src/ui/styles/library.css:54–60` (`.media-card:hover` under hover+fine).
- Do not add Framer / springs. No bounce.

#### Steps

1. Open `src/content/overlay.ts` and locate the `STYLES` (or equivalent) template string containing `.plaque-reveal` and `.museum-plaque`.
2. Change `.museum-plaque` transition properties from `var(--duration-curtain)` to `var(--duration-fast)` for all listed properties (background, border-color, box-shadow, color, transform).
3. Rewrite `.plaque-reveal` as in **Target**: keep `max-width: 0` + `overflow: hidden` for collapsed clip, but **remove `max-width` from the `transition` list**. Add `transform: translateX(-4px)`, `opacity: 0`, `pointer-events: none`.
4. In the existing `@media (hover: hover) and (pointer: fine)` block, set hover state: `max-width: 120px; opacity: 1; transform: translateX(0); pointer-events: auto`.
5. Confirm PRM block still zeroes transitions on `.museum-plaque` and `.plaque-reveal` and clears hover `transform`.
6. Optionally mirror the same hover-duration fix on `src/content/bookOverlay.ts` `.book-plaque` transitions (curtain → fast) — same pattern, no max-width there.

#### Boundaries

- Do NOT change badge positioning logic, library sync, or shadow host structure.
- Do NOT animate `width`/`height`/`margin`/`padding`/`left`/`top`.
- Do NOT remove the hover+fine media query around reveal (required for touch).
- Do NOT add dependencies.
- If line numbers drift, search for `.plaque-reveal` and `max-width: 0` — stop if the pattern is already transform-only.

#### Verification

- **Mechanical:** `npx vitest run tests/overlay.test.ts` (or nearest overlay suite); typecheck if available.
- **Feel check:** On a streaming site with plaques enabled, hover a poster slowly (DevTools Animations 10%):
  - Score text should fade/slide in without the plaque box **reflowing width** over ~220ms.
  - Spamming hover should not jank the host page.
  - On touch device / force touch emulation, reveal must **not** stick open from a tap (hover gate).
  - PRM: no transform motion; opacity may snap.
- **Done when:** `max-width` is not listed in any `transition` for `.plaque-reveal`; hover still shows action text; tests green.

---

### Plan 002 — Gate hover lifts under `(hover: hover) and (pointer: fine)`

- **Status:** TODO  
- **Commit:** `a5471b5`  
- **Severity:** HIGH  
- **Category:** Accessibility  
- **Estimated scope:** ~6 files, transform-only hover rules

#### Problem

Touch browsers fire `:hover` on tap; `transform: translateY(...)` then **sticks** until next touch. Library cards were fixed; most other lifts were not.

Ungated transform hovers (current):

```css
/* src/styles/sanctuary.css:329–333 — current */
.sanctuary-media-card:hover {
  border-color: var(--border-hero);
  transform: translateY(-3px);
  box-shadow: var(--shadow-card-hover);
}

/* src/ui/styles/people.css:91–94 — current */
.person-card:hover {
  border-color: var(--gold);
  transform: translateY(-2px);
}

/* src/content/overlay.ts:138–144 — current (lift ungated; reveal gated) */
.museum-plaque:hover {
  background: var(--bg-plaque-hover);
  color: var(--text-reflection);
  border-color: var(--border);
  box-shadow: var(--shadow-lg);
  transform: translateY(-1px);
}

/* src/content/bookOverlay.ts:79–84 — current */
.book-plaque:hover {
  ...
  transform: translateY(-1px);
}

/* src/content/dock.ts:74–78 — current */
.dock-toggle-btn:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}

/* src/styles/sanctuary.css ~1985 — filmography-card:hover transform */
/* src/content/hoverCard.tsx — button :hover translateY(-1px) */
```

#### Target

Pattern (every lift):

```css
/* color / border / background stay on :hover (ungated) */
.element:hover {
  border-color: …;
  box-shadow: …;
  background: …;
}

@media (hover: hover) and (pointer: fine) {
  .element:hover {
    transform: translateY(-Npx);
  }
}
```

Exemplar already correct:

```css
/* src/ui/styles/library.css:54–60 */
@media (hover: hover) and (pointer: fine) {
  .media-card:hover {
    border-color: var(--color-accent-border);
    transform: translateY(-3px);
    box-shadow: var(--shadow-card-hover);
  }
}
```

For library, box-shadow is gated with transform — either pattern is fine; **minimum** is gating `transform`. Prefer gating transform + shadow lift together; keep border/color feedback always.

#### Repo conventions to follow

- Prefer existing media-query placement after the base `:hover` block.
- PRM blocks that clear hover transform should remain.
- Do not invent new tokens.

#### Steps

1. **`src/styles/sanctuary.css`**
   - `.sanctuary-media-card:hover`: move `transform` (and preferably box-shadow lift) into `@media (hover: hover) and (pointer: fine)`.
   - `.filmography-card:hover`: same for `transform: translateY(-2px)`.
2. **`src/ui/styles/people.css`**
   - `.person-card:hover`: keep `border-color`; move `transform` into hover+fine query.
3. **`src/content/overlay.ts`**
   - Split `.museum-plaque:hover`: non-transform styles stay; `transform: translateY(-1px)` only inside hover+fine (can merge with existing plaque-reveal query or nested rules).
4. **`src/content/bookOverlay.ts`**
   - Same split for `.book-plaque:hover`.
5. **`src/content/dock.ts`**
   - Same for `.dock-toggle-btn:hover`.
6. **`src/content/hoverCard.tsx`**
   - Gate `.subsume-btn-*:hover` `transform: translateY(-1px)` under hover+fine; keep background/border changes.
7. Grep for remaining unguarded hover transforms:
   ```bash
   rg -n "translateY\(|:hover" src --glob '*.{css,ts,tsx}' | head -80
   ```
   Fix any additional **card/plaque/button lift** transforms the same way. Do **not** gate pure color hovers.

#### Boundaries

- Do NOT change `:active` press scales (those are intentional).
- Do NOT wrap entire components in `pointer: fine` such that focus-visible styles break.
- Do NOT remove hover color feedback.
- Do NOT touch keyframe enter animations.

#### Verification

- **Mechanical:** `npx vitest run` (or focused content/UI tests if full suite is heavy).
- **Feel check:**
  - Chrome DevTools → Rendering → emulate **hover: none** / touch: cards must not stay lifted after tap; border highlight may still flash.
  - On mouse: archive sanctuary cards and people cards still lift 2–3px.
  - PRM: existing `transform: none` on hover still holds where defined.
- **Done when:** All card/plaque/dock **translateY hover lifts** are inside `@media (hover: hover) and (pointer: fine)`; no new deps.

---

### Plan 003 — Soften popup view-switch motion

- **Status:** TODO  
- **Commit:** `a5471b5`  
- **Severity:** MEDIUM  
- **Category:** Purpose & frequency  
- **Estimated scope:** 1 file (`src/ui/styles/popup.css`), small

#### Problem

Popup is the highest-frequency extension chrome. Every internal view activation runs a 300ms scale+Y keyframe:

```css
/* src/ui/styles/popup.css:28–42 — current */
.popup-view {
  display: none;
  flex-direction: column;
  flex: 1;
  animation: popupSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.popup-view.active {
  display: flex;
}

@keyframes popupSlide {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
```

Purpose is weak for tens-of-times/day search↔log swaps: scale reads as ceremony, not navigation. Duration (300ms) sits at the UI cap and uses a hard-coded curve instead of tokens.

#### Target

```css
/* target — opacity-only, short, tokenized */
.popup-view {
  display: none;
  flex-direction: column;
  flex: 1;
  animation: popupViewIn var(--duration-fast) var(--ease-out) forwards;
}

.popup-view.active {
  display: flex;
}

@keyframes popupViewIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .popup-view {
    animation: none;
  }
  /* keep existing .suggestion-item PRM rules */
}
```

If product wants a hair of spatial continuity on **first** paint only, opacity + `translateY(4px)` over `var(--duration-fast)` is the max — **no scale**. Prefer opacity-only.

#### Repo conventions to follow

- Tokens from `src/shared/tokens.css` (`--duration-fast: 130ms`, `--ease-out`).
- PRM already disables `.popup-view` animation at `popup.css:409–411` — keep that.
- Suggestion item stagger stays as-is (already capped + PRM-safe).

#### Steps

1. In `src/ui/styles/popup.css`, rename or replace `popupSlide` with `popupViewIn` as in **Target**.
2. Set animation to `var(--duration-fast) var(--ease-out)` (or max `var(--duration-normal)` if 130ms feels too snappy in feel-check — never above 220ms).
3. Remove `scale` and preferably `translateY` from the keyframe.
4. Confirm PRM block still sets `.popup-view { animation: none; }`.
5. Do not change `.suggestion-item` stagger keyframes in this plan.

#### Boundaries

- Do NOT add exit animations that delay view switches (display:none swaps are high-freq).
- Do NOT animate the whole `.popup-shell` open (browser controls popup open).
- Do NOT touch log-success overlay in this plan (separate delight opportunity).

#### Verification

- **Mechanical:** Any popup-related tests (`npx vitest run tests/` filtered for popup if present).
- **Feel check:** Open extension popup; toggle between Search and Log (or whatever view switch exists) repeatedly:
  - No “zoom” feel; content should appear in ≤150ms.
  - Animations panel: only opacity changes.
  - PRM: instant appearance.
- **Done when:** No scale on `.popup-view` enter; duration ≤ `--duration-normal`; uses tokens.

---

### Plan 004 — Reflection expand: grid-rows instead of max-height

- **Status:** TODO  
- **Commit:** `a5471b5`  
- **Severity:** MEDIUM  
- **Category:** Performance / Interruptibility  
- **Estimated scope:** `src/styles/sanctuary.css` (+ verify `ExpandableReflection.tsx` class names only)

#### Problem

```css
/* src/styles/sanctuary.css:2857–2880 — current */
.reflection-excerpt-panel-inner {
  overflow: hidden;
  max-height: 12rem;
  opacity: 1;
  transition:
    max-height 0.28s var(--ease-focus-pull, cubic-bezier(0.25, 1, 0.5, 1)),
    opacity 0.22s ease;
}

.reflection-excerpt-expandable:not(.reflection-excerpt-expanded) .reflection-excerpt-panel-inner {
  max-height: 4.5em;
  opacity: 0.94;
  mask-image: linear-gradient(to bottom, #000 62%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, #000 62%, transparent 100%);
}

.reflection-excerpt-expanded .reflection-excerpt-panel-inner {
  max-height: 12rem;
  overflow-y: auto;
  opacity: 1;
  mask-image: none;
  -webkit-mask-image: none;
}
```

`max-height` is layout-animating. The product already has a correct accordion pattern for dossiers:

```css
/* src/styles/sanctuary.css:1263–1285 — exemplar */
.sanctuary-detail-accordion {
  display: grid;
  grid-template-rows: 0fr;
  ...
  transition:
    grid-template-rows var(--duration-normal, 220ms) var(--ease-out, ...),
    opacity var(--duration-normal, 220ms) var(--ease-out, ...),
    visibility 0s linear var(--duration-normal, 220ms);
}
.sanctuary-detail-accordion.is-expanded {
  grid-template-rows: 1fr;
  ...
}
.sanctuary-detail-accordion-inner {
  overflow: hidden;
  min-height: 0;
}
```

Reflection is a **partial** collapse (3-line preview → full), not 0→open, so the mapping is slightly different: collapsed state needs a clamped preview, not zero height.

#### Target

Two acceptable approaches (pick A unless markup must stay frozen):

**A — Keep max-height but stop animating mask thrash + token-align (minimal):**

```css
.reflection-excerpt-panel-inner {
  overflow: hidden;
  max-height: 4.5em;
  opacity: 0.94;
  transition:
    max-height var(--duration-soft-settle) var(--ease-focus-pull),
    opacity var(--duration-normal) var(--ease-out);
  /* mask only on collapsed; do not transition mask-image */
  mask-image: linear-gradient(to bottom, #000 62%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, #000 62%, transparent 100%);
}

.reflection-excerpt-expanded .reflection-excerpt-panel-inner {
  max-height: 12rem;
  opacity: 1;
  overflow-y: auto;
  mask-image: none;
  -webkit-mask-image: none;
}
```

**B — Preferred structure if small markup tweak allowed in `ExpandableReflection.tsx`:**

```html
<!-- collapsed: grid  shows clamp; expanded: 1fr full text -->
<div class="reflection-excerpt-panel reflection-excerpt-accordion">
  <div class="reflection-excerpt-panel-inner">…</div>
</div>
```

```css
.reflection-excerpt-accordion {
  display: grid;
  grid-template-rows: minmax(4.5em, auto); /* collapsed visual clamp via max-height on inner still OK if static */
}
```

Practical recommendation for executor: **implement A** (tokenize + no mask transition side effects) unless you can cleanly dual-state grid without clipping bugs. Document which approach you took.

PRM stays:

```css
@media (prefers-reduced-motion: reduce) {
  .reflection-excerpt-panel-inner {
    transition: none;
  }
}
```

#### Repo conventions to follow

- Prefer `var(--duration-*)` and `var(--ease-*)` over `0.28s` / bare `ease`.
- Exemplar accordion: `.sanctuary-detail-accordion` in same file.
- Component class toggles already exist: `.reflection-excerpt-expandable` / `.reflection-excerpt-expanded` in `ExpandableReflection.tsx`.

#### Steps

1. Read `ExpandableReflection.tsx` and confirm class names unchanged unless doing approach B.
2. Replace hardcoded `0.28s` / `0.22s ease` with tokenized transitions (Target A).
3. Ensure mask is applied only in collapsed rule and **not** listed in `transition`.
4. Keep PRM `transition: none`.
5. Manually toggle “Read full inscription” / “Show less” twice quickly — motion must retarget (CSS transition), not restart from zero (keyframes).

#### Boundaries

- Do NOT change truncation logic in `textTruncate` / maxLength.
- Do NOT introduce Framer or height measurement JS.
- Do NOT break screen-reader `aria-expanded` wiring.

#### Verification

- **Mechanical:** `npx vitest run tests/emotionalComponents.test.tsx` or any ExpandableReflection coverage; full vitest if cheap.
- **Feel check:** Expand/collapse a long reflection in DetailModal and hardcover card; height change ≤280ms; rapid toggle does not jump; PRM snaps open/closed.
- **Done when:** No bare `0.28s` / `0.22s ease` on this panel; mask not transitioned; PRM instant.

---

### Plan 005 — Motion token cohesion pass (interactive chrome)

- **Status:** TODO  
- **Commit:** `a5471b5`  
- **Severity:** MEDIUM  
- **Category:** Cohesion & tokens / Easing & duration  
- **Estimated scope:** multiple CSS files + hoverCard string; mechanical find-replace with judgment

#### Problem

After killing `transition: all`, many surfaces still hardcode near-identical timings with weak easing:

| Pattern | Examples |
| --- | --- |
| `0.2s ease` | `settings.css`, `popup.css`, `people.css`, `discovery-layout.css`, `sidebar.css` |
| `0.15s` bare | `app-nav.css`, `settings-nav.css`, `popup.css` suggestion bg |
| `0.25s cubic-bezier(0.16, 1, 0.3, 1)` | `hoverCard.tsx` (duplicates `--ease-out`) |
| `250ms ease` | `settings.css:803`, `discovery-layout.css:321` |
| `0.3s ease` | `poetic-sanctuary.css` controls, `popup.css` log-success |

This reads as two products: sanctuary buttons use `--transition-fast` (130ms + strong ease-out); settings/nav feel soft and slow by comparison.

#### Target rules

| Interaction | Transition |
| --- | --- |
| Color / background / border on controls | `var(--transition-fast)` or explicit `var(--duration-fast) var(--ease-out)` per property |
| Hover transform (lifts, after Plan 002) | `transform var(--duration-fast) var(--ease-out)` (≤160ms) |
| Occasional panels (modals, drawers) | keep curtain tokens |
| Loading pulse | leave infinite pulse as-is |

Example conversion:

```css
/* before */
transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease;

/* after */
transition:
  border-color var(--transition-fast),
  background-color var(--transition-fast),
  color var(--transition-fast);
```

```css
/* hoverCard.tsx — before */
transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);

/* after — tokens already in SHADOW_TOKEN_CSS */
transition:
  opacity var(--duration-normal) var(--ease-out),
  transform var(--duration-normal) var(--ease-out);

.subsume-hover-card.subsume-exiting {
  transition-duration: var(--duration-fast); /* or --duration-curtain-close */
}
```

Also set transform-origin when placement is known (if hover card code knows above/below):

```css
/* when card is below trigger */
transform-origin: top center;
/* when card is above trigger */
transform-origin: bottom center;
```

If placement is only in JS, set `cardEl.style.transformOrigin = '…'` when positioning — do not invent if placement data is unavailable; skip origin rather than guess wrong.

#### Repo conventions to follow

- Tokens live in `src/shared/tokens.css`; content parity in `src/shared/shadowTokens.ts`.
- Do not introduce Emil’s alternate curves (`0.23, 1, 0.32, 1`) — Subsume’s brand curve is already `0.16, 1, 0.3, 1` as `--ease-out`.
- `--transition-base` uses bare `ease` — do not spread it for intentional motion; prefer `--ease-out`.

#### Steps

1. Grep:
   ```bash
   rg -n "0\\.2s|0\\.15s|0\\.25s|0\\.3s|250ms|200ms ease|cubic-bezier\\(0\\.16" src --glob '*.{css,ts,tsx}'
   ```
2. For each **interactive chrome** hit (buttons, chips, tabs, inputs, cards): replace with `var(--transition-fast)` or property-listed token form.
3. Leave: skeleton pulses, spin loaders, save-ceremony soft-settle, modal curtain keyframes (already tokenized).
4. Update `hoverCard.tsx` hardcoded cubics → CSS vars from shadow tokens.
5. Optionally add `--duration-soft-settle` to `SHADOW_TOKEN_CSS` if content needs it (not required for this plan).
6. Do not change JS timing constants (`SAVE_CEREMONY_MS = 280`, `EXIT_MS = 180`) unless CSS durations they mirror change — keep them matched.

#### Boundaries

- Do NOT rewrite non-motion CSS.
- Do NOT lengthen anything past 300ms for UI.
- Do NOT “fix” by swapping to `transition: all`.
- If a value is intentional PRM or test snapshot, stop and report.

#### Verification

- **Mechanical:** `npx vitest run`; visual spot-check Settings chips, People cards, Popup search input focus ring, hover card open.
- **Feel check:** Settings section chips and sanctuary primary buttons should feel **same speed family** (~130ms). Hover card open ≤250ms ease-out; exit ≤ enter.
- **Done when:** No new magic cubics for standard chrome; hoverCard uses token vars; no regressions in modal curtain.

---

## Recommended execution order

| Order | Plan | Severity | Depends on |
| --- | --- | --- | --- |
| 1 | **001** Plaque max-width kill | HIGH | — |
| 2 | **002** Hover:fine lift gates | HIGH | — (parallelizable with 001) |
| 3 | **003** Popup view soften | MEDIUM | — |
| 4 | **004** Reflection expand | MEDIUM | — |
| 5 | **005** Token cohesion | MEDIUM | Best after 002 (avoids rework on hover rules) |

**Parallel-safe:** 001 ∥ 002 ∥ 003. Run 005 last.

---

## Delta vs 2026-08-04 audit

| 2026-08-04 finding | Status @ a5471b5 |
| --- | --- |
| `transition: all` on ~12 selectors | **Closed** — zero matches |
| Plaque `max-width` | **Open** (Plan 001) |
| Zero hover:fine gates | **Partial** — library/popup/sidebar/reveal only (Plan 002) |
| Reflection max-height | **Open** (Plan 004) |
| Shadow token ease drift | **Closed** for core motion vars |
| Popup view scale keyframe | **Open** (Plan 003) |
| Notice exit missing | **Closed** |
| Dossier hard mount | **Closed** on DetailModal; **open** on HardcoverSpineCard |
| Token magic 0.2s ease | **Open** (Plan 005) |

Score moved **6.5 → 7.5** on the strength of transition:all purge, exit lifecycles, accordion pattern, and partial a11y gates.

---

## Return summary

| | |
| --- | --- |
| **Score** | **7.5 / 10** |
| **Top 3** | 1) Plaque max-width kill · 2) Hover:fine lift gates · 3) Popup view soften |
| **Path** | `/Users/harshabalakrishnan/Subsume/docs/design-reviews/2026-08-10/12-improve-animations.md` |
