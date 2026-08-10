# Emil Kowalski / Design-Engineering Polish Review — Subsume

**Date:** 2026-08-10  
**Branch:** `fix/design-p0-review-wave` @ `a5471b5`  
**Lens:** [emil-design-eng](https://animations.dev/) — invisible polish, press feedback, enter/exit, focus, hover discipline  
**Scope:** Tokens, app shell CSS/TSX, popup, sanctuary modals, content overlays (hover card, plaques, dock)  
**Method:** Read-only audit + delta vs [2026-08-04/03-emil-kowalski.md](../2026-08-04/03-emil-kowalski.md)  
**Score: 7.4 / 10**

---

## Score rationale

| Dimension | /10 | Δ vs 08-04 | Notes |
| --- | --- | --- | --- |
| Motion tokens & ceremony | 8.5 | +1.0 | Curtain enter 280ms / close 220ms; ease-out family; no `scale(0)` |
| Button press feedback | 7.0 | +1.0 | Global `scale(0.97)`; sanctuary gold/restraint explicit; many CTAs still omit transform |
| Hover vs active discipline | 6.5 | +1.5 | Partial `@media (hover: hover)` (library, sidebar, popup, overlay); most surfaces still ungated |
| Focus rings | 8.0 | +1.0 | Broad `:focus-visible`; people tabs fixed; discovery focus red |
| Modal enter/exit | 8.5 | +3.0 | Asymmetric curtain; ease-out exit; poetic path matches DetailModal |
| Ferrari CTA remap fidelity | 8.0 | +3.0 | Solid `--primary` + white on-primary on gold/inscribe/save/popup |
| Cheap-feeling transitions | 7.5 | +2.0 | `transition: all` gone; weak `ease` still common; `--transition-base` not ease-out |

**Why not higher:** Invisible layer is uneven — hover still sticky on touch for people/discovery/nav chrome; press ladder incomplete on settings/poetic/onboarding CTAs; primary hover token darker than pressed; hover-card primary still near-black ink.

**Why not lower:** P0 wave landed. Modal exit is correct. CTAs are solid Rosso Corsa. No `transition: all`, no `scale(0)`, no UI `ease-in`. Reduced-motion coverage remains strong.

---

## Delta vs 2026-08-04 (prior score **6.2**)

| Prior finding | Status | Evidence |
| --- | --- | --- |
| F01 Translucent `--border-hero` CTAs | **Fixed** | `sanctuary-btn-gold`, `btn-sanctuary-gold`, inscribe, `save-btn` → `var(--primary)` |
| F02 Gold `hsla(45,…)` leftovers | **Fixed** | Discovery filter/focus red family; Search gold wash gone from prior sites |
| F03 Modal exit `ease-in` + slower than enter | **Fixed** | `--duration-curtain-close: 220ms`; exit uses `ease-focus-pull` / ease-out |
| F04 Zero hover media queries | **Partial** | 5 gates now (library, sidebar nav, popup recent + pills, overlay plaque reveal) |
| F05 `transition: all` | **Fixed** | Repo-wide: none remaining under `src/` |
| F06 Incomplete CTA press models | **Partial** | Sanctuary gold/restraint have active scale; settings gold + inscribe + poetic still thin |
| F07 Hover = pressed on plaque | **Open** | `.plaque-btn.reflect:hover` still `--primary-pressed-bg` |
| F08 shadowTokens weak `ease` | **Partial** | Fast path uses ease-out; `--transition-base` still `ease` |
| F09 Popup primary incomplete | **Mostly fixed** | Solid primary + white; active scale 0.98; icon-btn still bare |
| F10 Hover-card near-black on red | **Open** | `.subsume-btn-primary { color: var(--background) }` → `#181818` |
| F11 Legacy `.modal-content` exit | **Open** | Enter only (`global.css`) |
| F12 Nav underspecified | **Partial** | Scoped props + hover gate on tabs; drawer exit same duration as enter |
| F13 People outline / discovery gold focus | **Fixed** | `people-tab:focus-visible`; discovery red soft ring |
| F14 Popup loading italic text | **Open** | Still text-only |

**Net:** +1.2 points. Foundations and ceremony crossed from “almost” to “correct.” Remaining debt is interaction discipline (hover gate, press ladder, token depth order), not remap/ceremony.

---

## Strengths (do not regress)

1. **Asymmetric curtain motion** — enter 280ms / close 220ms, ease-out both ways (`tokens.css` 100–102; `sanctuary.css` 569–640; `poetic-sanctuary.css` 3–77).
2. **Scale floor ≥0.96** — modal/popup enter never from `scale(0)` (`sanctuary.css` 619–627; `popup.css` 40–41).
3. **Solid primary CTAs** — gold/inscribe/save/popup primary use `--primary` + on-primary white.
4. **Global press baseline** — `button:active { transform: scale(0.97) }` with transform in transition (`global.css` 104–111).
5. **Reduced motion** — global nuke + component opt-outs (`global.css` 608–636; modal/poetic/library/sidebar).
6. **`transition: all` eliminated** — property-scoped transitions across shell and popup.
7. **Focus-visible coverage** — people tabs, discovery, nav, sanctuary controls.

---

## Severity-ranked findings

Severity: **P0** feel-breaking · **P1** high polish debt · **P2** medium · **P3** nit

### P1 — Interaction discipline (highest remaining leverage)

#### F01 · Hover still ungated on most surfaces

Only five `@media (hover: hover) and (pointer: fine)` blocks exist. Touch sticky-hover remains on people cards, discovery feed, app subnav, settings chrome, global cards, hover-card lift, book plaques, popup stats.

| Before | After | Why |
| --- | --- | --- |
| `.discovery-feed-card:hover { border-color… }` ungated | Wrap decorative hover in `@media (hover: hover) and (pointer: fine)` | Tap must not leave card “stuck” elevated/highlighted |
| `.people-sanctuary-card:hover`, `.app-subnav-link:hover` always | Same gate | Frequent chrome — touch feedback is `:active` only |
| `.subsume-btn-primary:hover { transform: translateY(-1px) }` | Gate lift; keep `:active` scale | Hover lift + active scale fight on touch |

**Evidence:**

| File:line | |
| --- | --- |
| `src/ui/styles/discovery-layout.css:336-339` | feed card hover ungated |
| `src/ui/styles/people.css:649-651` | sanctuary card hover |
| `src/ui/styles/app-nav.css:107-110` | subnav hover |
| `src/ui/styles/global.css:90-94` | `.card:hover` |
| `src/content/hoverCard.tsx:990-994` | primary lift ungated |
| `src/content/bookOverlay.ts:79-84` | plaque lift ungated |
| `src/ui/styles/popup.css:155-157` | stat hover ungated |

**Already good (keep):** `library.css:54-59`, `sidebar.css:72-76`, `popup.css:240+,718+`, `overlay.ts:167-172`.

---

#### F02 · High-emotion CTAs: incomplete press model

Global `button:active { scale(0.97) }` helps only when the element is a native `button` **and** local transitions include `transform`. Settings gold/restraint omit transform → press snaps. Inscribe has no local active. Poetic chips/actions and onboarding CTA lack intentional press.

| Before | After | Why |
| --- | --- | --- |
| `.btn-sanctuary-gold` transition without `transform` | `transform 130–160ms var(--ease-out)` + `:active { scale(0.97); background: var(--primary-pressed) }` | Press must ease, not jump |
| `.sanctuary-detail-btn-inscribe` bg/opacity only | Add transform + `:active` pressed bg | Primary modal action must feel alive |
| `.intent-selectors button` 300ms ease, no active | 150–200ms ease-out + `scale(0.98)` active | Frequent chips — snappy, interruptible |
| `.onboarding-cta` hover only | `scale(0.97)` on active | First-run CTA — delight allowed |
| `.popup-icon-btn` no transition / active | Scoped props + active scale | Header chrome parity |

**Evidence:**

| File:line | |
| --- | --- |
| `src/ui/styles/settings.css:231-245` | gold CTA — no transform, no `:active` |
| `src/ui/styles/settings.css:258-275` | restraint — same |
| `src/styles/sanctuary.css:1607-1625` | inscribe — no transform / active |
| `src/ui/styles/poetic-sanctuary.css:231-306` | intent/rating/actions |
| `src/ui/styles/onboarding.css:141-159` | CTA hover only |
| `src/ui/styles/popup.css:815-835` | icon-btn bare |

---

#### F03 · Primary depth ladder inverted; hover conflated with pressed

`--primary-hover: #9d2211` is **darker** than `--primary-pressed: #b01e0a`. Pressed should read deepest (or equal), never lighter. Plaque reflect hover jumps straight to pressed bg.

| Before | After | Why |
| --- | --- | --- |
| hover `#9d2211` / pressed `#b01e0a` | pressed darkest (e.g. hover `#c42418`, pressed `#9d2211`) | Depth teaches hierarchy |
| `.plaque-btn.reflect:hover { --primary-pressed-bg }` | Hover → hover token; `:active` → pressed + scale | Hover ≠ press |

**Evidence:** `src/shared/tokens.css:18-19,195-196`; `src/ui/styles/layout.css:303-305`.

---

### P2 — Content UI, chrome, loading

#### F04 · Hover-card primary still near-black ink on Rosso Corsa

| Before | After | Why |
| --- | --- | --- |
| `color: var(--background)` (`#181818`) | `color: var(--on-primary-fg)` / `#ffffff` | Ferrari contract: white on primary |
| Hover `translateY(-1px)` ungated | Gate hover; keep active `scale(0.97)` | Touch sticky + competing transforms |

**Evidence:** `src/content/hoverCard.tsx:984-994`.

---

#### F05 · Drawer / legacy modal enter–exit asymmetry incomplete

| Before | After | Why |
| --- | --- | --- |
| Side drawer enter/exit both `--duration-slow` (260ms) | Exit ~180ms ease-out | Snappy dismiss matches Emil asymmetric release |
| `.modal-content` enter only | Closing class + short ease-out | Instant unmount next to DetailModal feels broken |

**Evidence:** `src/ui/styles/sidebar.css:132-179`; `src/ui/styles/global.css:255-277`.

---

#### F06 · Weak `ease` vs custom ease-out on frequent chrome

Shell has strong `--ease-out`, but many paths still use bare `ease` / 0.2s defaults. Content and settings feel softer than sanctuary ceremony.

| Before | After | Why |
| --- | --- | --- |
| `--transition-base: var(--duration-normal) ease` | `var(--duration-normal) var(--ease-out)` | Punch on base transitions |
| Popup/settings `0.2s ease` | `var(--duration-fast/normal) var(--ease-out)` | Shared “heard you” curve |

**Evidence:** `tokens.css:74-75`; `shadowTokens.ts:78-79`; `settings.css:244,270`; `popup.css:104,148,762`.

---

#### F07 · Popup loading / empty remain cheap

| Area | Verdict | Note |
| --- | --- | --- |
| Spinner 0.8s linear + skeleton 40ms stagger | Good | Perceived speed OK |
| `.popup-loading` italic text only | Weak | Prefer spinner/skeleton (`popup.css:899-907`) |
| `.popup-empty` italic centered | OK | Functional; less cohesive than `EmptyStateProjection` |

---

### P3 — Nits

| ID | Finding | File:line | Fix |
| --- | --- | --- | --- |
| F08 | Press scale 0.96 / 0.97 / 0.98 drift | popup close 0.96; global 0.97; optical 0.98 | Standardize **0.97** |
| F09 | `.sanctuary-modal-close` color-only transition, no active scale | `sanctuary.css:651-672` | Transform + active scale |
| F10 | `.sanctuary-acquire-btn` no `:active` | `sanctuary.css:120-141` | Add scale |
| F11 | `.popup-close-btn:active` scale without transform in transition | `popup.css:104-120` | Include transform 130ms |
| F12 | Intent selectors 300ms | `poetic-sanctuary.css:242-245` | 150–200ms ease-out |
| F13 | Book plaque hover duration = curtain 280ms | `bookOverlay.ts:72-75` | 130–160ms for hover micro-feedback |

---

## Master Before / After table (actionable)

| Before | After | Why |
| --- | --- | --- |
| Decorative `:hover` without media query | `@media (hover: hover) and (pointer: fine)` | Prevent sticky hover on touch |
| CTA transitions omit `transform` | Include `transform 130–160ms var(--ease-out)` + `scale(0.97)` active | Press feedback must interpolate |
| Inscribe / settings gold / poetic actions no pressed bg | `:active { background: var(--primary-pressed) }` | Full press ladder |
| `--primary-hover` darker than `--primary-pressed` | Pressed deepest | Depth hierarchy |
| Plaque hover uses pressed token | Hover → hover; active → pressed | Separate layers |
| Hover-card `color: var(--background)` on red | `var(--on-primary-fg)` | White on Rosso Corsa |
| Drawer exit same duration as enter | Exit ~180ms ease-out | Asymmetric release |
| Legacy modal enter-only | Exit class + short ease-out | Spatial consistency |
| `--transition-base: … ease` | `… var(--ease-out)` | Stronger default curve |
| Popup loading italic text | Spinner or skeleton | Perceived finish quality |

---

## Priority fix order

1. **Gate hover** — people, discovery, app-nav, global cards, hover-card, book plaques, popup stats (match library/sidebar pattern).
2. **Complete press ladder** — settings gold/restraint, inscribe, poetic chips/actions, onboarding CTA, popup icon-btn (transform + active scale + pressed color).
3. **Token depth + hover-card ink** — reorder primary hover/pressed; white on-primary in hover card; plaque hover ≠ pressed.
4. **Drawer + legacy modal exit** — shorter ease-out close.
5. **Ease-out defaults** — `--transition-base` and frequent chrome `0.2s ease` → tokens.
6. **Popup loading** — spinner/skeleton parity with shell.

---

## Scorecard detail (Emil checklist)

| Checklist item (Emil) | Status |
| --- | --- |
| No `transition: all` | **Pass** |
| No `scale(0)` entry | **Pass** — 0.96/0.98 floors |
| No `ease-in` on UI | **Pass** — exits use ease-out; only continuous pulse uses ease-in-out |
| Popover origin-aware | N/A / modals correctly centered |
| Duration ≤300ms UI | **Pass** |
| Asymmetric enter/exit | **Pass** for sanctuary/poetic; **Fail** for drawer + legacy modal |
| Hover media query | **Partial** — 5 sites; majority ungated |
| Button `:active` scale | **Partial** — global yes; many custom incomplete |
| Custom ease-out curves | **Partial** — shell strong; chrome often bare `ease` |
| Reduced motion | **Pass** |
| Loading perceived speed | **Pass** spinner; popup loading weak |

---

## Top 5 findings (executive)

1. **P1 — Hover gating incomplete** — only library/sidebar/popup/overlay gated; people, discovery, hover-card, book plaques still sticky on touch.
2. **P1 — Press model incomplete on high-value CTAs** — settings gold, inscribe, poetic actions, onboarding: missing transform easing and/or pressed color.
3. **P1 — Primary depth ladder inverted + plaque hover=pressed** — hover darker than pressed; reflect hover skips to pressed bg.
4. **P2 — Hover-card primary ink near-black** — `var(--background)` on Rosso Corsa fails on-primary white contract.
5. **P2 — Drawer / legacy modal exit** — same duration as enter or enter-only; sanctuary path is the reference.

---

## Top 3 fixes (if shipping one PR)

1. **Hover media query sweep** — gate all lift/glow/color decorative hovers.
2. **Press ladder on CTAs** — transform in transitions + `scale(0.97)` + `--primary-pressed` on settings/inscribe/poetic/onboarding.
3. **Primary tokens + hover-card ink** — pressed deepest; white on-primary; plaque hover vs active split.

---

## Deliverable meta

| Field | Value |
| --- | --- |
| Path | `/Users/harshabalakrishnan/Subsume/docs/design-reviews/2026-08-10/03-emil-kowalski.md` |
| Score | **7.4 / 10** (prior **6.2**, Δ **+1.2**) |
| Mode | Read-only |
| Reviewer lens | Emil Kowalski design engineering |
| Branch | `fix/design-p0-review-wave` @ `a5471b5` |
