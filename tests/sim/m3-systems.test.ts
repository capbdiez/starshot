import { describe, expect, it } from 'vitest';
import { diveInterval } from '../../src/sim/dive-scheduler.ts';
import { easeInOut, sampleCubic } from '../../src/sim/path.ts';
import { patternVelocities } from '../../src/sim/patterns.ts';

describe('M3 path sampling', () => {
  const path = [
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    { x: 100, y: 100 },
    { x: 100, y: 0 },
  ] as const;
  it('returns exact endpoints and a smooth midpoint', () => {
    expect(sampleCubic(path, 0)).toEqual({ x: 0, y: 0 });
    expect(sampleCubic(path, 1)).toEqual({ x: 100, y: 0 });
    expect(sampleCubic(path, 0.5)).toEqual({ x: 50, y: 75 });
    expect(easeInOut(0.5)).toBe(0.5);
  });
});

describe('M3 patterns and dive scheduler', () => {
  it('expands aimed, spread and ring primitives deterministically', () => {
    const aimed = patternVelocities({ type: 'aimed', speed: 3, count: 1 }, 0, 0, 0, 10)[0];
    expect(aimed?.vx).toBeCloseTo(0);
    expect(aimed?.vy).toBe(3);
    expect(
      patternVelocities({ type: 'spread', speed: 2, count: 3, angle: 90 }, 0, 0, 0, 10),
    ).toHaveLength(3);
    expect(patternVelocities({ type: 'ring', speed: 2, count: 6 }, 0, 0, 0, 10)).toHaveLength(6);
  });

  it('shortens the interval as fewer enemies remain', () => {
    expect(diveInterval(60, 180, 10, 10)).toBe(180);
    expect(diveInterval(60, 180, 1, 10)).toBeLessThan(diveInterval(60, 180, 10, 10));
    expect(diveInterval(60, 180, 0, 10)).toBe(60);
  });
});
