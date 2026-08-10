# 19 — Icons & Pictographic System Audit

**Date:** 2026-08-10  
**Repo:** Subsume @ `a5471b5`  
**Scope:** Material Symbols, ad-hoc SVG, emoji, Chrome action icons, empty-state / nav / status pictographs  
**Lens:** Cinema Black + Rosso Corsa sanctuary brand; userinterface-wiki morphing-icon spirit (`aria-hidden` on decorative SVGs, consistent viewBox, stroke discipline)  
**Score: 4.5 / 10**

---

## Executive summary

Subsume does **not** have a single icon system. Chrome is assembled from four incompatible sources:

| Source | Role today | Brand fit |
| --- | --- | --- |
| **Material Symbols Outlined** (Google Fonts) | Primary app/popup chrome | Poor — generic AI/SaaS tell |
| **Ad-hoc inline SVG** (24×24, mixed stroke) | Close, check, trash, plus, poster, send | Mixed — light stroke OK; no shared kit |
| **Unicode / CSS `content` glyphs** | Chevrons, ×, ★, [+/–] | Weak — inconsistent optical weight |
| **Emoji** | ⭐ IMDb, 🍅 RT on hover card | Fail — colorful, non-sanctuary |

**Strengths:** Empty-state projector SVG is on-brand (Rosso frame + beam); primary house nav uses intentional Roman numerals (I / II / III); many decorative icons correctly use `aria-hidden` under labelled buttons; Material load is explicitly **Outlined + FILL=0** (no filled/outlined flip-flop within the font).

**Weaknesses:** No size/stroke tokens; `auto_awesome` as “AI tell”; Material at 14–24px fighting Roman mono labels; hover-card emoji; Chrome toolbar icons still **gold spiral** (pre–Rosso Corsa); stroke widths 1 / 1.5 / 2 / 2.5; several content SVGs lack `aria-hidden`.

---

## Inventory summary

### 1. Font kit — Material Symbols Outlined

**Load (FILL=0, opsz 24, wght 400 only):**

- [`src/ui/index.html:11`](../../../src/ui/index.html) — `Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0`
- [`src/ui/popup.html:13-15`](../../../src/ui/popup.html) — same

**Base CSS:** [`src/ui/styles/sidebar.css:4-18`](../../../src/ui/styles/sidebar.css) — `font-size: 24px`

| Glyph | Surface | File:line | Render size |
| --- | --- | --- | --- |
| `menu` | App menu toggle | `App.tsx:373` | 24px default |
| `close` | Drawer close | `App.tsx:417` | 24px |
| `search` | Explore subnav + drawer | `App.tsx:41`, `386`, `448` | subnav **14px**; drawer via `.side-menu-roman` **10px mono** (broken) |
| `auto_awesome` | Recommendations | `App.tsx:42` | same |
| `new_releases` | Now Showing | `App.tsx:43` | same |
| `movie` | Creators | `App.tsx:44` | same |
| `bar_chart` | House Stats | `App.tsx:49` | drawer |
| `notifications` | Premiere Alerts | `App.tsx:50` | drawer |
| `settings` | Popup header | `popup.tsx:377`, `495` | **20px** (`.popup-icon-btn`) |
| `close` | Popup header | `popup.tsx:380` | 20px |
| `videocam` | Inscribe CTA + brand | `popup.tsx:467`, `482` | **18px** / **20px** primary red |
| `open_in_new` | Open the house | `popup.tsx:471` | 18px |

**Filled vs outlined:** Kit is locked outlined (`FILL@0`). No Material filled variants. Status/rating “filled” look comes from **solid unicode stars (★)** instead — a second fill language.

### 2. Roman numeral “icons” (house identity)

```53:57:src/ui/App.tsx
const PRIMARY_NAV: NavItem[] = [
  { key: 'library', label: 'Archive', icon: 'I' },
  { key: 'home', label: 'Discovery', icon: 'II' },
  { key: 'settings', label: 'Settings', icon: 'III' },
];
```

- Desktop / drawer primary: `NavIcon` → `.sidebar-nav-roman` — editorial italic **14px** ([`sanctuary.css:2613-2618`](../../../src/styles/sanctuary.css))
- Intentionally non-Material — good brand seed, but **not applied** to Explore / House tools (those use Material)

### 3. Ad-hoc inline SVG

| Asset | Size | Stroke | aria-hidden | File:line |
| --- | --- | --- | --- | --- |
| Success check | 32 | **2.5** | yes | `popup.tsx:351-353` |
| Back arrow | 14 | **2.5** | yes | `popup.tsx:507-510` |
| Poster placeholder rect | 18×24 | **2** | yes | `popup.tsx:595-597` |
| Send / paper-plane | 14 | **2.5** | yes | `popup.tsx:673-676` |
| Modal close × | 16 | **1.5** | yes | `DetailModal.tsx:528-531` |
| Film-frame placeholder | 40 | **1** | yes | `DetailModal.tsx:547-550` |
| Empty projector frame | 72 | 1–1.5 | yes | `EmptyStateProjection.tsx:24-57` |
| Hover poster frame | 32 | **1.5** | **no** | `hoverCard.tsx:114-117` |
| Hover trash | 14 | **2** | **no** | `hoverCard.tsx:209-211` |
| Hover plus | 14 | **2** | **no** | `hoverCard.tsx:223-225` |
| Hover confirm check | 24 | **2** | **no** | `hoverCard.tsx:579-581`, `606-608` |
| Film grain / weather chart | — | n/a | grain yes | decorative / data — not chrome icons |

**Stroke chaos:** 1 → 1.5 → 2 → 2.5 on a shared 24 viewBox. Optical weight jumps between modal (hairline) and popup (bold).

### 4. Unicode / text pictographs (status & chrome)

| Glyph | Use | File:line |
| --- | --- | --- |
| `×` | Unfollow, tag remove, notice dismiss, deselect | `People.tsx:308`, `DetailModal.tsx:1001`, `NoticeProvider.tsx:46`, `popup.tsx:612` |
| `▴` / `▾` | Dossier / hardcover expand | `DetailModal.tsx:755`, `HardcoverSpineCard.tsx:173` |
| `▸` / `▾` | Archive intent filter `::before` | `sanctuary.css:2655`, `2660` |
| ` ▾` / ` ▴` | Settings nav CSS content | `settings-nav.css:193`, `199` |
| `★` | Rating / plaque score | `hoverCard.tsx:191`, `bookOverlay.ts:470`, `DiscoveryFeedCard.tsx:55`, `overlay.ts:79` |
| `·` | Meta separators | Stats, book plaque, etc. |
| `[ + ]` / `[ – ]` | Recs group toggle | `Recommendations.tsx:474-477` |
| `✓` | Following state text | `People.tsx:465` |
| `\u2715` | Dock collapse | `dock.ts:329` |

### 5. Emoji (brand breaks)

| Emoji | Use | File:line |
| --- | --- | --- |
| ⭐ | IMDb chip | `hoverCard.tsx:139` |
| 🍅 | Rotten Tomatoes chip | `hoverCard.tsx:146` |

Emoji render platform-dependent, high chroma, and sit on Cinema Black as **retail review chrome**, not sanctuary inscription.

### 6. Chrome action / store icons

| Asset | Path |
| --- | --- |
| 16 / 48 / 128 | `src/assets/icons/icon{16,48,128}.png` → packaged `dist/icons/` |
| Manifest | `manifest.json:51-61` |

**Visual:** gold/amber spiral “CINEMA” disc + play triangle on near-black. **Conflicts** with live brand (Cinema Black + **Rosso Corsa**, gold retired to primary-red aliases). Toolbar icon is the highest-frequency brand surface users see; it still sells the old gold system.

### 7. Empty states

| Pattern | Status |
| --- | --- |
| `EmptyStateProjection` | Custom 72px film-frame SVG + Rosso conic beam — **best-in-product** pictograph ([`EmptyStateProjection.tsx`](../../../src/ui/components/EmptyStateProjection.tsx), [`emotional-components.css:339-414`](../../../src/ui/styles/emotional-components.css)) |
| `.empty-state-icon { font-size: 40px }` | Legacy layout token still in [`layout.css:77-80`](../../../src/ui/styles/layout.css) — large icon-font empty pattern leftover |
| `.library-empty-state-icon` | Color token only; actual empty uses projection component |

### 8. Optical alignment & size consistency

| Context | Declared size | Notes |
| --- | --- | --- |
| Material base | 24px | Menu / drawer close |
| App subnav | **14px** + opacity 0.85 | [`app-nav.css:117-120`](../../../src/ui/styles/app-nav.css) — undersized vs 11px caps labels; feels like noise |
| Side menu Material | class **`side-menu-roman`**: mono **10px**, width 20px | [`sidebar.css:274-280`](../../../src/ui/styles/sidebar.css) — Roman styles applied to Material **glyph names**; icons optically tiny / mono-forced |
| Popup icon buttons | 20px | OK in 44×44 hit target |
| Popup CTA icons | 18px | Inconsistent with 20px header icons |
| Brand capture `videocam` | 20px + `--primary` | Only Material glyph with brand voltage — OK as accent, uneven vs other icons |
| SVG closes | 14–16 | Different stroke → different perceived size |
| Empty frame | 72 | Intentional hero; good |

**Optical alignment issues:**

1. Subnav Material + uppercase 11px labels: icon baseline not optically centered against letterforms (inline-block Material + no `display: inline-flex; align-items: center` on icon alone is OK on the link, but 14px/24 optical box is uneven).
2. `.side-menu-roman` on Material symbols forces mono + 10px — **misaligned** and wrong typeface for a symbol font.
3. Unicode `×` dismissals vary by surrounding font (Inter vs system) vs SVG close paths.
4. `videocam` as “inscribe” is camera metaphor, not pen/inscription — semantic miss for product copy.

### 9. Decorative `aria-hidden` (wiki 7.9 spirit)

| Status | Evidence |
| --- | --- |
| **Pass** | Popup Material icons; popup SVGs; DetailModal close/poster SVGs; EmptyStateProjection; FilmGrain; chevrons in DetailModal / HardcoverSpineCard; bookOverlay star/dot |
| **Gap** | [`App.tsx:386`](../../../src/ui/App.tsx) — subnav Material **no** `aria-hidden` (label is adjacent text — usually OK, but glyph may be announced by some AT) |
| **Gap** | All hover-card SVGs ([`hoverCard.tsx:114`](../../../src/content/hoverCard.tsx), `209`, `223`, `579`, `606`) — no `aria-hidden` |
| **Gap** | Unicode `×` is **accessible name** for several buttons (acceptable if `aria-label` present) — People/Notice/tags OK; popup deselect has `title` only ([`popup.tsx:605-612`](../../../src/ui/popup.tsx)) |

### 10. Brand fit — Cinema Black + Rosso Corsa

| Element | Fit |
| --- | --- |
| Empty projector (Rosso stroke + beam) | Strong |
| Roman house nav | Strong (editorial, scarce) |
| Popup brand mark square (`--primary`) | Strong, minimal |
| Material Symbols suite | Weak — Google product chrome |
| `auto_awesome` sparkles | Fail — AI-template cliché |
| Gold toolbar icons | Fail — pre-Ferrari gold system |
| Emoji ratings | Fail |
| Success check in green circle | Acceptable semantic success (not brand red) — keep distinct from Rosso |
| Scarce primary on `videocam` brand capture only | Partial |

---

## Consistency gaps (file:line)

| ID | Severity | Gap | File:line |
| --- | --- | --- | --- |
| **I1** | P0 | No shared Icon component / stroke / size scale | (system absence) |
| **I2** | P0 | Material Symbols as default chrome | `index.html:11`, `popup.html:13-15`, `App.tsx:373+`, `popup.tsx:377+` |
| **I3** | P0 | Toolbar icons still gold cinema spiral | `src/assets/icons/icon*.png`, `manifest.json:51-61` |
| **I4** | P1 | Emoji ratings on hover card | `hoverCard.tsx:139`, `146` |
| **I5** | P1 | `auto_awesome` AI tell for Recommendations | `App.tsx:42` |
| **I6** | P1 | Stroke width set {1, 1.5, 2, 2.5} across SVGs | `DetailModal.tsx:528,547`; `popup.tsx:351,507,595,673`; `hoverCard.tsx:114,209` |
| **I7** | P1 | Size scale free-for-all (10 / 14 / 16 / 18 / 20 / 24 / 32 / 40 / 72) | `sidebar.css:8`; `app-nav.css:118`; `popup.css:798,803,838` |
| **I8** | P1 | `.side-menu-roman` styles applied to Material icons | `App.tsx:448,464` + `sidebar.css:274-280` |
| **I9** | P1 | Dual identity: Romans for house, Material for explore | `App.tsx:40-56`, `75-80` vs `386` |
| **I10** | P2 | Subnav Material missing `aria-hidden` | `App.tsx:386` |
| **I11** | P2 | Hover-card SVGs missing `aria-hidden` | `hoverCard.tsx:114,209,223,579,606` |
| **I12** | P2 | Unicode chevron triumvirate (`▴▾`, `▸▾`, CSS content) vs SVG | `DetailModal.tsx:755`; `sanctuary.css:2655-2660`; `settings-nav.css:193-199` |
| **I13** | P2 | Recs group toggle is ASCII `[ + ]` not icon | `Recommendations.tsx:474-477` |
| **I14** | P2 | Legacy `.empty-state-icon { font-size: 40px }` template residue | `layout.css:77-80` |
| **I15** | P2 | Popup deselect `×` lacks `aria-label` (title only) | `popup.tsx:605-612` |
| **I16** | P2 | Semantic: `videocam` for “Inscribe” | `popup.tsx:467,482` |
| **I17** | P3 | Morphing three-line system not adopted (wiki LOW) | out of scope; document choice |
| **I18** | P3 | External font + CSP/network for icon font on every shell load | `index.html` / `popup.html` |

---

## Recommendations for an icon system

### Principles (sanctuary)

1. **One stroke language** — monoline, round caps, optical size 16 / 20 / 24 only. Prefer `stroke-width: 1.5` at 24 viewBox (≈1.25 at 20). Ban 2.5 for UI chrome.
2. **No Material Symbols in product chrome** — remove Google font links after cutover; keep zero runtime font dependency for icons.
3. **Scarce Rosso** — icons inherit `currentColor` (fg-muted / fg-base on hover). Rosso only for empty-state frame, brand mark, or active primary CTA glyph — never rainbow status icons.
4. **No emoji** in extension UI. Ratings: monoline star + text “IMDb” / “RT”, or lettermarks.
5. **House vs utility** — keep Roman I–III (or small custom house monograms) for primary destinations; use a **cinema-house subset** for utility (close, search, alert, chart, person/reel, book, open-external).
6. **Decorative icons** always `aria-hidden="true"`; interactive controls expose name via `aria-label` / visible text.
7. **Toolbar / store icons** remastered: Cinema Black disc, Rosso Corsa hairline spiral or monogram “S”, no gold, legible at 16px.

### Proposed kit (12–16 SVGs)

Suggested monoline set (name → metaphor):

| Token | Metaphor |
| --- | --- |
| `close` | hairline × |
| `menu` | three lines (or omit if Romans-only mobile) |
| `search` | ring + stem |
| `archive` / house I | spine or ticket stub |
| `discovery` | aperture / beam |
| `settings` | slim gear or sliders |
| `marquee` | now showing / ribbon |
| `creators` | silhouette or clapper |
| `alerts` | slim bell |
| `stats` | two bars |
| `inscribe` | pen / fountain tip (replace videocam) |
| `open-external` | arrow out of frame |
| `check` | two-segment check |
| `plus` / `trash` | hover card actions |
| `star` | monoline rating |
| `frame` | film frame poster fallback (unify DetailModal / hover / empty) |

Optional: Phosphor **Light** or custom subset bundled as React/Preact components under `src/ui/icons/`.

### Size tokens (CSS)

```css
--icon-xs: 14px;   /* dense chips only */
--icon-sm: 16px;   /* inline with 13px body */
--icon-md: 20px;   /* buttons, popup header */
--icon-lg: 24px;   /* nav chrome */
--icon-hero: 72px; /* empty projector only */
--icon-stroke: 1.5;
```

### Implementation shape

```tsx
// src/ui/icons/Icon.tsx — single entry
export function Icon({ name, size = 'md', decorative = true, ... }) { ... }
```

- Map `name` → path data; `currentColor`; fixed viewBox `0 0 24 24`.
- Content scripts: inject the same path strings (or shared module) so hover/dock match sanctuary.

---

## Top fixes (prioritized)

### 1. Kill emoji + unify rating stars (quick win)

- Replace ⭐ / 🍅 in [`hoverCard.tsx:139-146`](../../../src/content/hoverCard.tsx) with monoline star SVG + label, or plain “IMDb” / “RT” chips without emoji.
- Standardize `★` rating displays to one monoline star or typographic star with shared color (`--fg-muted` / scarce primary), not platform emoji.

### 2. Fix drawer Material sizing class + subnav a11y (quick win)

- Stop putting Material glyphs in `.side-menu-roman` ([`App.tsx:448,464`](../../../src/ui/App.tsx)). Use a dedicated `.side-menu-icon` (20px, UI font stack / symbol font, not mono 10px).
- Add `aria-hidden="true"` on subnav icons ([`App.tsx:386`](../../../src/ui/App.tsx)) and all hover-card SVGs.
- Add `aria-label="Deselect title"` on popup deselect ([`popup.tsx:605`](../../../src/ui/popup.tsx)).

### 3. Replace Material + remaster toolbar icons (system)

- Introduce `src/ui/icons/` with ~14 monoline SVGs; swap App shell + popup usages.
- Drop Material `<link>` from `index.html` / `popup.html` once unused.
- Retire `auto_awesome` → marquee / programme icon; `videocam` → inscribe/pen.
- Export new `icon16/48/128` on Cinema Black + Rosso (no gold spiral).
- Normalize all ad-hoc SVG `stroke-width` to **1.5** (hero empty frame may stay 1–1.5).

---

## Score breakdown

| Dimension | Score | Weight note |
| --- | --- | --- |
| Single system / consistency | 2/10 | Four sources |
| Size & stroke discipline | 3/10 | No tokens; 1–2.5 stroke |
| Brand fit (Cinema Black + Rosso) | 4/10 | Empty state strong; Material + gold toolbar weak |
| Optical alignment | 4/10 | side-menu-roman misuse; mixed × |
| a11y decorative pattern | 6.5/10 | Many fixed; content script gaps |
| Empty / status pictographs | 6/10 | Projector excellent; emoji fail |
| Chrome action brand | 3/10 | Gold legacy |
| **Overall** | **4.5/10** | |

---

## Related prior reviews

- [`2026-08-04/06-high-end-visual-design.md`](../2026-08-04/06-high-end-visual-design.md) — P1 Material Symbols + empty icons  
- [`2026-08-04/14-redesign-existing-projects.md`](../2026-08-04/14-redesign-existing-projects.md) — W4 Icons / custom house set  
- [`2026-08-04/07-userinterface-wiki.md`](../2026-08-04/07-userinterface-wiki.md) — morphing icons out of scope; aria-hidden spirit  
- [`2026-08-04/08-design-taste-frontend.md`](../2026-08-04/08-design-taste-frontend.md) — T13 Material kit  

---

## Verdict

Treat icons as a **first-class design system slice**, not leftover Material + paste SVGs. Keep the projector empty state and Roman house nav as seeds of a cinema-house language; replace Material, emoji, gold toolbar art, and stroke chaos with a 14-icon monoline set on `currentColor`, sized by tokens, always decorative-hidden when paired with text or `aria-label`.
