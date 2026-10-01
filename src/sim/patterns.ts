import type { BulletPattern } from '../content/index.ts';
import { trigAtan2, trigCos, trigSin } from '../shared/index.ts';

export interface Velocity {
  readonly vx: number;
  readonly vy: number;
}
const TAU = Math.PI * 2;

/** Expands a data-defined firing pattern into deterministic projectile velocities. */
export function patternVelocities(
  pattern: BulletPattern,
  x: number,
  y: number,
  targetX: number,
  targetY: number,
): readonly Velocity[] {
  const angle = trigAtan2(targetY - y, targetX - x);
  const velocity = (a: number): Velocity => ({
    vx: trigCos(a) * pattern.speed,
    vy: trigSin(a) * pattern.speed,
  });
  if (pattern.type === 'aimed' || pattern.type === 'burst')
    return Array.from({ length: pattern.count }, () => velocity(angle));
  if (pattern.type === 'ring')
    return Array.from({ length: pattern.count }, (_, i) => velocity((TAU * i) / pattern.count));
  return Array.from({ length: pattern.count }, (_, i) =>
    velocity(angle + (i / (pattern.count - 1) - 0.5) * ((pattern.angle * Math.PI) / 180)),
  );
}
