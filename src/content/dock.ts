import { logger } from '@/shared/logger';
import { setupShadowStyles } from '@/shared/shadowTokens';

const DOCK_ATTR = 'data-subsume-dock';
export const PAGE_REFLECTIONS_STORAGE_KEY = 'subsume_page_reflections';

export interface PageReflection {
  notes: string;
  updatedAt: number;
}

export type PageReflectionStore = Record<string, PageReflection>;

export function pageReflectionKey(hostname = window.location.hostname, pathname = window.location.pathname): string {
  return `${hostname}${pathname}`;
}

export async function loadPageReflection(key: string): Promise<string> {
  const result = await chrome.storage.local.get(PAGE_REFLECTIONS_STORAGE_KEY);
  const store = (result[PAGE_REFLECTIONS_STORAGE_KEY] as PageReflectionStore | undefined) ?? {};
  return store[key]?.notes ?? '';
}

export async function savePageReflection(key: string, notes: string): Promise<void> {
  const result = await chrome.storage.local.get(PAGE_REFLECTIONS_STORAGE_KEY);
  const store = { ...((result[PAGE_REFLECTIONS_STORAGE_KEY] as PageReflectionStore | undefined) ?? {}) };
  const trimmed = notes.trim();
  if (trimmed) {
    store[key] = { notes: trimmed, updatedAt: Date.now() };
  } else {
    delete store[key];
  }
  await chrome.storage.local.set({ [PAGE_REFLECTIONS_STORAGE_KEY]: store });
}

const DOCK_STYLES = `
  :host {
    all: initial;
    position: fixed;
    bottom: var(--spacing-xl);
    right: var(--spacing-xl);
    z-index: 2147483647;
  }

  .dock-container {
    font-family: var(--font-ui);
  }

  .dock-toggle-btn {
    background: var(--bg-overlay);
    color: var(--text-reflection);
    border: 1px solid var(--border-hero);
    padding: var(--spacing-md) var(--spacing-lg);
    border-radius: 20px;
    font-family: var(--font-editorial);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    box-shadow: var(--shadow-md);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .dock-toggle-btn:hover {
    border-color: var(--primary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-lg);
  }

  .dock-card {
    background: var(--bg-overlay);
    border: 1px solid var(--border-hero);
    border-radius: var(--radius-lg);
    width: 320px;
    padding: var(--spacing-md);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .dock-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .dock-title {
    font-family: var(--font-editorial);
    font-size: 16px;
    font-weight: 600;
    color: var(--text-reflection);
  }

  .dock-collapse-btn {
    background: none;
    border: none;
    color: var(--text-meta);
    cursor: pointer;
    font-size: 14px;
    padding: var(--spacing-xs);
  }

  .dock-collapse-btn:hover {
    color: var(--text-reflection);
  }

  .dock-subtitle {
    font-size: 12px;
    color: var(--text-meta);
    line-height: 1.4;
  }

  .dock-textarea {
    width: 100%;
    height: 120px;
    background: var(--bg-sunken);
    border: 1px solid var(--color-accent-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    color: var(--text-reflection);
    font-family: var(--font-editorial);
    font-size: 14px;
    resize: vertical;
    box-sizing: border-box;
  }

  .dock-textarea:focus {
    outline: none;
    border-color: var(--primary);
  }

  .dock-footer {
    display: flex;
    justify-content: flex-end;
  }

  .dock-save-btn {
    background: var(--primary-soft);
    color: var(--text-reflection);
    border: 1px solid var(--border-hero);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .dock-save-btn:hover {
    background: var(--primary-soft);
    border-color: var(--primary);
  }
`;

export class AuteurScreenplayDock {
  private container: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private mountPoint: HTMLElement | null = null;
  private isExpandedState: boolean = false;
  private pageKey: string = pageReflectionKey();

  private boundOnToggle: ((e: MouseEvent) => void) | null;
  private boundOnSave: ((e: MouseEvent) => void) | null;

  constructor() {
    this.boundOnToggle = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggle();
    };
    this.boundOnSave = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.saveNotes();
    };
  }

  private buildCard(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'dock-card';

    const header = document.createElement('div');
    header.className = 'dock-header';
    const title = document.createElement('span');
    title.className = 'dock-title';
    title.textContent = 'Auteur Reflection Dock';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'dock-collapse-btn';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', this.boundOnToggle!);
    header.appendChild(title);
    header.appendChild(closeBtn);

    const subtitle = document.createElement('div');
    subtitle.className = 'dock-subtitle';
    subtitle.textContent = 'Poetic sanctuary reflection notes for this page';

    const textarea = document.createElement('textarea');
    textarea.className = 'dock-textarea';
    textarea.placeholder = 'Record your reflections...';
    void loadPageReflection(this.pageKey).then((notes) => {
      textarea.value = notes;
    }).catch((err) => {
      logger.warn('[Subsume] Failed to load page reflection notes:', err);
    });

    const footer = document.createElement('div');
    footer.className = 'dock-footer';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'dock-save-btn';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', this.boundOnSave!);
    footer.appendChild(saveBtn);

    card.appendChild(header);
    card.appendChild(subtitle);
    card.appendChild(textarea);
    card.appendChild(footer);
    return card;
  }

  public get isExpanded(): boolean {
    return this.isExpandedState;
  }

  public get shadow(): ShadowRoot | null {
    return this.shadowRoot;
  }

  public get host(): HTMLElement | null {
    return this.container;
  }

  public mount(): void {
    if (this.container) return;

    this.pageKey = pageReflectionKey();

    this.container = document.createElement('div');
    this.container.setAttribute(DOCK_ATTR, 'true');
    this.container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;';
    document.body.appendChild(this.container);

    this.shadowRoot = this.container.attachShadow({ mode: 'open' });
    setupShadowStyles(this.shadowRoot, DOCK_STYLES);

    this.mountPoint = document.createElement('div');
    this.mountPoint.className = 'dock-container';
    this.shadowRoot.appendChild(this.mountPoint);

    this.render();
    logger.log('[Subsume] Mounted Auteur Screenplay Dock.');
  }

  public destroy(): void {
    if (this.mountPoint) {
      this.mountPoint.innerHTML = '';
      this.mountPoint = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.shadowRoot = null;
    this.isExpandedState = false;
    this.boundOnToggle = null;
    this.boundOnSave = null;
    logger.log('[Subsume] Destroyed Auteur Screenplay Dock.');
  }

  public toggle(): void {
    this.isExpandedState = !this.isExpandedState;
    this.render();
  }

  private render(): void {
    if (!this.mountPoint) return;
    this.mountPoint.innerHTML = '';

    if (!this.isExpandedState) {
      const btn = document.createElement('button');
      btn.className = 'dock-toggle-btn';
      btn.textContent = '✦ Reflection Dock';
      btn.addEventListener('click', this.boundOnToggle!);
      this.mountPoint.appendChild(btn);
    } else {
      this.mountPoint.appendChild(this.buildCard());
    }
  }

  private saveNotes(): void {
    if (!this.shadowRoot) return;
    const textarea = this.shadowRoot.querySelector('textarea');
    if (!textarea) return;

    const notes = textarea.value;

    savePageReflection(this.pageKey, notes)
      .then(() => {
        logger.log('[Subsume] Successfully saved auteur reflection notes.');
        this.toggle();
      })
      .catch((err) => {
        logger.error('[Subsume] Error saving page reflection notes:', err);
      });
  }
}