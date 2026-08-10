# Frontend Design Guidelines Review — Subsume UI

**Date:** 2026-08-04  
**Skill:** `frontend-design-guidelines` (+ craft layer inspired by Emil Kowalski)  
**Scope:** App shell, library/archive, sanctuary components, popup, settings, onboarding — post Ferrari rebrand  
**Mode:** Read-only audit  
**Sources of truth used:** live tokens (`src/shared/tokens.css`), `brand.md` (drift noted), Ferrari plan (`docs/superpowers/plans/2026-08-04-ferrari-design-system.md`)

---

## Score: **6.7 / 10**

Solid architectural bones after the Ferrari token remount: shared shell gutters, real `<button>` usage, library skeletons/empty/error recovery, and many `focus-visible` rings. The score is held back by incomplete gold→rosso cleanup, weak or stripped focus on several inputs, `transition: all` still in high-frequency chrome, sub-12px type, and brand-doc vs live-token divergence.

| Dimension | Score | Notes |
|---|---|---|
| Hierarchy | 6.5 | Strong plaque/page titles; dual “editorial” identity weakened (Inter only + italic); pure white body can glare |
| Spacing | 7.5 | 4px-ish scale via tokens; shell max/gutter aligned; some pages denser than others |
| Components | 7.0 | Shared sanctuary cards, optical buttons, empty plaques; chip/filter APIs inconsistent |
| Interactions / a11y | 6.5 | Good nav drawer inert + focus return; focus holes on settings/sanctuary inputs & lobby links |
| Motion discipline | 6.0 | Reduced-motion in sanctuary/popup/emotional; many `transition: all` leftovers |
| Token / brand fidelity | 5.5 | Ferrari tokens live; gold hue fallbacks + stale `brand.md` still ship Gilded Night story |
| States (L/E/E) | 7.5 | Library, recs, search empty/error strong; settings load is text-only |

---

## What works

- **Token-first Ferrari core** in `src/shared/tokens.css` (Rosso `#da291c`, cinema canvas `#181818`, alias `--gold` → primary).
- **Shell alignment:** `--app-shell-max` / `--app-shell-gutter` shared by nav and `.page-container` (`app-nav.css`, `layout.css`).
- **Real controls:** primary surfaces use `<button type="button">`; sanctuary media cards use open buttons with `aria-label`.
- **Nav a11y:** `inert` on main when drawer open, `tabIndex` gating, focus restore to menu toggle (`App.tsx`).
- **Library states:** skeleton grid, error plaque + retry, empty + filtered-empty with next actions (`Library.tsx`).
- **Global focus baseline** for `button`/`input`/`a` via `focus-visible` ring on `--ring` (`global.css`).
- **Hit targets:** nav tabs / menu toggle / subnav links target ≥44px.

---

## Findings (severity-ordered)

Severity key: **P0** ship-blocker for a11y/brand integrity · **P1** high craft/a11y debt · **P2** polish · **P3** nit

### P0 — Incomplete Ferrari rebrand: gold hue still hard-coded

**Where**

| Location | Issue |
|---|---|
| `src/ui/styles/discovery-search.css:35` | Focus ring `hsla(45, 90%, 65%, 0.12)` — gold chroma |
| `src/ui/styles/discovery-search.css:68` | Active filter bg same gold wash |
| `src/ui/pages/Search.tsx:152` | Inline chip bg `hsla(45, 90%, 65%, 0.08)` |
| `src/ui/styles/emotional-components.css:164-166` | Ceremony gradient fallbacks `hsl(45, …)` |
| `src/ui/styles/emotional-components.css:362+` | Aura stops still gold-tinted |

**Why it fails guidelines:** Color must come from tokens; one accent only; Ferrari plan explicitly bans leftover gold hex/hsl fallbacks.

**Craft fix**

| Before | After |
|---|---|
| `box-shadow: 0 0 0 2px hsla(45, 90%, 65%, 0.12)` | `box-shadow: 0 0 0 2px var(--primary-soft)` |
| `background: hsla(45, 90%, 65%, 0.08)` | `background: var(--chip-active-bg)` / `var(--primary-soft)` |
| `var(--primary, hsl(45, 80%, 62%))` | `var(--primary, #da291c)` |

---

### P0 — Brand source-of-truth drift (`brand.md` vs live UI)

**Where:** `brand.md` (Gilded Night gold, Outfit + Newsreader) vs `src/shared/tokens.css` + `src/ui/index.html` (Ferrari red, Inter only).

**Why:** Skill treats `brand.md` as palette/type authority. Agents and humans will reintroduce gold/serif if docs stay stale.

**Craft fix**

| Before | After |
|---|---|
| `brand.md` documents `#c9a84c` + Outfit/Newsreader as live | Rewrite palette/type sections to match Ferrari plan; mark Gilded Night as historical |
| Editorial stack promises Newsreader | Either load a serif or drop “editorial italic” pretence and document Inter-only |

---

### P1 — Focus indicators stripped or border-only on key inputs

**Where**

| Location | Pattern |
|---|---|
| `src/ui/styles/settings.css:75` | `.settings-input { outline: none }` — **no local `:focus` / `:focus-visible`** |
| `src/ui/styles/poetic-sanctuary.css:192-198` | `.poetic-textarea` outline none; focus = border only |
| `src/styles/sanctuary.css:172-186` | `.optical-input` outline none; focus = border only |
| `src/styles/sanctuary.css:985-990` | `.sanctuary-detail-input` same |
| `src/ui/styles/onboarding.css:254-259` | `.onboarding-input` outline none; focus = border only |
| `src/ui/styles/people.css:27` | `.people-tab { outline: none }` |
| `src/ui/styles/people.css:855` | `.people-sanctuary-search { outline: none }` |
| `src/ui/styles/discovery-layout.css:59-63` | `.discovery-lobby-text-link:focus-visible { outline: none }` |

**Why:** Non-negotiable: every interactive control needs a visible focus ring (≥3:1). Border-color alone on a 1px hairline is easy to miss. Global `input:focus-visible` helps some cases but competes with higher-specificity `outline: none` and is absent for custom buttons that re-zero outline without replacement.

**Craft fix**

| Before | After |
|---|---|
| `outline: none` only | Keep default outline off **and** add `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }` |
| Lobby link: underline + `outline: none` | Underline **plus** ring, or 2px inset box-shadow using `--ring` |
| Settings inputs with no focus styles | Mirror `global.css` input focus: border `--primary` + soft ring |

---

### P1 — `transition: all` on high-frequency chrome

**Where**

| Location | Line(s) |
|---|---|
| `src/ui/styles/popup.css` | 237, 338, 673, 709 |
| `src/ui/styles/people.css` | 28, 469, 616 |
| `src/ui/styles/sidebar.css` | 63 (`.nav-tab-btn`) |
| `src/ui/styles/layout.css` | 292 (`.plaque-btn`) |
| `src/ui/styles/onboarding.css` | 153 (`.onboarding-cta`) |
| `src/ui/styles/discovery-search.css` | 57 (filter chips) |

**Why:** Craft anti-pattern — animates unintended properties, causes layout thrash, reads sluggish at 200ms for hover.

**Craft fix**

| Before | After |
|---|---|
| `transition: all 0.2s ease` | `transition: color 100ms ease-out, background-color 100ms ease-out, border-color 100ms ease-out` |
| `transition: all 220ms ease` (CTA) | `transition: border-color 150ms ease-out, background-color 150ms ease-out, color 150ms ease-out` |

---

### P1 — Sub-12px type & weak hit targets in dense chrome

**Where**

| Location | Detail |
|---|---|
| `src/ui/styles/popup.css:281` | Status badge `font-size: 9px` |
| `src/ui/styles/layout.css:245, 288` | Meta / plaque CTA `9–10px` |
| `src/ui/styles/popup.css:82,170,209` | Multiple 10px labels |
| `src/ui/styles/people.css:102-103, 312` | Controls `min-width/height: 32px` (< 40px touch minimum) |
| `src/ui/styles/app-nav.css:93` | Subnav labels `11px` uppercase (acceptable for caps, tight) |

**Why:** Guidelines ban tiny fonts below 12px for reliability; hit targets ≥40×40 on touch.

**Craft fix**

| Before | After |
|---|---|
| `font-size: 9px` badges | `font-size: 11px` min; prefer `12px` with tighter tracking |
| `min-height: 32px` icon buttons | `min-height: 40px; min-width: 40px` (padding expands hit area) |
| Plaque CTA `10px` | `12px` / keep uppercase + letter-spacing |

---

### P2 — Hierarchy: pure white body + collapsed type roles

**Where**

| Location | Detail |
|---|---|
| `src/shared/tokens.css:13` | `--fg-base: #ffffff` on `#181818` |
| `src/shared/tokens.css:15,38` | `--fg-subtle` / `--text-control: #666666` — small meta risk |
| `src/shared/tokens.css:43-44` | `--font-editorial` === Inter (no serif load) |
| `src/ui/styles/layout.css:45-54` | `.page-title` italic “editorial” without serif face |
| `src/ui/index.html:10` | Only Inter loaded |

**Why:** Layout guidelines prefer soft whites on dark (`#EDEDED`-class) to reduce glare; hierarchy needs distinct UI vs editorial faces *or* a deliberate mono-family system. Italic Inter is a weak stand-in for Newsreader.

**Craft fix**

| Before | After |
|---|---|
| `--fg-base: #ffffff` | `--fg-base: #f2f2f2` or `#e8e8e8` for long reading |
| `--text-control: #666666` at 11px | Raise to `#8f8f8f` / `--text-meta` for AA on small type |
| Italic Inter as “editorial” | Load Newsreader *or* drop italic + use weight/size only |

---

### P2 — Spacing / component consistency

**Where**

- Settings panels use 32px padding / 36px stack gap (`settings.css:24-35`) — generous and coherent.
- Popup body 14×18 padding / 12px gaps (`popup.css:312-318`) — denser, appropriate for extension.
- Search chips use **inline styles** for active state (`Search.tsx:147-152`) instead of CSS classes/tokens — breaks themeability and rebrand.
- Dual class systems: `.people-tab` (legacy) vs `.people-sanctuary-tabs` (newer) — risk of dead styles + inconsistent focus.

**Craft fix**

| Before | After |
|---|---|
| Inline `style={{ background: 'hsla(45…)' }}` | Class `.optical-button.is-active` with token bg |
| Parallel people tab CSS | Delete unused legacy block or map both to one pattern |

---

### P2 — Motion: reduced-motion coverage incomplete

**Covered:** sanctuary (multiple blocks), popup, poetic-sanctuary, emotional-components, App drawer close, DetailModal / PoeticCaptureCanvas checks.

**Gaps:** `people.css` / `sidebar.css` / `layout.css` plaque transitions / onboarding CTA — no reduced-motion override; many files animate color via `transition: all` without `prefers-reduced-motion`.

**Craft fix**

| Before | After |
|---|---|
| Global hover transitions always on | `@media (prefers-reduced-motion: reduce) { * { transition-duration: 0.01ms !important; } }` scoped to chrome, or per-component |

---

### P3 — Minor interaction nits

| Location | Note |
|---|---|
| `App.tsx:350-358` | Primary nav tabs omit `type="button"` (safe outside forms; still inconsistent) |
| `popup.css:777` | Fallback `var(--on-primary-fg, #0a0a0a)` — wrong if token missing; should be `#ffffff` per Ferrari |
| Content `overlay.ts:163` | `transition: all 280ms` in content script chrome (out of main UI but same anti-pattern) |
| Settings load | Text-only “Loading settings…” (`Settings.tsx:458`) — no skeleton matching panel shape |

---

## Surface-by-surface notes

### App shell
- Sticky dual-row nav (primary + explore) with shared gutter is the strongest layout win.
- Drawer: good `aria-*`, inert main, reduced-motion short-circuit.
- `transition: all` on `.nav-tab-btn` is the main polish miss.

### Library / sanctuary archive
- State coverage is reference-quality for the product (skeleton, error, empty, filtered empty).
- Hardcover spine cards correctly nest open control as `<button>`; avoid nested interactive traps.
- Optical button system specifies properties (good contrast to popup).

### Popup
- Structured overview + log flow; focus-visible set for many controls.
- Worst concentration of `transition: all`, 9–10px type, and gold-era fallback risk on primary button.

### Settings
- Clear section stack and field labels (uppercase 11px meta).
- Inputs zero outline without dedicated focus styling — highest settings a11y risk.
- Load/error is functional but not skeleton-shaped.

### Onboarding
- Step indicator + labelled form fields + `role="alert"` errors — solid.
- CTA uses `transition: all 220ms`; inputs border-only focus.

---

## Final checklist (skill non-negotiables)

| Check | Status |
|---|---|
| Keyboard nav / real buttons | Mostly pass |
| Visible focus rings | **Partial fail** (inputs, lobby links, people search) |
| No `div onClick` | Pass on reviewed surfaces |
| Hit targets ≥40×40 | **Partial** (people 32px, dense popup chips) |
| Loading / empty / error | Strong on library/recs; weaker settings |
| `prefers-reduced-motion` | Partial |
| Contrast AA | Risk on `#666` small meta; white glare not WCAG-fail |
| Tokens not magic numbers | **Fail** on gold `hsla(45…)` leftovers |
| Dark mode tokens | Present |
| Copy voice | Strong, product-specific |

---

## Recommended fix order

1. **Purge gold `hsla(45` / `hsl(45`** across UI CSS + Search inline styles; point fallbacks at `#da291c` / `--primary-soft`.
2. **Focus system pass:** one utility (e.g. `.focus-ring`) applied to settings/onboarding/optical/sanctuary inputs; restore ring on lobby text links.
3. **Replace `transition: all`** in popup, people, sidebar, plaque, onboarding.
4. **Bump sub-12px type** and 32px hit targets.
5. **Sync `brand.md`** to Ferrari + Inter so future agent work stops reintroducing Gilded Night.

---

## Top 5 findings (executive)

1. **Gold chroma still hard-coded** after Ferrari rebrand (`discovery-search.css`, `Search.tsx`, emotional ceremony fallbacks).
2. **`brand.md` out of sync** with live tokens/fonts — will re-poison implementation.
3. **Focus rings missing or outline:none without replacement** on settings, sanctuary, poetic, onboarding inputs and lobby text links.
4. **`transition: all`** still on nav tabs, popup rows/inputs, people tabs, plaque CTAs.
5. **Type below 12px + 32px targets** in popup/people dense chrome undermines a11y and polish.

---

_Reviewer: frontend-design-guidelines skill · craft layer credit: philosophy inspired by Emil Kowalski (emilkowal.ski)._
