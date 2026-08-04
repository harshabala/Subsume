# Ferrari Design System — Apply Across All Surfaces

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remap Subsume's design tokens and surface styles from Gilded Night (gold) to the Ferrari design system (Rosso Corsa on near-black cinematic canvas) across app shell, popup, sanctuary, and content-script Shadow DOM.

**Architecture:** Token-first. Existing CSS variable names (`--primary`, `--gold`, `--bg-base`, etc.) stay stable so components keep working. Values remapped to Ferrari. Alias tokens like `--gold` remain as compatibility aliases pointing at the new primary (Rosso Corsa). Hardcoded gold hex fallbacks and legacy font families are cleaned up after the token swap.

**Tech Stack:** Preact Chrome extension, CSS custom properties in `src/shared/tokens.css`, Shadow DOM tokens in `src/shared/shadowTokens.ts`, Vitest.

## Global Constraints

- **Primary (Rosso Corsa):** `#da291c`
- **Primary hover:** `#9d2211`
- **Primary active/pressed:** `#b01e0a`
- **Primary soft:** `rgba(218, 41, 28, 0.12)` (and `0.10` where existing soft was 0.10)
- **Canvas (dark bg-base):** `#181818`
- **Canvas elevated / surface card:** `#303030`
- **Ink (strong text on dark):** `#ffffff`
- **Body muted on dark:** `#969696`
- **Muted soft:** `#8f8f8f` / muted `#666666`
- **Hairline on dark:** `#303030`
- **On-primary text:** `#ffffff` (not near-black — red needs white text)
- **Light canvas:** `#ffffff` / soft `#f7f7f7` / strong soft `#ebebeb`
- **Body on light:** `#181818`
- **Hairline on light:** `#d2d2d2`
- **Semantic success (Ferrari):** `#03904a`
- **Semantic info:** `#4c98b9`
- **Semantic warning:** `#f13a2c`
- **Do not use proprietary FerrariSans.** Use Inter + system-ui stack for both UI and editorial:
  - `--font-ui`: `'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`
  - `--font-editorial`: same as `--font-ui` (Ferrari is single-family)
- **Google Fonts URL:** `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`
- **Keep CSS variable names** including `--gold`, `--accent-gold`, `--gold-text`, `--badge-on-gold-fg` — remap values only; do not mass-rename classes like `.sanctuary-btn-gold` in this plan (optional later).
- **Motion:** user-facing transitions remain ≤300ms (existing duration tokens).
- **Atmosphere presets** (sunset/emerald/french): keep as optional overrides; they intentionally change `--primary`. Do not remove them.
- **No trademarked Ferrari marks/logos/Cavallino** in UI copy or assets.
- **Theme labels:** dark = `Cinema Black`, light = `White Canvas`, system = `System`.
- **TDD:** for theme label and any token-contract tests, write/update failing tests first.
- **Verification gate:** `npm run typecheck`, `npm test`, `npm run build` must pass before final task closes.
- **Fallback hex** for `var(--primary, …)` and gold fallbacks must become `#da291c` (or red rgba equivalents), never leftover `#c9a84c` / `#b8962e`.
- **Work from the repo root** of the worktree/checkout you are given. Commit after each task with a focused conventional message.

---

### Task 1: Core design tokens (`tokens.css`)

**Files:**
- Modify: `src/shared/tokens.css` (full file — dark defaults, `[data-theme="dark"]`, `[data-theme="light"]`, system light `@media`, gradients, semantic gold-derived tokens)
- Test: none new (visual tokens); verify with `npm run typecheck` after (CSS-only)

**Interfaces:**
- Consumes: Ferrari palette from Global Constraints
- Produces: `:root` and theme selectors with remapped values; all existing variable names preserved

- [ ] **Step 1: Remap dark `:root` shell colors**

Replace Gilded Night values with:

```css
/* Header comment: Subsume Design Tokens — Ferrari cinematic system (Rosso Corsa on near-black) */
--bg-base: #181818;
--bg-elevated: #242424; /* slightly above canvas for elevation; cards use surface */
--bg-overlay: #303030;
--bg-hover: #3a3a3a;
--bg-sunken: #121212;
--fg-base: #ffffff;
--fg-muted: #969696;
--fg-subtle: #666666;
--primary: #da291c;
--primary-soft: rgba(218, 41, 28, 0.10);
--primary-hover: #9d2211;
--primary-pressed: #b01e0a;
--border: hsla(0, 0%, 100%, 0.08);
--border-subtle: hsla(0, 0%, 100%, 0.05);
--gold: var(--primary);
--accent-gold: var(--primary);
```

Sanctuary block:

```css
--bg-sanctuary: #181818;
--bg-plaque: hsla(0, 0%, 12%, 0.92);
--bg-plaque-hover: hsla(0, 0%, 16%, 0.96);
--border-restraint: hsla(0, 0%, 100%, 0.08);
--border-hero: rgba(218, 41, 28, 0.45);
--accent-sanctuary: var(--border-hero);
```

Text hierarchy:

```css
--text-reflection: #ffffff;
--text-artwork: #d2d2d2;
--text-title: #969696;
--text-meta: #8f8f8f;
--text-control: #666666;
```

Typography:

```css
--font-editorial: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
--font-ui: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
--font-sans: var(--font-ui);
```

Radius (Ferrari tighter):

```css
--radius-sm: 2px;
--radius-md: 4px;
--radius-lg: 8px;
```

Gradients (red voltage, not gold):

```css
--gradient-bg: linear-gradient(135deg, #121212 0%, #181818 100%);
--gradient-accent: linear-gradient(to right, #da291c 0%, #9d2211 100%);
```

- [ ] **Step 2: Remap shadcn-compatible + semantic application tokens (dark)**

```css
--background: #181818;
--foreground: #ffffff;
--card: #303030;
--card-foreground: #ffffff;
--popover: #303030;
--popover-foreground: #ffffff;
--primary-foreground: #ffffff;
--secondary: #303030;
--secondary-foreground: #ffffff;
--muted: #242424;
--muted-foreground: #969696;
--accent: #303030;
--accent-foreground: #ffffff;
--input: #303030;
--ring: #da291c;
--color-accent-border: rgba(218, 41, 28, 0.25);

/* semantic */
--nav-bg: hsla(0, 0%, 9%, 0.92);
--nav-tab-fg-active: var(--primary);
--nav-logo-fg: var(--primary);
--nav-item-active-bg: rgba(218, 41, 28, 0.10);
--nav-item-active-fg: #ffffff;
--nav-item-active-border: rgba(218, 41, 28, 0.28);
--on-primary-fg: #ffffff;
--on-accent-fg: #ffffff;
--gold-soft-bg: rgba(218, 41, 28, 0.12);
--gold-text: var(--primary);
--gold-text-soft: #ff6b5c; /* lighter red for soft text accents */
--accent-gold-border: rgba(218, 41, 28, 0.28);
--accent-gold-border-strong: rgba(218, 41, 28, 0.55);
--primary-hover-bg: #9d2211;
--primary-pressed-bg: #b01e0a;
--chip-active-bg: rgba(218, 41, 28, 0.12);
--intent-memory-fg: #da291c;
--intent-memory-border: rgba(218, 41, 28, 0.35);
--badge-on-gold-fg: #ffffff;
--selection-bg: rgba(218, 41, 28, 0.35);
--platform-chip-bg: rgba(218, 41, 28, 0.10);
--platform-chip-border: rgba(218, 41, 28, 0.22);
--btn-primary-fg: #ffffff;
--digest-badge-ai-bg: rgba(218, 41, 28, 0.12);
--digest-badge-ai-fg: #ff6b5c;
--onboarding-monogram: #da291c;
--onboarding-cta: #da291c;
--onboarding-cta-border: rgba(218, 41, 28, 0.45);
--onboarding-cta-hover-bg: rgba(218, 41, 28, 0.08);
--onboarding-cta-hover-border: rgba(218, 41, 28, 0.7);
--lobby-act-fg: var(--primary);
--ambient-glow-warm: rgba(218, 41, 28, 0.10);
--success: #03904a;
--success-fg: #03904a;
--success-bg: rgba(3, 144, 74, 0.12);
--success-border: rgba(3, 144, 74, 0.28);
--info-fg: #4c98b9;
--info-bg: rgba(76, 152, 185, 0.10);
```

Also update comment labels from "Gilded Night" → "Ferrari / Cinema Black".

Keep motion duration tokens unchanged. Keep emotional aura colors (awe/melancholy/etc.) unless they are pure gold hues — leave emotion spectrum as-is.

- [ ] **Step 3: Remap light theme + system light**

For `[data-theme="light"]` and the matching `@media (prefers-color-scheme: light)` block:

```css
--bg-base: #f7f7f7;
--bg-elevated: #ffffff;
--bg-overlay: #ebebeb;
--bg-hover: #e8e8e8;
--bg-sunken: #ebebeb;
--fg-base: #181818;
--fg-muted: #666666;
--fg-subtle: #8f8f8f;
--primary: #da291c;
--primary-soft: rgba(218, 41, 28, 0.12);
--primary-hover: #9d2211;
--primary-pressed: #b01e0a;
--border: #d2d2d2;
--border-subtle: #ebebeb;
--border-hero: rgba(218, 41, 28, 0.40);
--ring: #da291c;
--background: #f7f7f7;
--foreground: #181818;
--card: #ffffff;
/* all former #b8962e / gold rgba → #da291c / red rgba as above */
--nav-tab-fg-active: #da291c;
--nav-logo-fg: #da291c;
--gold-text: #da291c;
--gold-text-soft: #9d2211;
--btn-primary-fg: #ffffff;
--on-primary-fg: #ffffff;
--badge-on-gold-fg: #ffffff;
```

Replace parchment cream `#f5f0e8` with `#f7f7f7` / white canvas. Replace every `#b8962e`, `#a68829`, `#94771f`, and `rgba(184, 150, 46, …)` in light + system light blocks with the red equivalents above.

- [ ] **Step 4: Spot-check no gold hex remains in tokens.css**

Run:

```bash
rg -n "c9a84c|b8962e|a68829|94771f|201, 168, 76|184, 150, 46|Gilded|hsl\(45" src/shared/tokens.css
```

Expected: no matches (atmosphere oklch may still use hue 45 for sunset — that is OK only inside `[data-atmosphere='sunset']` blocks).

- [ ] **Step 5: Commit**

```bash
git add src/shared/tokens.css
git commit -m "feat(design): remap tokens.css to Ferrari Rosso Corsa system"
```

---

### Task 2: Shadow DOM tokens + font loading

**Files:**
- Modify: `src/shared/shadowTokens.ts`
- Modify: `src/ui/index.html` (font link)
- Modify: `src/ui/popup.html` (font link)

**Interfaces:**
- Consumes: same Ferrari dark token values as Task 1 `:root`
- Produces: `SHADOW_TOKEN_CSS`, `SHADOW_FONT_STYLESHEET`, `injectShadowFonts`

- [ ] **Step 1: Update font stylesheet URL and token CSS string**

```ts
export const SHADOW_FONT_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
```

Rewrite `SHADOW_TOKEN_CSS` `:host` block to mirror Task 1 dark values (primary `#da291c`, canvas `#181818`, fonts Inter, ring `#da291c`, color-accent-border red rgba, `--gold: var(--primary)`, etc.).

Update comment: `Inject Inter once per document…`

- [ ] **Step 2: Update HTML font links**

In both `src/ui/index.html` and `src/ui/popup.html`, replace the Newsreader+Outfit Google Fonts `href` with:

```
https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap
```

Keep Material Symbols links unchanged.

- [ ] **Step 3: Grep shadow + html for old fonts/gold**

```bash
rg -n "Newsreader|Outfit|c9a84c|Gilded" src/shared/shadowTokens.ts src/ui/index.html src/ui/popup.html
```

Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add src/shared/shadowTokens.ts src/ui/index.html src/ui/popup.html
git commit -m "feat(design): Ferrari shadow tokens and Inter font loading"
```

---

### Task 3: Theme labels (TDD)

**Files:**
- Modify: `tests/themeLabels.test.ts`
- Modify: `src/shared/themeLabels.ts`

**Interfaces:**
- Consumes: `ThemePreference`
- Produces: `THEME_LABELS.dark = 'Cinema Black'`, `.light = 'White Canvas'`, `.system = 'System'`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { THEME_LABELS } from '@/shared/themeLabels';

describe('THEME_LABELS', () => {
  it('maps theme preferences to Ferrari display names', () => {
    expect(THEME_LABELS.dark).toBe('Cinema Black');
    expect(THEME_LABELS.light).toBe('White Canvas');
    expect(THEME_LABELS.system).toBe('System');
  });
});
```

- [ ] **Step 2: Run test — expect RED**

```bash
npx vitest run tests/themeLabels.test.ts
```

Expected: FAIL — still `Gilded Night` / `Parchment`.

- [ ] **Step 3: Implement labels**

```ts
export const THEME_LABELS: Record<ThemePreference, string> = {
  dark: 'Cinema Black',
  light: 'White Canvas',
  system: 'System',
};
```

- [ ] **Step 4: Run test — expect GREEN**

```bash
npx vitest run tests/themeLabels.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add tests/themeLabels.test.ts src/shared/themeLabels.ts
git commit -m "feat(design): rename theme labels to Cinema Black / White Canvas"
```

---

### Task 4: Surface CSS fallback hex cleanup

**Files (only where gold fallbacks or hardcoded gold remain):**
- Modify: `src/ui/styles/popup.css`
- Modify: `src/ui/styles/sidebar.css`
- Modify: `src/ui/styles/app-nav.css`
- Modify: `src/ui/styles/recommendations.css`
- Modify: `src/ui/styles/settings-nav.css`
- Modify: `src/styles/sanctuary.css` (fallback `#c9a84c` only)
- Modify any other `src/**/*.css` that still matches the gold grep after Tasks 1–2

**Interfaces:**
- Consumes: CSS vars (unchanged names)
- Produces: fallbacks `#da291c` / `rgba(218, 41, 28, …)` instead of gold

- [ ] **Step 1: Find remaining gold hardcodes**

```bash
rg -n "c9a84c|b8962e|201, 168, 76|184, 150, 46" src --glob '*.css'
```

- [ ] **Step 2: Replace each match**

Examples:

```css
/* before */
var(--primary, #c9a84c)
rgba(201, 168, 76, 0.15)
/* after */
var(--primary, #da291c)
rgba(218, 41, 28, 0.15)
```

In `sanctuary.css`: `var(--border-hero, #c9a84c)` → `var(--border-hero, #da291c)`.

Do **not** rename `.sanctuary-btn-gold` class selectors in this task.

- [ ] **Step 3: Re-run grep — expect no gold hex in CSS**

```bash
rg -n "c9a84c|b8962e|201, 168, 76|184, 150, 46" src --glob '*.css'
```

Expected: empty.

- [ ] **Step 4: Commit**

```bash
git add src/ui/styles src/styles/sanctuary.css
git commit -m "fix(design): replace gold hex fallbacks with Rosso Corsa"
```

---

### Task 5: Hardcoded font families on surfaces

**Files:**
- Modify: any CSS under `src/` that hardcodes `'Newsreader'` or `'Outfit'` (e.g. `src/ui/styles/sidebar.css`, `src/ui/styles/layout.css`, others from grep)

**Interfaces:**
- Consumes: `--font-ui`, `--font-editorial`
- Produces: surfaces use token fonts

- [ ] **Step 1: Find hardcoded families**

```bash
rg -n "Newsreader|Outfit|Cormorant" src --glob '*.css' --glob '*.html' --glob '*.ts' --glob '*.tsx'
```

- [ ] **Step 2: Replace with tokens**

```css
font-family: var(--font-editorial);
/* or */
font-family: var(--font-ui);
```

Prefer `--font-editorial` for display/logo/serif-like headings that previously used Newsreader; prefer `--font-ui` for body/nav that used Outfit. Both resolve to Inter after Task 1.

- [ ] **Step 3: Grep clean**

```bash
rg -n "Newsreader|Outfit|Cormorant" src --glob '!dist/**'
```

Expected: empty (or only comments/docs if any — remove those too if in src).

- [ ] **Step 4: Commit**

```bash
git add -u src
git commit -m "refactor(design): route surface fonts through design tokens"
```

---

### Task 6: Full-suite verification + residual audit

**Files:**
- Possibly fix any test failures from label/copy expectations
- Modify: none required if green

- [ ] **Step 1: Residual brand audit**

```bash
rg -n "c9a84c|b8962e|Gilded Night|Parchment|Newsreader|Outfit" src tests --glob '!dist/**' || true
```

Fix any remaining product-facing strings/tests that still assert Gilded Night / Parchment (theme labels already updated in Task 3). Atmosphere code may keep sunset hues — fine.

- [ ] **Step 2: Run full CI suite**

```bash
npm run typecheck && npm test && npm run build
```

Expected: all pass. If failures, fix minimally within design-system scope and re-run.

- [ ] **Step 3: Commit only if fixes were needed**

```bash
git add -u
git commit -m "test(design): align assertions with Ferrari theme system"
```

If nothing to commit, skip.

- [ ] **Step 4: Record verification summary in the report** (typecheck OK, test count, build OK)

---

## File Map (quick reference)

| Surface | Primary token source |
|---------|----------------------|
| Full app UI | `src/shared/tokens.css` via `global.css` |
| Popup | tokens + `popup.css` |
| Content dock/overlay/hover | `shadowTokens.ts` + component CSS |
| Sanctuary archive | tokens + `src/styles/sanctuary.css` |
| Theme labels in Settings | `themeLabels.ts` |

## Out of scope

- Rewriting layout structure to full-bleed marketing heroes
- Adding real Ferrari brand assets or proprietary fonts
- Renaming every `*-gold*` CSS class
- Changing atmosphere preset design (only default brand)
- Chrome Web Store packaging / version bump
