# Brand — Subsume

> A Chrome extension for tracking movies and TV shows discovered while browsing.

## Palette: Gilded Night

**Mood:** dark · premium · elegant  
**Category:** consumer/social · tooling

### Dark Mode (default)

| Token | OKLCH | Hex |
|---|---|---|
| `--bg-base` | oklch(0.04 0.01 82) | `#0a0a0b` |
| `--bg-elevated` | oklch(0.08 0.01 82) | `#141416` |
| `--bg-overlay` | oklch(0.10 0.01 82) | `#1a1a1c` |
| `--bg-hover` | oklch(0.13 0.01 82) | `#222224` |
| `--fg-base` | oklch(0.91 0.01 82) | `#e8e6e1` |
| `--fg-muted` | oklch(0.62 0.01 82) | `#9e9a90` |
| `--fg-subtle` | oklch(0.42 0.01 82) | `#6a665e` |
| `--primary` | oklch(0.72 0.17 82) | `#c9a84c` |
| `--primary-soft` | rgba(201, 168, 76, 0.12) | — |
| `--primary-hover` | oklch(0.76 0.17 82) | `#d4b860` |
| `--primary-pressed` | oklch(0.68 0.17 82) | `#b8983e` |
| `--border` | oklch(0.16 0.01 82) | `#2a2a2c` |
| `--border-subtle` | oklch(0.12 0.01 82) | `#1e1e20` |

### Light Mode

| Token | OKLCH | Hex |
|---|---|---|
| `--bg-base` | oklch(0.96 0.01 82) | `#f5f0e8` |
| `--bg-elevated` | oklch(1.00 0.00 82) | `#ffffff` |
| `--bg-overlay` | oklch(0.94 0.01 82) | `#ede8e0` |
| `--bg-hover` | oklch(0.92 0.01 82) | `#e8e3db` |
| `--fg-base` | oklch(0.10 0.01 82) | `#1a1918` |
| `--fg-muted` | oklch(0.42 0.01 82) | `#6b6560` |
| `--fg-subtle` | oklch(0.62 0.01 82) | `#9e9a90` |
| `--primary` | oklch(0.52 0.17 82) | `#b8962e` |
| `--primary-soft` | rgba(184, 150, 46, 0.12) | — |
| `--primary-hover` | oklch(0.48 0.17 82) | `#a68829` |
| `--primary-pressed` | oklch(0.44 0.17 82) | `#94771f` |
| `--border` | oklch(0.88 0.01 82) | `#e0dbd3` |
| `--border-subtle` | oklch(0.92 0.01 82) | `#eae5dd` |

### Shadcn Token Set (dark)

```css
:root {
  --background: #0a0a0b;
  --foreground: #e8e6e1;
  --card: #141416;
  --card-foreground: #e8e6e1;
  --popover: #141416;
  --popover-foreground: #e8e6e1;
  --primary: #c9a84c;
  --primary-foreground: #0a0a0b;
  --secondary: #222224;
  --secondary-foreground: #e8e6e1;
  --muted: #1a1a1c;
  --muted-foreground: #9e9a90;
  --accent: #1a1a1c;
  --accent-foreground: #e8e6e1;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #2a2a2c;
  --input: #2a2a2c;
  --ring: #c9a84c;
  --radius: 0.5rem;
}
```

### Shadcn Token Set (light)

```css
@media (prefers-color-scheme: light) {
  :root {
    --background: #f5f0e8;
    --foreground: #1a1918;
    --card: #ffffff;
    --card-foreground: #1a1918;
    --popover: #ffffff;
    --popover-foreground: #1a1918;
    --primary: #b8962e;
    --primary-foreground: #ffffff;
    --secondary: #f5f0e8;
    --secondary-foreground: #1a1918;
    --muted: #ede8e0;
    --muted-foreground: #6b6560;
    --accent: #ede8e0;
    --accent-foreground: #1a1918;
    --destructive: #ef4444;
    --destructive-foreground: #ffffff;
    --border: #e0dbd3;
    --input: #e0dbd3;
    --ring: #b8962e;
  }
}
```

## Typography

| Role | Family | Source |
|---|---|---|
| Sans / UI | **Geist** | [Google Fonts](https://fonts.google.com/specimen/Geist) |
| Mono / numbers | **Geist Mono** | [Google Fonts](https://fonts.google.com/specimen/Geist+Mono) |

Applied via Google Fonts `<link>` in `src/ui/index.html`. CSS variables set in `global.css`:

```css
:root {
  --font-sans: 'Geist', system-ui, -apple-system, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, 'Courier New', monospace;
}
```

### Type Scale

| Role | Tailwind | px | Use |
|---|---|---|---|
| Display | `text-5xl font-semibold tracking-tight` | 48 | Hero only |
| H1 (page) | `text-3xl font-semibold tracking-tight` | 30 | Page title |
| H2 (section) | `text-xl font-semibold` | 20 | Section breaks |
| H3 (subsection) | `text-base font-medium` | 16 | Card titles |
| Body | `text-sm` | 14 | Default UI text |
| Small | `text-xs text-muted-foreground` | 12 | Meta, timestamps |
| Mono | `font-mono tabular-nums` | — | Numbers, addresses |

## Gradients

### Subtle Background (`--gradient-bg`)

```css
--gradient-bg: linear-gradient(135deg, oklch(0.04 0.01 82) 0%, oklch(0.07 0.015 97) 100%);
```

Use on: `<body>` or hero sections. Almost invisible — adds depth without dominating.

### Brand Accent (`--gradient-accent`)

```css
--gradient-accent: linear-gradient(to right, oklch(0.72 0.17 82) 0%, oklch(0.74 0.18 112) 100%);
```

Use on: Hero CTAs, featured cards. Never under body text.

## Tone & Voice

**Premium without pretension.** Subsume feels like a well-crafted tool you're glad to have — not a luxury product that tries too hard. The gold-on-dark palette signals quality; the Geist typeface keeps it modern and approachable.

**Quietly confident.** We don't shout. We use short, precise sentences. We let the product speak: "Track everything you watch" says more than "The ultimate cinematic discovery platform for the modern viewer."

**Human over algorithmic.** Even though we use LLM recommendations and TMDB data, we talk like a knowledgeable friend — not a API response. "You might like..." not "Based on your viewing patterns..."

## Usage Dos & Don'ts

### Dos
- Use the gold (`--primary`) sparingly — it's an accent, not a flood
- Maintain high contrast: gold-on-dark passes AA, but don't invert it
- Let the dark palette breathe — generous padding/margins
- Use `font-mono` for numbers, ratings, and TMDB IDs

### Don'ts
- Don't put body text directly on `--gradient-accent` (contrast fails at midpoint)
- Don't use more than one gradient per screen
- Don't add more fonts — Geist + Geist Mono covers everything
- Don't override the palette per "dark mode" — the dark tokens ARE the default

## For Future Sessions

`frontend-design-guidelines` reads this file as source of truth for colors, typography, and voice. Any component work should reference these tokens, not hardcoded values.
