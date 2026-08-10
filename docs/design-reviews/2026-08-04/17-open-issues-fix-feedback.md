# Open-issues fix feedback — 2026-08-04

**Branch:** `fix/design-p0-review-wave`  
**Scope:** Post-P0 + open issues A–H (plan: `docs/superpowers/plans/2026-08-04-design-open-issues.md`)  
**Method:** Read-only code spot-check vs residual P0 anti-patterns + plan acceptance criteria  
**Prior craft mean (multi-skill index):** ≈ **6.5 / 10**  
**Updated craft estimate:** ≈ **7.7 / 10** (+1.2)

---

## Spot-check: residual P0 anti-patterns

| Anti-pattern | Status | Evidence |
|---|---|---|
| `transition: all` / `transition-all` in runtime CSS/TS | **Closed** | Zero matches under `src/` |
| `hsla(45…)` / warm gold chroma in runtime | **Closed** | Zero matches under `src/`; only historical review docs |
| Primary CTAs using `background: var(--border-hero)` | **Closed** | No `background: var(--border-hero)`; primaries use `var(--primary)` (e.g. `.sanctuary-btn-gold`, `.popup-btn-primary`, `.btn-primary`) |
| Modal exit `ease-in` / longer-than-enter drag | **Closed** | Sanctuary + poetic use `--duration-curtain-close` + `--ease-focus-pull` / ease-out; reverse path of enter |
| `outline: none` without `:focus-visible` (or equivalent ring) | **Mostly closed** | App shell + most inputs have paired rings; one residual content-dock gap (below) |

### Residual focus gap (minor)

- **`src/content/dock.ts`** — `.dock-textarea:focus { outline: none; border-color: var(--primary) }` with **no** `:focus-visible` outline ring. Save/toggle buttons in the same file do have focus-visible. Keyboard users get border color only, not a 2px ring consistent with shell inputs.

Other `outline: none` sites checked (sanctuary inputs, poetic, onboarding, people, settings, popup search, global form controls) have matching `:focus-visible` or (range sliders) intentional thumb chrome + popup group focus-visible.

---

## Closed checklist (what was fixed)

### P0 wave

- [x] **Solid CTAs** — Primary fills use solid `--primary` / `#da291c`, not translucent `--border-hero`
- [x] **Gold chroma purge** — No live `hsla(45…)` leftovers in `src/`
- [x] **`transition: all` purge** — Explicit property lists across popup, people, nav, onboarding, discovery, content plaques
- [x] **Hover gates** — `@media (hover: hover) and (pointer: fine)` on high-touch chrome (popup, sidebar, library, overlay)
- [x] **Modal exit** — Curtain Close shorter + ease-out family (not ease-in)
- [x] **Brand docs** — `brand.md` / `PRODUCT.md` aligned to Cinema Black + Rosso Corsa + Inter monofont

### A — A11y focus + stats + SVG aria

- [x] Widespread `:focus-visible` rings with `var(--ring)` / accent-gold→primary
- [x] Stats tabular numerals (`.stats-meta-value` and related)
- [x] Decorative `aria-hidden` usage expanded (stats seps, nav icons, ambient layers, book overlay stars)

### B — Shadow token motion parity

- [x] `SHADOW_TOKEN_CSS` includes `--ease-out`, `--ease-focus-pull`, curtain durations, spacing ladder, radius-none, motion durations

### C — Dock expand/collapse

- [x] `dock-enter` / `dock-enter-active` / `dock-exit` classes + PRM-safe transitions (no hard flash-only swap)

### D — DetailModal dossier accordion

- [x] `.sanctuary-detail-accordion` grid-template-rows 0fr→1fr + opacity ≤220ms

### E — Notice exit + onboarding step + alerts form

- [x] Notice `--exiting` + exit keyframe + PRM
- [x] Onboarding step enter animation
- [x] Alerts form enter/exit panel classes

### F — Token geometry

- [x] `--spacing-3xl` … `--spacing-super`, `--radius-none` in tokens + shadowTokens
- [x] `.btn-primary` uses `border-radius: var(--radius-none, 0)`
- [x] Shadows slightly softer vs harsh 0.55-era depth (md ~0.45; hero still intentional lift)

### G — Primary scarcity on chips

- [x] `.tag-filter-chip.active` / settings chips use `--chip-active-bg` soft fill + primary text/border, not solid red CTA fill
- [x] Search type chips use `rgba(218, 41, 28, 0.08)` soft active (token-adjacent, not gold)

### H — Popup PRM

- [x] Nuclear `@media (prefers-reduced-motion: reduce)` block in `popup.css` (parity with app shell)

---

## Residual / deferred (not closed by this wave)

| Item | Severity | Notes |
|---|---|---|
| **Product activation** | Product | Guided first capture after onboarding; empty archive how-to — still open (index wave 4) |
| **Dual-type decision** | Brand | Runtime is Inter monofont; `font-editorial` alias remains but resolves to Inter. README / cinematic journal spec still mention Newsreader/Outfit in places. Dual-type restore **or** full monofont commitment with display scale still pending |
| **Full DESIGN.md fidelity** | Craft | Spacing ladder shipped; sharp CTAs partial (btn-primary 0 radius; many sanctuary CTAs still 2px). FerrariSans / display ladder / livery-band / full editorial rhythm not shipped. Option A synthesize, not full compliance |
| **Gold class / token names** | Hygiene | `.sanctuary-btn-gold`, `.btn-sanctuary-gold`, `--gold`, `--accent-gold*` aliases correctly resolve to red; names still read “gold era” in grep and onboarding mental model |
| **System light partial** | Polish | White Canvas tokens exist; not every content-script / surface path fully stress-tested under light |
| **Icon set** | Brand | Material Symbols + ad-hoc SVGs; no dedicated sanctuary/Ferrari-adapted icon system |
| **Dock textarea focus-visible** | A11y (minor) | Border-only focus; add ring for parity |
| **Hover media coverage** | Polish | Present on key surfaces; not universal on every lift (acceptable residual) |
| **Identity synthesis depth** | Craft ceiling | North star documented (sanctuary + scarce Rosso); luxury/anti-slop bar still limited by monofont + generic chrome density until type/icon/spacing composition pass |

---

## Craft score update

| Band | Prior (index mean) | After this wave (estimate) |
|---|---:|---:|
| Multi-skill craft mean | **~6.5** | **~7.7** |
| Floor (luxury / anti-slop / DESIGN.md) | ~5.5 | ~6.6–7.0 |
| Ceiling (motion / hygiene / product) | ~7.4–7.6 | ~8.2–8.5 |

**Why +~1.2:** The repeated P0/P1 hygiene failures (translucent CTAs, gold ghosts, `transition: all`, weak focus, asymmetric modal exit, dock snap, missing accordion/notice/form motion, popup PRM) are largely gone. Reviews that docked hardest for those will move up most.

**What still caps ~8+:** Dual identity / type system unfinished, gold nomenclature debt, DESIGN.md geometry only partially applied, product activation empty, icon system generic. Rams-style redesign was never claimed by this wave.

---

## Recommended next 3 steps (only residual that is real)

1. **Close the last a11y nits + name hygiene kickoff** — Add `.dock-textarea:focus-visible` ring; optional rename path for `*-btn-gold` → `*-btn-primary` (aliases can remain one release).  
2. **Identity decision execution** — Either (a) restore editorial dual-type (Newsreader/Outfit or equivalent) under Option A “sanctuary soul,” or (b) commit monofont with a real display scale + letter-spacing system so Inter doesn’t flatten luxury.  
3. **Product activation** — Guided first capture after onboarding + empty archive how-to; this is the remaining product-score lever, not more token churn.

*Do not open another pure token remap wave until 2 is decided.*

---

## Verdict

**Open issues A–H + P0 hygiene: accept.** Residual score is craft/identity/product, not broken P0 paint. Ship confidence high for the review-wave goals; craft ceiling still set by dual-type + activation + DESIGN.md depth.
