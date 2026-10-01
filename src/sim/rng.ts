/** Seeded PRNG (mulberry32). Pure integer maths, so it is identical on every JS engine. */
export interface Rng {
  /** Next uniformly distributed uint32. */
  nextU32(): number;
  /** Uniform float in [0, 1). */
  nextFloat(): number;
  /** Uniform integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  /** Internal state, folded into `sim.hash()`. */
  readonly state: number;
}

/** Creates an RNG seeded with `seed` (coerced to uint32). */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const nextU32 = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
  return {
    nextU32,
    nextFloat: () => nextU32() / 0x1_0000_0000,
    int: (min, max) => min + (nextU32() % (max - min + 1)),
    get state() {
      return state;
    },
  };
}
