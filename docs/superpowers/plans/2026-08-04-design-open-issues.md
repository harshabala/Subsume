# Design Open Issues Fix Plan (post-P0)

**Branch:** `fix/design-p0-review-wave`  
**North star:** Option A synthesize — sanctuary soul + scarce Rosso Corsa + Cinema Black.  
**Constraint:** Motion ≤300ms; `prefers-reduced-motion`; no Ferrari trademarks; keep variable names (`--gold` aliases OK).

## Already done (P0)
Solid CTAs, gold purge, transition:all, hover gates, modal exit ease, brand.md/PRODUCT.md.

## Open tasks

### A — A11y focus + stats numerals + SVG aria
- Every `outline: none` on interactive controls must have matching `:focus-visible` ring using `var(--ring)` or accent-gold mix.
- Stats values: add `font-variant-numeric: tabular-nums` to `.stats-meta-value`, `.stats-book-value`, `.stats-genre-count` in sanctuary.css.
- Decorative SVGs in DetailModal close + popup: `aria-hidden="true"` where decorative.

### B — Shadow tokens motion parity
- Extend `SHADOW_TOKEN_CSS` with: `--ease-out`, `--ease-focus-pull`, `--duration-curtain`, `--duration-curtain-close`, `--duration-fast/normal/slow`, `--transition-fast`, match app tokens.
- Prefer CSS vars in content overlay hardcodes where easy.

### C — Dock expand/collapse motion
- `src/content/dock.ts`: avoid hard innerHTML flash; animate collapsed pill ↔ expanded card with opacity/transform ≤220ms, PRM-safe.
- Keep behavior identical; CSS classes for enter/exit.

### D — Dossier accordion enter/exit
- DetailModal dossier panel + any related sanctuary panels: height/opacity or grid-template-rows transition ≤220ms when expanding; exit animation before unmount if needed.
- Use existing reflection-excerpt pattern if present.

### E — Notice exit + onboarding step + alerts form
- NoticeProvider: exit class + CSS exit keyframe before clear; timeout wait for animation end.
- Onboarding step content: fade/slide using curtain tokens.
- Alerts create form: enter/exit opacity+transform when showForm toggles.

### F — Token geometry (DESIGN.md-aligned, sanctuary-safe)
- Spacing ladder: add `--spacing-3xl: 48px`, `--spacing-4xl: 64px`, `--spacing-5xl: 96px`, `--spacing-super: 128px`; keep existing xs–2xl.
- Radius: add `--radius-none: 0`; primary buttons use radius-none or 2px max (already 2px on sanctuary).
- Soften shadow opacity slightly (0.55→0.4 style) for less harsh depth.
- Do NOT mass-break layouts with spacing renames.

### G — Primary scarcity + semantic red
- Nav active text can stay primary; avoid painting large surfaces with primary.
- Ensure danger/delete uses `--danger-*` not `--primary`.
- Chip active: prefer `--primary-soft` bg + primary text, not full solid red fill where not a CTA (except intentional primary buttons).

### H — Popup PRM + residual + verify
- popup.css: nuclear prefers-reduced-motion block matching global.css (disable transform animations).
- Run typecheck, test, build; refresh Desktop/Subsume-dev.
