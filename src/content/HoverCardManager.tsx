import { render, h } from 'preact';
import { sendMessage } from '@/shared/messages';
import { MessageType, MediaItem, MediaType, LibraryItem } from '@/shared/types';
import { computePosition } from './positioning';
import { HoverCard, HOVER_CARD_STYLES } from './hoverCard';

export class HoverCardManager {
  private container: HTMLDivElement;
  private shadowRoot: ShadowRoot;
  private currentTarget: HTMLElement | null = null;
  private showTimeout: ReturnType<typeof setTimeout> | null = null;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;
  private isCardHovered = false;
  private libraryItems: Map<string, LibraryItem> = new Map();
  private listeners: WeakMap<HTMLElement, { enter: () => void; leave: () => void }> = new WeakMap();

  private currentMediaItem: MediaItem | null = null;
  private isLoading: boolean = false;
  private currentActionStatus: 'added-movie' | 'added-tv' | 'removed' | null = null;

  constructor() {
    // Create shadow DOM container
    this.container = document.createElement('div');
    this.container.id = 'subsume-hover-root';
    this.shadowRoot = this.container.attachShadow({ mode: 'open' });

    // Inject styles into shadow DOM
    const style = document.createElement('style');
    style.textContent = HOVER_CARD_STYLES;
    this.shadowRoot.appendChild(style);

    // Render mount point
    const mount = document.createElement('div');
    mount.id = 'subsume-mount';
    this.shadowRoot.appendChild(mount);

    document.body.appendChild(this.container);

    this.setupSyncListener();
  }

  private libraryCacheInitialized = false;

  private async initLibraryCache() {
    try {
      const libResponse = await sendMessage<{}, { library: LibraryItem; media: MediaItem }[]>(
        MessageType.GET_LIBRARY,
        {}
      );
      if (libResponse.success && libResponse.data) {
        this.libraryItems = new Map(
          libResponse.data.map(item => [item.library.mediaId, item.library])
        );
      }
    } catch (err) {
      console.error('[Subsume] Failed to initialize library cache:', err);
    }
  }

  private setupSyncListener() {
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (sender.id !== chrome.runtime.id) return;

      if (message && message.type === 'LIBRARY_UPDATED') {
        const libItem = message.libraryItem as LibraryItem | undefined;
        const mediaId = message.mediaId || libItem?.mediaId;
        if (!mediaId) return;

        if (message.action === 'add' && libItem) {
          this.libraryItems.set(mediaId, libItem);
        } else if (message.action === 'update' && libItem) {
          this.libraryItems.set(mediaId, libItem);
        } else if (message.action === 'remove') {
          this.libraryItems.delete(mediaId);
        }
      }
    });
  }

  attachToElement(element: HTMLElement, title: string, yearGuess?: number): void {
    if (!this.libraryCacheInitialized) {
      this.libraryCacheInitialized = true;
      this.initLibraryCache();
    }

    const enter = () => {
      this.scheduleShow(element, title, yearGuess);
    };
    const leave = () => {
      this.scheduleHide();
    };

    element.addEventListener('mouseenter', enter);
    element.addEventListener('mouseleave', leave);
    this.listeners.set(element, { enter, leave });
  }

  detachFromElement(element: HTMLElement): void {
    const handlers = this.listeners.get(element);
    if (handlers) {
      element.removeEventListener('mouseenter', handlers.enter);
      element.removeEventListener('mouseleave', handlers.leave);
      this.listeners.delete(element);
    }
  }

  destroy(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  private scheduleShow(target: HTMLElement, title: string, yearGuess?: number): void {
    this.cancelHide();
    this.showTimeout = setTimeout(() => {
      this.showCard(target, title, yearGuess);
    }, 300);
  }

  private scheduleHide(): void {
    this.cancelShow();
    this.hideTimeout = setTimeout(() => {
      if (!this.isCardHovered) {
        this.hideCard();
      }
    }, 200);
  }

  private cancelShow(): void {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
  }

  private cancelHide(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  private renderCurrentState(): void {
    const mount = this.shadowRoot.getElementById('subsume-mount');
    if (!mount) return;

    if (!this.currentTarget) {
      render(
        <HoverCard
          mediaItem={null}
          loading={false}
          position={{ top: 0, left: 0 }}
          visible={false}
          inLibrary={false}
          libraryItem={null}
          actionStatus={null}
          onAdd={() => {}}
          onRemove={() => {}}
          onMouseEnter={() => {}}
          onMouseLeave={() => {}}
        />,
        mount
      );
      return;
    }

    const position = computePosition(this.currentTarget);
    const mediaItem = this.currentMediaItem;
    const libraryItem = mediaItem ? this.libraryItems.get(mediaItem.id) || null : null;
    const inLibrary = libraryItem !== null;

    render(
      <HoverCard
        mediaItem={mediaItem}
        loading={this.isLoading}
        position={position}
        visible={true}
        inLibrary={inLibrary}
        libraryItem={libraryItem}
        actionStatus={this.currentActionStatus}
        onAdd={(type) => this.handleAdd(mediaItem!, type)}
        onRemove={() => this.handleRemove(mediaItem!)}
        onMouseEnter={() => {
          this.isCardHovered = true;
          this.cancelHide();
        }}
        onMouseLeave={() => {
          this.isCardHovered = false;
          this.scheduleHide();
        }}
      />,
      mount
    );
  }

  private async showCard(target: HTMLElement, title: string, yearGuess?: number): Promise<void> {
    this.currentTarget = target;
    this.isLoading = true;
    this.currentMediaItem = null;
    this.currentActionStatus = null;
    this.renderCurrentState();

    try {
      const response = await sendMessage<
        { title: string; yearGuess?: number },
        MediaItem
      >(MessageType.GET_TITLE_DETAILS, { title, yearGuess });

      if (this.currentTarget !== target) return; 

      this.currentMediaItem = response.success ? response.data ?? null : null;
      this.isLoading = false;
      this.renderCurrentState();
    } catch (err) {
      console.error('[Subsume] Failed to fetch title details:', err);
      if (this.currentTarget !== target) return;
      
      this.currentMediaItem = null;
      this.isLoading = false;
      this.renderCurrentState();
    }
  }

  private hideCard(): void {
    this.currentTarget = null;
    this.currentMediaItem = null;
    this.isLoading = false;
    this.currentActionStatus = null;
    this.renderCurrentState();
  }

  private async handleAdd(mediaItem: MediaItem, type: MediaType): Promise<void> {
    try {
      await sendMessage(MessageType.ADD_TO_LIST, {
        mediaItem: { ...mediaItem, type },
        type,
      });

      this.currentActionStatus = type === 'movie' ? 'added-movie' : 'added-tv';
      this.renderCurrentState();
      
      setTimeout(() => this.hideCard(), 1200);
    } catch (err) {
      console.error('[Subsume] Failed to add to list:', err);
    }
  }

  private async handleRemove(mediaItem: MediaItem): Promise<void> {
    try {
      await sendMessage(MessageType.REMOVE_FROM_LIBRARY, {
        mediaId: mediaItem.id,
      });

      this.currentActionStatus = 'removed';
      this.renderCurrentState();

      setTimeout(() => this.hideCard(), 1200);
    } catch (err) {
      console.error('[Subsume] Failed to remove from library:', err);
    }
  }
}
