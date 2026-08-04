# Brand — Subsume

> **Canonical UI system:** Live tokens in `src/shared/tokens.css` and agent reference in `DESIGN.md` (Ferrari cinematic adaptation).  
> **Themes:** dark = **Cinema Black**, light = **White Canvas** (`src/shared/themeLabels.ts`).

> A Chrome extension for tracking films, shows, and books that stay with you.

## Palette: Cinema Black + Rosso Corsa

**Mood:** dark · cinematic · precise  
**Category:** consumer / personal archive tooling  
**North star:** Private sanctuary chrome with **scarce** Ferrari voltage (Rosso Corsa). Not a car brand UI — adapted design system values only. No trademarked Ferrari marks.

### Dark Mode (default) — Cinema Black

| Token | Hex | Notes |
|---|---|---|
| `--bg-base` | `#181818` | Near-black canvas |
| `--bg-elevated` | `#242424` | Elevated shell |
| `--bg-overlay` / surface | `#303030` | Cards / hairline surfaces |
| `--fg-base` / ink | `#ffffff` | Strong text on dark |
| `--fg-muted` / body | `#969696` | Secondary copy |
| `--fg-subtle` / muted | `#666666` | Meta / control |
| `--primary` | `#da291c` | Rosso Corsa — primary CTAs only |
| `--primary-soft` | `rgba(218, 41, 28, 0.10)` | Soft fills / chips |
| `--primary-hover` | `#9d2211` | Hover |
| `--primary-pressed` | `#b01e0a` | Active / pressed |
| `--on-primary` | `#ffffff` | Text on primary (never near-black) |
| `--ring` | `#da291c` | Focus ring |
| `--border` / hairline | low-alpha white or `#303030` | Restraint borders |

Legacy aliases `--gold`, `--accent-gold`, `--gold-text`, `.sanctuary-btn-gold` still exist for compatibility; **values resolve to primary red**, not gold.

### Light Mode — White Canvas

| Token | Hex |
|---|---|
| `--bg-base` | `#f7f7f7` |
| `--bg-elevated` | `#ffffff` |
| `--fg-base` | `#181818` |
| `--primary` | `#da291c` |
| `--primary-hover` | `#9d2211` |
| `--primary-pressed` | `#b01e0a` |
| `--on-primary` / `--btn-primary-fg` | `#ffffff` |
| `--border` | `#d2d2d2` |

### Typography

| Role | Stack |
|---|---|
| UI + editorial | `'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif` |

Single-family intentionally (Ferrari monofont adaptation). Do not reintroduce Newsreader/Outfit without a deliberate dual-type decision.

### Semantic vs brand red

| Use | Token |
|---|---|
| Brand / selection / primary CTA | `--primary` `#da291c` |
| Destructive / error | `--destructive` / `--danger-*` (keep distinct coral/red family — do not reuse brand primary for delete) |
| Success | `--success` `#03904a` |
| Info | `--info-fg` `#4c98b9` |
| Warning | Amber family (kept for contrast vs brand red) |

### Motion

- User-facing motion ≤ **300ms**
- Modal enter `--duration-curtain` 280ms; exit `--duration-curtain-close` 220ms
- Prefer `--ease-out` / `--ease-focus-pull`; avoid ease-in exits
- Prefer `@media (hover: hover) and (pointer: fine)` for hover lifts

### Out of scope for this brand

- Proprietary FerrariSans or Cavallino / prancing horse assets  
- Full-bleed automotive marketing layouts unless product explicitly ships them  
