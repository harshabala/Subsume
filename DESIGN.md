---
name: Subsume
description: A private sanctuary for films, shows, and books that stay with you.
colors:
  primary: "#c9a84c"
  primary-hover: "#d4b860"
  primary-pressed: "#b8983e"
  primary-soft: "#c9a84c1f"
  on-primary: "#0a0a0b"
  bg-base: "#0a0a0b"
  bg-elevated: "#141416"
  bg-overlay: "#1a1a1c"
  bg-hover: "#222224"
  bg-sunken: "#08080a"
  fg-base: "#e8e6e1"
  fg-muted: "#9e9a90"
  fg-subtle: "#6a665e"
  text-reflection: "#f5f5f5"
  text-artwork: "#d1d1d1"
  text-title: "#a8a8b8"
  text-meta: "#8a8a9c"
  text-control: "#6a6a7a"
  border: "#2a2a2c"
  border-subtle: "#1e1e20"
  border-restraint: "#ffffff14"
  border-hero: "#f0d05c66"
  plaque-bg: "#17171fdb"
  danger: "#ef4444"
  danger-fg: "#ffffff"
  ring: "#c9a84c"
  nav-bg: "#0d0d10d9"
typography:
  display:
    fontFamily: "Newsreader, Cormorant Garamond, Georgia, serif"
    fontSize: "2rem"
    fontWeight: 300
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Newsreader, Cormorant Garamond, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 300
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Outfit, Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Outfit, Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Outfit, Inter, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.12em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, Courier New, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "24px"
  "2xl": "32px"
components:
  button-primary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-hover}"
  button-gold:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  button-restraint:
    backgroundColor: "transparent"
    textColor: "{colors.fg-muted}"
    rounded: "{rounded.sm}"
    padding: "12px 20px"
  chip-filter:
    backgroundColor: "transparent"
    textColor: "{colors.text-meta}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  chip-filter-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-hover}"
  input-optical:
    backgroundColor: "#ffffff08"
    textColor: "{colors.text-reflection}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  card-plaque:
    backgroundColor: "{colors.plaque-bg}"
    textColor: "{colors.fg-base}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  nav-tab-active:
    backgroundColor: "transparent"
    textColor: "{colors.primary-hover}"
---

# Design System: Subsume

## 1. Overview

**Creative North Star: "The Private Cinematic Sanctuary"**

Subsume is not a tracker, not a spreadsheet, and not a productivity shell. It is a **private sanctuary** for works that take hold of you — on the screen and on the page. The visual system evokes the emotional cadence of a historic theatre and a hardcover journal: anticipation, immersion, reflection, memory. Density serves contemplation; decoration never competes with the user's own words.

The palette is **Gilded Night**: deep near-black auditorium surfaces, warm parchment-adjacent text (never pure white), and a single restrained gold accent. Typography carries hierarchy — **Newsreader** for reflection and editorial moments, **Outfit** for controls and navigation. Motion is intentional and capped at ≤300ms for user-facing transitions; ceremony may feel cinematic, never bouncy or elastic.

This system explicitly rejects SaaS landing clichés: neon gradients, purple dark-mode kits, glassmorphism as default, hero-metric dashboards, endless identical feature cards, and decorative motion that does not convey state. Gold is rare on purpose. If a screen looks like a 2014 admin theme or a 2024 AI demo, it has failed the litmus test: *Does this make the user want to spend more time reflecting?*

**Key Characteristics:**
- Dark-first product UI (Gilded Night) with gold accent ≤10% of any screen
- Serif + sans pairing (Newsreader + Outfit); mono only for diagnostics/code
- Restraint over ornament — one hero moment per screen
- Progressive disclosure: emotion before metadata
- Medium-aware labels (film vs book) without splitting into two visual brands
- Reduced motion always honored

## 2. Colors

Obsidian auditorium neutrals with a single gilded accent. Text hierarchy is literary: brightest for reflections, quietest for chrome.

### Primary
- **Gilded Gold** (`#c9a84c` / `hsl(45, 80%, 62%)`): Primary accent for selection, active nav, focus rings, and rare CTAs. Canonical CSS: `--primary`. Hover `#d4b860`, pressed `#b8983e`, soft wash `rgba(201, 168, 76, 0.10–0.12)`.
- **On Gold** (`#0a0a0b`): Text/icons on filled gold buttons (`--on-primary-fg` / `--primary-foreground`).

### Neutral
- **Obsidian Base** (`#0a0a0b`): App shell background (`--bg-base`, `--background`).
- **Raised Surface** (`#141416`): Cards, elevated panels (`--bg-elevated`, `--card`).
- **Overlay Surface** (`#1a1a1c`): Popovers, nested layers (`--bg-overlay`).
- **Hover Surface** (`#222224`): Interactive hover fill (`--bg-hover`).
- **Parchment Ink** (`#e8e6e1`): Primary UI text (`--fg-base`, `--foreground`).
- **Muted Ink** (`#9e9a90`): Secondary labels (`--fg-muted`).
- **Subtle Ink** (`#6a665e`): De-emphasized chrome (`--fg-subtle`).
- **Whisper Border** (`#2a2a2c` / `hsla(0,0%,100%,0.07–0.08)`): Default dividers and strokes.
- **Museum Plaque** (`hsla(240, 15%, 11%, 0.85)`): Glass-like plaque panels over dark grounds.

### Literary text roles (sanctuary hierarchy)
- **Reflection** (`hsl(0,0%,96%)`): User writing — highest contrast.
- **Artwork** (`hsl(0,0%,82%)`): Supporting prose near posters.
- **Title** (`hsl(240,10%,70%)`): Work titles secondary to reflection.
- **Meta** (`hsl(240,10%,58%)`): Year, runtime, quiet metadata.
- **Control** (`hsl(240,10%,45%)`): Lowest-priority UI chrome.

### Semantic
- **Danger** (`#ef4444`): Destructive actions only; never decoration.
- **Focus ring** (`#c9a84c`): `--ring` for `:focus-visible`.

### Named Rules
**The One Gold Rule.** Gold appears on ≤10% of any screen — selection, primary action, or active state. Filling backgrounds with gold is forbidden.

**The Reflection Hierarchy Rule.** User reflections are always brighter and more editorial than chrome. Never invert that stack.

**The No Neon Rule.** No purple gradients, electric cyan, or glassmorphism stacks. Depth comes from tonal steps and soft obsidian-tinted shadows, not glow kits.

## 3. Typography

**Display Font:** Newsreader (fallback Cormorant Garamond, Georgia, serif)  
**Body Font:** Outfit (fallback Inter, system-ui, sans-serif)  
**Mono Font:** JetBrains Mono (diagnostics, code-adjacent UI only)

**Character:** Editorial serif for the inner life of the work; geometric-humanist sans for the house machinery. Pairing is Criterion / literary journal, not startup landing page.

### Hierarchy
- **Display** (Newsreader, 300, ~2rem / 32px, line-height ~1.2, tracking ~-0.02em): Onboarding headlines, rare hero lines. `text-wrap: balance`. Letter-spacing never tighter than -0.04em.
- **Headline** (Newsreader italic or light, ~1.5rem): Section poetry, empty-state leads, archive atmosphere lines.
- **Title** (Outfit 500, ~18px): Page titles in UI chrome when sans is required; sanctuary page titles often serif.
- **Body** (Outfit 400, 14px, line-height 1.55): Settings, lists, secondary prose. Cap long reading measure ~65–75ch.
- **Label** (Outfit 500, 11px, uppercase, letter-spacing 0.1–0.15em): Tabs, chips, meta labels. Always track uppercase.
- **Mono** (12px): Diagnostics only — not marketing.

### Named Rules
**The Reflection Type Rule.** Emotional recall and user notes render in editorial serif when in sanctuary contexts. Controls stay Outfit.

**The Uppercase Tracking Rule.** All-caps labels always carry letter-spacing (≥0.08em). Untracked caps are unfinished.

## 4. Elevation

Depth is **hybrid tonal + soft shadow**: surfaces step through base → elevated → overlay → hover. Shadows are obsidian-tinted (not pure black), used for modal/card lift and hero moments — never stacked with glass + glow + gradient simultaneously.

### Shadow Vocabulary
- **sm** (`0 1px 3px hsla(240, 18%, 4%, 0.6)`): Subtle resting lift.
- **md** (`0 4px 16px hsla(240, 18%, 4%, 0.55)`): Cards, elevated panels (`--shadow-card`).
- **lg** (`0 12px 40px hsla(240, 18%, 4%, 0.6)`): Drawers, significant layers.
- **hero** (`0 20px 60px hsla(240, 18%, 4%, 0.8)`): Modal/hero only.

Modal scrim: dark overlay (~0.7–0.88) + optional `blur(16px)` as the single hero moment.

### Named Rules
**The One Hero Moment Rule.** Exactly one dramatic visual effect per screen (focus pull, curtain, or velvet blur). Everything else stays quiet.

**The Flat-By-Default Rule.** Most list rows and settings rows are flat. Shadows appear for elevation and focus, not decoration on every card.

## 5. Components

### Buttons
- **Shape:** Softly squared (4px radius). Prefer restraint over pill.
- **Primary gold fill (`.sanctuary-btn-gold`):** Gold background, on-primary text, min-height 44px, press scale 0.97–0.98.
- **Restraint / ghost (`.sanctuary-btn-restraint`, `.optical-button`):** Transparent fill, gold or muted border/text, hover soft gold wash.
- **Hover / Focus / Active:** Color shift via tokens; `:focus-visible` 2px gold ring offset 2px; `:active` subtle scale; disabled at reduced opacity.
- **Danger:** Red text or solid danger for destructive only.

### Chips / Filters
- **Style:** Transparent or whisper border; muted label text; uppercase tracked labels when meta.
- **Active:** Soft gold background wash + gold text (`--chip-active-bg`, primary-hover).
- **Hit target:** Min-height 32px (filters); primary CTAs 44px.

### Cards / Containers
- **Corner Style:** 8px typical (`--radius-md`); never 24px+ soft SaaS balloons.
- **Background:** Elevated or plaque glass over base.
- **Border:** Whisper 1px; no thick side-stripe accents.
- **Shadow:** md for archive/media cards when lifted; many spines rely on border + hover lift instead.
- **Hardcover archive cards:** Editorial spines with reflection excerpt; medium badge (Book / Film / Series) is quiet meta.

### Inputs / Fields
- **Style (`.optical-input`):** Near-transparent fill, restraint border, 8px radius, reflection-colored text.
- **Focus:** Border moves toward hero gold; background slightly brighter plaque; transition via `--transition-fast` (≤130–220ms).
- **Placeholder:** Muted, still readable against dark ground.

### Navigation
- **Top nav:** Translucent dark bar (`--nav-bg`), logo in gold hover tone, tabs muted → bright on hover → gold when active.
- **Primary destinations:** Archive · Discovery · Settings (product shell).
- **Explore subnav:** Search, Recommendations, Now Showing, Filmmakers, Stats, Alerts — same vocabulary, secondary density.
- **Medium filters:** All | Screen | Books — product structure, not a second app skin.

### Signature: Museum plaque / hover (content script)
- Quiet catalogue plaque over host pages: dark surface, gold star/meta, small type.
- Closed Shadow DOM; trusted gestures only for archive mutations.
- Never noisy SaaS badges or rainbow ratings as chrome.

### Signature: Detail modal / capture
- Curtain enter/exit ≤280–300ms; backdrop dim + blur is the hero moment.
- Progressive disclosure: reflection first, then status/rating/spectrum.
- Book-specific labels and progress without forking the visual system.

### Named Rules
**The Product Familiarity Rule.** Navigation, forms, and dialogs stay recognizable. Experimentation lives in typography and atmosphere, not reinvented controls.

## 6. Do's and Don'ts

### Do:
- **Do** keep gold rare — selection, focus, and primary action only.
- **Do** put user reflections in highest visual priority (serif, high contrast).
- **Do** use Outfit for UI chrome and Newsreader for editorial/reflection moments.
- **Do** cap user-facing motion at ≤300ms; stagger list items ≤40ms; honor `prefers-reduced-motion`.
- **Do** use 44px min height for primary actions and ≥32px for chips (Fitts).
- **Do** use `text-wrap: balance` on page titles and display headings.
- **Do** dim modal backdrops; one focus point at a time.
- **Do** keep books and screen in one sanctuary — medium labels, not dual themes.
- **Do** treat abandoned/DNF and reflections as first-class, never shaming UI.

### Don't:
- **Don't** build a tracker aesthetic (spreadsheet density, loud status pills, gamified streaks).
- **Don't** use purple neon dark kits, gradient text, or glassmorphism as default.
- **Don't** add colored left border stripes on cards/list items as decoration.
- **Don't** stack blur + glow + gradient + heavy shadow on the same element.
- **Don't** use display fonts on buttons, tabs, or data tables.
- **Don't** put an uppercase tracked eyebrow above every section by reflex.
- **Don't** animate layout properties for decoration; no bounce/elastic springs.
- **Don't** ship pure black shadows; use obsidian-tinted shadows from tokens.
- **Don't** invent a second brown “library” theme for books — same Gilded Night system.
- **Don't** let AI-generic fonts (e.g. Geist as brand face) replace Newsreader/Outfit in product UI.
