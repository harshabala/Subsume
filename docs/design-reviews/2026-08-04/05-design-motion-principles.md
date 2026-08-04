# Design Motion Principles Audit — Subsume

**Date:** 2026-08-04  
**Skill:** `design-motion-principles` v1.1  
**Scope:** CSS transitions/animations, `--duration-*` / ease tokens, sanctuary motion, emotional components, overlay/dock, reduced-motion  
**Mode:** Read-only  
**Overall score:** **7.6 / 10**

---

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 AUDIT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 2 Critical  |  🟡 6 Important  |  🟢 5 Opportunities
Primary perspective: Jakub (shipped cinematic consumer polish)
Secondary: Emil (high-frequency overlay / popup / dock restraint)
Selective: Jhey (ceremony, @property, linear(), empty projector)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Reconnaissance (context applied)

| Signal | Finding |
|--------|---------|
| **Project type** | Chrome extension: private cinematic sanctuary for films, shows, books (capture, archive, discovery, content overlays) |
| **Stack** | Preact + CSS-first motion (no Framer Motion / AnimatePresence) |
| **Motion system** | Tokenized durations ≤300ms (`--duration-fast` 130 → `--duration-curtain` 280 / close 300), custom easings (`--ease-out`, `--ease-focus-pull`, `--ease-soft-settle` via `linear()`) |
| **Prior work** | July 2026 motion audit fixes landed: modal exit lifecycle, stagger, save ceremony, empty projector, PRM on major surfaces |
| **Spec tension** | `CINEMATIC_JOURNAL_DESIGN_SPEC.md` still documents Slow Dolly **450ms**; shipped tokens enforce **≤300ms** (correct for UI wiki / Emil restraint) |
| **Motion gaps** | Dock expand/collapse hard swap; DetailModal dossier / adaptation-link panels snap; content plaque `max-width` layout anim; popup lacks global PRM nuclear rule |

**Applied weighting (assignment: all three perspectives, product-weighted):**

- **Primary — Jakub Krehel:** Production polish for a shipped consumer sanctuary users reopen repeatedly.
- **Secondary — Emil Kowalski:** High-frequency paths (popup search, museum plaques, hover cards, dock toggle).
- **Selective — Jhey Tompkins:** Rare ceremonial moments (save, empty archive, aura) where CSS innovation already exists.

---

## Overall assessment

Subsume’s motion system is **unusually mature for an extension**: shared duration tokens, cinematic enter/exit pairs (Slow Dolly / Curtain Close) with JS `closing` + `animationend` fallbacks, `@property`-interpolated aura, one-shot save ceremony, feed/library stagger, and broad `prefers-reduced-motion` coverage on sanctuary surfaces. Prior July work closed most Critical gaps.

What keeps the score under 8.5 is **surface inconsistency**, not absence of craft. Content-script shadow CSS (`shadowTokens`) trails the full token set; `transition: all` and layout-property animations remain on high-touch chrome; the reflection **dock** and several **conditional panels** still snap; popup PRM is patchy vs the app shell’s nuclear rule; most enters omit Jakub’s materializing **blur**; and many secondary styles still use default `ease` + magic `0.2s` values instead of tokens.

The product feels intentional and calm—not gimmicky—which matches the sanctuary brief. Closing token/PRM parity and the remaining motion gaps would land this in the high 8s without adding more spectacle.

---

## Per-designer perspectives

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ EMIL'S PERSPECTIVE — Restraint & Speed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

*Weight: Secondary — heavy on popup, overlays, dock, hover cards; light on rare sanctuary ceremony.*

### What's Working Well

- ✓ **Hard cap ≤300ms on user-facing motion** is documented and enforced in tokens — `src/shared/tokens.css:63-97` (`--duration-fast` 130ms … `--duration-curtain-close` 300ms).
- ✓ **Modal close is interruptible in spirit** (second Esc finishes immediately) — `src/ui/components/DetailModal.tsx:345-358`.
- ✓ **Active press scale** on sanctuary buttons (0.97–0.98, not 0) — e.g. `src/styles/sanctuary.css:116-118`, `:1605-1606`.
- ✓ **Scale enters start ≥0.96**, not `scale(0)` — `src/styles/sanctuary.css:614-622`, `src/ui/styles/poetic-sanctuary.css:367-376`, hover card `src/content/hoverCard.tsx:644-645`.
- ✓ **High-frequency hover transitions stay ~130–250ms** on sanctuary chrome; recommendations crossfade is a snappy **180ms** — `src/ui/styles/recommendations.css:20-22`.
- ✓ **PRM short-circuits modal close** without waiting for animation — `DetailModal.tsx:352-354`, `App.tsx:129-136`.

### Issues to Address

- ✗ **`transition: all` on content plaque reveal** — `src/content/overlay.ts:163`  
  Animates layout (`max-width`) + opacity together; expensive and hard to interrupt cleanly. Prefer explicit `max-width`/`opacity` or clip/transform-based reveal.

- ✗ **Museum plaque hover uses 280ms on a high-frequency control** — `src/content/overlay.ts:129-133`  
  Acceptable once, but plaques appear on many posters; Emil would prefer **~150–180ms** for hover micro-motion on dense pages.

- ✗ **Popup suggestion stagger re-fires as results update** — `src/ui/styles/popup.css:385-396`  
  Typing → new list → every item re-enters with delay. For a high-frequency surface, stagger on every keystroke fatigues; use stagger only on first open or cap re-animation (e.g. static class after first paint).

- ✗ **Reflection dock expands by DOM swap, not transition** — `src/content/dock.ts:315-322`  
  Toggle clears `innerHTML` and rebuilds toggle vs card: no enter/exit, not interruptible. For a page-level tool used while browsing, instant is OK; if it animates later, use state-class transitions, not keyframe re-mounts.

- ✗ **Widespread default `ease` / bare `0.2s`** outside tokens — e.g. `src/ui/styles/people.css:28`, `src/ui/styles/sidebar.css:208`, `src/ui/styles/discovery-layout.css:317`  
  Custom curves exist but aren’t the default path for secondary UI.

- ✗ **`max-height` expand on reflections** — `src/styles/sanctuary.css:2799-2805`  
  Layout thrash vs clip-path / grid-template-rows. Softened by PRM (`:2850-2853`); still a layout animation on a moderately frequent control.

**Emil would say:** Durations and modal discipline are already Linear-grade; stop re-staggering search suggestions and replace `transition: all` / layout reveals on content plaques so dense browsing stays invisible-fast.

---

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 JAKUB'S PERSPECTIVE — Production Polish
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

*Weight: Primary — this is the bar for a repeatedly used consumer product.*

### What's Working Well

- ✓ **Enter/exit asymmetry on sanctuary modals** — enter scale 0.96 + 8px Y; exit subtler 0.98 + 4px Y — `src/styles/sanctuary.css:614-635`, mirrored in `poetic-sanctuary.css:367-388`.
- ✓ **Exit lifecycle before unmount** (closing class + animationend + timeout) — `DetailModal.tsx:360-378`, `PoeticCaptureCanvas.tsx:75-196`.
- ✓ **Side drawer uses transitions (interruptible)** not one-shot keyframes for transform — `src/ui/styles/sidebar.css:148-178` with PRM at `:310-319`.
- ✓ **Hover transitions present** on cards/filters (150–220ms range) — library `src/ui/styles/library.css:47-57`, sanctuary media cards `sanctuary.css:316-327`.
- ✓ **Notice / error enter** short fade — `src/ui/styles/sanctuary-shared.css:1-24`, `inline-notice.css`.
- ✓ **Recommendations loading ↔ content soft crossfade** — `recommendations.css:10-31`.

### Issues to Address

- ✗ **Motion gap: DetailModal “Dossier” panel** — `DetailModal.tsx:737-738` + `sanctuary.css:1253-1258`  
  `{detailsExpanded && (...)}` mounts with **no height/opacity transition**. Conditional primary chrome that snaps is a Jakub Critical-class gap.

- ✗ **Motion gap: adaptation link panel** — `DetailModal.tsx:659` (`!linkOpen ? …`)  
  Same snap pattern for a meaningful panel swap.

- ✗ **Motion gap: dock card open/close** — `dock.ts:320+`  
  Instant swap between toggle button and full card; no opacity/Y enter, no exit.

- ✗ **Hover card exit matches enter displacement** — `hoverCard.tsx:644-658`  
  Exit uses same `translateY(8px) scale(0.96)` as enter. Exits should be subtler (smaller Y / nearer scale, shorter duration).

- ✗ **Most enters lack blur materialization**  
  Jakub recipe = opacity + translateY + blur. Only home digest uses blur enter — `discovery-layout.css:503-511`. Sanctuary modal, library cards, discovery feed, popup slide use opacity/Y/scale only.

- ✗ **Token drift: content shadow tokens incomplete** — `src/shared/shadowTokens.ts:64-68`  
  Has durations + plain `ease` transitions; **missing** `--ease-out`, `--ease-focus-pull`, `--ease-soft-settle`, `--duration-curtain*`, `--duration-soft-settle`. Overlay/dock/hover card hardcode Béziers and durations → dual sources of truth.

- ✗ **Popup lacks app-shell nuclear PRM**  
  App: `global.css:606-614` zeros animation/transition duration globally. Popup imports only `tokens.css` + `popup.css` + emotional CSS — PRM only on selected rules (`popup.css:402-409`, `:654-657`). Hover/button transitions still run under reduced motion unless covered.

- ✗ **`transition: all` clusters** (polish debt)  
  - `src/ui/styles/popup.css:237, 338, 673, 709`  
  - `src/ui/styles/people.css:28, 469, 616`  
  - `src/ui/styles/discovery-search.css:57`  
  - `src/ui/styles/onboarding.css:153`  
  - `src/ui/styles/layout.css:292`  
  - `src/ui/styles/sidebar.css:63`  
  Property-explicit transitions only.

**Jakub would say:** The ceremonial paths (modal, poetic capture, empty projector) already feel production; match that discipline on dock/dossier/link panels and unify tokens so content surfaces don’t feel like a second product.

---

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ JHEY'S PERSPECTIVE — Experimentation & Delight
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

*Weight: Selective — ceremony and atmosphere only; brand forbids bounce / constant pulse on main chrome.*

### What's Working Well

- ✓ **`linear()` soft-settle easing token** — `src/shared/tokens.css:84-94` — pure CSS spring-like deceleration without bounce (on-brand).
- ✓ **`@property` typed aura stops** enabling interpolatable gradient radii — `src/ui/styles/emotional-components.css:4-27`, transition at `:111-116`.
- ✓ **One-shot empty projector** (clip-path + conic beam) — `emotional-components.css:301-377` with PRM kill `:404-414`.
- ✓ **Save ceremony gold underline + aura settle** — `emotional-components.css:128-195`; JS gated by PRM — `DetailModal.tsx:380+`, `PoeticCaptureCanvas`.
- ✓ **Stagger via scoped CSS variables** (`--feed-index`, `--suggestion-index`) — library/discovery/popup — good Jhey-style composition.
- ✓ **animation-fill-mode: backwards/both** used to avoid pre-stagger flash — library `:24`, discovery feed `:323`.

### Opportunities

- 💡 **Align shadow content CSS with `@property` + soft-settle** for any future plaque “saved” micro-feedback — today plaques only hover-transition (`overlay.ts`).
- 💡 **`linear()` on hover-card enter** instead of raw cubic-bezier duplicates — one token import path into shadow styles.
- 💡 **Scroll-driven archive “hardcover” feel** (progressive enhancement + IntersectionObserver fallback) for library first paint when lists grow long — only if it stays ≤ one hero moment per screen.
- 💡 **Icon/chevron state animation** on dossier toggle (opacity + small rotate) — `DetailModal.tsx:734` currently swaps ▴/▾ with no transition.
- 💡 **Do not add bounce/elastic** — brand + `CINEMATIC_JOURNAL_DESIGN_SPEC` prohibit constant pulse/bounce; keep delight in one-shot ceremony (already the right call).

**Jhey would say:** You’ve already shipped the interesting modern CSS (`@property`, `linear()`, clip-path beam). The next win isn’t more demos—it’s wiring that vocabulary into content-script shadows so the whole product speaks one motion dialect.

---

## Combined recommendations

### Critical (Must Fix)

| | Issue | File:line | Action |
|-|-------|-----------|--------|
| 🔴 | **Dock open/close motion gap** — DOM rebuild snaps between toggle and card | `src/content/dock.ts:315-322` | Keep both in DOM; toggle classes for opacity + translateY (≤220ms) + PRM instant; or accept instant but document as deliberate high-freq choice |
| 🔴 | **DetailModal dossier / link panels snap** | `DetailModal.tsx:659, 737` · `sanctuary.css:1253` | CSS grid-rows / max-height + opacity enter/exit, or always-mounted collapsed panel; respect PRM |

### Important (Should Fix)

| | Issue | File:line | Action |
|-|-------|-----------|--------|
| 🟡 | **shadowTokens missing cinematic motion tokens** | `src/shared/shadowTokens.ts:64-68` | Mirror `--ease-out`, `--ease-focus-pull`, `--ease-soft-settle`, curtain + soft-settle durations; replace hardcoded ms in overlay/dock/hoverCard |
| 🟡 | **`transition: all` + layout `max-width` on plaque reveal** | `src/content/overlay.ts:157-169` | Explicit properties; prefer transform/clip over max-width |
| 🟡 | **Popup PRM incomplete vs app shell** | `src/ui/popup.tsx` imports · `global.css:606-614` | Import shared PRM block or duplicate nuclear reduce rule in `popup.css` |
| 🟡 | **Hover-card exit not subtler than enter** | `src/content/hoverCard.tsx:644-658` | Shorter exit duration; smaller translate/scale |
| 🟡 | **Popup suggestion re-stagger on every query** | `src/ui/styles/popup.css:385-396` | Stagger only first presentation; static thereafter |
| 🟡 | **Hardcoded durations / default `ease` outside tokens** | `people.css`, `discovery-layout.css:317`, `settings.css:760`, etc. | Map to `--transition-fast` / `--ease-focus-pull` |

### Opportunities (Could Enhance)

| | Enhancement | Where | Impact |
|-|-------------|-------|--------|
| 🟢 | Add subtle blur to modal/feed enters (2–4px) | `sanctuary.css` modal keyframes, `library.css`, `discovery-layout.css` | Jakub materialization without longer duration |
| 🟢 | Animate dossier chevron / icon swaps | `DetailModal.tsx:734` | State-change confidence |
| 🟢 | Resolve spec vs tokens (450ms vs 280ms) | `CINEMATIC_JOURNAL_DESIGN_SPEC.md` § motion | Docs match shipped system |
| 🟢 | Replace remaining `transition: all` | popup, people, onboarding, layout, sidebar | Predictable paint + easier PRM |
| 🟢 | Optional dock “soft settle” on save | `dock.ts` save button | Ceremony parity with sanctuary |

---

## Score breakdown

| Dimension | Score | Notes |
|-----------|------:|-------|
| Token system & consistency | 7.5 | Strong in app tokens; content shadow drift |
| Enter/exit craft | 8.5 | Modals/poetic excellent; dock/panels lag |
| High-frequency restraint | 7.0 | Durations good; suggestion re-stagger + plaque all |
| Accessibility (PRM) | 8.0 | App shell excellent; popup/content patchy |
| Performance (composite props) | 7.0 | Some max-width/max-height/all |
| Delight / brand fit | 8.5 | Ceremony without bounce; on-spec restraint |
| **Overall** | **7.6** | Polish ceiling high after July; gaps are consistency |

---

## Checklist snapshot

| Area | Status |
|------|--------|
| Philosophy: frequency-aware | Partial — modals rare ✓; popup suggestions ⚠ |
| Motion gap analysis | Gaps remain: dock, dossier, link panel |
| Enter opacity+Y+blur | Partial — blur mostly digest-only |
| Exit subtler than enter | Modals ✓; hover card ✗ |
| Durations context-appropriate | ✓ (≤300ms shipped) |
| Custom easing | Tokens ✓; many local `ease` leftovers |
| `prefers-reduced-motion` | App ✓ nuclear; popup/content selective |
| No scale(0) | ✓ |
| Active press feedback | ✓ sanctuary / global buttons |
| Layout property animation | ⚠ max-height reflections, max-width plaque |
| Continuous animation without purpose | ✓ avoided on chrome; loading pulses OK + PRM |

---

## Designer reference summary

> **Who was referenced most:** **Jakub Krehel** (primary), with **Emil Kowalski** on high-frequency paths and **Jhey Tompkins** on ceremonial CSS features already in the codebase.
>
> **Why:** Subsume is a repeatedly used consumer sanctuary, not a marketing demo and not a pure productivity dashboard. Invisible polish and exit discipline matter most; speed rules protect overlays and popup; Jhey’s toolkit is already applied where delight is intentional.
>
> **If you want to lean differently:**
> - **More Emil:** Kill popup suggestion stagger entirely; drop hover lift on dense grids; force all micro-interactions ≤180ms; convert modal keyframes to transition-driven open state for full interruptibility.
> - **More Jakub:** Blur on every major enter; fix all conditional panels; optical pass on icon buttons; zero `transition: all`.
> - **More Jhey:** View-timeline archive reveals; more `@property` (e.g. border hue on focus); keep one-shot only—never looping chrome.

---

## Top 5 findings (executive)

1. **🔴 Dock expand/collapse is a hard DOM swap** — `src/content/dock.ts:315-322` — no enter/exit motion vs sanctuary modals.
2. **🔴 DetailModal dossier (and link) panels mount without transition** — `DetailModal.tsx:737` / `:659` · `sanctuary.css:1253`.
3. **🟡 Content `shadowTokens` lag full motion system** — `shadowTokens.ts:64-68` missing ease/curtain/soft-settle; overlays hardcode timing.
4. **🟡 `transition: all` + layout-property reveals** on plaques and secondary UI — `overlay.ts:163`, popup/people/onboarding clusters.
5. **🟡 Popup PRM weaker than app shell** — no nuclear duration kill; hover-card exit equal to enter — `popup.tsx` imports, `hoverCard.tsx:644-658`.

---

*Audit method: design-motion-principles skill (Emil / Jakub / Jhey + accessibility + common mistakes). Read-only; no code changes.*
