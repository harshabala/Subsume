# User Interface Wiki Review — Subsume

**Date:** 2026-08-04  
**Skill:** userinterface-wiki v3.0.0 (152 rules / 12 categories)  
**Scope:** Animation principles, CSS, typography, UX patterns, icons, a11y focus, motion ≤300ms (project docs + implementation)  
**Mode:** Read-only code review  

## Score: **7.5 / 10**

Strong cinematic motion system already aligned to `timing-under-300ms` / `duration-max-300ms` via tokens and exit lifecycles. Gaps are mostly residual `transition: all`, incomplete tabular numerals on Stats, hover-only prefetch, and a few focus/outline edge cases.

---

## Category scores

| Priority | Category | Score | Notes |
|----------|----------|-------|-------|
| 1 | Animation Principles | 8.5 | Curtain ≤300ms, PRM, active scale, 40ms stagger, modal dim |
| 2 | Timing Functions | 8.0 | Token ladder 100–280ms; enter ease-out / exit ease-in on modals |
| 3 | Exit Animations | 8.5 | `closing` + `animationend` (no Framer); drawer transitionend |
| 4 | CSS Pseudo Elements | 7.0 | Hit-target `::before` on popup close; some outline:none |
| 5 | Audio Feedback | N/A | No UI sound (correct — no decorative audio debt) |
| 6 | Sound Synthesis | N/A | — |
| 7 | Morphing Icons | 5.5 | Material Symbols + ad-hoc SVG; not a 3-line morph system |
| 8 | Container Animation | 7.0 | max-height expand ok; not ResizeObserver two-div pattern |
| 9 | Laws of UX | 8.0 | 44px targets, skeletons, progressive onboarding, chunking |
| 10 | Predictive Prefetching | 6.5 | Intent prefetch exists; hover/focus only, no trajectory |
| 11 | Typography | 7.5 | antialiased, font-synthesis none, balance; Stats nums miss tnum |
| 12 | Visual Design | 8.0 | Tinted shadows, spacing tokens, alpha borders |

---

## Findings by category

### 1. Animation Principles (CRITICAL)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Pass | `timing-under-300ms` | `src/shared/tokens.css:79-96` | Explicit UI-wiki constraint; `--duration-curtain: 280ms`, `--duration-curtain-close: 300ms`, `--duration-soft-settle: 280ms` |
| Pass | `timing-under-300ms` | `src/styles/sanctuary.css:564-601` | Modal enter/exit animations bound to curtain tokens ≤300ms |
| Pass | `easing-no-linear-motion` | `src/ui/styles/layout.css:107` | Linear only on spinner (`subsume-ui-spin`) |
| Pass | `physics-active-state` | `src/ui/styles/global.css:109-111` | Global `button:active { transform: scale(0.97) }` |
| Pass | `physics-subtle-deformation` | `src/styles/sanctuary.css:116-117` | Interactive scales in 0.97–0.98 range |
| Pass | `physics-no-excessive-stagger` | `src/ui/styles/library.css:24-25` | Stagger `min(index,5) * 40ms` (<50ms) |
| Pass | `staging-dim-background` | `src/styles/sanctuary.css:565+` | Modal backdrop enter/exit with scrim |
| Pass | PRM | `src/ui/styles/global.css:606-614` | Nuclear reduced-motion: transitions/animations collapsed |
| Low | `staging-one-focal-point` | `src/ui/styles/emotional-components.css:339-376` | Empty projector runs **three** concurrent enter animations (`in`, `beam`, `frame`) at once |
| Low | continuous pulse | `src/ui/styles/poetic-sanctuary.css:126-131` | `poetic-pulse` infinite 1.8s on loading chrome (acceptable as loading indicator; ensure PRM kills it — global rule does) |

### 2. Timing Functions (HIGH)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Pass | `duration-max-300ms` | `src/shared/tokens.css:63-96` | User-facing durations: 100 / 130 / 220 / 260 / 280 / 300ms |
| Pass | `easing-entrance-ease-out` | `src/styles/sanctuary.css:575-596` | Modal enter uses `--ease-focus-pull` (decelerating) |
| Pass | `easing-exit-ease-in` | `src/styles/sanctuary.css:579-601` | Modal exit uses `ease-in` |
| Pass | `duration-press-hover` (partial) | `src/shared/tokens.css:64` | `--duration-fast: 130ms` fits 120–180ms band |
| Medium | `duration-press-hover` | `src/ui/styles/sidebar.css:63` | `transition: all 0.2s ease` on nav tabs — 200ms slightly over preferred 180ms hover band |
| Medium | property specificity | `src/content/overlay.ts:163` | `transition: all 280ms` on `.plaque-reveal` — animates all properties, not only max-width/opacity |
| Medium | property specificity | `src/ui/styles/popup.css:237,338,673,709` | Multiple `transition: all 0.2s` on popup controls |
| Medium | property specificity | `src/ui/styles/people.css:28,469,616` | `transition: all 0.2s ease` on people chrome |
| Medium | property specificity | `src/ui/styles/onboarding.css:153` | `.onboarding-cta { transition: all 220ms ease }` |
| Medium | property specificity | `src/ui/styles/discovery-search.css:57` | `.discovery-search-filter { transition: all var(--transition-fast) }` |
| Medium | property specificity | `src/ui/styles/layout.css:292` | `transition: all 0.2s ease` |

### 3. Exit Animations (HIGH)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Pass | exit lifecycle | `src/ui/components/DetailModal.tsx:360-375` | Close waits for exit `animationend` + timeout fallback; PRM skips |
| Pass | exit lifecycle | `src/ui/components/PoeticCaptureCanvas.tsx:179-193` | Same curtain-close pattern |
| Pass | exit lifecycle | `src/ui/App.tsx:148-161` | Drawer `transitionend` + 280ms fallback |
| Pass | key stability | `src/ui/components/DiscoveryFeedCard.tsx` / archive cards | Feed/library use stable keys with stagger index as style var, not React key |
| N/A | `exit-requires-wrapper` | — | No Framer `AnimatePresence`; CSS-class exit pattern is project standard |

### 4. CSS Pseudo Elements (MEDIUM)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Pass | `pseudo-hit-target-expansion` | `src/ui/styles/popup.css:107-112` | `.popup-close-btn::before { inset: -6px }` expands hit area |
| Pass | `native-selection-styling` | `src/ui/styles/global.css:37-40` | `::selection` uses brand `--selection-bg` |
| Pass | `native-placeholder-styling` | `src/ui/styles/global.css:200-203` | Placeholder color tokenized |
| Pass | `pseudo-content-required` | `src/ui/styles/sidebar.css:81-89` | Active nav underline via `::after { content: '' }` |
| Low | focus replacement | `src/ui/styles/discovery-layout.css:59-64` | `.discovery-lobby-text-link:focus-visible { outline: none }` relies only on border-bottom — weak for high-contrast / Windows HC |
| Pass | focus replacement | `src/ui/styles/discovery-layout.css:171-178` | Pulse items replace outline with inset box-shadow (acceptable) |

### 5–6. Audio / Sound Synthesis

| Severity | Rule | Finding |
|----------|------|---------|
| Pass | appropriate use | No UI audio / WebAudio synthesis. Correct for a quiet cinematic journal product. No toggle debt. |

### 7. Morphing Icons (LOW)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Info | morphing system | — | Project uses Material Symbols Outlined + hand-written SVG, not 14×14 three-line morph icons — **out of scope / not adopted** |
| Medium | `morphing-aria-hidden` (spirit) | `src/ui/components/DetailModal.tsx:521-524` | Close SVG is decorative under `aria-label` button but lacks `aria-hidden="true"` |
| Medium | decorative SVG | `src/ui/popup.tsx:351-353,507-509,595-597,673-675` | Inline SVGs generally missing `aria-hidden` |
| Pass | | `src/ui/popup.tsx:377` | Material icons correctly `aria-hidden="true"` |
| Pass | | `src/ui/components/FilmGrain.tsx:36` | Grain SVG `aria-hidden="true"` |
| Pass | | `src/ui/components/EmptyStateProjection.tsx:24-30` | Frame SVG `aria-hidden="true"` |

### 8. Container Animation (MEDIUM)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Low | `container-two-div-pattern` | `src/styles/sanctuary.css:2794-2821` | Reflection expand uses `max-height` + opacity on single panel-inner (works; not measured ResizeObserver pattern) |
| Pass | duration | same | 0.28s max-height / 0.22s opacity ≤300ms |
| Pass | PRM | `src/styles/sanctuary.css:2850+` | Expand transitions disabled under reduced motion |

### 9. Laws of UX (HIGH)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Pass | `ux-fitts-target-size` | `src/ui/styles/global.css:103` | Default `button { min-height: 44px }` |
| Pass | `ux-fitts-target-size` | `src/ui/styles/popup.css:101-102,817-818` | Icon buttons min 44×44 |
| Pass | `ux-fitts-target-size` | `src/styles/sanctuary.css:653-657` | Modal close 44×44 |
| Borderline | `ux-fitts-target-size` | `src/styles/sanctuary.css:222-226` | `.optical-button.sm` min-height 32px (meets wiki min, below project 44px chrome norm) |
| Borderline | `ux-fitts-target-size` | `src/ui/styles/people.css:681-682` | Unfollow control 32×32 |
| Pass | `ux-doherty-perceived-speed` | skeletons in App/Home/Library/Recommendations | Skeleton pulse + staggered delays |
| Pass | `ux-progressive-disclosure` | `src/ui/pages/Onboarding.tsx` | Multi-step setup with progress nav |
| Pass | `ux-goal-gradient-progress` | onboarding steps | `aria-current="step"` progress |
| Pass | `ux-jakobs-familiar-patterns` | nav, dialog, search, settings sections | Standard patterns |
| Pass | focus trap | `src/ui/App.tsx:220-248` | Drawer Tab trap + Esc close |

### 10. Predictive Prefetching (MEDIUM)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Pass | `prefetch-not-everything` | `src/ui/hooks/usePrefetch.ts:17-34` | Per-page intent map; mount only digests on home |
| Pass | `prefetch-keyboard-tab` (partial) | `src/ui/hooks/usePrefetch.ts:61-68` | `prefetchProps` includes `onFocus` |
| Medium | `prefetch-trajectory-over-hover` | `src/ui/hooks/usePrefetch.ts:61-68` | Prefetch on `onMouseEnter` only — no pointer trajectory / hitSlop prediction |
| Low | `prefetch-touch-fallback` | same | No touch-specific path; touch relies on focus/navigation after tap |

### 11. Typography (MEDIUM)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Pass | `type-antialiased-on-retina` | `src/ui/styles/global.css:33-34` | `-webkit-font-smoothing: antialiased` |
| Pass | `type-no-font-synthesis` | `src/ui/styles/global.css:32` | `font-synthesis: none` |
| Pass | `type-font-display-swap` | `src/ui/index.html:10` | Google Fonts `display=swap` |
| Pass | `type-text-wrap-balance-headings` | `src/ui/styles/global.css:47` | `h1–h6 { text-wrap: balance }` |
| Pass | `type-text-wrap-pretty` (partial) | `src/ui/styles/layout.css:96` | Empty-state description uses `pretty` |
| Pass | `type-letter-spacing-uppercase` | widespread in sanctuary/nav | Uppercase UI labels spaced |
| Pass | `type-underline-offset` | `src/styles/sanctuary.css:2841` | `text-underline-offset: 3px` |
| Pass | `type-tabular-nums-for-data` | `src/ui/styles/layout.css:152-154` | `.stat-value` |
| Pass | `type-tabular-nums-for-data` | `src/ui/styles/discovery-layout.css:185` | Pulse values |
| Pass | `type-tabular-nums-for-data` | `src/ui/styles/popup.css:163` | Popup stats |
| **High** | `type-tabular-nums-for-data` | `src/styles/sanctuary.css:3265-3272` | `.stats-meta-value` — Stats programme counts **missing** `font-variant-numeric: tabular-nums` |
| **High** | `type-tabular-nums-for-data` | `src/styles/sanctuary.css:3519-3526` | `.stats-book-value` — large book stats missing tnum |
| **High** | `type-tabular-nums-for-data` | `src/styles/sanctuary.css:3385-3389` | `.stats-genre-count` — column counts missing tnum |
| Low | `type-text-wrap-pretty` | body copy generally | Not applied to reflection/prose body globally |

### 12. Visual Design (HIGH)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Pass | `visual-no-pure-black-shadow` | `src/shared/tokens.css:72-76` | Shadows use `hsla(240, 18%, 4%, …)` not `#000` |
| Pass | `visual-layered-shadows` / scale | tokens | sm → md → lg → hero elevation ladder |
| Pass | `visual-border-alpha-colors` | `src/shared/tokens.css:20-21` | `--border: hsla(0,0%,100%,0.08)` |
| Pass | `visual-consistent-spacing-scale` | `src/shared/tokens.css:48-54` | 4 / 8 / 12 / 20 / 24 / 32 ladder |
| Medium | pure-black fallback | `src/ui/styles/people.css:715` | Fallback `0 4px 12px rgba(0, 0, 0, 0.35)` |
| Low | pure-black fallback | `src/ui/components/inline-notice.css:45` | Fallback `rgba(0, 0, 0, 0.12)` |
| Pass | concentric radius (partial) | card system | Cards use token radii; nested controls often 2–4px inside 4–8px shells |

### A11y focus (cross-cutting)

| Severity | Rule / theme | File:line | Finding |
|----------|--------------|-----------|---------|
| Pass | focus-visible global | `src/ui/styles/global.css:191-198` | `button/a/input/select/textarea:focus-visible` ring via `--ring` |
| Pass | focus-visible components | sanctuary, recommendations, settings, people, sidebar, popup | Broad coverage |
| Medium | outline none without ring | `src/styles/sanctuary.css:985-990` | `.sanctuary-detail-input` sets `outline: none`; focus only changes border — no 2px ring (global focus-visible may still apply if specificity allows) |
| Medium | outline none | `src/styles/sanctuary.css:1885-1888` | `.filmography-sort-select` outline none; no dedicated `:focus-visible` style in same block |
| Pass | modal a11y | `DetailModal.tsx:513-519` | `role="dialog"`, `aria-modal`, `aria-labelledby` |

---

## Top 5 findings (actionable)

1. **Stats data numerals lack tabular-nums** (`type-tabular-nums-for-data`)  
   - `src/styles/sanctuary.css:3265` `.stats-meta-value`  
   - `src/styles/sanctuary.css:3519` `.stats-book-value`  
   - `src/styles/sanctuary.css:3385` `.stats-genre-count`  
   - **Fix:** add `font-variant-numeric: tabular-nums;` (align with `.stat-value` / pulse / popup).

2. **`transition: all` sprawl** (timing cleanliness / paint cost)  
   - `src/content/overlay.ts:163`  
   - `src/ui/styles/popup.css:237,338,673,709`  
   - `src/ui/styles/people.css:28,469,616`  
   - `src/ui/styles/sidebar.css:63`  
   - `src/ui/styles/onboarding.css:153`  
   - `src/ui/styles/discovery-search.css:57`  
   - `src/ui/styles/layout.css:292`  
   - **Fix:** list only animated properties (color, border-color, background, transform, opacity).

3. **Prefetch is hover/focus only** (`prefetch-trajectory-over-hover`)  
   - `src/ui/hooks/usePrefetch.ts:61-68`  
   - **Fix:** optional pointer trajectory / earlier hitSlop on nav; keep intent map (already good).

4. **Decorative SVGs missing `aria-hidden`** (icon a11y)  
   - `src/ui/components/DetailModal.tsx:521`  
   - `src/ui/popup.tsx:351,507,595,673`  
   - **Fix:** `aria-hidden="true"` on SVGs inside labeled buttons.

5. **Weak / missing focus rings on a few surfaces**  
   - `src/ui/styles/discovery-layout.css:59-64` lobby links remove outline without ring  
   - `src/styles/sanctuary.css:1885-1888` filmography sort select  
   - **Fix:** keep visible 2px ring or equivalent inset shadow on `:focus-visible`.

---

## What’s already excellent (do not regress)

- **Motion ≤300ms rule is encoded in tokens and comments** (`tokens.css:79-96`); ceremony durations shortened to soft-settle 280ms after motion audit.
- **Modal Slow Dolly + Curtain Close** with enter ease-out, exit ease-in, PRM skip, and JS `closing` lifecycle.
- **Global + local `prefers-reduced-motion`** coverage (global nuclear rule + component blocks).
- **Press physics** via `:active` scale across sanctuary and global buttons.
- **Fitts 44px** default button height and major chrome controls.
- **Typography foundation:** antialiased, no font-synthesis, `display=swap`, heading balance, uppercase tracking.
- **Prefetch intent map** with mount restraint (not prefetch-everything).
- **Shadow system** tinted (not pure black primary tokens); alpha borders; spacing scale.

---

## Suggested fix order

1. Add `tabular-nums` to Stats value classes (5 min, high polish).  
2. Replace remaining `transition: all` with explicit property lists.  
3. `aria-hidden` on decorative SVGs.  
4. Restore stronger `:focus-visible` on lobby links + filmography select.  
5. (Optional) trajectory prefetch for nav — only if perceived nav latency remains.

---

## Score rationale

| Band | Criteria |
|------|----------|
| 9–10 | Wiki rules nearly complete; no `transition: all`; full tnum data surfaces; trajectory prefetch |
| **7.5 (this review)** | Strong motion/a11y foundations; residual CSS hygiene + Stats tnum + prefetch depth |
| ≤6 | Durations >300ms, missing PRM, no focus rings, pure-black shadow system |

**Final score: 7.5 / 10**
