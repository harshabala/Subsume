import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AuteurScreenplayDock,
  pageReflectionKey,
  loadPageReflection,
  savePageReflection,
  PAGE_REFLECTIONS_STORAGE_KEY,
} from '@/content/dock';

describe('AuteurScreenplayDock (dock.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    vi.mocked(chrome.storage.local.get).mockResolvedValue({});
    vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts into DOM with fixed positioning and open Shadow DOM', () => {
    const dock = new AuteurScreenplayDock();
    dock.mount();

    const host = document.querySelector('div[data-subsume-dock]');
    expect(host).not.toBeNull();
    expect((host as HTMLElement).style.position).toBe('fixed');
    expect((host as HTMLElement).style.zIndex).toBe('2147483647');
    expect(host?.shadowRoot).not.toBeNull();
  });

  it('renders collapsed floating pill initially', () => {
    const dock = new AuteurScreenplayDock();
    dock.mount();

    const shadow = dock.shadow!;
    const pill = shadow.querySelector('.dock-toggle-btn');
    expect(pill).not.toBeNull();
    expect(pill?.textContent).toContain('✦ Reflection Dock');
    expect(shadow.querySelector('.dock-card')).toBeNull();
  });

  it('toggles to expanded editorial notepad card when toggle is clicked', () => {
    const dock = new AuteurScreenplayDock();
    dock.mount();

    const pill = dock.shadow!.querySelector('.dock-toggle-btn') as HTMLElement;
    pill.click();

    expect(dock.isExpanded).toBe(true);
    const card = dock.shadow!.querySelector('.dock-card');
    expect(card).not.toBeNull();
    expect(dock.shadow!.querySelector('.dock-title')?.textContent).toContain('Auteur Reflection Dock');
    expect(dock.shadow!.querySelector('textarea')).not.toBeNull();
    expect(dock.shadow!.querySelector('.dock-save-btn')).not.toBeNull();
  });

  it('saves page reflections to chrome.storage.local on Save click', async () => {
    const dock = new AuteurScreenplayDock();
    dock.mount();
    dock.toggle();

    const textarea = dock.shadow!.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Cinematic masterpiece of framing.';

    const saveBtn = dock.shadow!.querySelector('.dock-save-btn') as HTMLElement;
    saveBtn.click();

    await vi.waitFor(() => {
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    const setCall = vi.mocked(chrome.storage.local.set).mock.calls.at(-1)?.[0] as Record<string, unknown>;
    const store = setCall[PAGE_REFLECTIONS_STORAGE_KEY] as Record<string, { notes: string }>;
    const key = pageReflectionKey();
    expect(store[key].notes).toBe('Cinematic masterpiece of framing.');
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('destroy() unmounts container DOM node and cleans up', () => {
    const dock = new AuteurScreenplayDock();
    dock.mount();
    expect(document.querySelector('div[data-subsume-dock]')).not.toBeNull();

    dock.destroy();
    expect(document.querySelector('div[data-subsume-dock]')).toBeNull();
    expect(dock.host).toBeNull();
  });
});

describe('page reflection storage helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chrome.storage.local.get).mockResolvedValue({});
    vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);
  });

  it('builds stable keys from hostname and pathname', () => {
    expect(pageReflectionKey('example.com', '/movies/inception')).toBe('example.com/movies/inception');
  });

  it('loads saved notes for a page key', async () => {
    const key = 'example.com/reviews';
    vi.mocked(chrome.storage.local.get).mockResolvedValue({
      [PAGE_REFLECTIONS_STORAGE_KEY]: {
        [key]: { notes: 'Lingering shot of rain.', updatedAt: 1 },
      },
    });

    await expect(loadPageReflection(key)).resolves.toBe('Lingering shot of rain.');
  });

  it('persists notes under hostname+path key', async () => {
    const key = 'example.com/reviews';
    await savePageReflection(key, 'A quiet ending.');

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [PAGE_REFLECTIONS_STORAGE_KEY]: {
        [key]: expect.objectContaining({ notes: 'A quiet ending.' }),
      },
    });
  });
});