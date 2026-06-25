import { sendMessage } from '@/shared/messages';
import { MessageType } from '@/shared/types';
import { logger } from '@/shared/logger';

const DOCK_ATTR = 'data-subsume-dock';

const DOCK_STYLES = `
  :host {
    all: initial;
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    --bg-dock: hsl(220, 15%, 10%);
    --border-gold: hsla(43, 45%, 55%, 0.35);
    --border-gold-hover: hsla(43, 45%, 55%, 0.65);
    --text-primary: hsl(0, 0%, 94%);
    --text-muted: hsl(0, 0%, 65%);
    --font-editorial: 'Newsreader', Georgia, serif;
    --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  .dock-container {
    font-family: var(--font-ui);
  }

  .dock-toggle-btn {
    background: var(--bg-dock);
    color: var(--text-primary);
    border: 1px solid var(--border-gold);
    padding: 10px 18px;
    border-radius: 20px;
    font-family: var(--font-editorial);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dock-toggle-btn:hover {
    border-color: var(--border-gold-hover);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);
  }

  .dock-card {
    background: var(--bg-dock);
    border: 1px solid var(--border-gold);
    border-radius: 12px;
    width: 320px;
    padding: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 12px;
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
    color: var(--text-primary);
  }

  .dock-collapse-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 14px;
    padding: 4px;
  }

  .dock-collapse-btn:hover {
    color: var(--text-primary);
  }

  .dock-subtitle {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .dock-textarea {
    width: 100%;
    height: 120px;
    background: hsla(220, 15%, 7%, 0.8);
    border: 1px solid hsla(43, 45%, 55%, 0.2);
    border-radius: 8px;
    padding: 10px;
    color: var(--text-primary);
    font-family: var(--font-editorial);
    font-size: 14px;
    resize: vertical;
    box-sizing: border-box;
  }

  .dock-textarea:focus {
    outline: none;
    border-color: var(--border-gold-hover);
  }

  .dock-footer {
    display: flex;
    justify-content: flex-end;
  }

  .dock-save-btn {
    background: hsla(43, 45%, 55%, 0.15);
    color: var(--text-primary);
    border: 1px solid var(--border-gold);
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .dock-save-btn:hover {
    background: hsla(43, 45%, 55%, 0.25);
    border-color: var(--border-gold-hover);
  }
`;

export class AuteurScreenplayDock {
  private container: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private mountPoint: HTMLElement | null = null;
  private isExpandedState: boolean = false;

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

    this.container = document.createElement('div');
    this.container.setAttribute(DOCK_ATTR, 'true');
    this.container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;';
    document.body.appendChild(this.container);

    this.shadowRoot = this.container.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = DOCK_STYLES;
    this.shadowRoot.appendChild(style);

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
    const mediaId = 'page_' + window.location.hostname;

    sendMessage(MessageType.SET_USER_NOTES, { mediaId, notes })
      .then((res) => {
        if (res.success) {
          logger.log('[Subsume] Successfully saved auteur reflection notes.');
          this.toggle(); // collapse after save
        } else {
          logger.warn('[Subsume] Failed to save reflection notes:', res.error);
        }
      })
      .catch((err) => {
        logger.error('[Subsume] Error sending SET_USER_NOTES message:', err);
      });
  }
}
