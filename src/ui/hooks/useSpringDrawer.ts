import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { RefObject } from 'preact';

/**
 * Critically damped spring drawer (Apple fluid interfaces).
 * - Progress 0 = fully closed (off-screen right), 1 = fully open
 * - Always animates from the *current* progress (interruptible / retargetable)
 * - 1:1 drag with release-velocity handoff + momentum projection
 * - Visuals are imperative (no per-frame React re-renders)
 */

export const SPRING_DRAWER_WIDTH = 320;

const STIFFNESS = 280;
const DAMPING = 2 * Math.sqrt(STIFFNESS);
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
  /** A11y open: true from open start until fully settled closed. */
  isOpen: boolean;
  /** Mount backdrop while animating or open. */
  isVisible: boolean;
  drawerRef: RefObject<HTMLElement>;
  backdropRef: RefObject<HTMLDivElement>;
  open: () => void;
  close: () => void;
  toggle: () => void;
  onDrawerPointerDown: (e: PointerEvent) => void;
}

export function useSpringDrawer(options: UseSpringDrawerOptions = {}): UseSpringDrawerResult {
  const width = options.width ?? SPRING_DRAWER_WIDTH;
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
  const backdropRef = useRef<HTMLDivElement>(null!);
  const progressRef = useRef(0);
  const velocityRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartProgressRef = useRef(0);
  const pointerSamplesRef = useRef<Array<{ t: number; x: number }>>([]);
  /** True while target is open OR progress still visible (a11y window). */
  const a11yOpenRef = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const applyVisual = useCallback(
    (p: number) => {
      const el = drawerRef.current;
      if (el) {
        const tx = (1 - p) * width;
        el.style.transform = `translate3d(${tx}px, 0, 0)`;
        el.style.opacity = String(Math.min(1, Math.max(0, p * 1.15)));
        el.style.pointerEvents = p > 0.05 ? 'auto' : 'none';
      }
      const backdrop = backdropRef.current;
      if (backdrop) {
        backdrop.style.opacity = String(Math.min(1, Math.max(0, p)));
      }
    },
    [width],
  );

  const syncDiscrete = useCallback((p: number, target: number, dragging: boolean) => {
    // Visible if anything is showing
    const visible = p > 0.001 || target > 0.5 || dragging;
    setIsVisible((v) => (v === visible ? v : visible));

    // A11y open: stay true from open start until fully settled closed
    // (avoids aria-hidden + focus still inside mid-close)
    if (target > 0.5 || dragging || p > 0.05) {
      a11yOpenRef.current = true;
    }
    if (target < 0.5 && p <= SETTLE_POS * 4 && !dragging) {
      a11yOpenRef.current = false;
    }
    const nextOpen = a11yOpenRef.current;
    setIsOpen((prev) => (prev === nextOpen ? prev : nextOpen));
  }, []);

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
      syncDiscrete(pos, target, false);

      const settled =
        Math.abs(pos - target) < SETTLE_POS && Math.abs(vel) < SETTLE_VEL;

      if (settled) {
        progressRef.current = target;
        velocityRef.current = 0;
        applyVisual(target);
        syncDiscrete(target, target, false);
        rafRef.current = null;
        lastTimeRef.current = null;
        if (target >= 0.5) onSettledOpenRef.current?.();
        else onSettledClosedRef.current?.();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [applyVisual, syncDiscrete],
  );

  const startSpring = useCallback(() => {
    if (draggingRef.current) return;
    if (rafRef.current != null) return;
    lastTimeRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const setTarget = useCallback(
    (open: boolean) => {
      const next = open ? 1 : 0;
      const alreadySettled =
        Math.abs(progressRef.current - next) < SETTLE_POS &&
        Math.abs(velocityRef.current) < SETTLE_VEL &&
        Math.abs(targetRef.current - next) < SETTLE_POS &&
        rafRef.current == null &&
        !draggingRef.current;

      // No-op if already settled on this target (fixes focus-steal on goToPage)
      if (alreadySettled) {
        return;
      }

      targetRef.current = next;
      if (open) {
        a11yOpenRef.current = true;
        setIsOpen(true);
        setIsVisible(true);
      } else {
        // Keep a11y open until settle; still ensure visible for exit animation
        setIsVisible(true);
      }

      if (prefersReducedMotion()) {
        stopRaf();
        progressRef.current = next;
        velocityRef.current = 0;
        applyVisual(next);
        a11yOpenRef.current = open;
        setIsOpen(open);
        setIsVisible(open);
        if (open) onSettledOpenRef.current?.();
        else onSettledClosedRef.current?.();
        return;
      }

      startSpring();
    },
    [applyVisual, prefersReducedMotion, startSpring, stopRaf],
  );

  const open = useCallback(() => setTarget(true), [setTarget]);
  const close = useCallback(() => setTarget(false), [setTarget]);
  const toggle = useCallback(() => {
    // Toggle based on target (not progress) so open-while-closing works cleanly
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

      // Measure live width so CSS/media changes stay in sync
      const liveWidth = el.getBoundingClientRect().width || width;

      draggingRef.current = true;
      a11yOpenRef.current = true;
      setIsOpen(true);
      stopRaf();
      dragStartXRef.current = e.clientX;
      dragStartProgressRef.current = progressRef.current;
      pointerSamplesRef.current = [{ t: performance.now(), x: e.clientX }];
      velocityRef.current = 0;
      el.style.userSelect = 'none';

      el.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        if (!draggingRef.current) return;
        ev.preventDefault();
        const dx = ev.clientX - dragStartXRef.current;
        let next = dragStartProgressRef.current - dx / liveWidth;
        if (next < 0) next = rubberband(next, 1);
        if (next > 1) next = 1 + rubberband(next - 1, 1);
        progressRef.current = next;
        applyVisual(next);

        const now = performance.now();
        const samples = pointerSamplesRef.current;
        samples.push({ t: now, x: ev.clientX });
        // Keep only last ~80ms for velocity
        while (samples.length > 1 && now - samples[0].t > 80) {
          samples.shift();
        }
      };

      const onUp = (ev: PointerEvent) => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        el.style.userSelect = '';
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
          // Prefer last two samples in trailing window
          const a = samples[Math.max(0, samples.length - 2)];
          const b = samples[samples.length - 1];
          const dt = (b.t - a.t) / 1000;
          if (dt > 0) velPx = (b.x - a.x) / dt;
        }
        const velProgress = -velPx / liveWidth;
        velocityRef.current = velProgress;

        const projected = progressRef.current + projectVelocity(velProgress);
        const openByFlick = velProgress > 0.8;
        const closeByFlick = velProgress < -0.8;
        const finalOpen = openByFlick ? true : closeByFlick ? false : projected > 0.5;

        targetRef.current = finalOpen ? 1 : 0;
        if (finalOpen) {
          a11yOpenRef.current = true;
          setIsOpen(true);
        }
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

  return {
    isOpen,
    isVisible,
    drawerRef,
    backdropRef,
    open,
    close,
    toggle,
    onDrawerPointerDown,
  };
}
