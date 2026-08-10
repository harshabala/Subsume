# Ferrari DESIGN.md — Live Implementation Compliance Review

**Date:** 2026-08-10  
**Repo / commit:** Subsume @ `a5471b5`  
**Spec:** [`DESIGN.md`](../../../DESIGN.md) (Ferrari-design-analysis, version alpha)  
**Brand intent:** [`brand.md`](../../../brand.md) **Option A synthesize** — sanctuary soul + scarce Rosso Corsa + Cinema Black (adapt DESIGN.md; not a car-brand UI)  
**Prior baseline:** [2026-08-04 / 16-ferrari-design-md-compliance.md](../2026-08-04/16-ferrari-design-md-compliance.md) (~**58%** / **5.8/10**)  
**Scope:** Token layer + surface CSS vs DESIGN.md colors, type, spacing, radius, shadows, primary scarcity, buttons; plus Option A synthesis fidelity  

**Sources reviewed:**
- `src/shared/tokens.css`
- `src/shared/shadowTokens.ts`
- `src/styles/sanctuary.css`
- `src/ui/styles/global.css`, `app-nav.css`, `popup.css`, `sidebar.css`, `settings.css`, related surface CSS
- Font loads in `src/ui/index.html`, `src/ui/popup.html`
- `brand.md`, Option A north star from open-issues / Aug 4 index

---

## Verdict

| Metric | Score | Δ from 2026-08-04 |
|--------|------:|------------------:|
| **Overall compliance** | **~64%** | **+6 pp** |
| **Fidelity** | **6.4 / 10** | **+0.6** |

**Summary:** Subsume remains **color-faithful** to Ferrari DESIGN.md (Cinema Black `#181818` + Rosso Corsa `#da291c` + Inter monofont) and has closed several post-remap hygiene gaps that dragged Aug 4: **solid primary CTAs**, **gold hex purge**, **`brand.md` Option A rewrite**, **extended spacing stops** (48–128), **`--radius-none`** on `.btn-primary`, and partial **primary demotion** on chips / explore subnav. Structural DESIGN.md signatures — **true 8px named ladder**, **sharp cards/CTAs by default**, **single soft shadow**, **button type 14/700/uppercase/1.4px @ 48px**, **display scale**, **scarce Rosso** — are still only partial. Option A (sanctuary soul + scarce voltage) is clearer in docs and CTA fill, but live surfaces still over-use primary on chrome, ratings, range thumbs, and many interactive accents.

---

## Dimension scores

| Dimension | Compliance | Fidelity /10 | Δ | Notes |
|-----------|-----------:|-------------:|:-:|-------|
| Brand & shell colors | 92% | 9.2 | +2 | Canvas, primary, hover/pressed, body/muted, card `#303030`; residual gold chroma gone from `src/` |
| Light / hairline surfaces | 75% | 7.5 | 0 | Soft/strong light bands match; dark hairline still translucent white, not solid `#303030` |
| Semantic (success/info/warning) | 72% | 7.2 | +2 | Success/info match; warning stays amber by **brand.md** (Option A contrast vs brand red) — fails strict DESIGN `#f13a2c` |
| Fonts (family) | 90% | 9.0 | +5 | Inter single-family; `brand.md` synced (no Outfit/Newsreader reintroduce path) |
| Type scale / CTA type | 42% | 4.2 | +2 | Still no display-mega… tokens; sanctuary CTA uppercase voice exists but 11px/0.15em not 14/700/1.4px |
| Spacing ladder | 55% | 5.5 | +25 | **3xl–super (48/64/96/128) added** + shadow parity; mid stops still 12/20 not DESIGN 16/24; ladder barely consumed |
| Radius vocabulary | 48% | 4.8 | +13 | **`--radius-none: 0`** + `.btn-primary` sharp; cards 4px, popup btn 4–8px, sanctuary CTA 2px |
| Elevation / shadows | 30% | 3.0 | +5 | Opacity slightly softened; multi-tier sm/md/lg/hero + poster/nav/drawer/plaque still defined & used |
| Primary scarcity | 55% | 5.5 | +10 | Solid CTAs + chip soft fill + explore subnav de-redded; logo/tabs/ratings/range/many accents still Rosso |
| Buttons | 58% | 5.8 | +13 | Fill/hover/active + sharp `.btn-primary` ✓; geometry/type/height still miss DESIGN `button-primary` |
| Surfaces (card/elevated) | 68% | 6.8 | +3 | `--card: #303030`; many shells use `--bg-elevated: #242424` intermediate |
| Shadow DOM parity | 88% | 8.8 | +8 | Colors, extended spacing, radius-none, motion/curtain tokens mirrored in `shadowTokens.ts` |
| Option A brand synthesis (docs + intent) | 85% | 8.5 | +~45 | `brand.md` / PRODUCT north star: sanctuary + scarce voltage; not full automotive chrome |

**Weighted overall ≈ 64% → 6.4/10.**

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
| `colors.canvas-elevated` / surface-card | `#303030` | `--bg-overlay` / `--card: #303030` | `tokens.css:10`, `tokens.css:132` |
| `colors.on-primary` | `#ffffff` | `--btn-primary-fg` / `--on-primary-fg` | `tokens.css:179`, `tokens.css:279` |
| `semantic-success` | `#03904a` | `--success: #03904a` | `tokens.css:204-205` |
| `semantic-info` | `#4c98b9` | `--info-fg: #4c98b9` | `tokens.css:216` |

Header still names the system correctly:

```1:4:src/shared/tokens.css
/* ──────────────────────────────────────────────────────────────────
   Subsume Design Tokens — Ferrari cinematic system (Rosso Corsa on near-black)
   Single source of truth: Cinema Black canvas + Rosso Corsa primary
   ────────────────────────────────────────────────────────────────── */
```

### Fonts
- DESIGN: FerrariSans with **Inter** as documented open-source substitute.
- Live: `--font-editorial` and `--font-ui` both Inter (`tokens.css:43-45`, `shadowTokens.ts:47-48`).
- Loaded: `index.html:10`, Shadow inject `shadowTokens.ts:6-7`.
- `brand.md` now documents single-family Inter (Option A; no dual-type drift path).

### Solid primary CTA fill (fixed since Aug 4)
Aug 4 called out translucent `--border-hero` fills on “gold” CTAs. Live now:

```1665:1676:src/styles/sanctuary.css
.sanctuary-btn-gold {
  background: var(--primary);
  border: none;
  color: var(--on-primary-fg);
  min-height: 44px;
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: 2px;
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
```

`.btn-primary` / `.popup-btn-primary` / `.btn-sanctuary-gold` also use solid `--primary`.

### Radius-none token + primary button sharpness (partial)
```64:67:src/shared/tokens.css
  --radius-none: 0px;
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;
```

```118:124:src/ui/styles/global.css
.btn-primary {
  background-color: var(--primary);
  color: var(--btn-primary-fg);
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-none, 0);
}
```

### Spacing high end extended (partial)
```48:58:src/shared/tokens.css
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 20px;
  --spacing-xl: 24px;
  --spacing-2xl: 32px;
  --spacing-3xl: 48px;
  --spacing-4xl: 64px;
  --spacing-5xl: 96px;
  --spacing-super: 128px;
```

Mirrored in `shadowTokens.ts:52-62`. DESIGN `lg/xl/xxl/super` values now exist under product names.

### Option A doc / brand synthesis
- `brand.md`: Cinema Black + scarce Rosso; gold aliases → primary; motion ≤300ms; no Ferrari trademarks.
- Residual **Gilded Night gold hex** (`#c9a84c` / `hsla(45,…)`) **not found** under `src/`.
- Explore subnav active state is ink/surface, not solid Rosso (`app-nav.css:112-115`) — scarcity-friendly.

### Shadow DOM
Core shell, Inter, extended spacing, `--radius-none`, motion/curtain tokens, multi-tier shadows all ported — structural gaps match app (same miss list).

---

## Gaps (fail / partial)

### 1. Spacing ladder — high end present; mid ladder + consumption fail

| DESIGN (`spacing.*`) | Value | Live (`--spacing-*`) | Value | Status |
|----------------------|------:|----------------------|------:|--------|
| xxxs | 4px | xs | 4px | ✓ value |
| xxs | 8px | sm | 8px | ✓ value |
| xs | 16px | md | **12px** | ✗ |
| sm | 24px | lg | **20px** | ✗ |
| md | 32px | 2xl | 32px | ✓ value, name drift |
| lg | 48px | 3xl | 48px | ✓ value |
| xl | 64px | 4xl | 64px | ✓ value |
| xxl | 96px | 5xl | 96px | ✓ value |
| super | 128px | super | 128px | ✓ |

**Consumption:** `--spacing-3xl`…`--spacing-super` appear almost only in token definitions (not surface CSS). Layouts still ad-hoc `rem`/`px`. DESIGN names (`xxxs`…`super`) not aliased.

### 2. Radius — token exists; surfaces not sharp-by-default

DESIGN: **`rounded.none` (0px)** on every CTA, card, band; pills only for badges.

Live:
- `.btn-primary` → 0 ✓
- Base `button` → `--radius-sm` (2px); `.card` → `--radius-md` (4px)
- `.popup-btn` → `var(--radius-md, 8px)` (often 4–8px)
- `.sanctuary-btn-gold` / restraint → **2px**
- Shadcn `--radius: 0.5rem` (8px) still present
- Missing DESIGN steps as first-class: `md: 6px`, `xl: 12px`, `full: 9999` named for badges

### 3. Elevation — multi-tier drop shadows remain

DESIGN: brightness-step elevation; optional single soft `0 4px 8px rgba(0,0,0,0.1)`.

Live still defines and consumes:
```77:81:src/shared/tokens.css
  --shadow-sm: 0 1px 3px hsla(240, 18%, 4%, 0.5);
  --shadow-md: 0 4px 16px hsla(240, 18%, 4%, 0.45);
  --shadow-lg: 0 12px 40px hsla(240, 18%, 4%, 0.5);
  --shadow-hero: 0 20px 60px hsla(240, 18%, 4%, 0.7);
```
Plus `--shadow-poster`, `--shadow-nav`, `--shadow-drawer`, `--shadow-hero-poster`, `--shadow-plaque`, `--shadow-card-hover`. Used in sanctuary, library, layout, popup, global modal, sidebar. Opacity soft-pass only; philosophy unchanged.

### 4. Buttons — fill & sharp primary OK; geometry & type miss DESIGN

| Spec (DESIGN `button-primary`) | Expected | Live (`.btn-primary` / sanctuary / popup) |
|--------------------------------|----------|-------------------------------------------|
| Background | `#da291c` | ✓ solid `--primary` |
| Text | white | ✓ |
| Typography | 14px / **700** / **uppercase** / **1.4px** tracking | 14/600 no uppercase (global); sanctuary **11**/600/`0.15em` uppercase; popup 13/600 no uppercase |
| Padding | 14px × 32px | `0.5rem 1rem` or spacing-md/xl |
| Height | **48px** | **44px** min-height |
| Radius | **0px** | global primary 0; sanctuary/popup/settings still 2–8px |
| Outline CTA | 1px white border, sharp | `.btn-secondary` soft border + non-sharp |

### 5. Primary scarcity — improved, still not reserved

DESIGN / Option A: primary **scarcely** — primary CTAs + rare race-position-style highlights.

Still Rosso (or aliases) on:
- Nav logo (`--nav-logo-fg: var(--primary)` → `sidebar.css`)
- Primary tab active text + 2px underline (`sidebar.css`, `global.css` `.tab-item.active`)
- Platform chips text (`global.css`)
- Range thumbs (`global.css`)
- Type-filter active border+text (`global.css:509-512`) — soft bg is better, solid red border remains
- Modal ratings / badges, intent-memory, onboarding monogram/CTA, digest badges
- Multiple sanctuary fills (progress, dots, active markers) beyond true CTAs
- Atmosphere presets still **replace** `--primary` (sunset/emerald/french) — product feature, anti single-voltage

**Improved since Aug 4:** solid CTA fill; chip active soft bg; explore `.app-subnav-link.active` no longer primary-colored.

### 6. Type scale — hierarchy tokens still absent

DESIGN: display-mega **80/500**, display-xl **56**, display-lg **36**, display-md **26**, title-md **18/700**, body-md **14**, caption-uppercase **11/600/1.1px**, button **14/700/1.4px**, nav-link **13/600/0.65px**, number-display **80/700**.

Live still only:
```125:127:src/shared/tokens.css
  --font-size-lg: 18px;
  --font-size-sm: 14px;
  --font-size-xs: 11px;
```

Ad-hoc clamps (nav logo, layout hero) and one 36px sanctuary size — not a tokenized ladder. Display weight-500 rule unenforced. Nav links often **11px** / ~0.04–0.15em, not 13/600/0.65px.

*Option A note:* full-bleed automotive display-mega heroes are **out of product scope** (`brand.md`); product still needs a modest display + button + nav type system.

### 7. Surfaces & hairlines — partial

| Item | DESIGN | Live | Ref |
|------|--------|------|-----|
| Card on dark | `#303030` | `--card: #303030` ✓; many cards use `--bg-elevated: #242424` | `tokens.css:9`, `165` |
| Dark hairline | solid `#303030` | translucent `hsla(0,0%,100%,0.08)` | `tokens.css:20` |
| Warning semantic | `#f13a2c` | amber `#fbbf24` / orange — **intentional in brand.md** | `tokens.css:208-211` |
| Brand red gradient | `180deg, #a00c01 → #da291c 64%` | `to right, #da291c → #9d2211` | `tokens.css:107` |

### 8. Option A synthesize — docs strong; UI half-synthesized

| Option A criterion | Status |
|--------------------|--------|
| Sanctuary soul preserved (poetic capture, plaques, grain, hardcover) | ✅ intact |
| Cinema Black canvas | ✅ |
| Scarce Rosso voltage | ⚠️ better CTAs; chrome still red-heavy |
| Adapt DESIGN.md (not Cavallino / full marketing) | ✅ trademarks absent; geometry only partially adapted |
| Docs north star unambiguous | ✅ `brand.md` |

---

## Compliance matrix (quick)

| DESIGN / Option A requirement | Status | Δ Aug 4 |
|-------------------------------|--------|---------|
| Canvas `#181818` (not pure black) | ✅ | same |
| Rosso Corsa `#da291c` primary | ✅ | same |
| Hover `#9d2211` / active `#b01e0a` | ✅ | same |
| Body `#969696` / muted `#666666` | ✅ | same |
| Inter substitute for FerrariSans | ✅ | same |
| Single sans family | ✅ | same |
| Success `#03904a` / info `#4c98b9` | ✅ | same |
| Solid primary CTA fills (not translucent hero red) | ✅ | **fixed** |
| Residual gold chroma purged from `src/` | ✅ | **fixed** |
| `brand.md` Option A (Cinema Black + scarce Rosso) | ✅ | **fixed** |
| Warning `#f13a2c` | ❌ (amber by brand policy) | same fail vs DESIGN |
| Spacing xxxs→super (values + names + use) | ⚠️ values partial; names/use fail | **partial** |
| Radius none (0) on CTAs/cards | ⚠️ primary button only | **partial** |
| Button 14/700/uppercase/1.4px, h48, pad 14×32 | ❌ | same fail |
| Primary scarce (CTA-only voltage) | ⚠️ improved | **partial** |
| No multi-tier drop shadows | ❌ | same fail |
| Display type scale (80/56/36/…) | ❌ | same fail |
| Display weight 500 only | ⚠️ unenforced | same |
| Hairline `#303030` on dark | ⚠️ translucent substitute | same |
| Shadow DOM parity with app tokens | ✅ core + extensions | **improved** |

---

## Top 5 gaps (priority)

1. **Button primary geometry & type (all surfaces)** — Unify `.btn-primary`, `.sanctuary-btn-gold`, `.popup-btn-primary`, `.btn-sanctuary-gold` to DESIGN `button-primary`: 14/700/uppercase/1.4px tracking, min-height 48, padding 14×32, `radius-none` (`global.css:97-124`, `sanctuary.css:1665+`, `popup.css:748-784`, `settings.css:231+`).
2. **Primary scarcity audit** — Keep solid Rosso for primary CTAs + focus ring; demote nav logo, active tab text/underline, ratings, range thumbs, chip borders, non-CTA sanctuary fills to ink/hairline/`--primary-soft` (`sidebar.css`, `global.css`, `tokens.css` nav-* tokens).
3. **Elevation collapse** — Replace multi-tier shadow system with brightness steps + optional single soft `0 4px 8px rgba(0,0,0,0.1)`; drop lg/hero/poster as default chrome (`tokens.css:77-81,243-248` + consumers).
4. **Spacing ladder alignment + consumption** — Alias DESIGN names or fix mid stops (16/24); use 3xl–super in section padding instead of ad-hoc rem (`tokens.css:48-58`).
5. **Sharp cards + type roles** — Cards/bands `radius-none`; tokenize button/nav/caption-uppercase/display-md at minimum for Option A (skip mega automotive heroes).

---

## Top 3 fixes (actionable)

1. **Ship DESIGN `button-primary` on every primary CTA class** (global + sanctuary + popup + settings) — single shared rule: solid Rosso, white type, 14/700/uppercase/1.4px, h48, pad 14×32, `border-radius: var(--radius-none)`.
2. **Scarcity pass on chrome** — set `--nav-logo-fg` and inactive/active nav to ink/muted; tab active underline hairline or soft; chips soft-only; reserve solid fill for CTAs.
3. **Collapse shadows to one soft tier + surface brightness**; set feature cards to `radius-none` and prefer `--card` (`#303030`) over intermediate `#242424` for true elevated plates.

---

## Delta from 2026-08-04 (~58%)

| Change | Effect |
|--------|--------|
| Solid Rosso CTAs (no translucent `--border-hero` primaries) | Buttons + scarcity hygiene ↑ |
| Gold hex / warm chroma purged from `src/` | Brand & shell ↑ |
| `brand.md` rewritten to Option A synthesize | Docs synthesis ↑↑ |
| `--spacing-3xl`…`--spacing-super` + shadowTokens parity | Spacing ↑ |
| `--radius-none` + `.btn-primary` sharp | Radius / buttons ↑ |
| Chip active soft fill; explore subnav de-redded | Scarcity ↑ |
| Shadow opacity slightly reduced | Elevation slight ↑ |
| **Still open:** button type/geometry, multi-tier shadows, mid-ladder, display type, primary chrome, hairline solid | Caps ceiling ~mid-60s |

**Net: ~58% → ~64% (+6 pp); fidelity 5.8 → 6.4.**

---

## Fidelity scorecard

| Area | /10 | Δ |
|------|----:|--:|
| Palette remapping | 9.2 | +0.2 |
| Semantic completeness | 7.2 | +0.2 |
| Typography system | 4.2 | +0.2 |
| Spacing system | 5.5 | +2.5 |
| Shape / radius | 4.8 | +1.3 |
| Elevation philosophy | 3.0 | +0.5 |
| Component buttons | 5.8 | +1.3 |
| Primary scarcity / brand voltage discipline | 5.5 | +1.0 |
| Option A synthesize (docs + sanctuary soul) | 8.5 | +~4 |
| **Overall fidelity** | **6.4** | **+0.6** |

**Bottom line:** Subsume is a **stronger Option A hybrid** than on Aug 4 — solid Rosso CTAs, clean brand docs, extended token geometry — but still **structurally partial** vs DESIGN.md. Closing the next ~15–20 pp requires button type discipline, primary scarcity on chrome, single-soft elevation, and consuming the spacing/radius tokens already declared.

---

## Return summary

| Field | Value |
|-------|-------|
| **Compliance** | **~64%** |
| **Fidelity** | **6.4 / 10** |
| **Δ Aug 4** | **+6 pp / +0.6** (from ~58% / 5.8) |
| **Top 3** | (1) DESIGN button-primary on all CTA classes (2) primary scarcity on nav/tabs/chips/ratings (3) collapse multi-tier shadows + sharp cards |
| **Path** | `/Users/harshabalakrishnan/Subsume/docs/design-reviews/2026-08-10/16-ferrari-design-md-compliance.md` |
