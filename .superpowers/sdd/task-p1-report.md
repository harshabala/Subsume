# Task P1 Report — Typography & reflection hierarchy

## Status
**DONE**

## Files changed
- `src/ui/pages/Home.tsx` — hero reflection priority, weekly picks reflection excerpts, `plaque-quote--reflection` modifier
- `src/ui/styles/discovery-layout.css` — plaque typography tokens (`--font-editorial` / `--font-ui`), reflection label styling

## Implementation summary

### Hero reflection priority
- After `heroMedia` resolves, finds matching `libraryItems` entry by media id.
- `heroQuote` priority: user reflection excerpt (truncated to 120 chars) → media overview → fallback string.
- Applies `plaque-quote--reflection` class when showing user reflection.

### Plaque typography
- `.plaque-quote` uses `var(--font-editorial)` (serif).
- `.plaque-director`, `.plaque-rating`, `.plaque-index` use `var(--font-ui)` (sans).
- `.plaque-quote--reflection::before` shows subtle "Your reflection" label in sans meta typography.

### Weekly picks cards
- `pickSynopsisForMedia()` helper prefers `getReflectionExcerpt` when the pick's media is in the user's library; falls back to `pick.reason`.

## Test results
- `npm test`: **212 passed** (40 files), exit 0
- `npm run build`: **success**, exit 0

## Concerns
None. No IA/nav changes; no new dependencies.