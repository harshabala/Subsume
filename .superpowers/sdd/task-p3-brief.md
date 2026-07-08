# Task P3 — Popup ↔ sanctuary cohesion + light theme

## Goal
Align popup visual language with sanctuary app; ensure light theme parity.

## Files
- `src/ui/styles/popup.css`
- `src/ui/popup.tsx` (class names only if needed)

## Requirements

1. **Header cohesion**: Popup header should echo sanctuary nav/plaque styling:
   - Use same border token `--border-restraint` or `--nav-border`
   - Brand area: match discovery pulse plaque subtle background on header optional (`--lobby-status-bg` or `--bg-plaque`)
   - Tagline: uppercase tracking like `.discovery-pulse-label` (10px, letter-spacing 0.12em)

2. **Light theme parity** under `[data-theme="light"]`:
   - `.popup-shell` background `--bg-base`, text `--fg-base`
   - Header, cards, inputs use semantic tokens (not hardcoded #0a0a0b)
   - Suggestion list, emotional sliders readable on parchment
   - Film grain opacity reduced in light mode (`--grain-opacity-popup: 0.03`)

3. **Stat chips in popup overview** align with discovery-pulse-item visual (border, padding rhythm)

4. Do not change popup width (360px) or functional layout

## Tests
`npm test` && `npm run build`