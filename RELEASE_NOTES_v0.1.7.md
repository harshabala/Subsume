# Subsume v0.1.7

Sanctuary UX polish, taste-aware AI curator, and Chrome load fixes.

## Highlights

- **Library UX**: Reflection excerpts (~120 chars) with expand; title-first card hierarchy; collection filters (All / Watched / Want to watch / Watching / Abandoned)
- **Navigation**: Unified top nav (Library · Discovery · Settings) + explore subnav; drawer removed from main flow
- **Settings**: Section tabs with plain-language descriptions; editable AI curator prompts (`#ai-curator`)
- **Copy & a11y**: Impeccable/Taste audit pass — clearer labels, 44px targets, focus rings, dialog semantics on detail modal
- **Build**: Vite `base: './'` + relative `./assets/` paths for reliable unpacked Chrome loads; version **0.1.7**

## Install (unpacked)

```bash
git clone https://github.com/harshabala/Subsume.git
cd Subsume && npm ci && npm run build
```

Chrome → `chrome://extensions` → **Load unpacked** → select the `dist` folder.

## Tests

203 passing (`npm test`).