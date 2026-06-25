import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuteurScreenplayDock } from '@/content/dock';
import { MessageType } from '@/shared/types';

describe('AuteurScreenplayDock (dock.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
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

  it('dispatches SET_USER_NOTES message on Save click', () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((msg: any, cb: any) => {
      if (cb) cb({ success: true, data: null });
    });

    const dock = new AuteurScreenplayDock();
    dock.mount();
    dock.toggle(); // expand

    const textarea = dock.shadow!.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Cinematic masterpiece of framing.';

    const saveBtn = dock.shadow!.querySelector('.dock-save-btn') as HTMLElement;
    saveBtn.click();

    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
    const calls = vi.mocked(chrome.runtime.sendMessage).mock.calls;
    const noteCall = calls.find((c: any) => c[0].type === MessageType.SET_USER_NOTES);
    expect(noteCall).toBeDefined();
    expect((noteCall as any)[0].payload).toEqual({
      mediaId: 'page_' + window.location.hostname,
      notes: 'Cinematic masterpiece of framing.',
    });
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
