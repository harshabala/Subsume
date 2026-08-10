# Apple Design Review — Subsume

**Date:** 2026-08-04  
**Lens:** Apple Design skill (WWDC *Designing Fluid Interfaces* + materials/type/reduced-motion foundations)  
**Product:** Subsume Chrome MV3 extension — sanctuary for films/books; Ferrari palette `#da291c` on `#181818`  
**Scope (read-only):** motion tokens, gesture/interaction CSS, sheets/modals, focus states, reduced-motion, typography optical sizing, translucent materials, depth  
**Key surfaces:** `src/shared/tokens.css`, `src/ui/styles/*`, `src/styles/sanctuary.css`, DetailModal, onboarding, popup, dock/overlay content  

---

## Score: **6.7 / 10**

Subsume is strong at **crafted, time-boxed motion** and **press feedback**, and has improved on **interrupt-friendly dismiss** and **focus traps**. It still reads as a **scripted cinematic UI** rather than a **fluid, velocity-aware interface**: almost no springs, no 1:1 gesture surfaces, asymmetric modal paths by design, and accessibility media queries that conflate motion with materials.

| Dimension | Score | Notes |
|-----------|------:|-------|
| Response / press feedback | 8.0 | `:active` scale on buttons; range draft while dragging; focus-visible rings |
| Direct manipulation / gestures | 4.5 | Sliders continuous; no sheet drag, rubber-band, pointer capture |
| Interruptibility | 6.0 | Esc mid-exit finishes close; still CSS-locked mid-flight |
| Springs / velocity handoff | 3.0 | Fixed-duration CSS only; soft-settle is a cubic/`linear()` recipe |
| Spatial consistency | 6.5 | Drawer + hover card good; modal enter≠exit; dock hard-cut |
| Materials & depth | 7.0 | Translucent nav/plaques; no reduced-transparency; blur on near-opaque |
| Reduced motion | 7.0 | Broad coverage; wrong coupling of blur to PRM |
| Typography (optical) | 6.5 | Size-specific tracking in places; no `font-optical-sizing`; Inter before system |
| Restraint / foundations | 7.5 | ≤300ms tokens, ceremony budget, intentional palette |

---

## What works (do not regress)

1. **Motion token discipline** — durations stay ≤300ms for user-facing work; soft-settle and curtain tokens are named and shared (`tokens.css` 63–97).
2. **Instant press response** — global `button:active { transform: scale(0.97) }` and sanctuary press scales (0.98) answer on pointer-down path, not only on click end.
3. **Continuous feedback on continuous controls** — DetailModal rating uses draft state + `onInput` while dragging; emotional aura interpolates with `--duration-soft-settle`.
4. **Dismiss interrupt (partial)** — second Esc during DetailModal exit finishes immediately (`DetailModal.tsx` 345–350); reduced-motion skips exit animation.
5. **Drawer spatial path** — side menu enters/exits on the same X axis from the right; `inert` + focus trap + Esc.
6. **Hover card path symmetry** — enter and exit share `translateY(8px) scale(0.96)` (`hoverCard.tsx` 644–658).
7. **Focus-visible system** — global ring on interactive controls; many sanctuary/popup/dock components mirror it.
8. **Display tracking** — large titles often use negative tracking (`-0.02em`); micro-labels use positive tracking for caps.

---

## Severity-ranked findings

Severity: **P0** blocker / safety · **P1** major Apple-fluid gap · **P2** clear craft gap · **P3** polish.

---

### P1 — Major

#### F01 — No springs; gesture-driven surfaces are CSS-scripted (interruptibility gap)

**Principle:** Behavior over animation; springs re-target from presentation value with velocity.

**Evidence:** Motion is almost entirely `@keyframes` + fixed `transition` durations. No Motion/Framer spring usage, no release-velocity handoff, no momentum projection.

```78:97:src/shared/tokens.css
  /* ─── Cinematic Motion ───────────────────────────────────────── */
  /* Ceremony may feel cinematic (ease + scale) but user-facing motion
     must stay ≤300ms per UI wiki — shorten, do not delete. */
  --ease-focus-pull: cubic-bezier(0.25, 1, 0.5, 1);
  /* Soft settle: decelerating linear() with no bounce/overshoot. ... */
  --ease-soft-settle: linear(
    0,
    0.25 20%,
    ...
  );
  --duration-soft-settle: 280ms;
  --duration-curtain: 280ms;
  --duration-curtain-close: 300ms;
```

```614:635:src/styles/sanctuary.css
@keyframes sanctuary-modal-enter {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes sanctuary-modal-exit {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.98) translateY(4px);
  }
}
```

**Why it fails Apple:** A user cannot grab a closing modal mid-flight and reverse it; the animation owns the frame until `animationend` or Esc abort. Soft-settle is a **fixed recipe**, not a velocity-aware spring.

**Fix direction:** For modal/drawer dismiss and any future sheet, drive `y`/`scale` with a spring library (or WAAPI with cancel-and-retarget from computed style). Reserve bounce only after momentum flicks; default critically damped (`bounce: 0`, ~0.3–0.4s response).

---

#### F02 — Modal enter/exit paths are deliberately asymmetric (spatial inconsistency)

**Principle:** “If something disappears one way, we expect it to emerge from where it came.” Mirror easing; same path.

**Evidence:** Enter uses `scale(0.96) translateY(8px)` + ease-out; exit uses `scale(0.98) translateY(4px)` + ease-in — smaller motion, different origin feel. Same pattern in Poetic capture.

| Surface | Enter | Exit |
|---------|-------|------|
| DetailModal | scale 0.96 · ty 8px · ease-out | scale 0.98 · ty 4px · ease-in |
| Poetic capture | same family | same family |

```599:601:src/styles/sanctuary.css
.sanctuary-modal-content.closing {
  /* Curtain Close: shorter, smaller motion, ease-in */
  animation: sanctuary-modal-exit var(--duration-curtain-close, 300ms) ease-in forwards;
}
```

```379:387:src/ui/styles/poetic-sanctuary.css
@keyframes poetic-modal-exit {
  ...
    transform: scale(0.98) translateY(4px);
}
```

**Why it fails Apple:** Cinematic “curtain close” trades spatial memory for flavor. Users map open/close as reversible; mismatched deltas read as two different objects.

**Fix direction:** Symmetric path (same delta and inverse easing), optionally faster exit duration only. Keep subtler *opacity* if needed; keep transform path identical.

---

#### F03 — `prefers-reduced-transparency` missing; reduced-motion incorrectly kills materials

**Principle:** Three independent signals — reduced **motion**, reduced **transparency**, more **contrast**. Reduced motion ≠ remove glass.

**Evidence:**

1. **Zero** matches for `prefers-reduced-transparency` or `prefers-contrast` under `src/`.
2. Global reduced-motion strips `backdrop-filter` from modals/plaques/media cards:

```606:627:src/ui/styles/global.css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  ...
  .sanctuary-modal-backdrop,
  .sanctuary-modal-content,
  [class*="plaque"],
  .media-card.sanctuary-media-card {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
```

**Why it fails Apple:** Vestibular-sensitive users still may want hierarchy from frost; transparency-sensitive users need solid surfaces without losing all motion elsewhere. Conflating the two over-corrects one cohort and under-serves the other.

**Fix direction:**
- Under `prefers-reduced-motion`: short opacity cross-fades only; keep materials.
- Under `prefers-reduced-transparency`: raise `--bg-plaque` / `--nav-bg` toward solid, set `backdrop-filter: none`.
- Under `prefers-contrast: more`: solid bg + stronger borders.

---

#### F04 — Reflection dock expand/collapse is a hard cut (no continuous feedback)

**Principle:** Response + direct manipulation; surfaces should materialize, not pop.

**Evidence:** `toggle()` flips state and `render()` replaces DOM — pill button ↔ full card with no shared transform, no enter/exit, no velocity.

```315:333:src/content/dock.ts
  public toggle(): void {
    this.isExpandedState = !this.isExpandedState;
    this.render();
  }

  private render(): void {
    if (!this.mountPoint) return;
    this.mountPoint.innerHTML = '';

    if (!this.isExpandedState) {
      const btn = document.createElement('button');
      ...
      this.mountPoint.appendChild(btn);
    } else {
      this.mountPoint.appendChild(this.buildCard());
    }
  }
```

Card styles also lack enter animation / `transform-origin` anchored to the toggle (`dock.ts` 81–91).

**Why it fails Apple:** Control Center modules grow toward the finger from their source. Dock is a floating sheet candidate that currently teleports.

**Fix direction:** Single container; morph width/height/opacity with interruptible spring; `transform-origin: bottom right`; keep toggle visible as chrome or morph label into title.

---

### P2 — Clear craft gaps

#### F05 — Sheets/modals are not source-anchored; no drag-to-dismiss

**Principle:** Anchor interactions to their source; sheets rubber-band and project momentum.

**Evidence:**
- DetailModal centers with flex (`sanctuary.css` 565–573); no `transform-origin` from card.
- No pointer-driven dismiss, no rubber-band, no `setPointerCapture`.
- Popup views use `display: none` + enter-only animation (`popup.css` 28–41) — exit cannot reverse the enter path.

**Fix direction:** Optional shared-element open from card rect; bottom-sheet pattern for capture on narrow chrome; Vaul-like drag with velocity projection (`d ≈ 0.998`).

---

#### F06 — Translucent materials are uneven; blur on near-opaque plaques

**Principle:** Material weight encodes hierarchy; bigger surfaces = stronger blur + deeper shadow; never stack light frosts; materialize blur+scale together.

**Evidence:**
- Nav chrome is correct translucent layer: `hsla(0,0%,9%,0.92)` + `blur(20px)` (`sidebar.css` 20–34; token `--nav-bg` at `tokens.css` 146).
- Plaques often use `--bg-plaque: hsla(0, 0%, 12%, 0.92)` *and* `backdrop-filter: blur(16–25px)` — blur does little under 92% opacity; cost without hierarchy signal (`sanctuary.css` 47–55, 320; `layout.css` 213–219).
- Modal: scrim **and** blur **and** plaque blur stack (`sanctuary.css` 565–569, 582–587) — heavy, not progressive dim of parents.
- Hover card: nearly opaque gradient + `blur(20px)` (`hoverCard.tsx` 636–638).
- Content dock card is solid `--bg-overlay` without glass (`dock.ts` 81–88) — inconsistent material language vs plaques.

**Fix direction:** Tokenize material steps (`--material-thin|regular|thick`); animate blur radius + scale on sheet enter; dim parent layers on modal stack; for content overlays prefer one material recipe.

---

#### F07 — Typography: no optical sizing; Inter preferred over system; tracking not scaled systematically

**Principle:** Optical sizing auto; tracking size-specific; system font first unless justified; leading inverse to size.

**Evidence:**
- Font stack prioritizes Inter, then system (`tokens.css` 43–45; shadow tokens mirror).
- **No** `font-optical-sizing: auto` anywhere under `src/`.
- Good local craft: `.sanctuary-title` 34px / `letter-spacing: -0.02em` / lh implicit; body 14px / `line-height: 1.6` (`sanctuary.css` 24–44); detail title 32px italic / `line-height: 1.1` (713–720); onboarding headline 42px / `-0.02em` / `1.2` (`onboarding.css` 73–82).
- Global headings get a single `-0.01em` regardless of size (`global.css` 43–47).
- Caps labels push `0.12–0.2em` tracking — appropriate for micro type, but not expressed as a size→tracking scale.

**Fix direction:** `font-optical-sizing: auto` on editorial display; optional `font-variation-settings` if variable Inter; prefer `system-ui` for dense UI chrome, reserve Inter/editorial for sanctuary prose; token map e.g. `--tracking-display` / `--tracking-body` / `--tracking-caps`.

---

#### F08 — Reduced-motion coverage is broad but not gentle (and uneven)

**Principle:** Reduced motion means short opacity cross-fades, not zero feedback.

**Evidence (good):**
- Modal, poetic, library stagger, discovery, emotional ceremony, popup suggestions, sidebar drawer, overlays, hover card all have PRM hooks.

**Evidence (gaps / harshness):**
- Global `transition-duration: 0.01ms !important` on `*` removes meaningful color/opacity feedback that should remain (~150–200ms fades).
- Onboarding step dots animate scale with no local PRM (`onboarding.css` 188–200) — only saved if global CSS is loaded.
- Content-script shadows rely on **local** `@media` (good) but miss global app sledgehammer when host page differs.
- `home-digest-enter` animates `filter: blur(8px)` (`discovery-layout.css` 503–516) — expensive and vestibular; PRM kills it, full-motion users still get filter animation.

**Fix direction:** Scope PRM to transform-heavy classes; keep 150–200ms opacity; replace blur-enter with opacity-only.

---

#### F09 — Shadow DOM motion tokens drift from the source of truth

**Principle:** Familiarity / craft — same behavior everywhere.

**Evidence:** `shadowTokens.ts` exports durations and eases but omits `--ease-out`, `--ease-focus-pull`, `--duration-curtain*`, `--ease-soft-settle`, `--blur-hero` used by the app shell. Overlay/hover hard-code `280ms cubic-bezier(0.16, 1, 0.3, 1)` instead of shared tokens (`overlay.ts` 129–133; `hoverCard.tsx` 645).

```60:68:src/shared/shadowTokens.ts
  --duration-fast: 130ms;
  --duration-normal: 220ms;
  --duration-slow: 260ms;
  --transition-fast: var(--duration-fast) ease;
  --transition-base: var(--duration-normal) ease;
```

**Fix direction:** Generate shadow tokens from `tokens.css` (or shared string) so content UI and sanctuary share one motion system.

---

### P3 — Polish

#### F10 — Notes save latency vs continuous feedback

DetailModal debounces notes 500ms then plays save ceremony (`DetailModal.tsx` 409–421, 380–396). Ceremony respects RM. Still: no live “dirty” affordance during the debounce gap — status feedback is completion-only.

#### F11 — Modal close control feedback incomplete relative to buttons

`.sanctuary-modal-close` transitions color only (`sanctuary.css` 646–662); no `:active` scale (inherits global button rule only if element is `button` — it is, so global helps). Missing explicit `:focus-visible` on this class (global covers it when styles load).

#### F12 — Hover lift without matching press continuity on cards

`.sanctuary-media-card:hover { translateY(-3px) }` (`sanctuary.css` 324–327); library media cards drop to `translateY(0)` on active (`library.css` 60–62) — good. Hover cards use `translateY(-1px)` on button hover without pointer-down highlight beyond scale — fine for web, not iOS-direct.

#### F13 — No rubber-banding / edge resistance anywhere

Scroll containers and sheets use native overflow hard edges. Acceptable for desktop extension, but any future bottom sheet should implement progressive resistance.

#### F14 — Popup view transitions are one-way

```28:41:src/ui/styles/popup.css
.popup-view {
  display: none;
  ...
  animation: popupSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
...
@keyframes popupSlide {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
```

`display: none` prevents reverse path; views teleport closed.

---

## Dimension deep-dives

### Feedback (response)

| Pattern | Status | Where |
|---------|--------|-------|
| Press-down highlight | Strong | `global.css` 109–111; sanctuary `:active` scales |
| Continuous drag feedback | Strong | DetailModal rating draft; emotional sliders + aura |
| Completion feedback | Good | Save ceremony gold line + aura settle |
| Status during wait | Partial | Skeleton pulse on hover card; debounced notes silent mid-flight |
| Focus visible | Strong | Global + dock/popup/sidebar |

### Spatial consistency

| Surface | Enter path | Exit path | Verdict |
|---------|------------|-----------|---------|
| Side drawer | translateX(100%)→0 | reverse | Pass |
| Hover card | ty 8 + scale 0.96 | same | Pass |
| DetailModal | ty 8 + scale 0.96 | ty 4 + scale 0.98 | Fail (asymmetric) |
| Poetic capture | same family | same family | Fail (asymmetric) |
| Dock | n/a (DOM swap) | n/a | Fail |
| Popup views | enter only | display:none | Fail |

### Springs / interruptibility

- **Present:** Esc abort during close; RM skip; ceremony re-trigger via double rAF; drawer `transitionend` + fallback.
- **Absent:** Spring params, velocity handoff, momentum projection, grab mid-animation reverse with continuous tracking, rubber-band.

### Reduced motion

| Area | Coverage |
|------|----------|
| App global PRM | Yes (aggressive) |
| DetailModal / Poetic JS | Yes |
| Drawer | Yes |
| Library / discovery stagger | Yes |
| Emotional ceremony | Yes |
| Content overlays / dock / hover | Local `@media` yes |
| Reduced transparency | **Missing** |
| More contrast | **Missing** |
| Onboarding-local PRM | Relies on global |

### Depth / materials

| Layer | Material | Notes |
|-------|----------|-------|
| Fixed nav | Frosted dark 0.92 + blur 20 | Good structural glass |
| Modal scrim | Near-opaque + blur 16 | Heavy; OK for modal task |
| Plaques / cards | 0.92 fill + blur | Blur mostly decorative |
| Dock | Solid overlay | Different language |
| Hover card | Near-opaque + blur 20 | Content-script isolation OK |

### Type

| Rule | Assessment |
|------|------------|
| Size-specific tracking | Partial — strong on sanctuary display/caps |
| Leading inverse to size | Partial — display ~1.1–1.2, body ~1.6 |
| Optical sizing | Missing |
| System font default | Inter first (brand choice; costs platform optical tables) |
| Dynamic Type / rem scaling | Mixed px and rem; chrome often px |

---

## Top 5 findings (priority)

1. **F01 — No springs / velocity-aware motion** — CSS keyframes cannot be re-targeted mid-flight; core fluid-interface gap.  
2. **F02 — Asymmetric modal enter/exit** — breaks spatial memory for DetailModal + Poetic capture.  
3. **F03 — Materials accessibility signals wrong-bucketed** — no reduced-transparency; PRM kills blur.  
4. **F04 — Dock hard-cut expand** — flagship content surface with zero continuous motion.  
5. **F07 — Typography optical sizing + system stack** — display craft is good; platform optical discipline is missing.

---

## Recommended next moves (restraint-ordered)

1. **Symmetric modal transform path** (small CSS change, high spatial win).  
2. **Split PRM vs reduced-transparency** media queries; stop removing `backdrop-filter` under PRM.  
3. **Dock morph** — single host, spring or short opacity+scale from bottom-right.  
4. **Introduce one spring pipeline** for modal/drawer only; critically damped defaults.  
5. **`font-optical-sizing: auto`** + tracking tokens; consider system-ui for chrome density.  
6. **Sync `shadowTokens`** with full motion token set.

---

## Score rationale

**6.7/10** — Above average web craft: disciplined durations, press feedback, focus management, and partial interrupt of dismiss paths. Below Apple fluid bar: no springs, no gesture sheets, intentional spatial asymmetry, incomplete material accessibility, and content dock that still “pops.”

A **7.5+** would require: symmetric paths, correct a11y media query split, spring-driven modal/drawer with velocity, and dock materialization from source.

---

## Files reviewed (primary)

| Path | Role |
|------|------|
| `src/shared/tokens.css` | Color, type, motion, material tokens |
| `src/shared/shadowTokens.ts` | Content-script token subset |
| `src/styles/sanctuary.css` | Modal, buttons, archive, filmography, PRM press |
| `src/ui/styles/global.css` | Base type, buttons, modal, global PRM |
| `src/ui/styles/sidebar.css` | Nav glass, drawer motion, PRM |
| `src/ui/styles/poetic-sanctuary.css` | Capture sheet motion |
| `src/ui/styles/emotional-components.css` | Aura springs-as-CSS, ceremony |
| `src/ui/styles/popup.css` | Popup materials + view transitions |
| `src/ui/styles/onboarding.css` | First-run type + step motion |
| `src/ui/styles/library.css` / `discovery-layout.css` | Card stagger / blur enter |
| `src/ui/styles/layout.css` | Hero plaque material |
| `src/ui/components/DetailModal.tsx` | Focus trap, exit interrupt, ceremony |
| `src/ui/components/PoeticCaptureCanvas.tsx` | Capture dialog a11y/motion hooks |
| `src/ui/App.tsx` | Drawer focus / close |
| `src/content/dock.ts` | Reflection dock |
| `src/content/hoverCard.tsx` | Hover card enter/exit |
| `src/content/overlay.ts` / `bookOverlay.ts` | Museum plaques |

---

*Review method: static code analysis against Apple Design skill checklist. No product code modified.*
