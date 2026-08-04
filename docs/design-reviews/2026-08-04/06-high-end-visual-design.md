# High-End Visual Design Audit — Subsume

**Date:** 2026-08-04  
**Scope:** Read-only audit of tokens, type, shadows, cards, hero, gold→red remaps, and `DESIGN.md` vs implementation  
**Ambition bar:** Ferrari cinematic editorial (`DESIGN.md`) + Principal UI / Awwwards-tier agency criteria (high-end-visual-design skill)  
**Surfaces:** App shell, Discovery/Home lobby, sanctuary cards/modals, popup, content Shadow DOM  

---

## Score

### **5.5 / 10**

**Read:** Competent dark media product with a partial Ferrari palette swap — not yet a luxury cinematic editorial surface, and not agency-tier haptic craft.

Core `:root` colors (`#181818` canvas, Rosso Corsa `#da291c`, white ink, `#969696` body) land correctly. The gap is structural: type, spacing ladder, hero language, shadow philosophy, iconography, and residual Gilded Night (gold) hardcodes still read as “premium template + recolor,” not Ferrari marketing editorial or a $150k agency build.

---

## Executive summary

| Axis | DESIGN.md (Ferrari) | Implementation | Luxury bar |
|------|---------------------|----------------|------------|
| Canvas / primary | `#181818` / `#da291c` scarce | Tokens mostly remapped; red used widely via aliases | Partial pass |
| Type family | FerrariSans, display **500** | **Inter** everywhere (plan-allowed; skill-banned) | Fail luxury |
| Type scale | 80 / 56 / 36 / 26… | Ad-hoc 28px italic, 2.75rem lobby, 11–14px UI | Fail |
| Spacing | 8px ladder → 128px `super` | 4 / 8 / **12** / **20** / 24 / 32 only | Fail |
| Corners | Sharp `0` on CTAs/cards | 2–8px radii; hero frame **6px** | Partial fail |
| Shadows | Hairlines + photo depth; **no shadow tiers** | Full dark shadow ladder 0.55–0.8 | Fail |
| Hero | Full-bleed cinematic photo | Max **380px** poster frame + side copy | Fail |
| Gold→red | Single Rosso voltage | Tokens remapped; **hsla(45…)** gold leftovers | Fail residual |
| Icons | Precision light line | **Material Symbols Outlined** | Fail skill |
| Motion | Editorial / heavy ease | Mixed: good cubics + `ease` / `ease-in-out` | Partial |

---

## Severity legend

| Level | Meaning |
|-------|---------|
| **P0** | Blocks luxury read; cheap AI / template signal |
| **P1** | Clear miss vs DESIGN.md or agency craft |
| **P2** | Polish / consistency debt |
| **P3** | Nice-to-have alignment |

---

## Top findings (priority)

### 1. [P0] Banned / commodity type stack — Inter as “editorial”

**Where:** `src/shared/tokens.css` (`--font-editorial`, `--font-ui`), `src/shared/shadowTokens.ts`, `src/ui/index.html` (Google Fonts Inter), mirrored in plan `docs/superpowers/plans/2026-08-04-ferrari-design-system.md`.

```43:46:src/shared/tokens.css
  --font-editorial: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-sans: var(--font-ui);
  --font-mono: 'JetBrains Mono', ui-monospace, 'Courier New', monospace;
```

**Why it fails the bar**

- High-end skill: **Inter is an absolute-zero banned font** (generic AI default).
- `DESIGN.md`: single family **FerrariSans**, display weight **500**, never bombastic bold display.
- Implementation intentionally substitutes Inter (legal/proprietary constraint in the Ferrari plan) but still labels the same stack as “editorial,” so display and UI collapse into one SaaS grotesk.
- Page titles use italic Inter at ~28px (`layout.css` `.page-title`); lobby heading ~2.75rem — no `display-mega` (80px) / `display-xl` (56px) ladder from DESIGN.md.

**Luxury fix direction:** Licensed or open high-end single sans (or true editorial pair) with explicit display/body roles; wire type tokens to sizes/weights/tracking from DESIGN.md (even if family ≠ FerrariSans).

---

### 2. [P0] Gold→red remaps incomplete — Gilded Night still bleeds through

**Token layer (good):** `--primary: #da291c`; `--gold` / `--accent-gold` alias to primary.

**Surface layer (bad):** Hardcoded **hue-45 gold** and warm fallbacks still paint focus rings, filters, overlays, and ceremony lines:

| Location | Residue |
|----------|---------|
| `src/ui/styles/discovery-search.css` | Focus ring `hsla(45, 90%, 65%, 0.12)`; active filter bg `hsla(45, 90%, 65%, 0.08)` |
| `src/ui/pages/Search.tsx` | Active type chip `hsla(45, 90%, 65%, 0.08)` |
| `src/content/bookOverlay.ts` | Borders `hsla(45, 80%, 55%, …)` / `hsla(45, 85%, 60%, …)` |
| `src/ui/styles/settings-nav.css` | Multiple `hsla(45, 80%, 62%, …)` fallbacks |
| `src/ui/styles/emotional-components.css` | Ceremony gradient + conic accents still gold-hue defaults |
| `src/ui/styles/discovery-layout.css` | Ambient orb fallback `hsla(45, 60%, 50%, 0.06)`; warm gray plaque fallbacks `hsl(30…)` |

Class/token **naming** still says gold everywhere (`.sanctuary-btn-gold`, `--gold-text`, `--badge-on-gold-fg`) — acceptable as aliases per plan, but combined with hue-45 hardcodes the product still reads half-gilded, half-rosso.

**Severity:** P0 for brand voltage purity. Single accent is the Ferrari signature; mixed gold/red is the opposite of scarce Rosso Corsa.

---

### 3. [P1] Spacing system is not the Ferrari 8px editorial ladder

**DESIGN.md:**

`xxxs` 4 → `xxs` 8 → `xs` 16 → `sm` 24 → `md` 32 → `lg` 48 → `xl` 64 → `xxl` 96 → `super` 128

**Implementation** (`tokens.css`):

```49:54:src/shared/tokens.css
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 20px;
  --spacing-xl: 24px;
  --spacing-2xl: 32px;
```

**Issues**

- Breaks pure 8px rhythm (**12**, **20**).
- Caps at **32px** — no 48 / 64 / 96 / 128 for macro editorial air.
- Discovery invents parallel clamps (`--discovery-gap-section: clamp(28px, 4vw, 48px)`, loose up to 72px) rather than named super tokens.
- Page shell padding is modest (`page-container` → `xl` + 32px gutter); skill expects section breathing on the order of `py-24`–`py-40`. App chrome cannot match marketing-site super spacing, but the **token vocabulary** still doesn’t encode luxury scale.

---

### 4. [P1] Shadows contradict Ferrari (“no drop shadow tiers”) and skill (“no harsh dark shadows”)

**DESIGN.md Key Characteristics:** hairlines + photographic depth — **no drop shadow tiers**.

**Implementation:**

```72:76:src/shared/tokens.css
  --shadow-sm: 0 1px 3px hsla(240, 18%, 4%, 0.6);
  --shadow-md: 0 4px 16px hsla(240, 18%, 4%, 0.55);
  --shadow-lg: 0 12px 40px hsla(240, 18%, 4%, 0.6);
  --shadow-hero: 0 20px 60px hsla(240, 18%, 4%, 0.8);
```

Plus poster/nav/drawer/plaque/card-hover variants at similar darkness.

**On `#181818` canvas, 0.55–0.8 black-ish shadows crush rather than lift** — muddy “floating SaaS card” depth, not machined hairline or photo-led hierarchy. Cards also combine `1px solid` borders + hover lift + shadow (`sanctuary-media-card`, `media-card`) — triple elevation language.

**Skill:** bans harsh dark drop shadows (`shadow-md`, heavy `rgba(0,0,0,…)`). Soft ambient multi-stop shadows (or none) are the agency pattern; Ferrari specifically prefers near-zero shadow reliance.

---

### 5. [P1] Hero is a poster widget, not full-bleed cinematic editorial

**DESIGN.md signature:** full-bleed cinematic hero photograph filling the viewport top; headlines float on photo or tight band beneath; zero chrome competing.

**Implementation** (`Home.tsx` + `layout.css` / `discovery-layout.css`):

- Split lobby grid: poster column (`max-width: 380px`, `aspect-ratio: 2/3`) + info column.
- Frame: `border-radius: 6px`, `1px` card border, `--shadow-hero-poster`.
- Plaque overlay on poster (rating, title, quote) — catalogue-card grammar, not marquee cinema.
- Sticky full-width nav above competes for chrome (skill bans edge-glued sticky nav as cheap default).

This is a **strong media-app lobby**, not Ferrari’s full-bleed photographic opening. Editorial ambition exists in voice (“Act I”, italic headings, grain) but spatial signature is wrong.

---

## Additional findings

### 6. [P1] Cards: flat single-shell, generic hover, blur on scrollables

| Pattern | Observed | Luxury expectation |
|---------|----------|--------------------|
| Structure | Single shell: bg + 1px border + 4px radius | Double-bezel (outer tray + inner core + inset highlight) **or** Ferrari sharp 0 radius photo plates |
| Radius | 4px sanctuary; `radius-lg` 8px library; hero 6px | DESIGN: `rounded.none` on cards/CTAs |
| Hover | `translateY(-3px)` + shadow + border→hero | Restraint: hairline/brightness; avoid floaty SaaS lift |
| Blur | `backdrop-filter: blur(16px)` on `.sanctuary-media-card` | Skill: blur only on fixed/sticky chrome — not grid cards |

```309:327:src/styles/sanctuary.css
.sanctuary-media-card {
  background: var(--bg-plaque);
  border: 1px solid var(--border-restraint);
  border-radius: 4px;
  ...
  backdrop-filter: blur(16px);
  ...
}
.sanctuary-media-card:hover {
  border-color: var(--border-hero);
  transform: translateY(-3px);
  box-shadow: var(--shadow-card-hover);
}
```

Primary buttons: small radius, no uppercase+tracking system from DESIGN button token on global `.btn-primary` (sanctuary gold CTA is closer: 11px uppercase, 0.15em tracking — good direction, still named “gold”).

---

### 7. [P1] Material Symbols + emoji-scale empty icons

- `index.html` loads **Material Symbols Outlined** (skill bans Material / thick generic icon sets).
- Used in app nav, drawer, popup (`App.tsx`, `popup.tsx`).
- Empty states use large icon font sizes (layout empty-state 40px) — template energy.

Luxury bar wants ultra-light custom or Phosphor/Remix **Light** line icons, optically consistent stroke.

---

### 8. [P2] Motion: promising tokens, uneven application

**Strengths**

- `--ease-focus-pull`, `--ease-soft-settle` (`linear()`), curtain durations ≤300ms, card enter with stagger.
- Poetic/sanctuary modal enter uses scale + translate (GPU-safe).

**Weaknesses**

- Skill bans default `ease-in-out` / `linear` for UI transitions — still present on skeletons (`ease-in-out`), spinner (`linear` — acceptable for infinite rotate), many `transition: … ease` / bare `0.15s`.
- Subnav: `transition: color 0.15s, background 0.15s` without custom cubic.
- No viewport scroll choreography (heavy fade-up) at section scale — first-paint stagger only on some grids.
- Cap at 300ms is product-wiki discipline; luxury marketing often uses longer settles — acceptable tradeoff for extension UX, but then micro-ease quality must be flawless.

---

### 9. [P2] DESIGN.md type roles not tokenized

Missing as CSS/design tokens (names or utilities):

- `display-mega` / `xl` / `lg` / `md`
- `caption-uppercase` (11px / 600 / 1.1px)
- `button` (14px / 700 / 1.4px / uppercase)
- `nav-link` (13px / 600 / 0.65px / uppercase)
- `number-display` (80px / 700)

Fragments appear ad hoc (kickers 10px / 0.2em; subnav 11px; CTAs mixed). Hierarchy is **tasteful but not systematic** — hard to keep luxury consistency across pages.

---

### 10. [P2] Multi-accent status rainbow vs scarce Rosso

Tokens still ship full status spectrum (blue to-watch, amber watching, green watched, red abandoned, rating yellow). Fine for UX semantics, but combined with platform chips, AI digest badges, and atmosphere presets (sunset/emerald/french **recolor primary**), Rosso ceases to be the single brand voltage. Atmospheres are intentional product features; they dilute Ferrari-lock when default dark should feel singular.

---

### 11. [P2] Radius philosophy conflict

| Source | Radii |
|--------|--------|
| DESIGN.md | 0 / 2 / 4 / 6 / 8 / 12 / full — CTAs & cards **none** |
| tokens | sm 2, md 4, lg 8; shadcn `--radius: 0.5rem` (8px) |
| Hero | **6px** (between tokens) |
| Global buttons | `radius-sm` (2px) not 0 |

Not chaotic, but not the sharp automotive cut of the brief.

---

### 12. [P3] Strengths worth protecting

- **Cinema Black + Rosso core tokens** correctly set in `tokens.css` / `shadowTokens.ts` (dark default).
- **Film grain** fixed overlay pattern (`FilmGrain.tsx`) with reduced-motion respect — editorial texture, skill-aligned if kept fixed + non-interactive.
- **Onboarding** restraint: monogram tracking, thin rules, hairline pillars, outline CTA — closest to luxury editorial in the app.
- **Copy / voice** (lobby “picture palace”, Act labels, italic titles) supports cinematic brand even when layout doesn’t.
- **Alias strategy** (`--gold` → primary) was correct for safe remaps; finish the hardcode sweep.
- Light theme **White Canvas** mapping exists with coherent hairlines — rare for dark-first products.

---

## DESIGN.md vs implementation checklist

| Spec item | Status |
|-----------|--------|
| Canvas `#181818` | ✅ |
| Primary `#da291c` / hover `#9d2211` / active `#b01e0a` | ✅ tokens |
| Body `#969696`, muted `#666666` | ✅ |
| Surface elevated `#303030` | ⚠️ cards often `#242424` elevated; shadcn card `#303030` mixed |
| FerrariSans / single family editorial | ❌ Inter (plan substitute) |
| Display 500, not bold display | ⚠️ mixed 400 italic / 600–700 UI |
| CTA uppercase + ~1.4px tracking | ⚠️ sanctuary yes; global btn partial |
| Sharp 0 radius CTAs/cards | ❌ |
| Full-bleed cinematic hero | ❌ |
| 8px spacing ladder through 128 | ❌ |
| No drop shadow tiers | ❌ |
| Scarce primary use | ⚠️ primary + gold aliases + status colors + atmospheres |
| White-canvas only in editorial bands | ⚠️ full light theme mode (product choice) |

---

## Cheap AI / template defaults flagged

| Default | Present? |
|---------|----------|
| Inter / system grotesk as “premium” | **Yes** |
| Material icon font | **Yes** |
| 1px gray borders + soft shadow + slight lift hover | **Yes** |
| Sticky full-bleed top nav | **Yes** |
| Symmetrical card auto-fill grids without macro air | **Yes** (library/discovery) |
| `ease-in-out` skeleton pulses | **Yes** |
| Purple/cool mesh + gold warm orb ambient | **Partial** (discovery ambient layer) |
| Double-bezel / island CTAs / button-in-button | **No** |
| Custom cubic everywhere | **Partial** |
| True display type scale | **No** |

---

## Score breakdown (subscores)

| Dimension | /10 | Notes |
|-----------|-----|-------|
| Color / brand voltage | 6.5 | Core Ferrari hex good; gold leftovers + rainbow status |
| Typography | 4.0 | Inter + no mega scale + italic as proxy for luxury |
| Spacing / rhythm | 4.5 | Incomplete ladder; discovery clamps help but ad hoc |
| Shadows / depth | 4.0 | Harsh dark tiers vs hairline/photo doctrine |
| Cards / components | 5.0 | Coherent system, generic elevation grammar |
| Hero / cinematic signature | 4.0 | Poster frame lobby ≠ full-bleed editorial |
| Motion | 6.0 | Best tokens in the system; uneven application |
| Icons / chrome | 3.5 | Material Symbols + sticky nav |
| Gold→red completeness | 5.5 | Token success, surface residue |
| Overall craft consistency | 5.5 | — |

**Weighted overall: 5.5 / 10**

---

## Recommended remediation order (not implementing — audit only)

1. **P0 hardcode sweep:** replace every `hsla(45…)` / gold-hex fallback with Rosso rgba / `var(--primary-soft)` / `var(--border-hero)` (search, book overlay, settings-nav, emotional ceremony, Search.tsx).
2. **P0 type decision:** either commit to a premium open family (not Inter) + full DESIGN scale tokens, or honestly document Inter as temporary and still implement **size/weight/tracking tokens** from DESIGN.md.
3. **P1 spacing tokens:** rename/realign to 4–8–16–24–32–48–64–96–128; delete 12/20 or map them as exceptions.
4. **P1 shadow doctrine:** drop card hover shadows on dark; rely on hairline + border-hero + photo; soft ambient only for modals if needed.
5. **P1 hero:** full-bleed poster/backdrop band on Discovery (even if content is user library art), sharp edges, type over image — keep plaque as optional secondary, not the hero itself.
6. **P1 icons:** Material → light line set; optical size 18–20 in nav.
7. **P2 rename** `.sanctuary-btn-gold` → primary CTA when safe; retire gold vocabulary from comments/keyframes (`save-ceremony-gold-line`).

---

## Files reviewed (primary)

- `/Users/harshabalakrishnan/Subsume/DESIGN.md`
- `/Users/harshabalakrishnan/Subsume/src/shared/tokens.css`
- `/Users/harshabalakrishnan/Subsume/src/shared/shadowTokens.ts`
- `/Users/harshabalakrishnan/Subsume/src/shared/theme.ts`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/global.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/layout.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/app-nav.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/discovery-layout.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/discovery-search.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/library.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/poetic-sanctuary.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/onboarding.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/emotional-components.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/settings-nav.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/sidebar.css`
- `/Users/harshabalakrishnan/Subsume/src/styles/sanctuary.css`
- `/Users/harshabalakrishnan/Subsume/src/content/bookOverlay.ts`
- `/Users/harshabalakrishnan/Subsume/src/ui/pages/Home.tsx`
- `/Users/harshabalakrishnan/Subsume/src/ui/index.html`
- `/Users/harshabalakrishnan/Subsume/docs/superpowers/plans/2026-08-04-ferrari-design-system.md`

---

## Audit metadata

- **Mode:** Read-only  
- **Skill:** `high-end-visual-design` (applied as critique matrix, not generation)  
- **Ambition:** Ferrari cinematic editorial  
- **Deliverable:** this file  
