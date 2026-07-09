# Motion Audit Full Fix Plan (Subsume)

> **For agentic workers:** Implement task-by-task. Commit after each task. Run focused tests then `npx vitest run` before commit.

**Goal:** Ship all Critical, Important, and Opportunity items from the design-motion-principles audit (Jhey-elevated delight + Jakub polish + Emil high-freq restraint).

**Architecture:** CSS-first motion (no framer-motion). Preact components get exit lifecycle via local `closing` state + `animationend`. Tokens in `src/shared/tokens.css`. Sanctuary modal CSS in `src/styles/sanctuary.css`. Spec: `CINEMATIC_JOURNAL_DESIGN_SPEC.md` §5 (Slow Dolly 450ms, Curtain Close ~300ms, no bounce/constant pulse).

**Global Constraints:**
- Respect `prefers-reduced-motion` everywhere new motion is added
- No bouncy spring physics; no continuous pulse on main chrome
- Rare/ceremonial moments may use longer durations (450–900ms)
- High-frequency (popup search typing) stays ≤220ms, interruptible
- Use transform/opacity only (not layout width/height anim where avoidable)
- Do not break existing tests; add tests for exit lifecycle where practical
- Work in `/Users/harshabalakrishnan/Subsume`
- Preact (not React) — use `class` or `className` consistently with file patterns
- Do not revert unrelated seed-data changes if present

---

## Task 1: Modal exit lifecycle + Slow Dolly timing + PRM

**Files:**
- Modify: `src/ui/components/DetailModal.tsx`
- Modify: `src/styles/sanctuary.css`
- Modify: `src/shared/tokens.css` (if needed for curtain tokens)
- Add: `tests/detailModalExit.test.tsx` (or jsdom unit test of close handler if component test harness exists)

**Requirements:**
1. DetailModal does not call `onClose()` immediately on Escape/backdrop/close button
2. Instead set `closing=true`, add class `closing` to backdrop + content
3. On `animationend` of content (or fallback timeout 350ms), call `onClose()`
4. Enter animation uses `--duration-curtain` (450ms) Slow Dolly: opacity + translateY(~4–8px) + scale from ≥0.96
5. Exit is subtler: shorter (~280–300ms), smaller translate (e.g. -4px or 4px down reduced), ease-in
6. `@media (prefers-reduced-motion: reduce)` on sanctuary modal: no animation; close immediately
7. Wire same exit helper pattern reusable if PoeticCaptureCanvas also needs it (optional same task if shared util)

**Done when:** Modal opens with curtain timing; close plays exit then unmounts; PRM skips animation; vitest green.

---

## Task 2: ExpandableReflection + transition:all cleanup + nav/errors enter

**Files:**
- Modify: `src/ui/components/ExpandableReflection.tsx` + CSS (sanctuary or archive CSS)
- Modify: `src/styles/sanctuary.css` — replace broad `transition: all` on interactive chrome with explicit properties where safe
- Modify: `src/ui/App.tsx` — nav menu enter/exit opacity+Y
- Modify: pages with `actionError &&` — CSS class enter for notices

**Requirements:**
1. Expand/collapse reflection uses smooth opacity + max-height or grid-rows transition (no hard snap)
2. PRM: instant expand
3. Nav menu: enter animation when opened; optional exit
4. Inline action errors: fade-in ~180ms

**Done when:** Expand feels smooth; no critical layout thrash; tests green.

---

## Task 3: Recommendations crossfade + popup suggestion stagger

**Files:**
- Modify: `src/ui/pages/Recommendations.tsx` + CSS
- Modify: `src/ui/popup.tsx` + `src/ui/styles/popup.css`

**Requirements:**
1. Loading ↔ content soft crossfade (~180ms)
2. Popup suggestions: stagger children 40ms, max ~6, enter opacity+translateY
3. PRM: no stagger

**Done when:** Recs and popup feel less snap-y; tests green.

---

## Task 4: Empty projector + library stagger + digest enter

**Files:**
- Modify: `src/ui/components/EmptyStateProjection.tsx` + `emotional-components.css` or dedicated CSS
- Modify: `src/ui/pages/Library.tsx` + library CSS for card stagger
- Modify: `src/ui/pages/Home.tsx` + discovery/home CSS for weekly digest enter

**Requirements:**
1. EmptyStateProjection: one-shot “projector beam” (opacity/clip-path/conic glow, 600–900ms once)
2. Library media cards: stagger first 6 like discovery feed (`--feed-index` pattern)
3. Weekly digest block: fade+blur enter when present
4. PRM: static states

**Done when:** Empty state and archive first paint feel ceremonial; PRM safe.

---

## Task 5: Aura @property + reflection-save ceremony + linear() tokens

**Files:**
- Modify: `src/shared/tokens.css` — add soft-settle `linear()` token(s), document usage
- Modify: `src/ui/components/AuraVisualizer.tsx` + emotional CSS — interpolate glow via @property if supported
- Modify: `DetailModal` / `PoeticCaptureCanvas` — brief gold underline or aura settle on successful reflection save (one-shot class ~500ms)

**Requirements:**
1. Tokens: `--ease-soft-settle` using CSS `linear()` without bounce
2. Aura gradients transition smoothly when slider values change
3. After save notes/reflection success, play one micro-ceremony (class on/off)
4. PRM: no ceremony animation

**Done when:** All opportunities landed; full vitest + build green.

---

## Task 6: Integration verification

**Requirements:**
1. `npx vitest run` all green
2. `npm run build` green
3. Grep: `closing` used in DetailModal; `prefers-reduced-motion` in sanctuary.css modal section
4. Commit remaining work if not already committed per-task
