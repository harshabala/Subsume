# Task P5 — Motion layer

## Goal
Add restrained motion: discovery feed stagger entrance; audit/fix library spine hover consistency.

## Files
- `src/ui/styles/discovery-layout.css`
- `src/ui/components/DiscoveryFeedCard.tsx` (add stagger class via index prop if needed)
- `src/ui/pages/Home.tsx` (pass index to feed cards)
- `src/ui/styles/poetic-sanctuary.css` or `library.css` (spine hover)
- `src/ui/components/archive/HardcoverSpineCard.tsx` (if class changes needed)

## Requirements

### Discovery feed stagger
- Add `@keyframes discoveryFeedIn` (opacity 0→1, translateY 8px→0)
- `.discovery-feed-card` animation with `animation-delay: calc(var(--feed-index, 0) * 60ms)`
- Cap delay at ~300ms (max index 5)
- `@media (prefers-reduced-motion: reduce)` → no animation

### Spine hover audit
- Ensure `.sanctuary-media-card` or `.media-card` has consistent:
  - `transition: transform 0.22s var(--ease-focus-pull), box-shadow 0.22s ease`
  - `:hover` → `transform: translateY(-3px)` + elevated shadow token
- Apply same on `.sanctuary-media-card` used in discovery if missing

## Tests
`npm test` && `npm run build`