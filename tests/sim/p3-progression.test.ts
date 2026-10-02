import { describe, expect, it } from 'vitest';
import {
  createWorld,
  advanceLevel,
  scaledHp,
  scaledInterval,
  waveForLevel,
} from '../../src/sim/world.ts';
import { realContent } from './helpers.ts';

describe('P3 endless progression', () => {
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
    expect(difficulties.slice(0, 16)).toEqual([1, 2, 2, 2, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5]);
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
