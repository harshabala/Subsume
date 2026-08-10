# High-End Visual Design Audit — Subsume

**Date:** 2026-08-10  
**Repo:** `/Users/harshabalakrishnan/Subsume` @ `a5471b5`  
**Skill bar:** Principal UI / Awwwards-tier (`high-end-visual-design`) — fonts, spacing, shadows, cards, animations; **block generic AI defaults**  
**Secondary bar:** Ferrari cinematic editorial (`DESIGN.md`)  
**Surfaces:** App shell, Discovery lobby, sanctuary cards/modals, library grid, popup, content Shadow DOM, onboarding  

**Delta vs 2026-08-04 audit:** Hue-45 gold hardcodes are **gone** (search/book overlay/settings ceremony). Spacing tokens now include `3xl`–`super` (48–128). Shadow opacities slightly softened. Structural luxury failures (Inter, Material icons, SaaS card elevation, poster-widget hero, sticky full-bleed nav, bare `ease` / `ease-in-out`) remain.

---

## Score

### **6.0 / 10**

**Read:** Strong dark media product with a real Ferrari palette and pockets of editorial restraint (onboarding, grain, sanctuary CTAs). Still reads as **premium SaaS template + recolor**, not a $150k agency build or full Ferrari marketing surface.

Absolute Zero skill fails alone prevent a higher score: **Inter** as “editorial,” **Material Symbols**, **1px border + dark drop shadow + `translateY` hover** card grammar, **edge-glued sticky nav**, and widespread **default `ease` / `ease-in-out`**.

---

## Executive summary

| Axis | Luxury / skill bar | Implementation | Verdict |
|------|--------------------|----------------|---------|
| Fonts | Banned: Inter. Want Geist / Clash / PP Editorial / etc. | **Inter** for both “editorial” and UI | **Fail** |
| Icons | Ultra-light line (Phosphor Light / Remix Line) | **Material Symbols Outlined** | **Fail** |
| Borders | No generic 1px gray border as sole craft | Hairline white/8% everywhere | **Partial** (token good; overused alone) |
| Shadows | No harsh dark `shadow-md` tiers | Full ladder 0.45–0.7 + poster/plaque/card-hover | **Fail** |
| Cards | Double-bezel nested hardware **or** sharp photo plates | Single shell + blur + lift hover | **Fail** |
| Spacing | Macro air (`py-24`–`py-40` sections); clean ladder | Super tokens exist; **12 / 20** break 8px; page shell modest | **Partial** |
| Nav | Floating glass island, not edge sticky | Sticky full-bleed shell | **Fail skill** |
| Motion | Custom cubics only; heavy entry choreography | Good tokens; many bare `ease` / `ease-in-out` | **Partial** |
| Color | Scarce Rosso on Cinema Black | Core hex correct; gold **aliases** OK; status rainbow remains | **Pass core / partial brand** |
| Hero | Full-bleed cinematic photo | 380px poster frame + plaque | **Fail DESIGN** |

---

## Severity legend

| Level | Meaning |
|-------|---------|
| **P0** | Absolute Zero / cheap AI signal |
| **P1** | Clear miss vs agency craft or DESIGN.md |
| **P2** | Polish / consistency debt |
| **P3** | Protect / nice-to-have |

---

## What looks **cheap** vs **expensive**

### Cheap (template / AI-default energy)

| Signal | Where |
|--------|--------|
| Inter as dual “editorial + UI” stack | `tokens.css:43-46`, `index.html:10`, `shadowTokens.ts:6-7,47-48` |
| Material Symbols icon font | `index.html:11`, `popup.html`, `sidebar.css:5` |
| Card = bg + 1px border + radius + hover lift + dark shadow | `sanctuary.css:314-333`, `library.css:42-59` |
| `backdrop-filter` on grid/scroll cards | `sanctuary.css:325` (skill: blur only fixed/sticky) |
| Sticky full-width top nav glued to edge | `app-nav.css:3-13` |
| Skeleton `ease-in-out`; many `transition: … ease` | `layout.css:121`, popup/settings/discovery |
| Auto-fill equal card grids, modest gaps | `library.css:3-7`, sanctuary grids |
| Hero as catalogue poster widget (6px radius, box-shadow) | `layout.css:193-202` |
| Empty-state 40px icon + 700 weight title | `layout.css:77-87` |
| Film-grain at `z-index: 9999` | `emotional-components.css:452-458` (skill: systemic z layers) |
| Class names still say “gold” for primary CTAs | `.sanctuary-btn-gold`, `btn-sanctuary-gold` |

### Expensive (protect / expand)

| Signal | Where |
|--------|--------|
| Cinema Black `#181818` + scarce Rosso `#da291c` tokens | `tokens.css:8-19` |
| Hairline borders `hsla(0,0%,100%,0.08)` not pure gray hex on dark | `tokens.css:20-21` |
| Custom motion tokens (`--ease-out`, `--ease-focus-pull`, soft-settle `linear()`) | `tokens.css:72-102` |
| Fixed film grain, pointer-events none, reduced-motion off | `FilmGrain.tsx`, `emotional-components.css:452-476` |
| Onboarding monogram tracking, thin rules, light italic headline | `onboarding.css:62-99` |
| Sanctuary primary CTA: uppercase, tracking, sharp 2px, active scale | `sanctuary.css:1665-1691` |
| First-paint stagger on library/discovery (transform + opacity) | `library.css:11-26` |
| Poetic modal curtain enter/exit on GPU props | `poetic-sanctuary.css` |
| Light theme White Canvas mapped coherently | `tokens.css` `[data-theme="light"]` |
| Gold→red token aliases complete; **no remaining `hsla(45…)`** | repo-wide grep clean |

---

## Top findings (priority)

### 1. [P0] Banned font stack — Inter as editorial

```43:46:src/shared/tokens.css
  --font-editorial: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-sans: var(--font-ui);
  --font-mono: 'JetBrains Mono', ui-monospace, 'Courier New', monospace;
```

Also loaded in:

- `src/ui/index.html:10`
- `src/ui/popup.html` (Inter + Material)
- `src/shared/shadowTokens.ts:6-7,47-48,110` (`injectShadowFonts`)

**Why cheap**

- Skill Absolute Zero: **Inter is banned** (generic AI default).
- `DESIGN.md` wants a single distinctive family (FerrariSans) with display **500** and a full size ladder (80 / 56 / 36 / 26…).
- Labeling the same Inter stack `--font-editorial` is cosmetic luxury; display and UI collapse into one SaaS grotesk.
- Lobby heading is italic Inter at `2.75rem` (`layout.css:333-340`); page titles italic `28px` (`layout.css:45-54`); sanctuary `34px` — no mega display system.

**Luxury fix:** Ship a premium open family (e.g. **Geist**, **Plus Jakarta Sans**, or editorial serif+grotesk pair — not Inter/Roboto/Arial). Tokenize DESIGN roles: `display-mega/xl/lg`, `caption-uppercase`, `button`, `nav-link`, `number-display`. Keep Inter out of product CSS even as temporary “legal substitute.”

---

### 2. [P0] Card elevation grammar = SaaS float (shadows + lift + blur)

```314:333:src/styles/sanctuary.css
.sanctuary-media-card {
  background: var(--bg-plaque);
  border: 1px solid var(--border-restraint);
  border-radius: 4px;
  ...
  transition:
    transform 0.22s var(--ease-focus-pull),
    box-shadow 0.22s ease,
    border-color 0.22s ease;
  backdrop-filter: blur(16px);
  cursor: pointer;
}
.sanctuary-media-card:hover {
  border-color: var(--border-hero);
  transform: translateY(-3px);
  box-shadow: var(--shadow-card-hover);
}
```

Mirrored in library:

```42:59:src/ui/styles/library.css
.media-card {
  ...
  border-radius: var(--radius-lg);
  ...
}
.media-card:hover {
  border-color: var(--color-accent-border);
  transform: translateY(-3px);
  box-shadow: var(--shadow-card-hover);
}
```

Token shadows (still “dark drop shadow tiers”):

```77:81:src/shared/tokens.css
  --shadow-sm: 0 1px 3px hsla(240, 18%, 4%, 0.5);
  --shadow-md: 0 4px 16px hsla(240, 18%, 4%, 0.45);
  --shadow-lg: 0 12px 40px hsla(240, 18%, 4%, 0.5);
  --shadow-hero: 0 20px 60px hsla(240, 18%, 4%, 0.7);
```

**Why cheap**

- Skill bans harsh dark drop shadows and generic 1px border as the only craft language.
- On `#181818`, 0.45–0.7 black-ish shadows **muddy** rather than lift — floating catalogue tiles, not machined hardware.
- Triple elevation: border + hover translateY + shadow. No **double-bezel** (outer tray `p-1.5` + hairline + inner core + inset highlight).
- `backdrop-blur` on scrolling grid cards violates performance guardrail (blur only fixed/sticky).
- DESIGN.md: hairlines + photographic depth, **no shadow tiers**; cards/CTAs prefer sharp `0` radius.

**Luxury fix:**

1. Grid cards: hairline only; hover = border-hero / brightness, **no** `translateY`, **no** `box-shadow`, **no** blur.  
2. Optional double-bezel for featured surfaces only.  
3. Soft ambient multi-stop shadows reserved for modals/popovers if needed.  
4. Align radius: Ferrari sharp plates (`0`–`2px`) **or** intentional large squircle bezels — not mixed 4 / 6 / 8.

---

### 3. [P0] Icons + chrome = Material + edge-sticky nav

```8:11:src/ui/index.html
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />
```

```3:13:src/ui/styles/app-nav.css
.app-nav-shell {
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  ...
  border-bottom: 1px solid var(--border-restraint, var(--border));
}
```

```80:99:src/ui/styles/app-nav.css
.app-subnav-link {
  ...
  border-radius: 4px;
  ...
  transition: color 0.15s, background 0.15s;
}
```

**Why cheap**

- Skill bans Material / thick generic icon fonts; wants ultra-light stroke sets.
- Skill bans edge-to-edge sticky nav; wants **floating glass island** (`mt-6`, `w-max`, `rounded-full`) with staggered menu morph on expand.
- Subnav transitions omit custom cubic entirely (`0.15s` bare).

**Luxury fix:** Phosphor Light / Remix Line (or custom SVG stroke set) at 18–20px optical; nav as detached island or at minimum inset glass pill with hairline — not full-bleed sticky slab.

---

### 4. [P1] Hero is a poster widget, not full-bleed cinematic editorial

```193:225:src/ui/styles/layout.css
.hero-poster-frame {
  ...
  max-width: 380px;
  aspect-ratio: 2 / 3;
  border-radius: 6px;
  ...
  border: 1px solid var(--card-border);
  box-shadow: var(--shadow-hero-poster);
}
.catalogue-plaque-card {
  ...
  backdrop-filter: blur(25px);
  border: 1px solid var(--accent-gold-border);
  ...
  box-shadow: var(--shadow-plaque);
}
```

```333:340:src/ui/styles/layout.css
.lobby-heading {
  font-family: var(--font-editorial);
  font-size: 2.75rem;
  font-style: italic;
  font-weight: 400;
  ...
}
```

**Why it fails**

- DESIGN signature: full-bleed cinematic photograph filling the viewport top; type on photo or tight band beneath; zero competing chrome.
- Implementation: split lobby grid + framed poster + floating plaque — **catalogue app**, not marquee cinema.
- Sticky nav competes above; 6px radius + dual shadows read mid-tier product, not automotive editorial.

---

### 5. [P1] Spacing ladder incomplete vs 8px editorial rhythm

**DESIGN.md:** 4 → 8 → 16 → 24 → 32 → 48 → 64 → 96 → 128  

**Implementation** (`tokens.css:49-61`):

| Token | Value | Issue |
|-------|-------|--------|
| `--spacing-md` | **12px** | Breaks 8px grid |
| `--spacing-lg` | **20px** | Breaks 8px grid |
| `--spacing-3xl` … `super` | 48–128 | Good vocabulary; underused in shells |
| page-container | `xl` + 32px gutter | Modest macro air |
| discovery gaps | clamp 28–72 | Parallel ad-hoc scale |

Skill expects heavy section breathing. App chrome cannot match marketing `py-40`, but token **names and usage** should encode luxury scale — and kill 12/20 as first-class steps (or mark them as half-steps only).

---

### 6. [P1] Motion: good tokens, uneven / banned easings

**Strengths**

- `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-focus-pull`, soft-settle `linear()`, curtain ≤300ms.
- Library/discovery enter: `opacity` + `translateY` + focus-pull (GPU-safe).
- Modal poetic enter/exit choreography.
- `active:scale` on several CTAs (~0.97–0.98).

**Weaknesses**

| Pattern | Example |
|---------|---------|
| `--transition-base: … ease` | `tokens.css:74` — default path is non-custom |
| Skeleton `ease-in-out` | `layout.css:121` |
| Bare `ease` / no cubic | `popup.css`, `settings.css`, `discovery-layout.css`, `poetic-sanctuary.css:165` |
| Subnav `0.15s` without ease family | `app-nav.css:99` |
| No section-scale scroll reveal | First-paint stagger only on some grids |
| `box-shadow` animated on hover | Prefer opacity/border/transform only for haptic feel |

Skill: never `linear` or `ease-in-out` for UI transitions (spinner infinite rotate is an acceptable exception). Prefer `duration-700` heavy settles for marketing moments; product wiki ≤300ms is fine if **every** micro-ease is custom.

---

### 7. [P2] Type roles not tokenized; gold naming debt

Missing as CSS utilities/tokens from DESIGN.md: `display-mega`, `display-xl`, `caption-uppercase` (11px / 600 / 1.1px tracking), `button` (14px / 700 / 1.4px / uppercase), `nav-link`, `number-display`.

Fragments exist ad hoc (kickers 10–11px / 0.18–0.25em; sanctuary gold CTA close). Hierarchy is **tasteful but not systematic**.

**Gold naming:** tokens alias correctly (`--gold` → primary). Class names `.sanctuary-btn-gold`, `btn-sanctuary-gold` still broadcast old Gilded Night brand. Rename when safe.

---

### 8. [P2] Multi-accent status rainbow + atmospheres dilute Rosso

Status tokens (blue / amber / green / red) + platform chips + AI digest badges + atmosphere presets that **recolor primary** (sunset / emerald / french) mean Rosso is not a single scarce voltage on default dark. Acceptable for UX semantics if default atmosphere keeps pure Ferrari lock.

---

### 9. [P2] Global `.card` / `.btn-primary` inconsistency

```79:124:src/ui/styles/global.css
.card {
  ...
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  ...
}
.btn-primary {
  ...
  font-weight: 600;
  ...
  border-radius: var(--radius-none, 0);
}
```

Primary button radius **0** is Ferrari-aligned; weight 600 and no uppercase/tracking lag DESIGN button token. Sanctuary gold CTA is closer to luxury. Two button languages = craft inconsistency.

---

### 10. [P3] Strengths to protect

1. **Core palette** Cinema Black + Rosso + body `#969696` / muted `#666666`.  
2. **Film grain** fixed overlay + reduced motion (editorial texture done right).  
3. **Onboarding** closest surface to agency editorial.  
4. **Hue-45 gold hardcode sweep complete** (major fix since 2026-08-04).  
5. **Super spacing tokens** exist for macro layout when adopted.  
6. **Motion token vocabulary** is above average for an extension product.  
7. **Copy voice** (Act labels, italic lobby, picture-palace language) sells cinema even when layout doesn’t.

---

## Skill Absolute Zero checklist

| Banned pattern | Present? |
|----------------|----------|
| Inter / Roboto / Arial / Open Sans / Helvetica | **Yes — Inter** |
| Material / FontAwesome / thick Lucide | **Yes — Material Symbols** |
| Generic 1px gray border as craft | **Yes** (hairline variant everywhere) |
| Harsh dark drop shadows | **Yes** |
| Edge sticky full-bleed nav | **Yes** |
| Symmetrical boring equal grids without macro air | **Yes** (library/discovery) |
| `linear` / `ease-in-out` UI motion | **Yes** (skeleton + many bare ease) |
| Double-bezel cards | **No** |
| Island / button-in-button CTAs | **No** |
| Custom cubic everywhere | **Partial** |
| Scroll entry heavy fade-up | **Minimal** (light first-paint only) |

---

## Score breakdown (subscores)

| Dimension | /10 | Notes |
|-----------|-----|-------|
| Color / brand voltage | 7.0 | Core Ferrari solid; gold hardcodes cleared; status/atmosphere dilute |
| Typography | 3.5 | Inter + italic-as-luxury + no mega scale |
| Spacing / rhythm | 5.5 | Super tokens exist; 12/20 + underuse of macro air |
| Shadows / depth | 4.0 | Dark tiers + hover lift on dark canvas |
| Cards / components | 5.0 | Coherent system, generic elevation grammar |
| Hero / cinematic signature | 4.0 | Poster frame ≠ full-bleed editorial |
| Motion | 6.0 | Best tokens in system; uneven application |
| Icons / chrome | 3.5 | Material + sticky slab nav |
| Overall craft consistency | 5.5 | Two button languages; gold class names |

**Weighted overall: 6.0 / 10** (+0.5 vs 2026-08-04: gold hardcode purge + spacing super ladder + slightly softer shadows.)

---

## Top 3 fixes (do these first)

1. **Replace Inter + materialize type roles**  
   Premium family (not Inter); wire `--font-editorial` / display tokens to DESIGN scale (even if family ≠ FerrariSans). Update `index.html`, `popup.html`, `shadowTokens.ts`.

2. **Rewrite card depth doctrine**  
   Kill hover `translateY` + `box-shadow` + `backdrop-filter` on grid cards. Hairline + optional double-bezel / sharp plates. Soften or delete shadow ladder on dark canvas; keep depth for modals only.

3. **Cinematic chrome: hero + icons + nav**  
   Full-bleed Discovery hero band (user art ok); Material → light-line icons; nav toward floating island (or inset glass pill) with custom cubic transitions.

---

## Recommended remediation order (audit only)

| Order | Item | Severity |
|-------|------|----------|
| 1 | Premium type stack + DESIGN size/weight/tracking tokens | P0 |
| 2 | Card hover: no lift/shadow/blur; double-bezel or sharp plate | P0 |
| 3 | Shadow ladder: hairline doctrine on dark; ambient only for overlays | P0 |
| 4 | Material Symbols → light line icon set | P0 |
| 5 | Nav: island / inset glass; custom cubic micro-transitions | P1 |
| 6 | Discovery full-bleed hero | P1 |
| 7 | Spacing: drop 12/20 as primary steps; use 3xl–super in page bands | P1 |
| 8 | Global transition default → `--ease-out` / focus-pull only | P1 |
| 9 | Rename `*-btn-gold` → primary; retire gold vocabulary | P2 |
| 10 | Tokenize caption/button/nav type roles | P2 |

---

## Files reviewed (primary)

- `/Users/harshabalakrishnan/Subsume/DESIGN.md`
- `/Users/harshabalakrishnan/Subsume/src/shared/tokens.css`
- `/Users/harshabalakrishnan/Subsume/src/shared/shadowTokens.ts`
- `/Users/harshabalakrishnan/Subsume/src/ui/index.html`
- `/Users/harshabalakrishnan/Subsume/src/ui/popup.html`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/global.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/layout.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/app-nav.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/library.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/discovery-layout.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/discovery-search.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/poetic-sanctuary.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/onboarding.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/emotional-components.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/popup.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/sidebar.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/styles/settings.css`
- `/Users/harshabalakrishnan/Subsume/src/styles/sanctuary.css`
- `/Users/harshabalakrishnan/Subsume/src/ui/components/FilmGrain.tsx`
- `/Users/harshabalakrishnan/Subsume/src/ui/pages/Home.tsx`
- Prior: `/Users/harshabalakrishnan/Subsume/docs/design-reviews/2026-08-04/06-high-end-visual-design.md`

---

## Audit metadata

| Field | Value |
|-------|--------|
| Auditor persona | Vanguard_UI_Architect (high-end-visual-design skill) |
| Mode | Read-only audit + write review doc |
| Commit | `a5471b5` |
| Score | **6.0 / 10** |
| Top 3 | Type stack · Card elevation · Hero/icons/nav chrome |
| Output path | `docs/design-reviews/2026-08-10/06-high-end-visual-design.md` |
