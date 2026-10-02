import { describe, expect, it } from 'vitest';
import { NO_INPUT } from '../../src/shared/index.ts';
import { createSim } from '../../src/sim/index.ts';
import { realContent as content } from './helpers.ts';

function run(seed: number, inputs: readonly number[]): string {
  const sim = createSim(content, seed);
  for (const input of inputs) sim.step(input);
  return sim.hash();
}

describe('sim public API', () => {
  it('starts at tick 0 and counts steps', () => {
    const sim = createSim(content, 1);
    expect(sim.snapshot().tick).toBe(0);
    sim.step(NO_INPUT);
    sim.step(NO_INPUT);
    expect(sim.snapshot().tick).toBe(2);
  });

  it('returns frozen snapshots that do not change after later steps', () => {
    const sim = createSim(content, 1);
    const before = sim.snapshot();
    sim.step(NO_INPUT);
    expect(Object.isFrozen(before)).toBe(true);
    expect(before.tick).toBe(0);
  });

  it('reports the first wave once, then drains an empty list', () => {
    const sim = createSim(content, 1);
    sim.step(NO_INPUT);
    expect(sim.drainEvents()).toEqual([{ type: 'WaveStarted', level: 1, difficulty: 1 }]);
    expect(sim.drainEvents()).toHaveLength(0);
  });

  it('hash is deterministic for the same seed and inputs', () => {
    const inputs = [0, 1, 3, 0, 2];
    expect(run(42, inputs)).toBe(run(42, inputs));
    expect(run(42, inputs)).toMatch(/^[0-9a-f]{8}$/);
  });

  it('hash changes with seed, tick count and input', () => {
    const base = run(42, [0, 0]);
    expect(run(43, [0, 0])).not.toBe(base);
    expect(run(42, [0, 0, 0])).not.toBe(base);
    expect(run(42, [0, 1])).not.toBe(base);
    expect(run(42, [0, 4])).not.toBe(base);
  });
});
