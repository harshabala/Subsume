# Code review — Standards axis (design P0 wave)

**Branch:** `fix/design-p0-review-wave` (`a5471b5b`)  
**Fixed point:** `main` (`e8a52877`) — three-dot `git diff main...HEAD`  
**Axis:** Standards + maintainability of design changes (smell baseline + repo docs)  
**Spec axis:** Not in scope for this file (open-issues plan treated as context only)  
**Date:** 2026-08-10

---

## Score: **7.4 / 10**

Solid design-hygiene wave: P0 anti-patterns are largely closed, motion and a11y land in the right places, and brand docs align with runtime tokens. Score is held down by **maintainability debt** — duplicated PRM helpers, dual token sources, magic motion timings, ungated content hover, and no automated coverage of the new motion paths despite CONTRIBUTING’s test expectation for UI changes.

---

## Standards sources consulted

| Source | Role |
|--------|------|
| `CONTRIBUTING.md` | Tests for UI/capture changes; conventional commits |
| `docs/LINTING.md` | Advisory ESLint; tooling skips |
| `brand.md` / `DESIGN.md` / `docs/superpowers/plans/2026-08-04-design-open-issues.md` | Design north star (context) |
| Fowler smell baseline (skill) | Duplication, shotgun surgery, mysterious names, etc. |

---

## What meets standards (keep)

| Area | Evidence |
|------|----------|
| Solid primary CTAs | `.sanctuary-btn-gold`, `.dock-save-btn`, popup primaries use `var(--primary)` not translucent `--border-hero` fills |
| Gold chroma purge | No live `hsla(45…)` under `src/`; aliases resolve to Rosso Corsa |
| Explicit transitions | No `transition: all` / `transition-all` in runtime CSS/TS |
| Modal exit | Sanctuary + poetic exit use `--duration-curtain-close` + ease-out family |
| Focus-visible pairing | Most `outline: none` sites paired with `:focus-visible` + `var(--ring)` (dock textarea fixed on tip commit) |
| Chip scarcity | `.tag-filter-chip.active` / settings chips use `--chip-active-bg`, not solid CTA red |
| Danger semantics | Delete/danger styles keep `--danger-*`, not primary fill |
| Token ladder | `--spacing-3xl`…`--spacing-super`, `--radius-none` in `tokens.css` + shadow parity for motion vars |
| Popup PRM | Nuclear `prefers-reduced-motion` block in `popup.css` |
| Commits | Conventional `fix`/`feat`/`docs` messages on the wave |

---

## Findings — documented standards

### S1 — UI motion changes lack tests (CONTRIBUTING)

**Severity:** Medium · **Hard** relative to CONTRIBUTING pre-ship checklist spirit  

`CONTRIBUTING.md` asks for appropriate tests on new UI/capture-flow code. Grep under `tests/` finds **no** coverage for:

- dock enter/exit classes / `animGen` cancellation
- notice `--exiting` + `EXIT_MS` path
- alerts form mount/exit timers
- DetailModal accordion class wiring (CSS-only, but behavior changed)

**Fix:** Minimal unit tests — dock class sequence under PRM on/off; NoticeProvider exit; Alerts `closeForm` timer cancel on re-open.

### S2 — Dual token source drift (Shotgun Surgery / Duplicated Code)

**Severity:** Medium · **Judgement**  

Design truth lives in both:

- `src/shared/tokens.css` (app shell)
- `src/shared/shadowTokens.ts` → `SHADOW_TOKEN_CSS` (content Shadow DOM)

Wave correctly extended spacing, radius, curtain durations in both — but shadow host still **omits** several app tokens used by content CSS (e.g. `--on-primary-fg` only via fallback in dock; no `--chip-active-bg`). Content styles still hardcode red alphas (`bookOverlay.ts` `rgba(218, 41, 28, 0.28)` / `0.45`) instead of `--accent-gold-border` / `--border-hero`.

**Fix:** Single generator or shared fragment for token CSS; content components consume vars only. Treat any hex/rgba in content CSS as a review fail.

### S3 — Search chips bypass token system (Divergent Change)

**Severity:** Low–Medium · **Judgement**  

`Search.tsx` type filters still use **inline** active styles:

```ts
background: typeFilter === opt.value ? 'rgba(218, 41, 28, 0.08)' : 'var(--bg-plaque)'
```

Archive/settings chips use classes + `--chip-active-bg`. Same semantic, two systems — future brand tweaks will miss Search.

**Fix:** `.search-type-chip` / reuse `.tag-filter-chip` + active class; delete inline color map.

---

## Findings — smell baseline (judgement calls)

### B1 — Duplicated `prefersReducedMotion` (+ exit timer pattern)

**Smell:** Duplicated Code  

Near-identical helpers in:

- `NoticeProvider.tsx`
- `DetailModal.tsx`
- `PoeticCaptureCanvas.tsx`
- `FilmGrain.tsx`
- `Alerts.tsx`
- `App.tsx` (inline)
- `dock.ts` (class method + try/catch)

Plus the same “set exiting → `setTimeout` → unmount / clear” shape in Notice, Alerts, dock.

**Fix:** `src/shared/prefersReducedMotion.ts` (or hook `usePrefersReducedMotion`) + optional `useExitAnimation(ms)` for form/notice/dock.

### B2 — Motion durations not single-sourced

**Smell:** Data Clumps / Primitive Obsession on timing  

| Site | Value |
|------|--------|
| `NoticeProvider` `EXIT_MS` | 180 |
| `inline-notice.css` exit keyframe | 180ms (literal) |
| `Alerts` `FORM_MOTION_MS` | 180 |
| `alerts-form-panel` CSS | 180ms |
| `dock` `DOCK_ENTER_MS` / `DOCK_EXIT_MS` | 200 / 180 (interpolated into CSS string) |
| Token curtain | 280 / 220 |
| `DetailModal` `EXIT_FALLBACK_MS` | **350** (above UI-wiki ≤300ms ceiling noted in tokens comments) |

TS timers and CSS animations can desync silently (PRM skip path masks some of this).

**Fix:** Export duration constants once (or read from CSS custom properties where possible); cap fallbacks ≤300ms; prefer `var(--duration-normal)` in CSS over raw 180ms.

### B3 — Content dock hover not hover-gated

**Smell:** Inconsistent shared UI pattern  

App chrome (popup, sidebar, library, overlay plaque) uses:

```css
@media (hover: hover) and (pointer: fine) { … }
```

`dock.ts` still applies `transform: translateY(-1px)` on `.dock-toggle-btn:hover` without that gate. Touch sticky-hover regression risk — the wave fixed this for shell, not fully for content dock.

**Fix:** Wrap dock hover transform/shadow in the same media query; PRM block already zeros transform.

### B4 — Primary save hover inconsistency

**Smell:** Divergent Change  

- `.sanctuary-btn-gold:hover` → `var(--primary-hover-bg)` (darker red)  
- `.dock-save-btn:hover` → `var(--primary-soft)` (10% fill — reads as de-emphasized, not pressed)

**Fix:** Align dock save hover with `--primary-hover` / `--primary-hover-bg`.

### B5 — Shotgun CSS surface for one concern

**Smell:** Shotgun Surgery (expected for a design wave; still a maintainability tax)  

Focus rings, PRM blocks, and property-listed transitions are copy-pasted across many stylesheets (`sanctuary.css`, `popup.css`, `onboarding.css`, `poetic-sanctuary.css`, content strings, etc.). Correct outcomes; high cost for the next token rename.

**Fix (incremental):** Shared partials for `:focus-visible` ring + PRM nuclear block; content CSS should pull tokens only (already partially true).

### B6 — Legacy “gold” names (accepted)

**Smell:** Mysterious Name — **suppressed**  

`brand.md` and open-issues plan explicitly allow `--gold` / `.sanctuary-btn-gold` aliases. Not a violation while values resolve to primary.

---

## Shared UI pattern spot-check

| Pattern | Shell / sanctuary | Content / outliers |
|---------|-------------------|--------------------|
| Focus ring `2px solid var(--ring)` | Consistent on inputs/buttons | Dock textarea fixed; hoverCard/book overlay mostly OK |
| Hover gate `(hover: hover)` | popup, sidebar, library, overlay | **Dock / book plaque hover lift unguarded** |
| Chip active soft red | CSS tokens | **Search.tsx inline rgba** |
| PRM | global + popup nuclear + per-component | Dock skips anim via JS + CSS |
| Primary solid CTA | sanctuary / popup | Dock save solid; hover soft (B4) |
| Enter ≤300ms / exit shorter | curtain tokens | Notice/alerts 180ms OK; modal fallback 350ms soft-violate |

---

## Maintainability summary

| Dimension | Assessment |
|-----------|------------|
| Correctness of design intent | High — plan A–H largely implemented in place |
| Consistency of implementation | Medium — shared patterns re-encoded per file |
| Token single source of truth | Medium-low — dual CSS + hardcodes in content |
| Test safety net for motion | Low — behavior untested |
| Risk of next design wave | Medium — shotgun edits will repeat without shared helpers |

---

## Top fixes (priority order)

1. **Centralize PRM + exit-animation helpers; single-source motion durations** (B1, B2) — cut drift and 350ms fallback.
2. **Token sync: shadowTokens ⇄ tokens.css; kill content/Search hardcodes** (S2, S3) — one place for Rosso alphas and chip active.
3. **Dock/content hover gate + primary-hover parity; add 2–3 motion tests** (B3, B4, S1) — finish P0 hygiene where content lagged shell.

---

## Standards axis tally

| Kind | Count |
|------|------:|
| Documented-standard findings | 3 (S1–S3) |
| Baseline smells (actionable) | 5 (B1–B5; B6 suppressed) |
| **Worst in-axis** | **S2/B1 — dual tokens + duplicated PRM/exit motion (maintainability)** |

**Score: 7.4 / 10**
