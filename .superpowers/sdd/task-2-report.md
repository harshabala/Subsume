# Task 2 Report: ExpandableReflection + transition cleanup + nav/errors enter

## Status
**DONE**

## Commit
- **Hash:** `82b94510673f708db855183950e3562b2744f892` (short: `82b9451`)
- **Message:** `feat(ui): reflection expand and chrome motion polish`
- **Files committed only:**
  - `src/ui/components/ExpandableReflection.tsx`
  - `src/styles/sanctuary.css`
  - `src/ui/App.tsx`
  - `src/ui/styles/sidebar.css`
  - `src/ui/styles/sanctuary-shared.css`
  - `.superpowers/sdd/task-2-report.md`
- Seed-data and unrelated working tree changes were **not** staged.

## What changed

### ExpandableReflection (`src/ui/components/ExpandableReflection.tsx`)
- Always renders full reflection text (no hard swap between truncated/full strings).
- Expandable blocks use classes `reflection-excerpt-expandable` + `reflection-excerpt-expanded`.
- CSS-driven expand/collapse on `.reflection-excerpt-panel-inner`: `max-height` (~3 lines ↔ 12rem) + `opacity`, with a soft mask fade when collapsed.
- Toggle still reports `aria-expanded` and optional `onToggleExpand`.
- PRM: `transition: none` on the panel inner (instant expand/collapse).

### sanctuary.css transition cleanup
- Replaced all `transition: all` on interactive chrome with explicit properties (`background`, `border-color`, `color`, `opacity`, etc.) matched to hover/active rules.
- Reflection excerpt styles updated for smooth expand; removed line-clamp hard snap path.

### Nav menu (`src/ui/App.tsx` + `sidebar.css`)
- Open/close lifecycle: `navMenuClosing` keeps backdrop mounted through exit; drawer loses `open` and gains `closing` until `transitionend` (or 400ms fallback).
- Drawer enter/exit: `opacity` + `translateX` (with `pointer-events` gated when closed).
- PRM: close immediately; CSS disables drawer transitions and backdrop animations.
- Backdrop already had enter/exit keyframes; exit now actually runs via closing class.

### Inline action errors (`sanctuary-shared.css`)
- `.sanctuary-notice-plaque` fades in over **180ms** (`sanctuary-notice-enter`).
- PRM: animation disabled.
- Covers Library, Recommendations, Alerts, NewReleases, Search (shared class).

## Verification
```
npx vitest run
# Test Files  41 passed (41)
# Tests       219 passed (219)
```

## Self-review checklist
| Requirement | Met |
|-------------|-----|
| Reflection expand/collapse smooth (opacity + max-height) | Yes |
| PRM: instant expand | Yes |
| Nav menu enter animation | Yes (opacity + slide) |
| Nav menu exit | Yes (closing lifecycle) |
| Inline action errors fade-in ~180ms | Yes |
| `transition: all` cleaned in sanctuary.css | Yes (0 remaining) |
| Seed-data not committed | Yes |

## Concerns
- Collapsed reflection uses a fixed `max-height: 4.5em` (~3 lines) rather than measuring content; very large fonts/zoom may clip slightly differently than the old 120-char truncate + line-clamp combo.
- Nav drawer exit relies on `transitionend` for `transform`/`opacity`; if both fire, a ref guard prevents double-finish. Fallback timeout covers browsers that skip events under PRM edge cases.
