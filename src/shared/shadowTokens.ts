/**
 * Shared design tokens + font loading for content-script Shadow DOM roots.
 * Shadow trees cannot inherit :root variables from the host page.
 */

export const SHADOW_FONT_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';

/** Key CSS variables from src/shared/tokens.css (dark / default). */
export const SHADOW_TOKEN_CSS = `
:host {
  /* Ferrari / Cinema Black */
  --bg-base: #181818;
  --bg-elevated: #242424;
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

  /* Sanctuary */
  --bg-sanctuary: #181818;
  --bg-plaque: hsla(0, 0%, 12%, 0.92);
  --bg-plaque-hover: hsla(0, 0%, 16%, 0.96);
  --border-restraint: hsla(0, 0%, 100%, 0.08);
  --border-hero: rgba(218, 41, 28, 0.45);
  --accent-sanctuary: var(--border-hero);

  /* Text hierarchy */
  --text-reflection: #ffffff;
  --text-artwork: #d2d2d2;
  --text-title: #969696;
  --text-meta: #8f8f8f;
  --text-control: #666666;
  --text-sanctuary: var(--text-reflection);

  /* Typography */
  --font-editorial: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
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
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;
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
  --color-accent-border: rgba(218, 41, 28, 0.25);

  /* Shadcn-compatible (content overlays) */
  --background: #181818;
  --foreground: #ffffff;
  --card: #303030;
  --card-foreground: #ffffff;
  --muted-foreground: #969696;
  --destructive: #ef4444;
  --ring: #da291c;
}
`;

let fontsInjected = false;

/** Inject Inter once per document (shared across shadow roots). */
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
