import { describe, expect, it } from 'vitest';
import { overlaps } from '../../src/sim/collision.ts';
import { createRng } from '../../src/sim/rng.ts';

describe('seeded RNG', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createRng(7);
    const b = createRng(7);
    for (let i = 0; i < 100; i += 1) expect(a.nextU32()).toBe(b.nextU32());
  });

  it('matches a pinned sequence (cross-engine determinism)', () => {
    const rng = createRng(1);
    expect([rng.nextU32(), rng.nextU32(), rng.nextU32()]).toEqual([
      2693262067, 11749833, 2265367787,
    ]);
  });

  it('int() stays in range and floats are in [0, 1)', () => {
    const rng = createRng(3);
    for (let i = 0; i < 1000; i += 1) {
      const n = rng.int(30, 60);
      expect(n).toBeGreaterThanOrEqual(30);
      expect(n).toBeLessThanOrEqual(60);
      const f = rng.nextFloat();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });
});

describe('overlaps', () => {
  it('detects overlap and treats touching edges as a miss', () => {
    const a = { x: 0, y: 0, w: 4, h: 4 };
    expect(overlaps(a, { x: 3, y: 0, w: 4, h: 4 })).toBe(true);
    expect(overlaps(a, { x: 4, y: 0, w: 4, h: 4 })).toBe(false);
    expect(overlaps(a, { x: 0, y: 5, w: 4, h: 4 })).toBe(false);
  });
});
