# Apple Design Review — Subsume

**Date:** 2026-08-11  
**HEAD:** `main` @ `86c60a6`  
**Lens:** Apple Design skill (WWDC *Designing Fluid Interfaces* + materials, focus, reduced-motion, gesture foundations, design principles)  
**Product:** Subsume Chrome MV3 extension — private multi-medium sanctuary  
**Visual system:** Cinema Black + scarce Rosso Corsa; Courier Prime / IBM Plex Mono  

**Prior:** [2026-08-10/02-apple-design.md](../2026-08-10/02-apple-design.md) scored **7.0 / 10**

---

## Score: **7.3 / 10** (+0.3)

Subsume remains a **crafted, ceremony-budgeted CSS product** that honors press response, focus isolation, and ≤300ms motion tokens. Post-wave work improved **modal shell isolation (`inert`)**, **dock keyboard/trusted-gesture model**, **hit-target floor**, and **chip contrast**. It still is **not** a fluid, velocity-aware interface: no springs, no 1:1 sheet drag, no momentum projection, no presentation-value retarget, and reduced-transparency is not a first-class preference.

| Dimension | Score | Δ | Notes |
|-----------|------:|---:|-------|
| Response / press feedback | **8.2** | +0.2 | Global `:active` scale; continuous rating draft; hit targets ≥40px help “directness” |
| Direct manipulation / gestures | **4.5** | 0 | Ranges 1:1; still no drawer/sheet drag, pointer capture, rubber-band, flick |
| Interruptibility | **6.5** | +0.5 | Esc mid-exit + dock `animGen`; shell `inert` while modals open; drawer still locks while `closing` |
| Springs / velocity / momentum | **3.0** | 0 | Fixed-duration CSS / keyframes only; no release-velocity handoff |
| Spatial consistency | **7.8** | +0.3 | Symmetric modal/drawer/dock paths held; plaque reveal no longer thrash-max-width |
| Materials & depth | **6.5** | 0 | Blur plaques/nav; sticky shell often near-opaque; PRM still kills blur |
| Focus | **8.5** | +0.5 | Traps + restore; **`#app` inert** behind DetailModal / Poetic; dock Esc + named field |
| Reduced motion / a11y prefs | **6.8** | +0.3 | Broad PRM; hit targets; chip AA; still no `prefers-reduced-transparency` / `prefers-contrast` |
| Restraint / foundations | **8.0** | +0.5 | Motion ≤300ms; monofont identity locked; house icons; activation path exists |
| **Overall** | **7.3** | **+0.3** | Weighted toward response, focus, spatial craft |

---

## Executive verdict

Apple’s bar is: **motion starts from the live value, inherits velocity, projects momentum, and can be reversed mid-flight.** Subsume’s bar is: **cinematic, interruptible-enough ceremony under a hard 300ms ceiling.** That is a deliberate product choice (sanctuary calm over physics toy), but it caps the Apple score in the high 7s until at least one surface (drawer or sheet) becomes spring + gesture driven.

**What improved since 2026-08-10**

1. Modal/page isolation — `#app` gets `inert` + `aria-hidden` while DetailModal / Poetic Capture open (`DetailModal.tsx`, `PoeticCaptureCanvas.tsx`).
2. Dock keyboard model — Esc collapse, focus restore, trusted-gesture gate, labeled textarea (`dock.ts`).
3. Hit-target floor + Rosso chip AA — `--hit-target-min: 40px`, active chips white-on-soft-Rosso (`tokens.css`, sanctuary/UI CSS).
4. Plaque reveal motion — opacity/transform instead of animated `max-width` thrash (`overlay.ts`).
5. Activation path — 2-step onboarding + Discovery first-inscription (agency / purpose foundations).

**What still blocks 8+**

1. No springs / Motion library — every path is duration-scripted.
2. No 1:1 drag sheets (drawer, modal, dock pill) with velocity handoff.
3. Drawer input lock while `navMenuClosing`.
4. PRM incorrectly strips materials; no independent transparency/contrast media queries.
5. Type is monospaced identity (product choice) rather than system font + optical sizing tables.

---

## Dimension notes (Apple checklist)

### 1. Response — kill latency · **8.2**

**Strengths**

- `button:active { transform: scale(0.97) }` is instant press feedback (`global.css`).
- DetailModal rating: continuous draft on `input`, commit on pointer-up / blur / key-end (feedback during drag, not only on release).
- Debounced notes flush on unmount/close (Wave 0) — no silent data loss after fast dismiss.
- Hit targets ≥40px on primary chips/tabs/sliders reduce “missed tap” latency.

**Gaps**

- Some secondary controls still rely on CSS hover lifts without pointer-down highlight variants beyond global `button:active`.
- Content-script plaques still use hover-primary paths (gated for fine pointer, but no press state parity).

### 2. Direct manipulation · **4.5**

**Strengths**

- Range inputs track 1:1 while dragging.
- Emotional spectrum sliders continuous.

**Gaps (skill core)**

- No `setPointerCapture` sheets.
- Drawer is button-toggle + CSS transform, not finger-following.
- Modal cannot be grabbed mid-close and reopened with velocity.
- No rubber-band at edges.

### 3. Interruptibility · **6.5**

**Strengths**

- Second Esc during DetailModal exit finishes immediately (`closingRef` path).
- Dock `animGen` invalidates stale enter/exit timers on re-toggle.
- Trusted gesture required to open dock (blocks synthetic thrash).

**Gaps**

- Animations start from logical class targets, not read presentation matrix.
- Drawer sets `navMenuClosing` and does not accept open mid-close without finish path.
- CSS `@keyframes` / transition class swaps cannot blend reverse velocity.

### 4–6. Springs, velocity, momentum · **3.0**

**Reality:** fixed tokens only:

| Token | Value |
|-------|-------|
| `--duration-fast` | 130ms |
| `--duration-normal` | 220ms |
| `--duration-curtain` | 280ms |
| `--duration-curtain-close` | 220ms |
| `--ease-out` | cubic-bezier(0.16, 1, 0.3, 1) |
| `--ease-soft-settle` | multi-stop `linear()` recipe |

No release-velocity handoff. No projection function. Soft-settle is a **duration recipe**, not a spring.

**Product note:** ≤300ms ceiling is sanctuary-correct; Apple bounce on flick is optional and should stay **off** for capture ceremony unless a physical gesture exists first.

### 7. Spatial consistency · **7.8**

**Strengths**

- Modal enter/exit share scale+translate path; exit shorter but same ease family.
- Drawer slides on X both directions.
- Dock enter/exit share `translateY(8px)`.
- Hover card enter/exit deltas aligned.

**Gaps**

- Reflect from plaque opens a **new Sanctuary tab** (spatial break of immersion — interaction design debt, not pure motion).
- Popovers/menus do not always set `transform-origin` from trigger.

### 12. Materials & depth · **6.5**

**Strengths**

- Nav / plaques use `backdrop-filter` + translucent tokens.
- Modal scrim dims background (dim-to-focus).

**Gaps**

- Sticky top nav often reads near-opaque at scroll rest.
- PRM block zeros `backdrop-filter` globally — couples motion preference to materials (should be `prefers-reduced-transparency`).
- No materialize (blur+scale) enter for glass; mostly opacity/transform.

### 14. Reduced motion & a11y prefs · **6.8**

**Strengths**

- Broad `@media (prefers-reduced-motion: reduce)` nuclear coverage (shell + popup + dock).
- Focus-visible rings; inert shell; 40px targets; chip AA.

**Gaps**

| Preference | Status |
|------------|--------|
| `prefers-reduced-motion` | Present (sometimes over-applies) |
| `prefers-reduced-transparency` | **Missing** |
| `prefers-contrast: more` | **Missing** |

### 15. Typography · **6.5** (product-constrained)

Wave 2 locked **Courier Prime + IBM Plex Mono** (screenplay / manuscript identity). That is intentional brand, not system-ui optical tables. Display tracking is tightened in places; body mono at dense UI sizes is a tradeoff Apple would usually avoid for general UI — acceptable if Subsume stays editorial mono by choice.

### 16. Foundations snapshot

| Principle | Subsume read |
|-----------|----------------|
| Purpose | Strong — reflection over tracking |
| Agency | Improved — 2-step onboarding, skip keys, first-inscription CTAs |
| Responsibility | Strong local-first story; keys still plaintext IDB (security debt) |
| Familiarity | Theatre lexicon partly plain now (status lexicon unified) |
| Flexibility | Themes Cinema Black / White Canvas; medium-aware labels |
| Simplicity | IA still deep (Explore + House tools); activation simpler |
| Craft | High on tokens, focus, hit targets, icons |
| Delight | Ceremony (curtain, grain, capture) — not confetti |

---

## Protect (do not regress)

1. Motion ceiling ≤300ms + named duration/ease tokens  
2. Instant `:active` press scale  
3. Symmetric modal/drawer/dock enter-exit paths  
4. Focus traps + restore + `#app` inert behind modals  
5. Continuous rating/slider draft while dragging  
6. Dock trusted-gesture + Esc + focus restore  
7. Hit-target floor and white-on-soft-Rosso active chips  

---

## Prioritized upgrades (Apple lens only)

### P0 — Fluid ceiling (if you want “extension of you”)

1. **One spring surface** — rewrite nav drawer (or a future sheet) with Motion/Framer springs, critically damped (`bounce: 0`, `duration ~0.35`), open/close from presentation value.  
2. **1:1 drag-to-dismiss drawer** — `pointerdown` capture, track offset, release velocity → spring target (open or closed).  
3. **Split a11y media queries** — move blur kill from PRM to `prefers-reduced-transparency`; add `prefers-contrast: more` solid borders.

### P1 — Interrupt + materials

4. Allow open while drawer `closing` by retargeting from live transform.  
5. Materialize glass enter (blur + scale together) on nav/plaques.  
6. Modal drag-to-dismiss optional (only if it stays calm; no bounce without flick).

### P2 — Polish

7. Scroll-edge fade under sticky nav instead of hard hairline only.  
8. Size-specific tracking audit on mono display vs dense UI.  
9. Reflect-in-context (same tab overlay) to fix spatial break from content script.

---

## Quick reference: Subsume vs Apple defaults

| Apple need | Subsume today |
|------------|----------------|
| Critically damped spring | Fixed CSS durations ≤300ms |
| Flick bounce spring | Intentionally none (sanctuary) |
| Gesture → spring velocity | Not implemented |
| Momentum projection | Not implemented |
| Interrupt from presentation value | Partial (Esc finish / gen cancel) |
| 1:1 drag | Ranges only |
| Rubber-band | No |
| Translucent chrome | Partial |
| PRM | Yes (over-broad) |
| Reduced transparency | No |
| System font + optical sizing | Custom mono system (by design) |

---

## Verdict line

**7.3 / 10** — Apple-caliber **press, focus, and ceremony discipline**; not yet Apple-caliber **fluid physics**. Next step that moves the needle most: **one critically damped, gesture-driven drawer** plus **split transparency preference** — without abandoning the ≤300ms sanctuary ceiling for capture chrome.

*File:* `docs/design-reviews/2026-08-11/02-apple-design.md`
