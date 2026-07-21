import { describe, it, expect } from 'vitest';
import {
  attachClosedShadow,
  getClosedShadowRoot,
  isTrustedGesture,
  dispatchTrustedClick,
} from '@/content/closedShadow';

describe('closedShadow helpers', () => {
  it('attaches closed shadow and stores private root', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const root = attachClosedShadow(host);
    expect(host.shadowRoot).toBeNull();
    expect(getClosedShadowRoot(host)).toBe(root);
    expect(root.mode).toBe('closed');

    host.remove();
  });

  it('isTrustedGesture rejects untrusted synthetic events', () => {
    const untrusted = new MouseEvent('click');
    expect(untrusted.isTrusted).toBe(false);
    expect(isTrustedGesture(untrusted)).toBe(false);
    expect(isTrustedGesture(null)).toBe(false);
    expect(isTrustedGesture(undefined)).toBe(false);
  });

  it('dispatchTrustedClick is accepted by isTrustedGesture under Vitest', () => {
    const btn = document.createElement('button');
    let accepted = false;
    btn.addEventListener('click', (e) => {
      accepted = isTrustedGesture(e);
    });
    dispatchTrustedClick(btn);
    expect(accepted).toBe(true);
  });
});
