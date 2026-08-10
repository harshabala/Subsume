# User Interface Wiki Review — Subsume

**Date:** 2026-08-10  
**Skill:** userinterface-wiki v3.0.0 (152 rules / 12 categories)  
**Repo:** `/Users/harshabalakrishnan/Subsume` @ `a5471b5`  
**Scope:** Animation principles, timing, exits, CSS pseudo, audio, icons, container motion, Laws of UX, prefetch, typography, visual design  
**Mode:** Read-only code review  

## Score: **8.0 / 10**

Since 2026-08-04, the high-severity gaps closed: **no `transition: all`**, **Stats tabular-nums**, **decorative SVG / Material `aria-hidden`**, and **stronger `:focus-visible` rings** on lobby links + filmography select. Remaining debt is prefetch depth, a few hover durations still at the 280–300ms ceiling, pure-black shadow fallbacks, and decorative scale overshoot outside the 0.95–1.05 band.

---

## Category scores

| Priority | Category | Score | Notes |
|----------|----------|-------|-------|
| 1 | Animation Principles | 8.5 | Curtain ≤300ms, PRM nuclear + local, active scale, 40ms stagger, modal dim |
| 2 | Timing Functions | 8.5 | Explicit property lists; residual 0.3s / curtain-on-hover |
| 3 | Exit Animations | 8.5 | `closing` + `animationend` / `transitionend` + fallbacks |
| 4 | CSS Pseudo Elements | 8.0 | Hit-target `::before`, selection/placeholder, focus rings restored |
| 5 | Audio Feedback | N/A | No UI sound (correct for quiet cinematic product) |
| 6 | Sound Synthesis | N/A | — |
| 7 | Morphing Icons | 6.0 | Material Symbols + SVG (not 3-line morph); a11y mostly fixed |
| 8 | Container Animation | 7.5 | Grid 0fr→1fr accordion; reflection still max-height pattern |
| 9 | Laws of UX | 8.0 | 44px primary chrome, skeletons, progressive onboarding |
| 10 | Predictive Prefetching | 6.5 | Intent map + focus; still hover-only trajectory |
| 11 | Typography | 8.5 | antialiased, synthesis none, swap, balance, Stats tnum |
| 12 | Visual Design | 8.0 | Tinted token shadows, alpha borders, spacing scale |

---

## Findings by category

### 1. Animation Principles (CRITICAL)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Pass | `timing-under-300ms` | `src/shared/tokens.css:99-102` | `--duration-curtain: 280ms`, `--duration-curtain-close: 220ms`, soft-settle 280ms; explicit UI-wiki comment |
| Pass | `timing-under-300ms` | `src/styles/sanctuary.css:580-606` | Modal enter/exit bound to curtain tokens |
| Pass | `easing-no-linear-motion` | `src/ui/styles/layout.css:108` | Linear only on spinner (`subsume-ui-spin`) |
| Pass | `physics-active-state` | `src/ui/styles/global.css:109-111` | Global `button:active { transform: scale(0.97) }` |
| Pass | `physics-subtle-deformation` | `src/styles/sanctuary.css:116-117` | Interactive press scales ~0.97–0.98 |
| Pass | `physics-no-excessive-stagger` | `src/ui/styles/library.css:24-25` | `min(index,5) * 40ms` (<50ms) |
| Pass | `staging-dim-background` | `src/styles/sanctuary.css:570-584` | Modal backdrop enter/exit with scrim |
| Pass | PRM | `src/ui/styles/global.css:607-615` | Nuclear reduced-motion collapse |
| Low | `staging-one-focal-point` | `src/ui/styles/emotional-components.css:339-376` | Empty projector runs **three** concurrent enter animations (`in`, `beam`, `frame`) |
| Low | continuous pulse | `src/ui/styles/poetic-sanctuary.css:126-131` | `poetic-pulse` infinite 1.8s loading chrome (PRM kills via global rule) |
| Medium | `duration-press-hover` | `src/content/overlay.ts:129-133` | Museum plaque hover uses `--duration-curtain` (280ms) — over preferred 120–180ms hover band |
| Medium | `duration-press-hover` | `src/content/bookOverlay.ts:72-75` | Book plaque same curtain-duration hover |

### 2. Timing Functions (HIGH)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Pass | `duration-max-300ms` | `src/shared/tokens.css:68-102` | User-facing ladder 100 / 130 / 220 / 260 / 280 / 300ms |
| Pass | property specificity | codebase-wide | **No remaining `transition: all`** (fixed since 08-04) |
| Pass | `easing-entrance-ease-out` | `src/styles/sanctuary.css:580-601` | Modal enter uses decelerating `--ease-focus-pull` |
| Info | `easing-exit-ease-in` | `src/shared/tokens.css:101-102` | Project **intentionally** uses shorter exit with ease-out family (“not ease-in”) — wiki prefers ease-in exits; document as product choice |
| Pass | `duration-press-hover` (token) | `src/shared/tokens.css:69` | `--duration-fast: 130ms` fits 120–180ms |
| Medium | `duration-press-hover` | `src/ui/styles/poetic-sanctuary.css:165` | `.poetic-retry-btn { transition: border-color 0.3s }` — 300ms for hover edge |
| Medium | `duration-press-hover` | `src/ui/styles/poetic-sanctuary.css:242-245` | Intent selector buttons 0.3s background/border/color |
| Low | hover band | `src/ui/styles/sidebar.css:63` | Nav tabs `0.2s` (slightly over 180ms preferred band) |
| Low | hover band | `src/ui/styles/layout.css:292` | `.plaque-btn` 0.2s property list |
| Pass | `none-high-frequency` / PRM | multi-file | Keyboard/PRM paths skip ceremony motion |

### 3. Exit Animations (HIGH)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Pass | exit lifecycle | `src/ui/components/DetailModal.tsx:362-380` | Close waits for exit `animationend` + 350ms timeout fallback; PRM skip |
| Pass | exit lifecycle | `src/ui/components/PoeticCaptureCanvas.tsx:179-193` | Same curtain-close pattern |
| Pass | exit lifecycle | `src/ui/App.tsx:148-161` | Drawer `transitionend` + 280ms fallback |
| Pass | exit symmetry | `src/styles/sanctuary.css:619-639` | Exit mirrors enter (scale 0.96 + translateY 8px reverse) |
| Pass | hover card exit | `src/content/hoverCard.tsx:655-659` | Exit 0.18s ≤ enter 0.25s; `pointer-events: none` while exiting |
| N/A | `exit-requires-wrapper` | — | No Framer `AnimatePresence`; CSS-class exit is project standard |
| Low | fallback budget | `src/ui/components/DetailModal.tsx:55` | `EXIT_FALLBACK_MS = 350` exceeds 300ms animation cap (safety only; animation itself ≤220ms) |

### 4. CSS Pseudo Elements (MEDIUM)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Pass | `pseudo-hit-target-expansion` | `src/ui/styles/popup.css:108-112` | `.popup-close-btn::before { inset: -6px }` |
| Pass | `native-selection-styling` | `src/ui/styles/global.css:37-40` | `::selection` brand colors |
| Pass | `native-placeholder-styling` | `src/ui/styles/global.css:201-204` | Placeholder tokenized |
| Pass | `pseudo-content-required` | `src/ui/styles/sidebar.css:83-89` | Active nav underline `::after { content: '' }` |
| Pass | focus replacement | `src/ui/styles/discovery-layout.css:65-68` | Lobby links now use 2px ring on `:focus-visible` (**fixed**) |
| Pass | focus replacement | `src/styles/sanctuary.css:1945-1948` | Filmography sort select ring (**fixed**) |
| Pass | focus | `src/styles/sanctuary.css:998-1000` | `.sanctuary-detail-input:focus-visible` ring |
| Info | View Transitions | — | No View Transitions API usage (optional; CSS class exits preferred) |

### 5–6. Audio / Sound Synthesis

| Severity | Rule | Finding |
|----------|------|---------|
| Pass | appropriate use | No UI audio / WebAudio. Correct for a quiet cinematic journal. No toggle debt. |

### 7. Morphing Icons (LOW)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Info | morphing system | — | Material Symbols Outlined + hand SVG, not 14×14 three-line morph — **not adopted** |
| Pass | `morphing-aria-hidden` (spirit) | `src/ui/components/DetailModal.tsx:528` | Close SVG has `aria-hidden="true"` (**fixed**) |
| Pass | | `src/ui/popup.tsx:351,507,595,673` | Inline SVGs now `aria-hidden` (**fixed**) |
| Low | decorative icon | `src/ui/App.tsx:386` | `.app-subnav-icon` Material span **missing** `aria-hidden="true"` (label text is sibling; icon still announced on some AT) |
| Pass | | `src/ui/App.tsx:373,417,448,464` | Menu/close/side-menu icons correctly hidden |

### 8. Container Animation (MEDIUM)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Pass | measured expand (spirit) | `src/styles/sanctuary.css:1263-1289` | Detail accordion: outer grid + inner overflow (`0fr`→`1fr`) — good two-layer pattern |
| Low | `container-two-div-pattern` | `src/styles/sanctuary.css:2857-2879` | Reflection excerpt still `max-height` + opacity on single inner (works; not ResizeObserver-measured) |
| Pass | duration | same | 0.28s max-height / 0.22s opacity ≤300ms |
| Pass | PRM | `src/styles/sanctuary.css:2908-2911` | Expand transitions disabled under reduced motion |

### 9. Laws of UX (HIGH)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Pass | `ux-fitts-target-size` | `src/ui/styles/global.css:103` | Default `button { min-height: 44px }` |
| Pass | `ux-fitts-target-size` | `src/ui/styles/app-nav.css:85-87` | Subnav links min 44×44 |
| Pass | `ux-fitts-target-size` | `src/ui/styles/popup.css:101-102` | Close visual 32 + min 44 + `::before` pad |
| Pass | `ux-fitts-target-size` | `src/styles/sanctuary.css:658-659` | Modal close 44×44 |
| Borderline | `ux-fitts-target-size` | `src/styles/sanctuary.css:227-230` | `.optical-button.sm` min-height 32px (wiki min met; below project 44px norm) |
| Borderline | `ux-fitts-target-size` | `src/ui/styles/people.css:686-687` | Unfollow control 32×32 |
| Borderline | `ux-fitts-target-size` | `src/ui/styles/discovery-search.css:50-57` | Filter chips: padding only, **no min-height** — may land under 32px depending on font metrics |
| Low | legacy modal close | `src/ui/styles/global.css:288-290` | `.modal-close` 32×32 without expanded hit area (legacy path if still used) |
| Pass | `ux-doherty-perceived-speed` | Home/Library/Recommendations skeletons | Skeleton pulse + staggered delays |
| Pass | `ux-progressive-disclosure` | `src/ui/pages/Onboarding.tsx` | Multi-step setup |
| Pass | `ux-goal-gradient-progress` | onboarding steps | Step dots + pane enter |
| Pass | focus trap | `src/ui/App.tsx` drawer / DetailModal | Tab trap + Esc close patterns present |

### 10. Predictive Prefetching (MEDIUM)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Pass | `prefetch-not-everything` | `src/ui/hooks/usePrefetch.ts:17-34` | Per-page intent map; mount only digests on home |
| Pass | `prefetch-keyboard-tab` (partial) | `src/ui/hooks/usePrefetch.ts:61-68` | `prefetchProps` includes `onFocus` |
| Pass | wiring | `src/ui/App.tsx:355,384,430` | Nav / subnav / drawer spread `prefetchProps` |
| **Medium** | `prefetch-trajectory-over-hover` | `src/ui/hooks/usePrefetch.ts:61-68` | Prefetch only on `onMouseEnter` / `onFocus` — **no pointer trajectory / hitSlop** |
| Low | `prefetch-touch-fallback` | same | No touch-specific path; relies on focus after tap / navigate |

### 11. Typography (MEDIUM)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Pass | `type-antialiased-on-retina` | `src/ui/styles/global.css:33-34` | `-webkit-font-smoothing: antialiased` |
| Pass | `type-no-font-synthesis` | `src/ui/styles/global.css:32` | `font-synthesis: none` |
| Pass | `type-font-display-swap` | `src/ui/index.html:10` | Google Fonts `display=swap` |
| Pass | `type-font-display-swap` | `src/ui/popup.html:10` | Same for popup |
| Pass | `type-text-wrap-balance-headings` | `src/ui/styles/global.css:47` | `h1–h6 { text-wrap: balance }` |
| Pass | `type-text-wrap-pretty` (partial) | `src/ui/styles/layout.css:96` | Empty-state description uses `pretty` |
| Pass | `type-letter-spacing-uppercase` | sanctuary / nav / poetic | Uppercase UI labels tracked |
| Pass | `type-underline-offset` | `src/styles/sanctuary.css:2899` | `text-underline-offset: 3px` |
| Pass | `type-tabular-nums-for-data` | `src/styles/sanctuary.css:3328` | `.stats-meta-value` tnum (**fixed**) |
| Pass | `type-tabular-nums-for-data` | `src/styles/sanctuary.css:3448` | `.stats-genre-count` tnum (**fixed**) |
| Pass | `type-tabular-nums-for-data` | `src/styles/sanctuary.css:3584` | `.stats-book-value` tnum (**fixed**) |
| Pass | | `src/ui/styles/layout.css:153`, `discovery-layout.css:189`, `popup.css:163` | Other data surfaces covered |
| Low | `type-text-wrap-pretty` | reflection / prose body | Not applied globally to long-form copy |

### 12. Visual Design (HIGH)

| Severity | Rule | File:line | Finding |
|----------|------|-----------|---------|
| Pass | `visual-no-pure-black-shadow` | `src/shared/tokens.css:78-81` | Shadows `hsla(240, 18%, 4%, …)` not `#000` |
| Pass | `visual-layered-shadows` / scale | tokens | sm → md → lg → hero elevation ladder |
| Pass | `visual-border-alpha-colors` | `src/shared/tokens.css:20-21` | `--border: hsla(0,0%,100%,0.08)` |
| Pass | `visual-consistent-spacing-scale` | `src/shared/tokens.css:49-58` | 4 / 8 / 12 / 20 / 24 / 32 / 48 / 64 ladder |
| Medium | pure-black fallback | `src/ui/styles/people.css:720` | `var(--shadow-card, 0 4px 12px rgba(0, 0, 0, 0.35))` |
| Low | pure-black fallback | `src/ui/components/inline-notice.css:62` | Fallback `rgba(0, 0, 0, 0.12)` |
| Low | pure black scrim | `src/shared/tokens.css:177` | `--overlay-bg: rgba(0, 0, 0, 0.7)` (prefer tinted like `--overlay-scrim`) |
| Low | `physics-subtle-deformation` | `src/ui/styles/emotional-components.css:433` | Emotion dots hover `scale(1.1)` > 1.05 band |
| Low | same | `src/ui/styles/emotional-components.css:86` | Slider thumb active `scale(1.08)` |
| Low | same | `src/ui/styles/popup.css:584` | Slider thumb hover `scale(1.08)` |
| Info | decorative scale | `src/ui/styles/onboarding.css:199` | Step-dot current `scale(1.35)` — indicator chrome, not press physics |

---

## Top fixes (actionable)

1. **Prefetch is hover/focus only** (`prefetch-trajectory-over-hover`) — **Top #1**  
   - `src/ui/hooks/usePrefetch.ts:61-68`  
   - **Fix:** optional pointer trajectory / earlier hitSlop on nav; keep intent map (already good). Touch: prefetch on `pointerdown` or first focus.

2. **Hover chrome too slow on plaques + poetic chips** (`duration-press-hover`) — **Top #2**  
   - `src/content/overlay.ts:129-133` (museum plaque → use `--duration-fast` / 130–180ms)  
   - `src/content/bookOverlay.ts:72-75` (book plaque)  
   - `src/ui/styles/poetic-sanctuary.css:165,242-245` (0.3s → `var(--transition-fast)`)  
   - **Fix:** reserve curtain 280ms for modal/ceremony only, not hover.

3. **Subnav icon a11y + pure-black shadow fallbacks** — **Top #3**  
   - `src/ui/App.tsx:386` — add `aria-hidden="true"` on `.app-subnav-icon`  
   - `src/ui/styles/people.css:720` — drop pure-black fallback; use `var(--shadow-md)` only  
   - `src/ui/components/inline-notice.css:62` — same  
   - Optional: clamp decorative scales to ≤1.05 (`emotional-components.css:86,433`, `popup.css:584`)

---

## What’s already excellent (do not regress)

- **Motion ≤300ms encoded in tokens** (`tokens.css:84-102`) with ceremony vs interaction distinction.
- **`transition: all` eliminated** — explicit property lists across CSS and content scripts.
- **Modal Slow Dolly + Curtain Close** with PRM skip and JS `closing` lifecycle.
- **Stats + data surfaces use `tabular-nums`** (meta, genre counts, book values, pulse, popup).
- **Focus-visible coverage** restored on lobby links, filmography select, detail inputs, discovery search.
- **Decorative SVG / Material icons mostly `aria-hidden`**.
- **Fitts 44px** default buttons, subnav, modal close, popup chrome.
- **Prefetch intent map** with mount restraint (not prefetch-everything).
- **Tinted primary shadow tokens**; alpha borders; spacing scale.
- **Global + component `prefers-reduced-motion`**.

---

## Delta vs 2026-08-04 (7.5 → 8.0)

| Fixed | Still open |
|-------|------------|
| `transition: all` sprawl | Prefetch trajectory |
| Stats missing tnum | Hover at 280–300ms on plaques/poetic |
| DetailModal/popup SVG aria-hidden | Subnav icon aria-hidden |
| Lobby / filmography weak focus | Pure-black shadow fallbacks |
| | Decorative scale >1.05 |

---

## Suggested fix order

1. Plaque/poetic hover → `--duration-fast` / `var(--transition-fast)` (10 min, high snappiness).  
2. `aria-hidden` on `app-subnav-icon` + shadow fallback cleanup (5 min).  
3. (Optional) trajectory / hitSlop prefetch if nav latency still felt.  
4. Clamp decorative hover scales to 0.95–1.05.  
5. Add `min-height: 32px` (or 44px) to discovery search filters if hit testing feels tight.

---

## Score rationale

| Band | Criteria |
|------|----------|
| 9–10 | Trajectory prefetch; hover ≤180ms everywhere; no pure-black shadow fallbacks; scale band clean |
| **8.0 (this review)** | Strong motion/a11y/type foundations; residual hover timing + prefetch depth + polish |
| 7.5 (08-04) | Same base + tnum + `transition: all` debt |
| ≤6 | Durations >300ms, missing PRM, no focus rings, pure-black shadow system |

**Final score: 8.0 / 10**
