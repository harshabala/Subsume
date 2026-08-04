# Emil Kowalski / Design-Engineering Polish Review — Subsume

**Date:** 2026-08-04  
**Lens:** [emil-design-eng](https://animations.dev/) — invisible details, motion decisions, press feedback, focus, enter/exit  
**Scope:** Buttons, hover/active, transitions, focus rings, modal enter/exit, popup, nav, CTAs after Ferrari red remap  
**Method:** Read-only audit of tokens + surface CSS/TSX (app shell, popup, sanctuary, content overlays)  
**Score: 6.2 / 10**

---

## Score rationale

| Dimension | /10 | Notes |
| --- | --- | --- |
| Motion tokens & ceremony | 7.5 | Custom ease-out curves, curtain ≤300ms, scale ≥0.96, reduced-motion coverage |
| Button press feedback | 6.0 | Global `scale(0.97)` exists; many CTAs omit transform in their own transitions; scale 0.97/0.98 drift |
| Hover vs active discipline | 5.0 | Hover often doubles as pressed; zero `@media (hover: hover)` |
| Focus rings | 7.0 | Broad `:focus-visible`; a few `outline: none` / gold-tinted leftovers |
| Modal enter/exit | 5.5 | Enter is solid; exit uses `ease-in` and is **slower** than enter |
| Ferrari CTA remap fidelity | 5.0 | Primary tokens correct; CTAs still paint with translucent `--border-hero` + gold `hsla(45…)` ghosts |
| Cheap-feeling transitions | 5.5 | Widespread `transition: all`; content Shadow tokens use weak `ease` |

**Why not higher:** Foundations are better than average (tokens, reduced-motion, many press scales), but the invisible layer is inconsistent after Rosso Corsa — solid red CTAs wash out, gold hue leftovers remain, modal exits feel sluggish, and touch hover is ungated.

**Why not lower:** No `scale(0)` pop-ins; modal enter from 0.96; strong ease-out on core paths; popup focus-visible set is thoughtful; skeleton stagger is short (40ms).

---

## Strengths (do not regress)

1. **Motion token system** — `--ease-out`, `--ease-focus-pull`, durations ≤300ms (`tokens.css` 63–96).
2. **Modal enter scale floor** — `scale(0.96)` + opacity, not `scale(0)` (`sanctuary.css` 614–622).
3. **Global button press** — `button:active { transform: scale(0.97) }` (`global.css` 109–111).
4. **Reduced motion** — global nuke + component-level opt-outs (`global.css` 606–634, sanctuary modal block).
5. **Popup focus-visible cluster** — explicit list for controls (`popup.css` 346–357).

---

## Severity-ranked findings

Severity: **P0** feel-breaking / remap regression · **P1** high polish debt · **P2** medium · **P3** nit

### P0 — CTAs and remap ghosts

#### F01 · Primary CTAs use translucent `--border-hero` instead of solid Rosso Corsa

Ferrari remap defines solid `--primary: #da291c` and `--on-primary-fg: #ffffff`, but major CTAs still paint with `--border-hero` (`rgba(218, 41, 28, 0.45)`). On Cinema Black this reads as a washed, half-committed red — not a primary action.

| Before | After | Why |
| --- | --- | --- |
| `background: var(--border-hero)` on gold CTAs | `background: var(--primary); color: var(--on-primary-fg)` | Solid primary reads as intentional CTA; border token is for outlines |
| Hover → only opacity/border | Hover → `var(--primary-hover)`; active → `var(--primary-pressed)` + `scale(0.97)` | Distinct hover vs press layers |

**Evidence:**

| File:line | Selector / usage |
| --- | --- |
| `src/ui/styles/settings.css:226-239` | `.btn-sanctuary-gold` |
| `src/styles/sanctuary.css:1615-1640` | `.sanctuary-btn-gold` |
| `src/styles/sanctuary.css:1556-1575` | `.sanctuary-detail-btn-inscribe` |
| `src/ui/styles/poetic-sanctuary.css:303-308` | `.save-btn` |
| `src/ui/styles/poetic-sanctuary.css:243-247` | `.intent-selectors button.active` |
| `src/ui/styles/people.css:967` | solid CTA still on `--border-hero` |

---

#### F02 · Gold hue leftovers after Ferrari remap (`hsla(45, …)`)

Hue 45 is amber/gold. These surfaces never remapped and fight Rosso Corsa.

| Before | After | Why |
| --- | --- | --- |
| `hsla(45, 90%, 65%, 0.08)` active chip bg | `var(--primary-soft)` / `var(--chip-active-bg)` | Hue must match primary family |
| `hsla(45, 90%, 65%, 0.12)` focus ring | `0 0 0 2px var(--primary-soft)` | Focus glow should be red voltage, not gold ghost |
| Book plaque `hsla(45, 80%, 55%, 0.28)` border | `var(--accent-gold-border)` / `rgba(218, 41, 28, 0.28)` | Content overlay must share shell palette |

**Evidence:**

| File:line | Issue |
| --- | --- |
| `src/ui/pages/Search.tsx:152` | Inline active filter `background: 'hsla(45, 90%, 65%, 0.08)'` |
| `src/ui/styles/discovery-search.css:35` | Focus shadow gold-tinted |
| `src/ui/styles/discovery-search.css:68` | `.discovery-search-filter.active` gold wash |
| `src/content/bookOverlay.ts:62,81,181,187` | Plaque border / hover / add still gold HSL |

---

#### F03 · Modal / poetic exit uses `ease-in` and is slower than enter

Emil: never `ease-in` for UI — it delays the first frame the user is watching. Exit should feel **faster** than enter (asymmetric release). Tokens comment says exit is “shorter,” but values invert that.

| Before | After | Why |
| --- | --- | --- |
| Exit `300ms ease-in` | Exit `180–220ms` custom ease-out (e.g. `cubic-bezier(0.23, 1, 0.32, 1)`) | Instant departure feedback; no sluggish start |
| Enter `280ms` / exit `300ms` | Enter ≤280ms / exit ≤200ms | Asymmetric: deliberate open, snappy close |
| `--duration-curtain-close: 300ms` | `--duration-curtain-close: 200ms` (or lower) | Token must match intent (“shorter”) |

**Evidence:**

| File:line | Issue |
| --- | --- |
| `src/shared/tokens.css:95-96` | curtain 280ms enter, close 300ms |
| `src/styles/sanctuary.css:578-601` | backdrop + modal exit `ease-in` |
| `src/styles/sanctuary.css:625-634` | `@keyframes sanctuary-modal-exit` |
| `src/ui/styles/poetic-sanctuary.css:18-19,75-77` | poetic exit same pattern |

---

### P1 — Interaction discipline

#### F04 · No `@media (hover: hover) and (pointer: fine)` anywhere

Repo-wide: **zero** hover media queries. Touch devices sticky-hover on cards, nav, filters, plaques (lift, border glow, color flip).

| Before | After | Why |
| --- | --- | --- |
| `.media-card:hover { transform: translateY(-3px) }` ungated | Wrap lift/glow in `@media (hover: hover) and (pointer: fine)` | Tap must not leave card “stuck” elevated |
| Nav / subnav / chips `:hover` always | Same gate for decorative hover | Touch feedback should be `:active` only |

**Evidence (representative):**

| File:line | |
| --- | --- |
| `src/ui/styles/library.css:54-57` | card lift on hover |
| `src/ui/styles/app-nav.css:107-110` | subnav hover |
| `src/ui/styles/sidebar.css:72-74` | nav tab hover |
| `src/ui/styles/popup.css:155-157,240-243` | stat / recent hover |
| `src/content/overlay.ts:138+` | plaque hover |

---

#### F05 · `transition: all` (and unlisted properties) — cheap, over-eager

| Before | After | Why |
| --- | --- | --- |
| `transition: all 0.2s` | `transition: background-color 150ms var(--ease-out), border-color 150ms var(--ease-out), color 150ms var(--ease-out), transform 130ms var(--ease-out)` | Only animate what changes; avoid layout thrash |
| `transition: all 0.2s ease` on nav tabs | Property-scoped + custom ease-out | Tabs feel snappier and intentional |

**Evidence:**

| File:line | |
| --- | --- |
| `src/ui/styles/popup.css:237` | `.popup-recent-item` |
| `src/ui/styles/popup.css:338,673,709` | search, notes, intent pills |
| `src/ui/styles/sidebar.css:63` | `.nav-tab-btn` |
| `src/ui/styles/layout.css:292` | `.plaque-btn` |
| `src/ui/styles/onboarding.css:153` | `.onboarding-cta` |
| `src/ui/styles/discovery-search.css:57` | filter chips |
| `src/ui/styles/people.css:28,469,616` | tabs / cards |
| `src/content/overlay.ts:163` | plaque reveal `transition: all 280ms` |

---

#### F06 · Settings / poetic / inscribe CTAs: incomplete press model

Global `button:active { scale(0.97) }` helps, but local transitions often **omit `transform`**, so press snaps without easing. Several CTAs also lack pressed **color**.

| Before | After | Why |
| --- | --- | --- |
| `.btn-sanctuary-gold` transition without `transform` | Include `transform 130–160ms var(--ease-out)` + `:active { scale(0.97); background: var(--primary-pressed) }` | Press must ease, not jump |
| `.sanctuary-detail-btn-inscribe` no `:active` scale/color | Add active press + pressed bg | Primary modal action must feel alive |
| `.save-btn` / poetic buttons transitions color only | Add transform + pressed | Capture is high-emotion; feedback should match |
| `.onboarding-cta` no `:active` | `scale(0.97)` 160ms ease-out | First-run CTA is rare — delight is allowed |

**Evidence:**

| File:line | |
| --- | --- |
| `src/ui/styles/settings.css:239,265` | gold/restraint transitions (no transform) |
| `src/styles/sanctuary.css:1569` | inscribe transitions bg/opacity only |
| `src/ui/styles/poetic-sanctuary.css:237-300` | intent/rating/actions — no active scale |
| `src/ui/styles/onboarding.css:141-159` | CTA hover only |

---

#### F07 · Hover vs active conflated on plaque primary

| Before | After | Why |
| --- | --- | --- |
| `.plaque-btn.reflect:hover { background: var(--primary-pressed-bg) }` | Hover → `--primary-hover`; `:active` → `--primary-pressed` + scale | Hover ≠ press; users learn depth from the pair |

**Evidence:** `src/ui/styles/layout.css:303-305`

Also: `--primary-hover: #9d2211` is darker than `--primary-pressed: #b01e0a` (`tokens.css` 18–19, 189–190). Pressed should read **deeper** than hover (or equal), never lighter. Reorder: pressed darkest.

---

### P2 — Easing, popup, nav, focus, loading

#### F08 · Content Shadow tokens use weak `ease`, not punchy ease-out

| Before | After | Why |
| --- | --- | --- |
| `--transition-fast: var(--duration-fast) ease` | Match shell: `var(--duration-fast) var(--ease-out)` with shared curve | Hover cards / dock / plaques should share app “punch” |

**Evidence:** `src/shared/shadowTokens.ts:67-68` vs `src/shared/tokens.css:67-68`

---

#### F09 · Popup primary CTA incomplete after remap

| Before | After | Why |
| --- | --- | --- |
| `color: var(--on-primary-fg, #0a0a0a)` | Fallback `#ffffff` only | Near-black on red is pre-Ferrari (gold era) |
| Primary hover only; no `:active` bg | `:active { background: var(--primary-pressed); transform: scale(0.97) }` | Full press ladder |
| `.popup-icon-btn` no transition / active | Add transform + color transitions + active scale | Header chrome should match body buttons |
| `.intent-pill` `transition: all`; no active | Scoped props + `scale(0.98)` on active | Pills are frequent — keep motion short |

**Evidence:** `src/ui/styles/popup.css:775-786,811-831,700-725`

---

#### F10 · Hover-card primary CTA uses near-black ink on red

| Before | After | Why |
| --- | --- | --- |
| `.subsume-btn-primary { color: var(--background) }` (`#181818`) | `color: var(--on-primary-fg)` / `#ffffff` | Ferrari constraint: white on Rosso Corsa |
| Hover lifts with `translateY(-1px)` ungated | Gate hover; keep active scale | Touch sticky + competing transforms with active scale |

**Evidence:** `src/content/hoverCard.tsx:983-993`

---

#### F11 · Generic `.modal-content` enter-only; no exit ceremony

| Before | After | Why |
| --- | --- | --- |
| Enter animation only (`global.css` 254–276) | Exit class + shorter ease-out (mirror sanctuary) | Instant unmount feels broken next to DetailModal |

Sanctuary DetailModal is the good path; legacy `.modal-*` is the cheap path.

---

#### F12 · Nav interactions underspecified

| Before | After | Why |
| --- | --- | --- |
| `.nav-tab-btn { transition: all 0.2s ease }` | Color + underline opacity only, 150ms ease-out | Frequent chrome — reduce motion weight |
| No `:active` on tabs / subnav / drawer items | Subtle `scale(0.98)` or opacity dip | Confirm press without competing with underline |
| Drawer exit same duration as enter (`--duration-slow`) | Exit ~180ms ease-out | Snappy dismiss |

**Evidence:** `src/ui/styles/sidebar.css:52-65,147-177`; `src/ui/styles/app-nav.css:80-115`

---

#### F13 · Focus: people tabs kill outline; discovery focus still gold-tinted

| Before | After | Why |
| --- | --- | --- |
| `.people-tab { outline: none }` with no `:focus-visible` | `outline: 2px solid var(--ring); outline-offset: 2px` on `:focus-visible` | Keyboard users need a ring after Ferrari ring token exists |
| Discovery input focus gold wash | `box-shadow: 0 0 0 2px var(--primary-soft)` | Consistent red focus system |

**Evidence:** `src/ui/styles/people.css:27-28`; `src/ui/styles/discovery-search.css:33-36`

---

#### F14 · Loading / empty — acceptable but uneven

| Area | Verdict | Note |
| --- | --- | --- |
| `.subsume-spinner` 0.8s linear | Good | Fast spin → perceived speed (`layout.css:101-108`) |
| Skeleton pulse + 40ms stagger | Good | Short stagger matches Emil guidance |
| `.popup-loading` italic text only | Cheap | Prefer spinner or skeleton; text-only loading feels unfinished (`popup.css:895-903`) |
| `.popup-empty` italic centered | OK | Functional; could use `EmptyStateProjection` pattern for cohesion |
| `EmptyStateProjection` + optical CTA | Good | Has action path (`EmptyStateProjection.tsx`) |

---

### P3 — Nits

| ID | Finding | File:line | Fix |
| --- | --- | --- | --- |
| F15 | Press scale 0.97 vs 0.98 inconsistency | global vs sanctuary/optical | Standardize **0.97** (Emil default) |
| F16 | Popup view switch always animates 300ms | `popup.css:32-41` | If view changes are frequent, 150–180ms or skip on back-to-back |
| F17 | `.sanctuary-modal-close` no active scale / transform in transition | `sanctuary.css:646-667` | Match other icon buttons |
| F18 | `.sanctuary-acquire-btn` no `:active` | `sanctuary.css:120-141` | Add scale |
| F19 | Intent selector transitions 300ms `ease` | `poetic-sanctuary.css:237-240` | 150–200ms ease-out for chips |
| F20 | `people-tab` uses `transition: all` + no hover color transition clarity | `people.css:18-34` | Scope + active press |

---

## Master Before / After table (actionable)

| Before | After | Why |
| --- | --- | --- |
| CTA `background: var(--border-hero)` (45% red) | `background: var(--primary)` + white ink | Solid Ferrari primary reads as a real CTA |
| Exit `ease-in` 300ms | Exit ease-out ~200ms | Never ease-in; exit faster than enter |
| `transition: all 0.2s` | Explicit properties + `var(--ease-out)` | Avoid accidental layout animation; stronger curve |
| Hover styles without media query | `@media (hover: hover) and (pointer: fine)` | Prevent sticky hover on touch |
| `hsla(45, 90%, 65%, …)` chips/focus | `var(--primary-soft)` / red rgba | Kill gold ghosts post-remap |
| Hover uses `--primary-pressed-bg` | Hover → hover token; active → pressed + scale | Separate layers of feedback |
| `--transition-fast: … ease` in shadowTokens | Match shell ease-out curve | Content UI should feel as punchy as the app |
| `color: var(--on-primary-fg, #0a0a0a)` / `color: var(--background)` on red | White on-primary only | Remap contract: white on Rosso Corsa |
| No transform in CTA transition lists | `transform 130–160ms ease-out` + `scale(0.97)` active | Press feedback must interpolate |
| Modal enter without matching exit (legacy `.modal-content`) | Closing class + short ease-out | Symmetric spatial model |

---

## Priority fix order (if implementing later)

1. **Solid primary CTAs** — replace `--border-hero` fills on gold/inscribe/save with `--primary` ladder (hover/pressed).
2. **Purge gold HSL** — Search.tsx, discovery-search.css, bookOverlay.ts.
3. **Modal exit** — ease-out + shorter close duration token; fix poetic path in lockstep.
4. **Gate hover** — cards, nav, plaques, popup lists.
5. **Scope transitions + press** — kill `transition: all`; ensure transform on CTA transitions; pressed bg on popup primary.
6. **shadowTokens ease-out + hover-card on-primary white**.

---

## Scorecard detail

| Checklist item (Emil) | Status |
| --- | --- |
| No `transition: all` | Fail — many surfaces |
| No `scale(0)` entry | Pass — 0.96/0.98 floors |
| No `ease-in` on UI | Fail — modal/poetic exits |
| Popover origin-aware | N/A / partial (modals correctly centered) |
| Duration ≤300ms UI | Pass (tokens); close duration slightly high |
| Hover media query | Fail — absent |
| Button `:active` scale | Partial — global yes; many custom incomplete |
| Asymmetric enter/exit | Fail — exit slower + ease-in |
| Custom ease-out curves | Partial — shell good; shadow/content/popup often `ease` |
| Reduced motion | Pass — strong global coverage |
| Loading perceived speed | Pass spinner; popup loading weak |

---

## Top 5 findings (executive)

1. **P0 — CTAs still translucent “hero border” red** (`settings.css` gold buttons, `sanctuary-btn-gold`, inscribe, poetic save) instead of solid `--primary`.
2. **P0 — Gold hue leftovers** (`Search.tsx:152`, `discovery-search.css:35,68`, `bookOverlay.ts`) break Ferrari remap.
3. **P0 — Modal exit `ease-in` + longer than enter** (`tokens.css` curtain tokens; `sanctuary.css` / `poetic-sanctuary.css`).
4. **P1 — Zero touch-safe hover gating** — sticky lifts/glows on touch across cards, nav, popup.
5. **P1 — `transition: all` + incomplete press on high-frequency chrome** (popup pills, nav tabs, settings CTAs, plaque buttons).

---

## Deliverable meta

| Field | Value |
| --- | --- |
| Path | `/Users/harshabalakrishnan/Subsume/docs/design-reviews/2026-08-04/03-emil-kowalski.md` |
| Score | **6.2 / 10** |
| Mode | Read-only |
| Reviewer lens | Emil Kowalski design engineering |
