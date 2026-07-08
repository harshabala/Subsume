# Task P4 — Copy polish (em-dashes)

## Goal
Replace em-dashes (—) in user-facing marketing/copy strings with commas, periods, or en-dashes where appropriate. Per design-taste skill: zero em-dashes in visible copy.

## DO replace em-dashes in:
- `src/ui/pages/Onboarding.tsx` (headline + pillar descriptions)
- `src/ui/pages/NewReleases.tsx` (subtitle)
- `src/ui/pages/Home.tsx` (descriptive strings like "Trending on Trakt...")
- `src/ui/pages/Search.tsx` (subtitle paragraph)
- `src/ui/pages/Recommendations.tsx` (descriptive copy)
- `src/ui/pages/Settings.tsx` (section descriptions, list items, option labels - user-facing prose only)
- `src/ui/components/SettingsDiagnosticsPanel.tsx` (user-visible error strings)

## DO NOT replace:
- Typographic em-dash used as empty/missing data placeholder (`'—'` for null year/count in tables/stats)
- CSS comments
- `aria-hidden` or technical strings

## Tone
Keep literary calm voice. Use commas or " · " separators instead of em-dashes.

## Tests
`npm test` && `npm run build`