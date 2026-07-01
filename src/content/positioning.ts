export interface CardPosition {
  top: number;
  left: number;
}

export function computePosition(target: HTMLElement): CardPosition {
  const rect = target.getBoundingClientRect();
  const cardW = 340;
  const cardH = 380;
  const gap = 12;

  let top = rect.bottom + gap + window.scrollY;
  let left = rect.left + window.scrollX;

  // Keep within viewport
  if (left + cardW > window.innerWidth) {
    left = window.innerWidth - cardW - 16;
  }
  if (left < 8) left = 8;

  // If card would go below viewport, show above
  if (rect.bottom + gap + cardH > window.innerHeight) {
    top = rect.top - cardH - gap + window.scrollY;
  }

  return { top, left };
}
