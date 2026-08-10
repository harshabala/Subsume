# Apple Design Review — Subsume

**Date:** 2026-08-10  
**Branch:** `fix/design-p0-review-wave` @ `a5471b5`  
**Lens:** Apple Design skill (WWDC *Designing Fluid Interfaces* + materials, focus, reduced-motion, gesture foundations)  
**Product:** Subsume Chrome MV3 extension — sanctuary for films/books; Ferrari palette `#da291c` on `#181818`  
**Scope (read-only):** fluid interfaces, springs/momentum, materials, focus, reduced-motion, interruptibility, spatial consistency, gesture  
**Key surfaces:** `src/shared/tokens.css`, `src/ui/styles/*`, `src/styles/sanctuary.css`, DetailModal, PoeticCapture, drawer (`App.tsx` / `sidebar.css`), dock/hover card content, global a11y CSS  

**Delta vs 2026-08-04:** Modal enter/exit transform path is now **spatially symmetric** (same `scale(0.96) translateY(8px)`); exit uses shared ease-out family and shorter duration token; dock pill↔card uses enter/exit transform+opacity. Core fluid gaps (springs, velocity handoff, gesture sheets, independent transparency preference) remain.

---

## Score: **7.0 / 10**

Subsume is strong at **press response**, **focus trapping**, **tokenized ≤300ms motion**, and **symmetric scripted paths** on modal/drawer/hover-card/dock. It still reads as a **cinematic, time-boxed CSS UI** rather than a **fluid, velocity-aware interface**: no springs, no 1:1 grab surfaces, partial interruptibility (Esc abort / gen cancel, not presentation-value retarget), and reduced-motion incorrectly coupled to materials.

| Dimension | Score | Notes |
|-----------|------:|-------|
| Response / press feedback | 8.0 | Global `button:active { scale(0.97) }`; sanctuary press scales; continuous slider draft |
| Direct manipulation / gestures | 4.5 | Ranges track 1:1; no sheet drag, pointer capture, rubber-band, or flick |
| Interruptibility | 6.0 | Esc finishes modal exit; dock `animGen` cancels stale timers; drawer **locks** while `closing` |
| Springs / velocity / momentum | 3.0 | Fixed-duration CSS / `@keyframes` only; no Motion lib; no release-velocity handoff |
| Spatial consistency | 7.5 | Modal path mirrored; drawer X in/out; hover card + dock share enter/exit deltas |
| Materials & depth | 6.5 | Blur plaques/nav; sticky shell often opaque; near-solid glass; no reduced-transparency |
| Focus | 8.0 | Global `:focus-visible` ring; modal + drawer traps; restore focus on close; `inert` on accordion |
| Reduced motion | 6.5 | Broad PRM coverage; **wrongly strips `backdrop-filter`**; no `prefers-reduced-transparency` / contrast |
| Restraint / foundations | 7.5 | Motion tokens ≤300ms; ceremony budget; intentional palette; soft-settle is recipe not spring |

---

## What works (do not regress)

1. **Motion token discipline** — user-facing durations stay ≤300ms; curtain enter/exit and soft-settle are named (`tokens.css` 83–103).
2. **Instant press response** — `button:active { transform: scale(0.97) }` (`global.css` 109–111); sanctuary gold/restraint buttons match.
3. **Continuous feedback on continuous controls** — DetailModal / HardcoverSpineCard rating draft + `onInput`; EmotionalSliders fire on every input; AuraVisualizer interpolates CSS custom properties.
4. **Spatial path symmetry (improved)** — DetailModal + Poetic exit reverse enter transform exactly (`sanctuary.css` 619–639; `poetic-sanctuary.css` 377–397). Drawer slides on X both ways (`sidebar.css` 150–179). Hover card enter/exit share `translateY(8px) scale(0.96)` (`hoverCard.tsx` 644–658). Dock enter/exit share `translateY(8px)` (`dock.ts` 97–114).
5. **Partial dismiss interrupt** — second Esc during DetailModal exit finishes immediately (`DetailModal.tsx` 347–352); PRM skips exit animation.
6. **Focus system** — global ring (`global.css` 192–198); DetailModal focus trap + restore (`DetailModal.tsx` 458–503); drawer trap + Esc + toggle restore (`App.tsx` 116–125, 220–264); `inert` on collapsed accordion sections.
7. **Display tracking** — large titles use negative tracking (`sanctuary-title` −0.02em); micro-labels use positive tracking for caps.

---

## Severity-ranked findings

Severity: **P0** blocker / safety · **P1** major Apple-fluid gap · **P2** clear craft gap · **P3** polish.

---

### P1 — Major

#### F01 — No springs; gesture-driven surfaces are CSS-scripted (interruptibility + momentum gap)

**Principle:** Behavior over animation; springs re-target from the **presentation** value with velocity. Never lock out input mid-flight.

**Evidence:** No spring library in `package.json` (deps: preact, idb, uuid only). Motion is `@keyframes` + fixed `transition` durations. Soft-settle is a hand-authored `linear()` recipe, not a damping/response spring.

```83:103:src/shared/tokens.css
  /* ─── Cinematic Motion ───────────────────────────────────────── */
  /* Ceremony may feel cinematic (ease + scale) but user-facing motion
     must stay ≤300ms per UI wiki — shorten, do not delete. */
  --ease-focus-pull: cubic-bezier(0.25, 1, 0.5, 1);
  /* Soft settle: decelerating linear() with no bounce/overshoot. ... */
  --ease-soft-settle: linear(
    0,
    0.25 20%,
    ...
    1
  );
  --duration-soft-settle: 280ms;
  --duration-curtain: 280ms;
  --duration-curtain-close: 220ms;
```

```619:639:src/styles/sanctuary.css
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
    transform: scale(0.96) translateY(8px);
  }
}
```

**Why it fails Apple:** User cannot grab a closing modal/drawer mid-flight and reverse it with continuous velocity. Animation owns the frame until `animationend` / timeout / Esc abort. Esc finish is **binary interrupt**, not **velocity-aware retarget from live transform**.

**Fix direction:** Drive modal `y`/`scale` and drawer `x` with a spring library (Motion) or WAAPI cancel + retarget from `getComputedStyle` / matrix. Default critically damped (`bounce: 0`, response ~0.3–0.4s). Reserve slight under-damping only after momentum flicks.

---

#### F02 — Drawer close is input-locked while `closing` (interruptibility)

**Principle:** Never lock out input during a transition. Thought and gesture happen in parallel.

**Evidence:** `closeNavMenu` no-ops if already closing; toggle cannot reverse mid-exit.

```127:140:src/ui/App.tsx
  const closeNavMenu = useCallback(() => {
    if (!navMenuOpen || navMenuClosing) return;
    if (prefersReducedMotion()) {
      ...
      return;
    }
    navCloseDoneRef.current = false;
    setNavMenuClosing(true);
  }, [navMenuOpen, navMenuClosing]);
```

```368:371:src/ui/App.tsx
            onClick={() => {
              if (drawerOpen) closeNavMenu();
              else if (!navMenuVisible) openNavMenu();
            }}
```

While `navMenuClosing` is true, `drawerOpen` is false (`navMenuOpen && !navMenuClosing`), so the toggle falls through to `!navMenuVisible` — menu is still visible until transition ends, but open is blocked. User cannot reverse close mid-slide.

**Fix direction:** On toggle during close, cancel closing flag, set open, animate from **current** transform (CSS transition can reverse if you only toggle class without remounting — prefer reading live `transform` or use spring re-target). Second Esc / backdrop click should also reverse cleanly.

---

#### F03 — `prefers-reduced-transparency` missing; reduced-motion incorrectly kills materials

**Principle:** Three independent signals — reduced **motion**, reduced **transparency**, more **contrast**. Reduced motion ≠ remove glass.

**Evidence:**

1. **Zero** matches for `prefers-reduced-transparency` or `prefers-contrast` under `src/` (only prior design-review docs mention them).
2. Global PRM strips `backdrop-filter` from modals/plaques/media cards:

```607:628:src/ui/styles/global.css
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

**Why it fails Apple:** Vestibular sensitivity and translucency intolerance are different users. Killing blur under PRM flattens hierarchy for people who still want (and can tolerate) materials.

**Fix direction:**
- Under `prefers-reduced-motion`: cross-fade / opacity only; keep materials.
- Under `prefers-reduced-transparency`: raise `--bg-plaque` / `--nav-bg` toward solid; `backdrop-filter: none`.
- Under `prefers-contrast: more`: solid bg + stronger borders.

---

#### F04 — No 1:1 gesture surfaces (sheet drag, rubber-band, momentum projection)

**Principle:** Touch and content move together; rubber-band at edges; project flick landing from velocity.

**Evidence:** Grep for `setPointerCapture`, `rubberband`, release `velocity`, and drag-to-dismiss finds nothing meaningful in product UI. Gesture surface is limited to native `<input type="range">` continuous updates and click/Esc dismiss.

- DetailModal: backdrop click + Esc only — no vertical drag dismiss (`DetailModal.tsx` 512–517).
- Side drawer: class-driven `translateX` transition only (`sidebar.css` 150–179) — no finger tracking.
- Dock expand/collapse: class swap with rAF enter (`dock.ts` 422–444) — no drag.

**Why it fails Apple:** Continuous physical objects (sheets, drawers) without 1:1 tracking feel like slideshows of states, not manipulable objects.

**Fix direction:** Pointer Events + capture; track velocity history; rubber-band past bound; on release project endpoint (`v/1000 * d/(1-d)`, `d≈0.998`) then spring to nearest snap (open/closed).

---

### P2 — Clear craft gaps

#### F05 — Sticky app chrome is mostly opaque (materials underused on primary nav)

**Principle:** Nav/toolbars as translucent layers with content scrolling underneath; material weight encodes hierarchy.

**Evidence:** Unified shell uses solid sanctuary background, not frosted glass:

```3:13:src/ui/styles/app-nav.css
.app-nav-shell {
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  max-width: 100%;
  background: var(--bg-sanctuary, var(--bg-primary));
  border-bottom: 1px solid var(--border-restraint, var(--border));
  ...
}
```

Legacy `.fixed-top-nav` still declares `backdrop-filter: blur(20px)` (`sidebar.css` 26–27), but shell paint is opaque cinema black — content does not read “under” chrome.

Plaque materials are near-solid (`--bg-plaque: hsla(0, 0%, 12%, 0.92)` in `tokens.css` 27) with `blur(16–25px)` — blur does little when alpha is already 0.92.

**Fix direction:** Semi-transparent sticky nav (`rgba` / hsla ~0.72–0.85 + `backdrop-filter: blur(20px) saturate(180%)`); scroll edge fade instead of hard 1px divider where content overlaps; lighten plaque alpha slightly so glass is perceptible; **materialize** enter (blur + scale together), not opacity alone.

---

#### F06 — Materials do not “materialize”; enter is opacity/transform only

**Principle:** For glass surfaces, animate blur radius and scale together so the surface reads as a real material arriving.

**Evidence:** Modal backdrop only fades opacity (`sanctuary-backdrop-enter`); content scales/translates without blur ramp. Hover card transitions opacity+transform only (`hoverCard.tsx` 645).

**Fix direction:** On enter, ramp `backdrop-filter` blur 0→16px with scale; reverse on exit. Respect reduced-transparency by skipping blur ramp.

---

#### F07 — Soft-settle / aura is fixed-duration CSS, not velocity-aware

**Principle:** Springs for anything the user can touch; critically damped default.

**Evidence:** Aura stop positions use CSS custom property transitions + `--duration-soft-settle` / `--ease-soft-settle`. Emotional slider changes update immediately in state but visual settle is scripted, not spring-retargeted from current percent.

**Fix direction:** Optional: spring `--aura-*` values (or transform-based indicators) with `bounce: 0` so rapid slider flicks re-target smoothly without jump.

---

### P3 — Polish

#### F08 — Typography optical sizing incomplete

**Principle:** Size-specific tracking; `font-optical-sizing: auto`; system font as default unless justified.

**Evidence:** Inter is stacked before system (`tokens.css` 43–44). No `font-optical-sizing` in source. Tracking is thoughtfully applied in places (display −0.02em, meta +0.18em) but not systematized as a size→tracking table.

**Fix direction:** `font-optical-sizing: auto` on editorial faces; optional system-ui first for pure UI chrome; document tracking scale by size band.

#### F09 — Dock expand hard-cuts the pill (DOM replace)

**Principle:** Symmetric spatial continuity; avoid hard cuts between related states.

**Evidence:** Expand replaces mount innerHTML with card immediately (`dock.ts` 436–444) — pill does not morph/exit; only card enters. Collapse animates card exit then builds pill (better).

**Fix direction:** Cross-fade or shared-element morph pill↔card; or keep both in DOM and spring layout.

#### F10 — Global PRM nuclear option may still be too broad

**Principle:** Reduced motion = gentler equivalents (cross-fade), not zero feedback.

**Evidence:** `* { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }` (`global.css` 607–614) plus component-level `animation: none`. Instant press scale is correctly zeroed; some status feedback may vanish entirely.

**Fix direction:** Prefer short opacity cross-fades (~150–200ms) for open/close comprehension rather than near-zero duration everywhere; keep color/opacity status changes.

---

## Focus audit (dedicated)

| Surface | Trap | Restore | Esc | `aria-modal` / label | Notes |
|---------|:----:|:-------:|:---:|:---------------------:|-------|
| DetailModal | Yes | Yes | Yes (+ exit interrupt) | dialog + labelledby | Good |
| PoeticCapture | Yes (parity) | Yes | Yes | yes | Match modal pattern |
| Side drawer | Yes | Toggle focus | Yes | not modal; `aria-hidden` when closed | Main gets `inert` when open |
| Hover card | N/A (ephemeral) | — | — | actions gated | Not a dialog |
| Dock | Collapse control focus-visible | — | — | aria-labels on buttons | No full trap (overlay, OK) |

**Strength:** Global `:focus-visible` outline on buttons/links/inputs (`global.css` 192–198); many sanctuary/dock mirrors.

**Gap:** Drawer while closing still occupies screen but is not fully interactive for reverse — focus may sit in a closing surface briefly.

---

## Top fixes (priority order)

1. **Springs + presentation-value retarget for modal & drawer**  
   Add Motion (or equivalent). Replace curtain `@keyframes` with spring-driven `y`/`scale`/`x`. On interrupt, start from live transform; hand off velocity when gesture exists. Unlock drawer toggle during close (F01, F02).

2. **Split accessibility media queries**  
   Move `backdrop-filter: none` off `prefers-reduced-motion` onto `prefers-reduced-transparency`; add `prefers-contrast: more` solid/border variants (F03). Keep PRM = cross-fade / no vestibular motion only.

3. **Gesture-driven dismiss for drawer (then modal)**  
   Pointer capture, 1:1 drag, rubber-band past edge, momentum projection to open/closed snap (F04). Highest ROI fluid win after springs.

**Honorable next:** Translucent sticky nav + content scroll-under (F05); materialize blur on glass enter (F06); dock pill↔card continuity (F09).

---

## Dimension-aligned checklist (quick)

| Apple technique | Present? | Where / gap |
|-----------------|:--------:|-------------|
| Respond on pointer-down | Partial | `:active` scale; not all custom hit targets |
| 1:1 drag tracking | No | Ranges only |
| Interruptible / retargetable motion | Partial | Esc finish; no grab mid-flight |
| Springs (critically damped default) | No | CSS fixed duration |
| Velocity handoff on release | No | — |
| Momentum projection | No | — |
| Spatial enter=exit path | Yes | Modal, drawer, hover card, dock Y |
| Rubber-banding | No | — |
| Translucent materials + hierarchy | Partial | Plaques/blur; sticky shell solid |
| Dim to focus (modal scrim) | Yes | `--overlay-scrim` |
| Focus trap + restore | Yes | Modal, drawer |
| `prefers-reduced-motion` | Yes | Over-broad |
| `prefers-reduced-transparency` | No | — |
| `prefers-contrast` | No | — |
| Size-specific tracking | Partial | Titles/meta; no optical sizing |

---

## Score rationale

+ Crafted press feedback, focus, motion budget, and **fixed spatial symmetry** lift the product above generic web UIs (~7).  
− Absence of springs, velocity, and true gesture surfaces caps fluid-interface authenticity (~Apple skill core).  
Net **7.0 / 10** — up slightly from 6.7 (2026-08-04) on spatial consistency; fluid/momentum dimension still the ceiling.

---

*Reviewer: Apple Design skill audit (read-only). No code changes in this pass.*
