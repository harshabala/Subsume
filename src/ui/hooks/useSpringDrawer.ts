import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { RefObject } from 'preact';

/**
 * Critically damped spring drawer (Apple fluid interfaces).
 * - Progress 0 = fully closed (off-screen right), 1 = fully open
 * - Always animates from the *current* progress (interruptible / retargetable)
 * - 1:1 drag with release-velocity handoff + momentum projection
 *
 * No external spring library — keeps the extension lean.
 */

const DRAWER_WIDTH_PX = 320;

/** Stiffness tuned for ~0.35s settle (Apple response ≈ 0.3–0.4). */
const STIFFNESS = 280;
/** Critical damping: ζ = 1 → 2√k */
const DAMPING = 2 * Math.sqrt(STIFFNESS);

/** Settled when close to target with near-zero velocity. */
const SETTLE_POS = 0.002;
const SETTLE_VEL = 0.02;

/** Exponential projection (Apple sample: d ≈ 0.998). */
export function projectVelocity(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export interface UseSpringDrawerOptions {
  width?: number;
  prefersReducedMotion?: () => boolean;
  onSettledOpen?: () => void;
  onSettledClosed?: () => void;
}

export interface UseSpringDrawerResult {
  /** True when drawer is open enough for a11y (focus trap / inert). */
  isOpen: boolean;
  /** True while progress > 0 — mount backdrop. */
  isVisible: boolean;
  /** 0–1 current progress (for backdrop opacity). */
  progress: number;
  drawerRef: RefObject<HTMLElement>;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Bind to drawer surface for drag-to-dismiss (not buttons). */
  onDrawerPointerDown: (e: PointerEvent) => void;
  style: { transform: string; opacity: number; pointerEvents: 'auto' | 'none' };
  backdropStyle: { opacity: number };
}

export function useSpringDrawer(options: UseSpringDrawerOptions = {}): UseSpringDrawerResult {
  const width = options.width ?? DRAWER_WIDTH_PX;
  const prefersReducedMotion =
    options.prefersReducedMotion ??
    (() =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const onSettledOpenRef = useRef(options.onSettledOpen);
  const onSettledClosedRef = useRef(options.onSettledClosed);
  onSettledOpenRef.current = options.onSettledOpen;
  onSettledClosedRef.current = options.onSettledClosed;

  const drawerRef = useRef<HTMLElement>(null!);
  const progressRef = useRef(0);
  const velocityRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartProgressRef = useRef(0);
  const pointerSamplesRef = useRef<Array<{ t: number; x: number }>>([]);

  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const applyVisual = useCallback(
    (p: number) => {
      const el = drawerRef.current;
      if (el) {
        const tx = (1 - p) * width;
        el.style.transform = `translate3d(${tx}px, 0, 0)`;
        el.style.opacity = String(Math.min(1, Math.max(0, p * 1.15)));
        el.style.pointerEvents = p > 0.05 ? 'auto' : 'none';
      }
      setProgress(p);
      setIsVisible(p > 0.001 || targetRef.current > 0.5 || draggingRef.current);
    },
    [width],
  );

  const stopRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTimeRef.current = null;
  }, []);

  const tick = useCallback(
    (now: number) => {
      if (draggingRef.current) {
        rafRef.current = null;
        return;
      }

      const last = lastTimeRef.current ?? now;
      let dt = (now - last) / 1000;
      if (dt > 0.064) dt = 0.064;
      if (dt <= 0) dt = 1 / 60;
      lastTimeRef.current = now;

      const target = targetRef.current;
      let pos = progressRef.current;
      let vel = velocityRef.current;

      const force = -STIFFNESS * (pos - target) - DAMPING * vel;
      vel += force * dt;
      pos += vel * dt;

      if (pos < 0) {
        pos = rubberband(pos, 1);
        vel *= 0.4;
      } else if (pos > 1) {
        pos = 1 + rubberband(pos - 1, 1);
        vel *= 0.4;
      }

      progressRef.current = pos;
      velocityRef.current = vel;
      applyVisual(pos);

      const settled =
        Math.abs(pos - target) < SETTLE_POS && Math.abs(vel) < SETTLE_VEL;

      if (settled) {
        progressRef.current = target;
        velocityRef.current = 0;
        applyVisual(target);
        setIsOpen(target >= 0.5);
        rafRef.current = null;
        lastTimeRef.current = null;
        if (target >= 0.5) onSettledOpenRef.current?.();
        else onSettledClosedRef.current?.();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [applyVisual],
  );

  const startSpring = useCallback(() => {
    if (draggingRef.current) return;
    if (rafRef.current != null) return;
    lastTimeRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const setTarget = useCallback(
    (open: boolean) => {
      targetRef.current = open ? 1 : 0;
      setIsOpen(open);
      setIsVisible(true);

      if (prefersReducedMotion()) {
        stopRaf();
        progressRef.current = open ? 1 : 0;
        velocityRef.current = 0;
        applyVisual(open ? 1 : 0);
        setIsOpen(open);
        setIsVisible(open);
        if (open) onSettledOpenRef.current?.();
        else onSettledClosedRef.current?.();
        return;
      }

      // Retarget from current progress — never lock during close (item 3)
      startSpring();
    },
    [applyVisual, prefersReducedMotion, startSpring, stopRaf],
  );

  const open = useCallback(() => setTarget(true), [setTarget]);
  const close = useCallback(() => setTarget(false), [setTarget]);
  const toggle = useCallback(() => {
    setTarget(targetRef.current < 0.5);
  }, [setTarget]);

  const onDrawerPointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, a, input, select, textarea, [role="button"]')) {
        return;
      }
      if (prefersReducedMotion()) return;

      const el = drawerRef.current;
      if (!el) return;

      draggingRef.current = true;
      stopRaf();
      dragStartXRef.current = e.clientX;
      dragStartProgressRef.current = progressRef.current;
      pointerSamplesRef.current = [{ t: performance.now(), x: e.clientX }];
      velocityRef.current = 0;

      el.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        if (!draggingRef.current) return;
        const dx = ev.clientX - dragStartXRef.current;
        let next = dragStartProgressRef.current - dx / width;
        if (next < 0) next = rubberband(next, 1);
        if (next > 1) next = 1 + rubberband(next - 1, 1);
        progressRef.current = next;
        applyVisual(next);

        const samples = pointerSamplesRef.current;
        samples.push({ t: performance.now(), x: ev.clientX });
        if (samples.length > 6) samples.shift();
      };

      const onUp = (ev: PointerEvent) => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        try {
          el.releasePointerCapture(ev.pointerId);
        } catch {
          /* ignore */
        }
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);

        const samples = pointerSamplesRef.current;
        let velPx = 0;
        if (samples.length >= 2) {
          const a = samples[0];
          const b = samples[samples.length - 1];
          const dt = (b.t - a.t) / 1000;
          if (dt > 0) velPx = (b.x - a.x) / dt;
        }
        // Right drag → closing → negative progress velocity
        const velProgress = -velPx / width;
        velocityRef.current = velProgress;

        const projected = progressRef.current + projectVelocity(velProgress);
        const openByFlick = velProgress > 0.8;
        const closeByFlick = velProgress < -0.8;
        const finalOpen = openByFlick ? true : closeByFlick ? false : projected > 0.5;

        targetRef.current = finalOpen ? 1 : 0;
        setIsOpen(finalOpen);
        startSpring();
      };

      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    },
    [applyVisual, prefersReducedMotion, startSpring, stopRaf, width],
  );

  useEffect(() => {
    applyVisual(0);
    return () => stopRaf();
  }, [applyVisual, stopRaf]);

  const style = {
    transform: `translate3d(${(1 - progress) * width}px, 0, 0)`,
    opacity: Math.min(1, Math.max(0, progress * 1.15)),
    pointerEvents: (progress > 0.05 ? 'auto' : 'none') as 'auto' | 'none',
  };

  const backdropStyle = {
    opacity: Math.min(1, Math.max(0, progress)),
  };

  // a11y "open" when mostly open OR settling toward open
  const a11yOpen = isOpen || progress > 0.5 || targetRef.current > 0.5;

  return {
    isOpen: a11yOpen,
    isVisible,
    progress,
    drawerRef,
    open,
    close,
    toggle,
    onDrawerPointerDown,
    style,
    backdropStyle,
  };
}

export const SPRING_DRAWER_WIDTH = DRAWER_WIDTH_PX;
