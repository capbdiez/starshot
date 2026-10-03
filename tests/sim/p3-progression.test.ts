import { describe, expect, it } from 'vitest';
import {
  MIN_NORMAL_WAVE_INTERVAL_TICKS,
  scaledNormalEnemyHp,
  scaledNormalWaveInterval,
} from '../../src/sim/difficulty.ts';
import { moveMovers, updateEnemyFire, updateWave } from '../../src/sim/systems.ts';
import {
  advanceLevel,
  createWorld,
  ENEMY_BULLET_POOL,
  isBossLevel,
  jumpToBossLevel,
  spawnWave,
  waveForLevel,
} from '../../src/sim/world.ts';
import { createSim } from '../../src/sim/index.ts';
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

  it('starts normal encounters on levels 1–9 and 11–19, and bosses on levels 10 and 20', () => {
    const world = createWorld(realContent, 42);
    const schedule = [world.events[0]?.type ?? ''];
    for (let level = 2; level <= 20; level += 1) {
      world.waveKey = 'cleared';
      world.waveTimer = world.rules.grunt.respawnTicks - 1;
      world.boss.active = false;
      for (const enemy of world.grunts) enemy.alive = false;
      world.events.length = 0;
      updateWave(world);
      schedule.push(world.events[0]?.type ?? '');
    }

    expect(schedule).toEqual([
      'WaveStarted',
      'WaveStarted',
      'WaveStarted',
      'WaveStarted',
      'WaveStarted',
      'WaveStarted',
      'WaveStarted',
      'WaveStarted',
      'WaveStarted',
      'BossStarted',
      'WaveStarted',
      'WaveStarted',
      'WaveStarted',
      'WaveStarted',
      'WaveStarted',
      'WaveStarted',
      'WaveStarted',
      'WaveStarted',
      'WaveStarted',
      'BossStarted',
    ]);
  });

  it('schedules boss levels independently of unrelated RNG consumption', () => {
    const clean = createWorld(realContent, 42);
    const noisy = createWorld(realContent, 42);
    const cleanBossLevels: number[] = [];
    const noisyBossLevels: number[] = [];

    for (let transition = 0; transition < 99; transition += 1) {
      if (isBossLevel(clean.level)) cleanBossLevels.push(clean.level);
      if (isBossLevel(noisy.level)) noisyBossLevels.push(noisy.level);
      for (let roll = 0; roll <= transition; roll += 1) noisy.rng.nextU32();
      advanceLevel(clean);
      advanceLevel(noisy);
    }
    if (isBossLevel(clean.level)) cleanBossLevels.push(clean.level);
    if (isBossLevel(noisy.level)) noisyBossLevels.push(noisy.level);

    expect(cleanBossLevels).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    expect(noisyBossLevels).toEqual(cleanBossLevels);
  });

  it('jumps directly to the current or next boss level and starts its boss encounter', () => {
    const sim = createSim(realContent, 42);

    sim.jumpToBossLevel();
    expect(sim.snapshot().level).toBe(10);
    expect(sim.snapshot().boss).toBeDefined();
    expect(sim.drainEvents()).toContainEqual(
      expect.objectContaining({ type: 'BossStarted', level: 10 }),
    );

    sim.jumpToBossLevel();
    expect(sim.snapshot().level).toBe(10);
    expect(sim.drainEvents()).toContainEqual(
      expect.objectContaining({ type: 'BossStarted', level: 10 }),
    );

    const world = createWorld(realContent, 42);
    world.level = 14;
    jumpToBossLevel(world);
    expect(world.level).toBe(20);
    expect(world.boss.active).toBe(true);
    expect(world.events).toContainEqual(
      expect.objectContaining({ type: 'BossStarted', level: 20 }),
    );
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
    expect(scaledNormalEnemyHp(5, 1)).toBe(5);
    expect(scaledNormalWaveInterval(60, 1)).toBe(60);
    expect(scaledNormalEnemyHp(5, 12)).toBeGreaterThan(5);
    expect(scaledNormalWaveInterval(60, 12)).toBeLessThan(60);
    expect(scaledNormalWaveInterval(1, 999)).toBe(MIN_NORMAL_WAVE_INTERVAL_TICKS);
  });

  it('applies modifiers to normal waves without mutating frozen authored content', () => {
    const world = createWorld(realContent, 42);
    const baselineHp = realContent.enemies['grunt']?.hp;
    const baselineFireInterval = realContent.enemies['grunt']?.fireIntervalTicks;
    const baselineDiveInterval = realContent.waves['opening']?.dive.maxIntervalTicks;
    world.difficulty = 12;
    spawnWave(world);

    expect(world.grunts.every((enemy) => enemy.hp === scaledNormalEnemyHp(1, 12))).toBe(true);
    expect(
      world.grunts.every((enemy) => enemy.fireTimer === scaledNormalWaveInterval(120, 12)),
    ).toBe(true);
    expect(world.diveTimer).toBe(scaledNormalWaveInterval(180, 12));
    expect(realContent.enemies['grunt']?.hp).toBe(baselineHp);
    expect(realContent.enemies['grunt']?.fireIntervalTicks).toBe(baselineFireInterval);
    expect(realContent.waves['opening']?.dive.maxIntervalTicks).toBe(baselineDiveInterval);
  });

  it('keeps the fixed enemy-bullet pool bounded during an extended high-difficulty normal wave', () => {
    const world = createWorld(realContent, 42);
    world.difficulty = 999;
    spawnWave(world);
    world.diveTimer = Number.MAX_SAFE_INTEGER;
    let peakBullets = 0;

    for (let tick = 0; tick < 10_000; tick += 1) {
      world.tick += 1;
      moveMovers(world.bullets);
      updateEnemyFire(world);
      peakBullets = Math.max(peakBullets, world.bullets.filter((bullet) => bullet.active).length);
    }

    expect(peakBullets).toBeGreaterThan(0);
    expect(peakBullets).toBeLessThanOrEqual(ENEMY_BULLET_POOL);
    expect(world.bullets).toHaveLength(ENEMY_BULLET_POOL);
  });
});
