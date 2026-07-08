# Task P5 Report — Motion layer

## Status
**DONE**

## Files changed
- `src/ui/styles/discovery-layout.css` — `discoveryFeedIn` keyframes, stagger animation, reduced-motion guard
- `src/ui/components/DiscoveryFeedCard.tsx` — optional `index` prop, `--feed-index` CSS variable (capped at 5)
- `src/ui/pages/Home.tsx` — pass `index` to discovery feed cards
- `src/styles/sanctuary.css` — unified `.sanctuary-media-card` hover lift + shadow
- `src/ui/styles/library.css` — unified `.media-card` hover lift + shadow

## Implementation summary

### Discovery feed stagger
- Added `@keyframes discoveryFeedIn` (opacity 0→1, `translateY(8px)`→0)
- `.discovery-feed-card` uses `animation-delay: calc(min(var(--feed-index, 0), 5) * 60ms)` (max ~300ms)
- `DiscoveryFeedCard` accepts `index` and sets `--feed-index` via inline style (component also caps at 5)
- `Home.tsx` passes map index into each feed card
- `@media (prefers-reduced-motion: reduce)` disables feed card animation

### Spine hover audit
- `.sanctuary-media-card` (discovery search/picks/weekly) and `.media-card` (library hardcover spines) now share:
  - `transition: transform 0.22s var(--ease-focus-pull), box-shadow 0.22s ease` (+ border-color)
  - `:hover` → `transform: translateY(-3px)` + `box-shadow: var(--shadow-card-hover)`
- `HardcoverSpineCard.tsx` unchanged — existing `media-card sanctuary-media-card` classes pick up updated CSS

## Test results
- `npm test`: **212 passed** (40 files), exit 0
- `npm run build`: **success**, exit 0

## Concerns
- Discovery feed **card layout** styles (grid, poster, typography) still live in `settings.css`, which `Home.tsx` does not import. Stagger animation applies via `discovery-layout.css`, but base card chrome may be missing on Home until those rules are relocated or `settings.css` is split. Pre-existing architectural gap; out of P5 scope but worth a follow-up.