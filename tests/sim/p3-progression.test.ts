import { describe, expect, it } from 'vitest';
import { createSim } from '../../src/sim/index.ts';
import {
  createWorld,
  advanceLevel,
  scaledHp,
  scaledInterval,
  waveForLevel,
} from '../../src/sim/world.ts';
import { B, contentWith, ofType, realContent, run } from './helpers.ts';

const rapidProgressionContent = contentWith((gameplay) => {
  gameplay['grunt'] = {
    ...(gameplay['grunt'] ?? {}),
    respawnTicks: 1,
  };
  gameplay['player'] = {
    ...(gameplay['player'] ?? {}),
    bombsPerLife: 9,
  };
  gameplay['bomb'] = {
    ...(gameplay['bomb'] ?? {}),
    damage: 99,
  };
});

function clearNormalLevels(seed: number): {
  readonly levels: readonly number[];
  readonly hashes: readonly string[];
} {
  const sim = createSim(rapidProgressionContent, seed);
  const levels = ofType(run(sim, 1), 'WaveStarted').map((event) => event.level);
  const hashes = [sim.hash()];

  for (let level = 1; level < 6; level += 1) {
    levels.push(...ofType(run(sim, 1, B), 'WaveStarted').map((event) => event.level));
    hashes.push(sim.hash());
    run(sim, 1);
    hashes.push(sim.hash());
  }

  expect(sim.snapshot()).toMatchObject({ level: 6, phase: 'playing' });
  return { levels, hashes };
}

describe('P3 endless progression', () => {
  it('continues through level 6 in playing phase and retains deterministic hashes', () => {
    const left = clearNormalLevels(42);
    const right = clearNormalLevels(42);

    expect(left.levels).toEqual([1, 2, 3, 4, 5, 6]);
    expect(left.hashes).toEqual(right.hashes);
  });

  it('cycles authored normal templates and reserves every tenth level for a boss', () => {
    const world = createWorld(realContent, 42);
    const templates: string[] = [];
    for (let level = 1; level <= 20; level += 1) {
      world.level = level;
      if (level % 10 !== 0) templates.push(waveForLevel(world)?.key ?? '');
    }
    expect(templates).toEqual([
      'opening',
      'swoop',
      'armored',
      'elite',
      'opening',
      'swoop',
      'armored',
      'elite',
      'opening',
      'swoop',
      'armored',
      'elite',
      'opening',
      'swoop',
      'armored',
      'elite',
      'opening',
      'swoop',
    ]);
  });

  it('uses one deterministic 50/50 roll per level transition and never lowers difficulty', () => {
    const left = createWorld(realContent, 99);
    const right = createWorld(realContent, 99);
    const difficulties: number[] = [];
    for (let transition = 0; transition < 100; transition += 1) {
      const previous = left.difficulty;
      advanceLevel(left);
      advanceLevel(right);
      difficulties.push(left.difficulty);
      expect(left.difficulty - previous).toBeLessThanOrEqual(1);
      expect(left.difficulty).toBeGreaterThanOrEqual(previous);
      expect(left.difficulty).toBe(right.difficulty);
      expect(left.level).toBe(right.level);
    }
    expect(new Set(difficulties).size).toBeGreaterThan(1);
  });

  it('preserves difficulty-one tuning and clamps high-difficulty timing safely', () => {
    expect(scaledHp(5, 1)).toBe(5);
    expect(scaledInterval(60, 1, 18)).toBe(60);
    expect(scaledHp(5, 12)).toBeGreaterThan(5);
    expect(scaledInterval(60, 12, 18)).toBeLessThan(60);
    expect(scaledInterval(1, 999, 18)).toBe(18);
  });
});
