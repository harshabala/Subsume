/**
 * Shared design tokens + font loading for content-script Shadow DOM roots.
 * Shadow trees cannot inherit :root variables from the host page.
 */

export const SHADOW_FONT_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,300;1,6..72,400;1,6..72,500&family=Outfit:wght@300;400;500;600&display=swap';

/** Key CSS variables from src/shared/tokens.css (dark / default). */
export const SHADOW_TOKEN_CSS = `
:host {
  /* Gilded Night */
  --bg-base: hsl(240, 18%, 5%);
  --bg-elevated: hsl(240, 16%, 8%);
  --bg-overlay: hsl(240, 14%, 11%);
  --bg-hover: hsl(240, 12%, 14%);
  --bg-sunken: hsl(240, 20%, 3%);
  --fg-base: hsl(0, 0%, 92%);
  --fg-muted: hsl(240, 8%, 52%);
  --fg-subtle: hsl(240, 8%, 36%);
  --primary: hsl(45, 80%, 62%);
  --primary-soft: hsla(45, 80%, 62%, 0.10);
  --primary-hover: hsl(45, 85%, 68%);
  --primary-pressed: hsl(45, 75%, 54%);
  --border: hsla(0, 0%, 100%, 0.07);
  --border-subtle: hsla(0, 0%, 100%, 0.04);
  --gold: var(--primary);

  /* Sanctuary */
  --bg-sanctuary: hsl(240, 18%, 5%);
  --bg-plaque: hsla(240, 15%, 11%, 0.85);
  --bg-plaque-hover: hsla(240, 15%, 16%, 0.95);
  --border-restraint: hsla(0, 0%, 100%, 0.08);
  --border-hero: hsla(45, 90%, 65%, 0.4);
  --accent-sanctuary: var(--border-hero);

  /* Text hierarchy */
  --text-reflection: hsl(0, 0%, 96%);
  --text-artwork: hsl(0, 0%, 82%);
  --text-title: hsl(240, 10%, 70%);
  --text-meta: hsl(240, 10%, 50%);
  --text-control: hsl(240, 10%, 32%);
  --text-sanctuary: var(--text-reflection);

  /* Typography */
  --font-editorial: 'Newsreader', 'Cormorant Garamond', Georgia, serif;
  --font-ui: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-sans: var(--font-ui);
  --font-mono: 'JetBrains Mono', ui-monospace, 'Courier New', monospace;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 20px;
  --spacing-xl: 24px;
  --spacing-2xl: 32px;

  /* Radius & motion */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --duration-fast: 130ms;
  --duration-normal: 220ms;
  --duration-slow: 260ms;
  --transition-fast: var(--duration-fast) ease;
  --transition-base: var(--duration-normal) ease;

  /* Shadows */
  --shadow-sm: 0 1px 3px hsla(240, 18%, 4%, 0.6);
  --shadow-md: 0 4px 16px hsla(240, 18%, 4%, 0.55);
  --shadow-lg: 0 12px 40px hsla(240, 18%, 4%, 0.6);
  --shadow-hero: 0 20px 60px hsla(240, 18%, 4%, 0.8);

  /* Aliases */
  --color-surface: var(--bg-elevated);
  --color-surface-elevated: var(--bg-overlay);
  --color-text: var(--fg-base);
  --color-text-secondary: var(--fg-muted);
  --color-text-muted: var(--fg-subtle);
  --color-accent-light: var(--primary);
  --color-accent-border: rgba(201, 168, 76, 0.25);

  /* Shadcn-compatible (content overlays) */
  --background: #0a0a0b;
  --foreground: #e8e6e1;
  --card: #141416;
  --card-foreground: #e8e6e1;
  --muted-foreground: #9e9a90;
  --destructive: #ef4444;
  --ring: #c9a84c;
}
`;

let fontsInjected = false;

/** Inject Outfit + Newsreader once per document (shared across shadow roots). */
export function injectShadowFonts(doc: Document = document): void {
  if (fontsInjected || doc.getElementById('subsume-shadow-fonts')) return;

  const link = doc.createElement('link');
  link.id = 'subsume-shadow-fonts';
  link.rel = 'stylesheet';
  link.href = SHADOW_FONT_STYLESHEET;
  doc.head.appendChild(link);
  fontsInjected = true;
}

export function createShadowTokenStyle(): HTMLStyleElement {
  const style = document.createElement('style');
  style.setAttribute('data-subsume', 'tokens');
  style.textContent = SHADOW_TOKEN_CSS;
  return style;
}

export function createShadowComponentStyle(css: string): HTMLStyleElement {
  const style = document.createElement('style');
  style.setAttribute('data-subsume', 'component');
  style.textContent = css;
  return style;
}

/** Append shared fonts (document head) + token + component styles into a shadow root. */
export function setupShadowStyles(shadowRoot: ShadowRoot, componentCss: string): void {
  injectShadowFonts();
  shadowRoot.appendChild(createShadowTokenStyle());
  shadowRoot.appendChild(createShadowComponentStyle(componentCss));
}