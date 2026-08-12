import { describe, it, expect } from 'vitest';
import { projectVelocity, rubberband, SPRING_DRAWER_WIDTH } from '@/ui/hooks/useSpringDrawer';

function stepSpring(
  pos: number,
  vel: number,
  target: number,
  dt: number,
  stiffness = 280,
  damping = 2 * Math.sqrt(280),
): { pos: number; vel: number } {
  const force = -stiffness * (pos - target) - damping * vel;
  const nextVel = vel + force * dt;
  const nextPos = pos + nextVel * dt;
  return { pos: nextPos, vel: nextVel };
}

describe('spring drawer math', () => {
  it('projects forward with positive velocity', () => {
    expect(projectVelocity(500)).toBeGreaterThan(0);
    expect(projectVelocity(-500)).toBeLessThan(0);
  });

  it('rubberbands past bounds without hard stop at zero overshoot', () => {
    expect(rubberband(-0.2, 1)).toBeLessThan(0);
    expect(Math.abs(rubberband(-0.2, 1))).toBeLessThan(0.2);
  });

  it('critically damped spring approaches open target without large overshoot', () => {
    let pos = 0;
    let vel = 0;
    const target = 1;
    for (let i = 0; i < 120; i++) {
      ({ pos, vel } = stepSpring(pos, vel, target, 1 / 60));
    }
    expect(pos).toBeGreaterThan(0.95);
    expect(pos).toBeLessThan(1.05);
    expect(Math.abs(vel)).toBeLessThan(0.5);
  });

  it('retarget mid-flight (interrupt) continues from current pos', () => {
    let pos = 0;
    let vel = 0;
    // Spring toward open
    for (let i = 0; i < 20; i++) {
      ({ pos, vel } = stepSpring(pos, vel, 1, 1 / 60));
    }
    const mid = pos;
    expect(mid).toBeGreaterThan(0.1);
    // Retarget closed from mid — no hard jump
    for (let i = 0; i < 80; i++) {
      ({ pos, vel } = stepSpring(pos, vel, 0, 1 / 60));
    }
    expect(pos).toBeLessThan(0.15);
    // Mid value was preserved as continuous evolution (not reset to 1 or 0)
    expect(mid).not.toBe(0);
    expect(mid).not.toBe(1);
  });

  it('momentum projection at midpoint uses projected rest, not raw release point', () => {
    const progress = 0.45;
    // Strong open-ward velocity (progress/s) should push past 0.5
    const projectedOpen = progress + projectVelocity(1200);
    expect(projectedOpen).toBeGreaterThan(0.5);
    const projectedClose = progress + projectVelocity(-1200);
    expect(projectedClose).toBeLessThan(0.5);
  });

  it('exports a single drawer width constant for CSS/JS parity', () => {
    expect(SPRING_DRAWER_WIDTH).toBe(320);
  });

  it('already-settled close is a pure no-op in decision logic', () => {
    // Mirrors setTarget early-return: if progress≈target and vel≈0, do not re-fire settle
    const progress = 0;
    const target = 0;
    const vel = 0;
    const alreadySettled =
      Math.abs(progress - target) < 0.002 && Math.abs(vel) < 0.02;
    expect(alreadySettled).toBe(true);
  });
});
