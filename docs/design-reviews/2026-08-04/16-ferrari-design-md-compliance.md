# Ferrari DESIGN.md — Live Implementation Compliance Review

**Date:** 2026-08-04  
**Spec:** [`DESIGN.md`](../../../DESIGN.md) (Ferrari-design-analysis, version alpha)  
**Scope:** Token layer + surface CSS vs DESIGN.md colors, type, spacing, radius, shadows, primary scarcity, buttons  
**Sources reviewed:**
- `src/shared/tokens.css`
- `src/shared/shadowTokens.ts`
- `src/ui/styles/global.css`
- `src/ui/styles/app-nav.css`
- `src/ui/styles/popup.css`
- `src/styles/sanctuary.css`
- related surface CSS under `src/ui/styles/`
- font loads in `src/ui/index.html`, `src/ui/popup.html`

---

## Verdict

| Metric | Score |
|--------|------:|
| **Overall compliance** | **~58%** |
| **Fidelity** | **5.8 / 10** |

**Summary:** Core **palette remapping** (Cinema Black `#181818` + Rosso Corsa `#da291c` + body/muted text) is largely in place and mirrored in Shadow DOM. Structural Ferrari signatures from DESIGN.md — **8px spacing ladder (`xxxs`→`super`)**, **sharp `rounded.none` CTAs/cards**, **single soft shadow tier**, **scarce primary**, **button type (14/700/uppercase/1.4px tracking)**, and **display type scale** — are only partially or not implemented. Live system still carries multi-tier shadows, intermediate radii, a truncated/misaligned spacing scale, and broad primary usage.

---

## Dimension scores

| Dimension | Compliance | Fidelity /10 | Notes |
|-----------|-----------:|-------------:|-------|
| Brand & shell colors | 90% | 9.0 | Canvas, primary, hover/pressed, body, muted, card `#303030` |
| Light / hairline surfaces | 75% | 7.5 | `#f7f7f7` / `#ebebeb` / `#d2d2d2` in light theme; dark hairline is translucent white, not solid `#303030` |
| Semantic (success/info/warning) | 70% | 7.0 | Success `#03904a`, info `#4c98b9` match; warning is amber/orange, not Ferrari `#f13a2c` |
| Fonts (family) | 85% | 8.5 | Inter as documented FerrariSans substitute; single sans for UI+editorial |
| Type scale / CTA type | 40% | 4.0 | No display-mega/xl/… tokens; CTA type not 14/700/1.4px uppercase |
| Spacing ladder | 30% | 3.0 | Different token names + stops at 32px; includes 12/20 not in DESIGN |
| Radius vocabulary | 35% | 3.5 | sm/md/lg only (2/4/8); no `none:0`; CTAs/cards not sharp-by-default |
| Elevation / shadows | 25% | 2.5 | Multi-tier drop shadows; DESIGN allows only soft-small + photo depth |
| Primary scarcity | 45% | 4.5 | Rosso used widely (chips, tabs, ratings, range, gold aliases) |
| Buttons | 45% | 4.5 | Correct fill color; wrong radius, padding, type treatment |
| Surfaces (card/elevated) | 65% | 6.5 | `#303030` on `--card` / overlay; elevated often `#242424` intermediate |
| Shadow DOM parity | 80% | 8.0 | Core colors/fonts/spacing/radius mirrored in `shadowTokens.ts` |

**Weighted overall ≈ 58% → 5.8/10.**

---

## What matches (pass)

### Brand voltage & canvas
| DESIGN token | Expected | Live | Location |
|--------------|----------|------|----------|
| `colors.canvas` | `#181818` | `--bg-base: #181818` | `tokens.css:8`, `shadowTokens.ts:13` |
| `colors.primary` | `#da291c` | `--primary: #da291c` | `tokens.css:16`, `shadowTokens.ts:21` |
| `colors.primary-hover` | `#9d2211` | `--primary-hover: #9d2211` | `tokens.css:18` |
| `colors.primary-active` | `#b01e0a` | `--primary-pressed: #b01e0a` | `tokens.css:19` |
| `colors.ink` / body-strong | `#ffffff` | `--fg-base: #ffffff` | `tokens.css:13` |
| `colors.body` | `#969696` | `--fg-muted: #969696` | `tokens.css:14` |
| `colors.muted` | `#666666` | `--fg-subtle: #666666` | `tokens.css:15` |
| `colors.muted-soft` | `#8f8f8f` | `--text-meta: #8f8f8f` | `tokens.css:37` |
| `colors.canvas-elevated` / surface-card | `#303030` | `--bg-overlay` / `--card: #303030` | `tokens.css:10`, `tokens.css:126` |
| `colors.on-primary` | `#ffffff` | `--btn-primary-fg` / `--on-primary-fg` | `tokens.css:130`, `tokens.css:173`, `tokens.css:273` |
| `semantic-success` | `#03904a` | `--success: #03904a` | `tokens.css:198-199` |
| `semantic-info` | `#4c98b9` | `--info-fg: #4c98b9` | `tokens.css:210` |

Header comment and plan intent explicitly name Ferrari cinematic system:

```1:4:src/shared/tokens.css
/* ──────────────────────────────────────────────────────────────────
   Subsume Design Tokens — Ferrari cinematic system (Rosso Corsa on near-black)
   Single source of truth: Cinema Black canvas + Rosso Corsa primary
   ────────────────────────────────────────────────────────────────── */
```

### Fonts
- DESIGN: FerrariSans with **Inter @ 500** as documented open-source substitute (`DESIGN.md` Known Gaps).
- Live: `--font-editorial` and `--font-ui` both Inter + system stack (`tokens.css:43-45`, `shadowTokens.ts:47-48`).
- Loaded: `index.html:10`, `popup.html:9-11`, Shadow inject `shadowTokens.ts:6-7`.
- Single-family (no display/body split) — aligned with DESIGN.

### Primary button color path
- `.btn-primary` fill/hover/active use `--primary` / `--primary-hover` / `--primary-pressed` (`global.css:118-131`).
- `.popup-btn-primary` same (`popup.css:775-785`).

### Light theme soft surfaces
- Light `--bg-base: #f7f7f7`, soft/strong bands and hairlines `#ebebeb` / `#d2d2d2` (`tokens.css:318-331`) map to `surface-soft-light`, `surface-strong-light`, `hairline-on-light`.

---

## Gaps (fail / partial)

### 1. Spacing ladder — not the Ferrari 8px named scale

| DESIGN (`spacing.*`) | Value | Live (`--spacing-*`) | Value |
|----------------------|------:|----------------------|------:|
| xxxs | 4px | xs | 4px |
| xxs | 8px | sm | 8px |
| xs | 16px | md | **12px** ✗ |
| sm | 24px | lg | **20px** ✗ |
| md | 32px | xl | 24px ✗ name/value |
| lg | 48px | 2xl | 32px ✗ |
| xl | 64px | — | **missing** |
| xxl | 96px | — | **missing** |
| super | 128px | — | **missing** |

```48:54:src/shared/tokens.css
  /* ─── Spacing Scale ────────────────────────────────────────── */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 20px;
  --spacing-xl: 24px;
  --spacing-2xl: 32px;
```

Mirrored in `shadowTokens.ts:52-58`. Section padding tokens at 96/128 do not exist. Surfaces often use ad-hoc `rem`/`px` instead of ladder tokens (e.g. `global.css` card/modal padding).

### 2. Radius — not sharp-by-default

DESIGN: **`rounded.none` (0px)** on every CTA, card, band; pills only for badges.

Live:
- `--radius-sm: 2px; --radius-md: 4px; --radius-lg: 8px` (`tokens.css:60-62`) — no `0` token.
- Shadcn `--radius: 0.5rem` (8px) (`tokens.css:141`).
- Global `button { border-radius: var(--radius-sm) }` → **2px**, not 0 (`global.css:97-100`).
- `.card { border-radius: var(--radius-md) }` → **4px** (`global.css:82`).
- Sanctuary primary CTA: `border-radius: 2px` (`sanctuary.css:1621`).
- Nav chips: `border-radius: 4px` (`app-nav.css:89`).
- Missing DESIGN steps: `md: 6px`, `xl: 12px`, explicit `none: 0`, `full: 9999` as tokens.

### 3. Elevation — multi-tier drop shadows vs photo + single soft

DESIGN: brightness-step elevation; **no drop shadow tiers**; optional single soft `0 4px 8px rgba(0,0,0,0.1)`.

Live defines and uses a full stack:

```72:76:src/shared/tokens.css
  --shadow-sm: 0 1px 3px hsla(240, 18%, 4%, 0.6);
  --shadow-md: 0 4px 16px hsla(240, 18%, 4%, 0.55);
  --shadow-lg: 0 12px 40px hsla(240, 18%, 4%, 0.6);
  --shadow-hero: 0 20px 60px hsla(240, 18%, 4%, 0.8);
```

Plus `--shadow-poster`, `--shadow-nav`, `--shadow-drawer`, `--shadow-hero-poster`, `--shadow-plaque`, `--shadow-card-hover` (`tokens.css:237-242`). Consumed in sanctuary, library, layout, popup, global modal. Violates DESIGN “Don’t add drop shadow tiers.”

### 4. Buttons — color OK; geometry & type miss DESIGN `button-primary`

| Spec (DESIGN) | Expected | Live |
|---------------|----------|------|
| Background | `#da291c` | ✓ `--primary` |
| Text | white | ✓ |
| Typography | 14px / **700** / **uppercase** / **1.4px** tracking | `.btn-primary`: 14px / **600**, no uppercase, no tracking (`global.css:97-123`) |
| Padding | 14px × 32px | `0.5rem 1rem` (~8×16) |
| Height | **48px** | `min-height: 44px` |
| Radius | **0px** | `var(--radius-sm)` = 2px |
| Outline CTA | 1px white border, sharp | `.btn-secondary` uses soft `--border`, 2px radius |

Sanctuary “gold” primary is closer in voice (uppercase + tracking) but still wrong:
- Fill: `var(--border-hero)` = `rgba(218, 41, 28, 0.45)` not solid Rosso (`sanctuary.css:1615-1621`)
- Type: **11px** / 600 / `0.15em` tracking — not 14/700/1.4px
- Radius 2px, min-height 44

### 5. Primary scarcity — Rosso not reserved

DESIGN: primary **only** for primary CTAs, Cavallino (N/A in product), F1 race-position style highlights.

Live Rosso (or `--gold` alias → primary) appears on:
- Nav logo / active tabs (`tokens.css:151-152`, `global.css:530-585`)
- Platform chips (`tokens.css:271-272`, `global.css:401`)
- Range thumbs (`global.css:222-232`)
- Type-filter active (`global.css:508-511`)
- Ratings / modal badges (`global.css:337-351`)
- People filmography accents (`people.css` multiple `var(--gold)`)
- Intent-memory, onboarding monogram/CTA, chip-active, selection, digest badges
- Atmosphere presets **replace** primary with sunset/emerald/french hues (`tokens.css:582-695`) — intentional product feature, but anti-DESIGN single-voltage

### 6. Type scale — hierarchy tokens absent

DESIGN defines display-mega **80/500**, display-xl **56**, display-lg **36**, display-md **26**, title-md **18/700**, body-md **14**, caption-uppercase **11/600/1.1px**, button **14/700/1.4px**, nav-link **13/600/0.65px**, number-display **80/700**.

Live only:
```119:121:src/shared/tokens.css
  --font-size-lg: 18px;
  --font-size-sm: 14px;
  --font-size-xs: 11px;
```

Headings get ad-hoc sizes + `letter-spacing: -0.01em` (`global.css:43-47`); display weight-500 rule is not tokenized. Nav uses 11px / ~0.04em (`app-nav.css:93-95`), not 13/600/0.65px.

### 7. Surfaces & hairlines — partial

| Item | DESIGN | Live | Ref |
|------|--------|------|-----|
| Card on dark | `#303030` | `--card: #303030` ✓ but `--card-bg` / many cards use `--bg-elevated: #242424` | `tokens.css:9`, `159` |
| Dark hairline | solid `#303030` | translucent `hsla(0,0%,100%,0.08)` | `tokens.css:20` |
| Warning semantic | `#f13a2c` | `--warning: #fbbf24` / orange status | `tokens.css:202-204` |
| Destructive | (warning red family) | Tailwind-like `#ef4444` | `tokens.css:137` |
| Brand red gradient | `180deg, #a00c01 → #da291c 64%` | `to right, #da291c → #9d2211` | `tokens.css:101` |

### 8. Shadow DOM — good core parity, same structural gaps

`shadowTokens.ts` correctly ports Ferrari shell colors, Inter, short spacing, small radius scale, multi-tier shadows. Missing the same DESIGN ladders (full spacing, radius.none, type roles, single soft shadow).

---

## Compliance matrix (quick)

| DESIGN requirement | Status |
|--------------------|--------|
| Canvas `#181818` (not pure black) | ✅ |
| Rosso Corsa `#da291c` primary | ✅ |
| Hover `#9d2211` / active `#b01e0a` | ✅ |
| Body `#969696` / muted `#666666` | ✅ |
| Inter substitute for FerrariSans | ✅ |
| Single sans family | ✅ |
| Success `#03904a` / info `#4c98b9` | ✅ |
| Warning `#f13a2c` | ❌ |
| Spacing xxxs→super ladder | ❌ |
| Radius none (0) on CTAs/cards | ❌ |
| Button 14/700/uppercase/1.4px, h48, pad 14×32 | ❌ |
| Primary scarce (CTA-only) | ❌ |
| No multi-tier drop shadows | ❌ |
| Display type scale (80/56/36/…) | ❌ |
| Display weight 500 only | ⚠️ unenforced |
| Photographic depth as primary elevation | ⚠️ partial (product photography, but shadows remain) |
| Hairline `#303030` on dark | ⚠️ translucent substitute |

---

## Top 5 gaps (priority)

1. **Spacing ladder mismatch** — Live 4/8/12/20/24/32 vs DESIGN 4/8/16/24/32/48/64/96/128 (`tokens.css:49-54`, `shadowTokens.ts:53-58`).
2. **Sharp radius not default** — CTAs/cards use 2–8px; no `rounded.none`; `--radius: 0.5rem` (`tokens.css:60-62,141`, `global.css:100,82`).
3. **Multi-tier shadow system** — sm/md/lg/hero + poster/nav/drawer vs DESIGN single soft + photo depth (`tokens.css:73-76,237-242`).
4. **Button primary geometry & type** — not uppercase/1.4px tracking/700/48px/0 radius (`global.css:97-123`; sanctuary CTA `sanctuary.css:1615-1626` uses translucent fill + 11px).
5. **Primary scarcity** — Rosso/`--gold` on chips, tabs, ratings, range, people accents, atmosphere overrides (`global.css`, `people.css`, `tokens.css:582+`).

---

## Recommended next steps (out of scope for this review file)

1. Extend spacing tokens to DESIGN names/values (alias old names for back-compat).
2. Add `--radius-none: 0`; set `.btn-primary` / outline CTAs / feature cards to 0; keep full only for badge pills.
3. Collapse shadow tokens to optional `--shadow-soft: 0 4px 8px rgba(0,0,0,0.1)` + brightness steps; remove lg/hero tiers from default UI.
4. Restyle `.btn-primary` (and sanctuary primary) to DESIGN button-primary type + solid Rosso fill.
5. Audit primary usage: keep solid fill for primary CTAs; demote chips/tabs/ratings to ink/hairline or muted.

---

## Fidelity scorecard

| Area | /10 |
|------|----:|
| Palette remapping | 9 |
| Semantic completeness | 7 |
| Typography system | 4 |
| Spacing system | 3 |
| Shape / radius | 3.5 |
| Elevation philosophy | 2.5 |
| Component buttons | 4.5 |
| Primary scarcity / brand voltage discipline | 4.5 |
| **Overall fidelity** | **5.8** |

**Bottom line:** Subsume is **color-faithful** to Ferrari DESIGN.md (~cinema black + Rosso Corsa) but only **structurally partial**. Treating the design system as complete requires spacing, radius, shadow, button type, and primary-scarcity work beyond the initial token recolor.
