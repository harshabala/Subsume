# Frontend Design Guidelines Review — Subsume UI

**Date:** 2026-08-10  
**Repo:** Subsume @ `a5471b5`  
**Skill:** `frontend-design-guidelines` (+ craft layer inspired by Emil Kowalski)  
**Scope:** App shell, library/archive, sanctuary components, popup, settings, onboarding, discovery, people, recommendations  
**Mode:** Read-only craft audit  
**Sources of truth:** `src/shared/tokens.css`, `brand.md` (Ferrari / Cinema Black), skill non-negotiables + craft-and-polish  

---

## Score: **7.6 / 10**

Material lift from **6.7** (2026-08-04). Ferrari rebrand hygiene landed: gold `hsla(45…)` is gone, `brand.md` matches live tokens, `transition: all` is purged, focus-visible rings cover settings/onboarding/poetic/people/lobby inputs, and a global `prefers-reduced-motion` blanket lives in `global.css`. Remaining score drag is dense **sub-12px type**, **sub-40px hit targets**, residual **magic-number / gilded fallback** colors, and **text/spinner loading** on several secondary surfaces.

| Dimension | Score | Notes |
|---|---|---|
| Hierarchy | 7.0 | Strong page titles / plaques; pure white body + Inter-only “editorial” italic still soft |
| Spacing | 7.5 | Token ladder + shell max/gutter coherent; popup denser by design |
| Components | 7.5 | Shared optical/sanctuary systems; chip active state still half-inline |
| Interactions / a11y | 7.5 | Focus largely fixed; hit targets and 9px labels lag |
| Motion discipline | 7.5 | No `transition: all`; property-specific transitions; hover often 200ms not 100ms micro |
| Token / brand fidelity | 8.0 | brand.md + tokens aligned; some `rgba(218,41,28…)` and warm-gray fallbacks remain |
| States (L/E/E) | 7.5 | Library/home skeletons strong; settings/people/stats still text or spinner |

---

## What works

- **Brand source of truth:** `brand.md` documents Cinema Black + Rosso Corsa; live `--primary: #da291c` in `src/shared/tokens.css:16` matches. No more Gilded Night drift.
- **Gold chroma purge:** no `hsla(45` / `hsl(45` under `src/` (prior P0 closed).
- **Motion hygiene:** no `transition: all` under `src/`. High-frequency chrome uses property lists (e.g. `popup.css`, `sidebar.css`, `layout.css` plaque buttons).
- **Global reduced motion:** `src/ui/styles/global.css:607-615` collapses animation/transition duration app-wide; surfaces also keep local overrides (library, sanctuary, popup, emotional, discovery).
- **Focus baseline:** `global.css` `button|a|input:focus-visible` ring on `--ring`; local replacements after `outline: none` on settings, onboarding, poetic, people, optical, sanctuary detail inputs.
- **Real controls:** primary UI uses `<button>` / labelled inputs; diagnostics row uses `role="button"` + Enter/Space (`SettingsDiagnosticsPanel.tsx:308-318`).
- **Library / home states:** skeleton grids (`Library.tsx`, `Home.tsx`), empty plaques with next actions, error + retry patterns.
- **Pressed / disabled system:** global `button:active` scale + `button:disabled` opacity (`global.css:109-116`).
- **Shell alignment:** `--app-shell-max` / `--app-shell-gutter` shared across nav and pages.

---

## Findings (severity-ordered)

Severity: **P0** ship-blocker · **P1** high craft/a11y debt · **P2** polish · **P3** nit

### P1 — Sub-12px type still widespread (9px badges / meta)

Guidelines treat type below **12px** as unreliable for reading and control labels (uppercase caps can go slightly smaller only when still legible).

| Location | Size | Role |
|---|---|---|
| `src/ui/styles/popup.css:283` | 9px | `.popup-status-badge` |
| `src/ui/styles/layout.css:245` | 9px | `.plaque-index` |
| `src/ui/styles/layout.css:288` | 10px | `.plaque-btn` CTA label |
| `src/ui/styles/sidebar.css:235` | 9px | `.side-menu-section-label` |
| `src/ui/styles/recommendations.css:73,166,248` | 9px | type badges / meta |
| `src/ui/styles/discovery-layout.css:497` | 9px | reflection eyebrow |
| `src/styles/sanctuary.css:401,2042,2056,3076` | 9px | card badges / dense meta |
| `src/content/hoverCard.tsx:906` | 9px | content chrome |

Many additional **10–11px** labels across popup, people, settings, sanctuary remain dense; prioritize badges and interactive labels first.

**Craft fix**

| Before | After |
|---|---|
| `font-size: 9px` on badges/eyebrows | `font-size: 11px` min; prefer `12px` + `letter-spacing` for caps |
| `.plaque-btn { font-size: 10px }` | `12px` uppercase with existing tracking |
| Status badge 9px in popup | `11px` / `font-weight: 600` |

---

### P1 — Hit targets under 40×40 on dense chrome

Skill non-negotiable: interactive targets ≥ **40×40** on touch (padding expands the hit area; icon can stay small).

| Location | Detail |
|---|---|
| `src/ui/styles/people.css:107-108` | unfollow / icon control `min-width/height: 32px` |
| `src/ui/styles/people.css:317,686-687,735` | additional 32px controls |
| `src/ui/styles/recommendations.css:94,313,338,433,497,526,780` | dismiss / chips / actions `min-height: 32px` |
| `src/styles/sanctuary.css` | many optical/detail controls at `min-height: 32px` (e.g. ~130, 228, 852, 1179-1180) |
| `src/ui/styles/settings.css:292` | chip / compact control 32px |
| `src/ui/components/inline-notice.css:95-96` | dismiss 32×32 |

Nav tabs / menu toggle / optical primary buttons (≥44px) pass.

**Craft fix**

| Before | After |
|---|---|
| `min-height: 32px; min-width: 32px` | `min-height: 40px; min-width: 40px` (keep visual padding; icon size unchanged) |
| Dismiss `padding: 4px 10px` + 32px height | `min-height: 40px; padding: 8px 12px` |

---

### P2 — Magic numbers & warm-gray fallbacks (token bypass)

Gold hue is gone, but craft still wants **tokens only** — hard-coded red alpha and pre-Ferrari warm grays reintroduce drift.

| Location | Issue |
|---|---|
| `src/ui/pages/Search.tsx:147-152` | Inline chip styles: `rgba(218, 41, 28, 0.08)` + raw padding/fontSize |
| `src/ui/styles/discovery-search.css:35,73` | Hard-coded `rgba(218, 41, 28, 0.12/0.08)` instead of `--primary-soft` / chip tokens |
| `src/ui/styles/popup.css:345` | Focus wash `rgba(218, 41, 28, 0.15)` |
| `src/ui/styles/recommendations.css:78-112` | Fallbacks `#5a5248`, `#9e9a90`, `#f0e6d8` (Gilded Night warm palette) |
| `src/ui/styles/settings-nav.css:323` | Bare `rgba(218, 41, 28, 0.12)` |

**Craft fix**

| Before | After |
|---|---|
| `background: rgba(218, 41, 28, 0.08)` | `background: var(--primary-soft)` / `var(--chip-active-bg)` |
| `var(--text-meta, #9e9a90)` | `var(--text-meta)` only (token already `#8f8f8f`) |
| Search chip `style={{…}}` | CSS class `.optical-button.is-active` with token borders/bg |

---

### P2 — Loading states: text/spinner where skeletons exist elsewhere

| Surface | Pattern | File |
|---|---|---|
| Settings first load | Plain text “Loading settings…” | `Settings.tsx:456-460` |
| People following | Text “Loading creators…” | `People.tsx:243-246` |
| Stats | Spinner + text | `Stats.tsx:111-115` |
| Library / Home | Card-shaped skeletons | **good** reference |

**Craft fix**

| Before | After |
|---|---|
| Settings string load | Settings-shaped skeleton (section nav pills + field rows) |
| People “Loading creators…” | Grid of photo + name card skeletons |
| Stats spinner plaque | Stat-tile skeleton grid (App already has `app-skeleton-stats-grid`) |

---

### P2 — Hover duration often Medium, not Micro

Craft duration tiers: hover color feedback should be **~100ms**. Many high-frequency controls still use **200ms**:

| Location | Example |
|---|---|
| `src/ui/styles/popup.css:104,237,340,711` | `0.2s` color/bg transitions |
| `src/ui/styles/people.css:28,474,621` | `0.2s` tab/button transitions |
| `src/ui/styles/sidebar.css:63` | nav tab `0.2s` |
| `src/ui/styles/layout.css:292` | plaque-btn `0.2s` |
| `src/ui/styles/settings.css:137,244` | chips/buttons `0.2s` |

Better examples: `app-nav.css:99` (`0.15s`), `settings-nav.css:19` (`0.15s`), popup press `transform 0.1s`.

**Craft fix**

| Before | After |
|---|---|
| `transition: … 0.2s ease` on hover color | `100ms` / `var(--duration-instant)` + `ease-out` for color/bg only |
| Keep 200–250ms | Dialogs, layout enter/exit only |

---

### P2 — Hierarchy / contrast nits (aligned with brand, still craft debt)

| Location | Detail |
|---|---|
| `src/shared/tokens.css:13` | `--fg-base: #ffffff` on `#181818` — brand-accurate; long-read glare risk |
| `src/shared/tokens.css:15,38` | `--fg-subtle` / `--text-control: #666666` at 11px meta — AA risk on small caps |
| `src/ui/styles/layout.css:45-54` (and sanctuary titles) | Italic Inter as “editorial” without a second face (documented as intentional in brand.md) |

Not a rebrand regression — document as accepted or soften body to `#f2f2f2` and lift small meta toward `--text-meta` (`#8f8f8f`).

---

### P3 — Minor interaction / markup nits

| Location | Note |
|---|---|
| `src/ui/App.tsx:350-358` | Primary nav tabs omit `type="button"` (safe outside forms; explore/drawer buttons set it) |
| `src/ui/components/SettingsDiagnosticsPanel.tsx:308-318` | `<tr role="button">` works with keyboard; prefer native button pattern if table semantics become complex |
| Naming debt | Classes like `btn-sanctuary-gold`, `--gold-text` resolve to red — fine functionally, confusing for agents |
| `people.css` | No local reduced-motion block; covered by global blanket |

---

## Surface-by-surface notes

### App shell
- Sticky dual-row nav + drawer a11y (`inert`, focus return, reduced-motion short-circuit) remain strong.
- Nav hover transitions property-specific; primary tabs should add `type="button"`.

### Library / sanctuary archive
- Reference-quality L/E/E: skeletons, error plaque + retry, empty + filtered empty.
- Hardcover spine / media cards use real open buttons.
- Dense sanctuary chrome still carries 9px badges and 32px controls.

### Popup
- Focus-visible set on search, buttons, intent pills, icon buttons.
- Status badge still **9px**; several labels **10px**.
- Property-specific transitions; reduced-motion blocks present.

### Settings
- Labels, section nav, focus rings on inputs/chips/buttons — solid.
- First paint is text-only; no panel skeleton.
- Save / restraint buttons have clear disabled states.

### Onboarding
- Labels + `htmlFor`, `autoComplete="off"` on keys, `role="alert"` errors, ghost + primary CTAs.
- Input focus-visible ring present.

### Discovery / Search / Home
- Empty and error plaques with next actions.
- Search chips still **inline-styled** for active state — highest remaining themeability smell.
- Feed skeletons + reduced-motion card enter.

### People / Recommendations
- Empty plaques with guidance; people loading is text-only.
- Weakest hit-target concentration (32px).
- Recs still ship warm-gray hex fallbacks.

---

## Final checklist (skill non-negotiables)

| Check | Status |
|---|---|
| Keyboard nav / real buttons | **Pass** (primary surfaces) |
| Visible focus rings | **Pass** (prior holes largely closed) |
| No bare `<div onClick>` | **Pass** (diagnostics uses role+keyboard) |
| Hit targets ≥40×40 | **Partial fail** (people/recs/sanctuary 32px) |
| Loading / empty / error | **Partial** (library/home strong; settings/people/stats weak load) |
| `prefers-reduced-motion` | **Pass** (global + local) |
| Contrast AA | **Risk** on `#666` small meta; body white is intentional |
| Tokens not magic numbers | **Partial** (red alpha + warm fallbacks) |
| Dark mode tokens | **Pass** |
| Forms: labels / type / autocomplete | **Pass** on onboarding; settings fields labelled |
| Copy voice | **Pass** — concise, product-specific |
| No `transition: all` | **Pass** |

---

## Recommended fix order

1. **Type + targets pass** — bump 9–10px interactive/meta to ≥11–12px; expand 32px controls to 40px in people, recommendations, sanctuary dense chrome, popup badges.
2. **Token-only colors** — replace hard-coded `rgba(218,41,28,…)` and warm fallbacks; move Search chip active styles into CSS classes.
3. **Skeleton loading** for Settings, People, Stats (mirror library/home patterns).
4. **Hover micro-timing** — 100ms color/bg on chrome; keep 200–280ms for layout/dialog only.
5. **Optional hierarchy softener** — body `#f2f2f2`, small meta ≥ `#8f8f8f`; rename `*-gold` aliases when convenient.

---

## Top 3 findings (executive)

1. **Sub-12px type (esp. 9px badges) + 32px hit targets** in popup, people, recommendations, and sanctuary dense chrome — highest remaining a11y/craft debt.
2. **Magic-number red alpha + Gilded warm fallbacks** (`Search.tsx` inline chips, `recommendations.css` `#5a5248`/`#9e9a90`, discovery-search focus wash) undermine token discipline.
3. **Settings / People / Stats load states** are text or spinner only — lag library/home skeleton quality.

---

## Delta vs 2026-08-04

| Prior P0/P1 | Status |
|---|---|
| Gold `hsla(45…)` leftovers | **Fixed** |
| `brand.md` out of sync | **Fixed** |
| Focus rings missing on inputs / lobby | **Fixed** |
| `transition: all` on chrome | **Fixed** |
| Sub-12px type + 32px targets | **Still open** (this review P1) |

---

_Reviewer: frontend-design-guidelines skill · craft layer credit: philosophy inspired by Emil Kowalski (emilkowal.ski)._
