# Task P1 — Typography & reflection hierarchy

## Goal
Discovery hero should show user reflection when the featured title is in-library; standardize plaque typography (serif reflections, sans meta).

## Files
- `src/ui/pages/Home.tsx`
- `src/ui/styles/discovery-layout.css` (or `poetic-sanctuary.css` if plaque classes live there)

## Requirements

### 1. Hero reflection priority
In `Home.tsx`, after `heroMedia` is resolved:
- Find matching `libraryItems` entry: `libraryItems.find(({ media }) => media.id === heroMedia?.id)`
- Import `getReflectionExcerpt` from `../components/archive/constants`
- `heroQuote` logic:
  1. If library match + `getReflectionExcerpt(library)` → use that (truncate to 120 chars with ellipsis if longer)
  2. Else if `heroMedia?.overview` → use overview (existing behavior)
  3. Else fallback string (existing)

### 2. Plaque typography
Ensure CSS:
- `.plaque-quote` uses `var(--font-editorial)` (serif) — verify/fix
- `.plaque-director`, `.plaque-rating`, `.plaque-index` use `var(--font-ui)` (sans)
- Add `.plaque-quote--reflection` modifier if needed when showing user reflection vs synopsis (optional subtle label)

### 3. Weekly picks cards
Where Home shows overview snippets on pick cards (~line 530), prefer `getReflectionExcerpt` when library item exists for that media.

## Tests
Run `npm test` and `npm run build`.

## Do NOT
- Change IA or nav
- Add new dependencies