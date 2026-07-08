# Task P2 — Tokenize inline styles

## Goal
Extract repeated inline `style={{}}` patterns into shared CSS classes; apply across UI pages.

## New shared CSS file
Create `src/ui/styles/sanctuary-shared.css` and import from `src/ui/index.tsx` (or global.css).

## Classes to add

### `.sanctuary-notice-plaque`
For error/action notice plaques used across pages:
```css
.sanctuary-notice-plaque {
  max-width: 500px;
  margin: 0 auto 24px;
  border-color: var(--border-hero);
}
.sanctuary-notice-plaque-text {
  color: var(--text-reflection);
}
```

### `.sanctuary-notice-plaque--centered`
`margin: 48px auto` variant for empty states

### `.sanctuary-filter-row`
`display: flex; gap: 12px; margin-bottom: 20px;`

### `.sanctuary-filter-chips`
`display: flex; gap: 8px; flex-wrap: wrap;`

### `.sanctuary-view-toggle`
For Recommendations/New Releases mode toggles:
```css
.sanctuary-view-toggle {
  display: flex;
  margin: 0 auto 32px;
  max-width: 360px;
}
.sanctuary-view-toggle-btn {
  flex: 1;
  padding: 8px 16px;
}
```

### `.sanctuary-spinner-centered`
`margin: 0 auto 16px`

### `.sanctuary-card-grid-padded`
`padding: 0 32px; max-width: 1200px; margin: 0 auto 48px`

## Pages to update (replace inline styles with classes)
- `src/ui/pages/Alerts.tsx`
- `src/ui/pages/NewReleases.tsx`
- `src/ui/pages/Search.tsx`
- `src/ui/pages/Recommendations.tsx`
- `src/ui/pages/Home.tsx` (only inline styles that match patterns above)
- `src/ui/pages/Library.tsx` where patterns match
- `src/ui/App.tsx` where patterns match

Keep legitimate dynamic inline styles (e.g. Stats progress bar `width: ${percent}%`).

## Tests
`npm test` && `npm run build`