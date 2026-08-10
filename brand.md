# Brand — Subsume

> **Canonical UI system:** Live tokens in `src/shared/tokens.css` and system write-up in `DESIGN.md`.  
> **Themes:** dark = **Cinema Black**, light = **White Canvas** (`src/shared/themeLabels.ts`).

> A Chrome extension for films, shows, and books that stay with you — private sanctuary, not a social tracker.

## North star

**Private multi-medium sanctuary** with scarce Rosso Corsa voltage on a Cinema Black canvas.  
Voice: plaque, inscription, archive, dossier — archival / manuscript language, not “app” chrome.

## Palette: Cinema Black + Rosso Corsa

**Mood:** dark · cinematic · precise · typed like a script and a ledger  
**Category:** personal archive tooling

### Dark Mode (default) — Cinema Black

| Token | Hex | Notes |
|---|---|---|
| `--bg-base` | `#181818` | Near-black canvas |
| `--bg-elevated` | `#242424` | Elevated shell |
| `--bg-overlay` / surface | `#303030` | Cards |
| `--fg-base` / ink | `#ffffff` | Strong text on dark |
| `--fg-muted` / body | `#969696` | Secondary copy |
| `--fg-subtle` / muted | `#666666` | Meta / control |
| `--primary` | `#da291c` | Rosso Corsa — **primary CTAs only** |
| `--primary-soft` | `rgba(218, 41, 28, 0.10)` | Soft fills / chips |
| `--primary-hover` | `#9d2211` | Hover |
| `--primary-pressed` | `#b01e0a` | Active / pressed |
| `--on-primary` | `#ffffff` | Text on primary |
| `--ring` | `#da291c` | Focus ring |

### Light Mode — White Canvas

| Token | Hex |
|---|---|
| `--bg-base` | `#f7f7f7` |
| `--bg-elevated` | `#ffffff` |
| `--fg-base` | `#181818` |
| `--primary` | `#da291c` |
| `--border` | `#d2d2d2` |

### Red-channel policy (required)

| Use | Token | Example |
|---|---|---|
| Brand / primary CTA / focus | `--primary` `#da291c` | Save, Inscribe, solid CTAs |
| Destructive / delete / error actions | `--danger-*` / `--destructive` **orange-red** `#ea580c` | Never reuse brand primary for delete |
| Abandoned / DNF status | `--status-abandoned-*` **stone** `#a8a29e` | Not a CTA, not delete |
| Success | `--success` `#03904a` | |
| Info | `--info-fg` `#4c98b9` | |
| Warning | Amber family | Distinct from brand red |

## Typography (Wave 2 — monofont system)

| Role | Face | Stack |
|---|---|---|
| **Display / hero / plaque / inscription** | **Courier Prime** | `'Courier Prime', 'Courier New', ui-monospace, monospace` → `--font-editorial` / `--font-display` |
| **Body / UI / dense chrome** | **IBM Plex Mono** | `'IBM Plex Mono', ui-monospace, 'Cascadia Code', 'Courier New', monospace` → `--font-ui` |

**Why:** Courier is the industry screenplay standard and reads as manuscript/typewriter — aligned with inscribe, plaque, dossier, archive. Plex Mono keeps the mono system legible at UI density.  

**Do not use:** Inter as product type; Newsreader/Outfit dual-type (superseded); JetBrains Mono / Fira Code / Cascadia as the *display* face (IDE smell). Cascadia may appear only as a Plex Mono fallback.

Loaded from Google Fonts in `index.html`, `popup.html`, and Shadow DOM via `shadowTokens.ts`.

## Naming hygiene

| Preferred | Deprecated alias (one release) |
|---|---|
| `.sanctuary-btn-primary` | `.sanctuary-btn-gold` |
| `.btn-sanctuary-primary` | `.btn-sanctuary-gold` |
| `--brand-text` / `--brand-soft-bg` | `--gold-text` / `--gold-soft-bg` |

`--gold` and related tokens still resolve to Rosso primary for compatibility.

## Motion

- User-facing motion ≤ **300ms**
- Modal enter `--duration-curtain` 280ms; exit `--duration-curtain-close` 220ms
- Prefer `--ease-out` / `--ease-focus-pull`
- Prefer `@media (hover: hover) and (pointer: fine)` for hover lifts

## Out of scope

- Proprietary FerrariSans or Cavallino / prancing horse assets  
- Dual-type serif/sans editorial pairing (explicitly retired)  
- Racing-livery marketing layouts unless product ships them  
