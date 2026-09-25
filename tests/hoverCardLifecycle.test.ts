import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HoverCardManager } from '@/content/hoverCard';

vi.mock('@/shared/messages', () => ({
  sendMessage: vi.fn(),
}));

describe('HoverCardManager Lifecycle and AbortController (P1-CS1)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('aborts element listeners on destroy so mouseenter/mouseleave do not fire', () => {
    const manager = new HoverCardManager();
    const el = document.createElement('div');
    document.body.appendChild(el);

    const scheduleShowSpy = vi.spyOn(manager as any, 'scheduleShow');
    const scheduleHideSpy = vi.spyOn(manager as any, 'scheduleHide');

    manager.attachToElement(el, 'Inception', 2010);

    // Before destroy, mouseenter triggers scheduleShow
    el.dispatchEvent(new MouseEvent('mouseenter'));
    expect(scheduleShowSpy).toHaveBeenCalledTimes(1);

    el.dispatchEvent(new MouseEvent('mouseleave'));
    expect(scheduleHideSpy).toHaveBeenCalledTimes(1);

    // Call destroy
    manager.destroy();

    // After destroy, mouseenter and mouseleave listeners should be aborted and not fire
    el.dispatchEvent(new MouseEvent('mouseenter'));
    el.dispatchEvent(new MouseEvent('mouseleave'));

    expect(scheduleShowSpy).toHaveBeenCalledTimes(1);
    expect(scheduleHideSpy).toHaveBeenCalledTimes(1);
  });

  it('cleans up shadow host container and cancels pending timers on destroy', () => {
    const manager = new HoverCardManager();
    const host = document.getElementById('subsume-hover-root');
    expect(host).not.toBeNull();

    const cancelShowSpy = vi.spyOn(manager as any, 'cancelShow');
    const cancelHideSpy = vi.spyOn(manager as any, 'cancelHide');

    manager.destroy();

    expect(cancelShowSpy).toHaveBeenCalledTimes(1);
    expect(cancelHideSpy).toHaveBeenCalledTimes(1);
    expect(document.getElementById('subsume-hover-root')).toBeNull();
  });
});
