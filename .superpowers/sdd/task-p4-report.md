# Task P4 Report — Copy polish (em-dashes)

## Status
**DONE**

## Files changed
- `src/ui/pages/Onboarding.tsx` — headline + pillar descriptions
- `src/ui/pages/NewReleases.tsx` — subtitle
- `src/ui/pages/Home.tsx` — discovery feed copy (placeholders left intact)
- `src/ui/pages/Search.tsx` — subtitle paragraph
- `src/ui/pages/Recommendations.tsx` — curator explainer
- `src/ui/pages/Settings.tsx` — section descriptions, list items, option labels
- `src/ui/components/SettingsDiagnosticsPanel.tsx` — user-visible error strings

## Implementation summary

Replaced em-dashes (—) in user-facing marketing/copy with commas, periods, or ` · ` separators per design-taste guidance. Literary calm voice preserved throughout.

### Replacement patterns
| Location | Before | After |
|----------|--------|-------|
| Onboarding headline | `watch — where` | `watch, where` |
| Onboarding pillars | `browse — ratings` / `taste — organised` | comma joins |
| NewReleases subtitle | `03 — Historic` | `03 · Historic` |
| Home discovery | `TVmaze — no API keys` / `feed — Trakt` | comma / ` · ` |
| Search subtitle | `catalogue — no API keys` | `catalogue, no API keys` |
| Recommendations | `matches — nothing` | `matches. Nothing` |
| Settings intro | `controls — no jargon` | `controls, with no jargon` |
| Settings list items | `TVmaze — TV series…` | `TVmaze · TV series…` |
| Settings options | `Restrained — CDN…` | `Restrained · CDN…` |
| Settings prose | various `—` clauses | commas or periods |
| Diagnostics | `Copy failed — use` / `entry — full` | period / ` · ` |

### Intentionally preserved
- `Home.tsx` null/loading placeholders (`'—'` for year, counts)
- `Settings.tsx` JSX comment `{/* AI Curator — journey + editable prompts */}`

## Test results
- `npm test`: **212 passed** (40 files); exit code **1** due to pre-existing Vitest teardown error (`EnvironmentTeardownError` loading `seedIndianHighlights.ts` from `wikidata.test.ts`) — unrelated to copy changes
- `npm run build`: **success**, exit 0

## Concerns
None for this task. The Vitest teardown error predates P4 and does not affect test assertions.