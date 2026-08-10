# Design Motion Principles Audit — Subsume

**Date:** 2026-08-10  
**Skill:** `design-motion-principles` v1.1  
**Repo / ref:** `/Users/harshabalakrishnan/Subsume` @ `a5471b5`  
**Scope:** `tokens.css` motion, popup, `dock.ts`, DetailModal, onboarding, library stagger, PRM  
**Mode:** Read-only  
**Overall score:** **8.3 / 10**

---

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 AUDIT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 0 Critical  |  🟡 7 Important  |  🟢 6 Opportunities
Primary perspective: Jakub (shipped cinematic consumer polish)
Secondary: Emil (high-frequency overlay / popup / dock restraint)
Selective: Jhey (ceremony, @property, linear(), empty projector)
Delta vs 2026-08-04 (7.6): +0.7 — dock enter/exit, accordion panels,
  popup nuclear PRM, shadow token parity, zero `transition: all`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Reconnaissance (context applied)

| Signal | Finding |
|--------|---------|
| **Project type** | Chrome extension: private cinematic sanctuary for films, shows, books (capture, archive, discovery, content overlays) |
| **Stack** | Preact + CSS-first motion (no Framer Motion / AnimatePresence) |
| **Motion system** | Tokenized durations ≤300ms (`--duration-fast` 130 → `--duration-curtain` 280 / close **220**), custom easings (`--ease-out`, `--ease-focus-pull`, `--ease-soft-settle` via `linear()`) |
| **Prior work** | July motion fixes + Aug 4 audit follow-through: modal exit lifecycle, dock class-driven enter/exit, dossier/link accordion, library/discovery stagger, popup nuclear PRM, explicit transitions (no `transition: all`) |
| **Spec tension** | `CINEMATIC_JOURNAL_DESIGN_SPEC.md` still documents Slow Dolly **450ms**; shipped tokens enforce **≤300ms** (correct for UI wiki / Emil restraint) |
| **Motion gaps remaining** | Hardcover spine dossier still conditional-mounts; popup suggestions re-key and re-stagger on every query; plaque reveal still animates `max-width`; modal/hover/dock exits often mirror enter displacement |

**Applied weighting (assignment: all three perspectives, product-weighted):**

- **Primary — Jakub Krehel:** Production polish for a shipped consumer sanctuary users reopen repeatedly.
- **Secondary — Emil Kowalski:** High-frequency paths (popup search, museum plaques, hover cards, dock toggle).
- **Selective — Jhey Tompkins:** Rare ceremonial moments (save, empty archive, aura) where CSS innovation already exists.

---

## Overall assessment

Subsume’s motion system is **among the more disciplined** for an extension: shared duration/ease tokens, cinematic enter/exit pairs (Slow Dolly / Curtain Close) with JS `closing` + `animationend` + fallback, `@property`-interpolated aura, one-shot save ceremony, feed/library stagger with `animation-fill-mode: backwards`, dock expand/collapse with double-rAF enter and timed exit, DetailModal dossier/link as **always-mounted accordions** (`grid-template-rows` + opacity), and **nuclear `prefers-reduced-motion`** on both app shell and popup.

What keeps the score under ~9 is **craft consistency**, not missing ceremony. High-frequency content chrome still leans on layout properties (`max-width` plaque reveal, `max-height` reflection excerpt); several exits still **copy enter displacement** (only shorter duration); popup typeahead **re-staggers on every keystroke** via list `key`; `shadowTokens` still omits soft-settle; and most enters omit Jakub’s materializing **blur** (digest is the exception). No Critical blockers remain relative to the Aug 4 bar.

The product still feels intentional and calm—not gimmicky—which matches the sanctuary brief. Closing the remaining high-freq and exit-asymmetry items would land a high 8.5–9 without adding spectacle.

---

## Per-designer perspectives

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ EMIL'S PERSPECTIVE — Restraint & Speed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

*Weight: Secondary — heavy on popup, overlays, dock, hover cards; light on rare sanctuary ceremony.*

### What's Working Well

- ✓ **Hard cap ≤300ms on user-facing motion** documented and enforced in tokens — `src/shared/tokens.css:68-102` (`--duration-fast` 130ms … `--duration-curtain` 280ms, `--duration-curtain-close` **220ms**).
- ✓ **Modal close is interruptible in spirit** (second Esc finishes immediately) — `src/ui/components/DetailModal.tsx:348-360`.
- ✓ **PRM short-circuits modal close** without waiting for animation — `DetailModal.tsx:354-356`; app shell nuclear rule — `src/ui/styles/global.css:607-615`.
- ✓ **Popup now has nuclear PRM parity** with app shell — `src/ui/styles/popup.css:937-945`.
- ✓ **Scale enters start ≥0.96**, not `scale(0)` — `src/styles/sanctuary.css:619-627`, hover card `src/content/hoverCard.tsx:644-645`, popup slide `popup.css:39-41`.
- ✓ **Dock motion is class/transition-driven** (interruptible path via gen counter + clear timers) — `src/content/dock.ts:7-9`, `:97-114`, `:287-313`, `:430-474`.
- ✓ **Active press scale** on sanctuary buttons (0.97–0.98 range, not 0) — e.g. sanctuary button patterns in `src/styles/sanctuary.css`.
- ✓ **Recommendations crossfade stays snappy at 180ms** — `src/ui/styles/recommendations.css:11-21`.
- ✓ **Zero remaining `transition: all`** in `src/` (grep clean) — explicit properties only.

### Issues to Address

- ✗ **Museum plaque hover uses curtain duration (280ms) on dense, high-frequency controls** — `src/content/overlay.ts:129-133`  
  Plaques appear on many posters; Emil prefers **~150–180ms** for hover micro-motion. Use `--duration-fast` / `--duration-normal`, not `--duration-curtain`.

- ✗ **Popup suggestion stagger re-fires as results update** — `src/ui/popup.tsx:561` (`key={… searchQuery}`) + `src/ui/styles/popup.css:387-397`  
  Typing → new list key → every item re-enters with delay. Class `suggestion-item--static` exists (`popup.css:400-402`) but only for the loading row. For a high-frequency surface, stagger **first presentation only** or drop stagger after first paint of a session.

- ✗ **Plaque reveal animates layout (`max-width`)** — `src/content/overlay.ts:157-170`  
  Prefer clip-path / transform / opacity so composite stays cheap and interruptible on hover thrash.

- ✗ **Reflection excerpt still expands via `max-height`** — `src/styles/sanctuary.css:2852-2863`  
  Softened by PRM (`:2908-2911`); still layout work on a moderately frequent control. Grid `0fr→1fr` (as dossier) is the better pattern already used nearby.

- ✗ **Magic `0.15s` / `0.2s` / `250ms ease` outside tokens** on secondary surfaces — e.g. `recommendations.css:316,344,395`, `discovery-layout.css:321`, `popup.css:394`  
  Custom curves exist but aren’t the default path for secondary UI.

**Emil would say:** Durations, modal discipline, dock class transitions, and nuclear PRM are already Linear-grade; stop re-staggering search suggestions and pull plaque hover timing down so dense browsing stays invisible-fast.

---

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 JAKUB'S PERSPECTIVE — Production Polish
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

*Weight: Primary — this is the bar for a repeatedly used consumer product.*

### What's Working Well

- ✓ **Enter/exit lifecycle before unmount** (closing class + animationend + timeout) — `DetailModal.tsx:341-380`, mirrored in `PoeticCaptureCanvas.tsx`.
- ✓ **Motion gap closed: DetailModal Dossier + link panels** use always-mounted accordion with `grid-template-rows` + opacity + visibility — markup `DetailModal.tsx:678-763`, CSS `sanctuary.css:1263-1308` with PRM.
- ✓ **Motion gap closed: dock pill ↔ card** enter/exit opacity + translateY (≤200/180ms) + PRM skip — `dock.ts:97-114`, `:213-230`, `:287-313`, `:430-474`.
- ✓ **shadowTokens motion parity improved** — durations + `--ease-out` + `--ease-focus-pull` + curtain tokens — `src/shared/shadowTokens.ts:64-79`.
- ✓ **Library first-paint stagger** with `--feed-index`, curtain duration, focus-pull ease, `backwards` fill — `src/ui/styles/library.css:10-31`; card index wiring e.g. `HardcoverSpineCard.tsx:47,75`.
- ✓ **Hover transitions present** on cards/filters (150–220ms range) — library `library.css:47-57`.
- ✓ **Side drawer uses transitions** (interruptible) not one-shot keyframes for open — `src/ui/styles/sidebar.css` open/closing classes.
- ✓ **Recommendations loading ↔ content soft crossfade** — `recommendations.css:10-31`.
- ✓ **Onboarding step pane enter** (opacity + 6px Y, 200ms) + PRM — `src/ui/styles/onboarding.css:212-232`; CTA transitions property-explicit — `:153`.

### Issues to Address

- ✗ **Modal exit displacement equals enter** — `sanctuary.css:619-639`  
  Enter: `scale(0.96) translateY(8px)`. Exit: same values. Jakub: exits should be **subtler** (e.g. scale 0.98, Y 4px) with shorter duration (already 220ms ✓).

- ✗ **Hover-card exit matches enter transform; only duration shortens** — `hoverCard.tsx:644-659`  
  Exit still `translateY(8px) scale(0.96)`; prefer smaller Y / nearer scale (duration 0.18s is good).

- ✗ **Dock exit uses same `translateY(8px)` as enter** — `dock.ts:97-112`  
  Exit slightly shorter (180 vs 200) but same travel. Soften exit to ~4px or opacity-only.

- ✗ **Most enters lack blur materialization**  
  Jakub recipe = opacity + translateY + blur. Only home digest uses blur enter — `discovery-layout.css:506-520`. Sanctuary modal, library cards, discovery feed, popup slide, dock use opacity/Y/scale only.

- ✗ **shadowTokens still missing soft-settle** — `shadowTokens.ts:64-79`  
  Has curtain + focus-pull; **missing** `--ease-soft-settle` and `--duration-soft-settle` from `tokens.css:89-99`. Content surfaces can’t share save-ceremony vocabulary without hardcoding.

- ✗ **Motion gap: HardcoverSpineCard dossier** still `{detailsExpanded && (…)}` mount/unmount — `HardcoverSpineCard.tsx:177-183`  
  DetailModal fixed this; archive card still snaps. Reuse `sanctuary-detail-accordion` pattern or equivalent.

- ✗ **Dossier chevron / link icon swaps with no transition** — `DetailModal.tsx:754-756` (▴/▾ text swap)  
  Instant glyph change is a small polish miss; opacity + rotate would signal state.

- ✗ **Onboarding step content has enter only** — `onboarding.css:212-227`  
  Step changes remount pane → enter fires; no exit. Acceptable for wizard rarity; if multi-step feels jumpy, add short opacity exit or crossfade.

**Jakub would say:** The ceremonial and primary paths (modal, dock, accordion dossier, library stagger, nuclear PRM) already feel production; match exit subtlety and soft-settle token parity so content chrome doesn’t feel like a second product, and bring hardcover dossier up to the DetailModal standard.

---

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ JHEY'S PERSPECTIVE — Experimentation & Delight
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

*Weight: Selective — ceremony and atmosphere only; brand forbids bounce / constant pulse on main chrome.*

### What's Working Well

- ✓ **`linear()` soft-settle easing token** — `src/shared/tokens.css:87-99` — pure CSS spring-like deceleration without bounce (on-brand).
- ✓ **`@property` typed aura stops** enabling interpolatable gradient radii — `src/ui/styles/emotional-components.css:3-27`, transition at `:111-116`.
- ✓ **One-shot empty projector** (clip-path + conic beam) — `emotional-components.css` empty-projector keyframes + PRM kill.
- ✓ **Save ceremony gold underline + aura settle** — `emotional-components.css:128-195`; JS gated by PRM — `DetailModal.tsx:56,382+`, `PoeticCaptureCanvas`.
- ✓ **Stagger via scoped CSS variables** (`--feed-index`, `--suggestion-index`) — library / discovery / popup — good Jhey-style composition.
- ✓ **`animation-fill-mode: backwards` / `both`** avoids pre-stagger flash — library `library.css:24`, discovery feed `discovery-layout.css:327-328`.
- ✓ **Dock double-rAF paint-then-transition** — classic CSS transition discipline — `dock.ts:299-305`.

### Opportunities

- 💡 **Wire soft-settle + `@property` into shadow content CSS** for optional plaque “saved” micro-feedback — today plaques only hover-transition (`overlay.ts`).
- 💡 **`linear()` / token easings on hover-card** instead of duplicated cubic-bezier literals — `hoverCard.tsx:645`.
- 💡 **Clip-path plaque reveal** instead of `max-width` — same visual, composite-friendly (`overlay.ts:157-170`).
- 💡 **Scroll-driven archive “hardcover” feel** (progressive enhancement + IntersectionObserver fallback) for long libraries — one hero moment per screen max.
- 💡 **Animate dossier chevron** (opacity + small rotate) — `DetailModal.tsx:754-756`.
- 💡 **Do not add bounce/elastic** — brand + cinematic spec prohibit constant pulse/bounce; keep delight in one-shot ceremony (already the right call).

**Jhey would say:** You’ve already shipped the interesting modern CSS (`@property`, `linear()`, clip-path beam, double-rAF dock). The next win isn’t more demos—it’s wiring that vocabulary into content-script shadows and replacing layout reveals so the whole product speaks one motion dialect.

---

## Combined recommendations

### Critical (Must Fix)

*None at this pass.* Prior Critical items (dock snap, DetailModal dossier/link snap) are resolved with production-grade patterns.

### Important (Should Fix)

| | Issue | File:line | Action |
|-|-------|-----------|--------|
| 🟡 | **Popup suggestion re-stagger on every query** | `popup.tsx:561` · `popup.css:387-397` | Stable list key; stagger only first open of dropdown or mark items static after first paint |
| 🟡 | **Plaque hover too slow + layout `max-width` reveal** | `overlay.ts:129-133`, `:157-170` | Hover ≤180ms (`--duration-fast`/`normal`); clip/transform instead of max-width |
| 🟡 | **Modal / hover-card / dock exits mirror enter travel** | `sanctuary.css:630-639` · `hoverCard.tsx:655-659` · `dock.ts:109-112` | Smaller exit Y/scale; keep shorter duration |
| 🟡 | **Hardcover dossier still conditional mount** | `HardcoverSpineCard.tsx:177-183` | Always-mounted accordion like DetailModal |
| 🟡 | **shadowTokens missing soft-settle** | `shadowTokens.ts:64-79` | Mirror `--ease-soft-settle` + `--duration-soft-settle` from `tokens.css:89-99` |
| 🟡 | **Hardcoded durations / bare `ease` outside tokens** | `discovery-layout.css:321`, `recommendations.css:316+`, `popup.css:394` | Map to `--transition-fast` / `--ease-focus-pull` / `--duration-*` |
| 🟡 | **Reflection excerpt still `max-height` layout anim** | `sanctuary.css:2857-2863` | Prefer grid `0fr→1fr` pattern used by dossier |

### Opportunities (Could Enhance)

| | Enhancement | Where | Impact |
|-|-------------|-------|--------|
| 🟢 | Add subtle blur (2–4px) to modal/feed/library enters | `sanctuary.css` modal keyframes, `library.css`, `discovery-layout.css` | Jakub materialization without longer duration |
| 🟢 | Animate dossier chevron / icon swaps | `DetailModal.tsx:754-756` | State-change confidence |
| 🟢 | Resolve spec vs tokens (450ms vs 280ms) | `CINEMATIC_JOURNAL_DESIGN_SPEC.md` § motion | Docs match shipped system |
| 🟢 | Optional dock soft-settle on save | `dock.ts` save success | Ceremony parity with sanctuary |
| 🟢 | Onboarding step crossfade / short exit | `onboarding.css:212-227` | Smoother multi-step wizard |
| 🟢 | Token easings in hover-card / dock literals | `hoverCard.tsx:645`, `dock.ts:106-112` | Single motion dialect |

---

## Score breakdown

| Dimension | Score | Notes |
|-----------|------:|-------|
| Token system & consistency | 8.5 | Strong app tokens; shadow near-parity; soft-settle gap |
| Enter/exit craft | 8.5 | Modals/dock/accordion excellent; exit travel still enter-matched |
| High-frequency restraint | 7.5 | Durations good; suggestion re-stagger + plaque curtain hover |
| Accessibility (PRM) | 9.0 | App + popup nuclear; content surfaces selective + JS gates |
| Performance (composite props) | 7.5 | max-width plaque + max-height excerpt remain |
| Delight / brand fit | 8.5 | Ceremony without bounce; on-spec restraint |
| **Overall** | **8.3** | Critical gaps closed; polish ceiling is consistency |

---

## Checklist snapshot (pass / fail)

| Area | Status |
|------|--------|
| Philosophy: frequency-aware | **Partial** — modals/dock rare ✓; popup suggestions ⚠; plaque hover ⚠ |
| Motion gap analysis (primary UI) | **Pass** — DetailModal dossier/link + dock fixed; hardcover spine still gap |
| Enter opacity + Y (+ blur) | **Partial** — opacity+Y/scale ✓; blur mostly digest-only |
| Exit subtler than enter | **Partial** — shorter duration ✓; smaller travel ✗ on modal/hover/dock |
| Durations context-appropriate | **Pass** — shipped ≤300ms |
| Custom easing tokens | **Pass** on primary; **Partial** secondary (`ease` leftovers) |
| `prefers-reduced-motion` | **Pass** — app + popup nuclear; content selective + reduced skip in JS |
| No scale(0) | **Pass** |
| Active press feedback | **Pass** on sanctuary chrome |
| Layout property animation | **Fail / residual** — plaque max-width, reflection max-height |
| Continuous animation without purpose | **Pass** — no bounce on chrome; loading pulses OK + PRM |
| `transition: all` | **Pass** — none remaining in `src/` |
| Stagger fill-mode / no flash | **Pass** — backwards/both on library & discovery |
| Interruptible high-touch paths | **Pass** — transitions + animGen on dock; second-Esc on modal |

---

## Focused surface notes (assignment keys)

### tokens.css motion
`src/shared/tokens.css:63-103` — coherent system: instant/fast/normal/slow, `--ease-out`, focus-pull, soft-settle `linear()`, curtain enter 280 / close 220. Comment correctly enforces UI wiki ≤300ms.  
**Gap:** soft-settle not mirrored in `shadowTokens.ts`.

### popup
Nuclear PRM (`popup.css:937-960`), view enter (`popupSlide` 0.3s), suggestion stagger 180ms + 40ms index, property-explicit intent/notes transitions.  
**Gap:** list re-key on query forces re-stagger (`popup.tsx:561`); still high-freq fatigue risk.

### dock.ts
Enter 200 / exit 180, opacity+Y, double-rAF, PRM instant, gen-guarded timers.  
**Gap:** exit travel = enter; bare `ease-out` not token vars; pill has no exit on expand (documented intentional).

### DetailModal
Closing lifecycle, save ceremony PRM gate, accordion dossier + link panels with inert/aria.  
**Gap:** exit keyframe travel equals enter; chevron swap unanimated.

### onboarding
Property-explicit CTA; step-pane enter 200ms; PRM kills step animation.  
**Gap:** no step exit; rare so low severity.

### library stagger
`library.css:10-31` — first 6 via `--feed-index`, curtain + focus-pull, `backwards`, PRM off. Matches discovery pattern.  
**Gap:** hardcover dossier conditional mount still snaps.

### PRM
App `global.css:607-615` nuclear; popup nuclear; sanctuary modal/accordion/reflection/emotional/dock/overlay/hoverCard selective + JS `prefersReducedMotion()` on DetailModal/dock/ceremony.  
**Gap residual:** content shadows rely on per-component media queries (acceptable if complete—today mostly are).

---

## Designer reference summary

> **Who was referenced most:** **Jakub Krehel** (primary), with **Emil Kowalski** on high-frequency paths and **Jhey Tompkins** on ceremonial CSS features already in the codebase.
>
> **Why:** Subsume is a repeatedly used consumer sanctuary, not a marketing demo and not a pure productivity dashboard. Invisible polish and exit discipline matter most; speed rules protect overlays and popup; Jhey’s toolkit is already applied where delight is intentional.
>
> **If you want to lean differently:**
> - **More Emil:** Kill popup suggestion stagger entirely; drop hover lift on dense grids; force plaque/hover micro-interactions ≤180ms; convert modal keyframes to transition-driven open state for full interruptibility.
> - **More Jakub:** Blur on every major enter; subtler exits everywhere; hardcover accordion; zero magic ms outside tokens; optical pass on chevrons.
> - **More Jhey:** View-timeline archive reveals; clip-path plaque; more `@property` (e.g. border hue on focus); keep one-shot only—never looping chrome.

---

## Top 3 prioritized fixes

1. **🟡 Popup typeahead re-staggers on every keystroke** — `src/ui/popup.tsx:561` + `src/ui/styles/popup.css:387-397` — stabilize list key / apply `--static` after first paint so high-frequency search stays Emil-fast.  
2. **🟡 Exit travel equals enter on modal, hover card, and dock** — `src/styles/sanctuary.css:630-639`, `src/content/hoverCard.tsx:655-659`, `src/content/dock.ts:109-112` — smaller Y/scale on exit (duration already shorter).  
3. **🟡 Plaque high-freq cost** — `src/content/overlay.ts:129-133`, `:157-170` — shorten hover to ≤180ms and replace `max-width` reveal with clip/transform + opacity.

---

## Delta vs 2026-08-04

| Prior Critical / Important | Status @ 2026-08-10 |
|---------------------------|---------------------|
| Dock open/close snap | **Fixed** — enter/exit classes + timers + PRM |
| DetailModal dossier / link snap | **Fixed** — grid accordion + PRM |
| shadowTokens missing ease/curtain | **Mostly fixed** — soft-settle still missing |
| `transition: all` clusters | **Fixed** — none remaining |
| Popup PRM incomplete | **Fixed** — nuclear block in `popup.css` |
| Hover-card exit not subtler | **Partial** — duration shorter; transform still equal |
| Popup suggestion re-stagger | **Open** — static class exists but list re-keys |
| Plaque max-width / slow hover | **Open** |

---

*Audit method: design-motion-principles skill (Emil / Jakub / Jhey + audit-checklist + accessibility). Read-only; no code changes.*
