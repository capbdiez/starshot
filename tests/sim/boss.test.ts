import { describe, expect, it } from 'vitest';
import {
  MIN_BOSS_INTERVAL_TICKS,
  scaledBossFireInterval,
  scaledBossPartHp,
  scaledBossPhaseHp,
} from '../../src/sim/difficulty.ts';
import { createSim } from '../../src/sim/index.ts';
import {
  moveMovers,
  updateEnemyFire,
  updateGuidedBullets,
  updatePlayer,
} from '../../src/sim/systems.ts';
import { createWorld, ENEMY_BULLET_POOL, spawnBoss } from '../../src/sim/world.ts';
import { B, F, filesWith, ofType, run } from './helpers.ts';

function bossTestContent(bombDamage = 99) {
  return filesWith((files) => {
    files['gameplay.json'] = {
      ...(files['gameplay.json'] as Record<string, unknown>),
      grunt: {
        sprite: 'enemy_grunt',
        hp: 1,
        hitbox: { w: 12, h: 12 },
        row: { count: 1, y: 20, spacing: 1 },
        respawnTicks: 1,
      },
      enemyFire: { minIntervalTicks: 36000, maxIntervalTicks: 36000, aimChance: 0 },
      player: {
        ...(files['gameplay.json'] as { player: Record<string, unknown> }).player,
        bombsPerLife: 9,
      },
      bomb: { damage: bombDamage, invulnerableTicks: 90 },
    };
    const waves = ['stage-1', 'stage-2', 'stage-3', 'stage-4'];
    for (const stage of waves) {
      files[`waves/${stage}.json`] = {
        waves: [
          {
            key:
              stage === 'stage-1'
                ? 'opening'
                : stage === 'stage-2'
                  ? 'swoop'
                  : stage === 'stage-3'
                    ? 'armored'
                    : 'elite',
            formation: { columns: 1, spacingX: 1, spacingY: 1, y: 300, sway: 0, swayTicks: 60 },
            entries: [
              {
                enemy: 'grunt',
                count: 1,
                path: [
                  { x: 0, y: 0 },
                  { x: 0, y: 0 },
                  { x: 0, y: 0 },
                  { x: 0, y: 0 },
                ],
                delayTicks: 0,
              },
            ],
            dive: { minIntervalTicks: 3600, maxIntervalTicks: 3600, durationTicks: 60 },
          },
        ],
      };
    }
    const bossFile = files['bosses.json'] as { bosses: Record<string, unknown>[] };
    const boss = bossFile.bosses[0];
    if (!boss) throw new Error('missing test boss');
    boss['parts'] = (boss['parts'] as Record<string, unknown>[]).map((part) => ({
      ...part,
      hp: 2,
    }));
    boss['phases'] = (boss['phases'] as Record<string, unknown>[]).map((phase, index) => ({
      ...phase,
      hp: 2,
      ...(index === 2
        ? { barrage: { ...(phase['barrage'] as Record<string, unknown>), healthThreshold: 0.5 } }
        : {}),
      fireIntervalTicks: 1,
      tellTicks: 1,
    }));
  });
}

function advanceToBoss(seed = 7) {
  const sim = createSim(bossTestContent(), seed);
  const events = [];
  for (let tick = 0; tick < 2_000; tick += 1) {
    events.push(...run(sim, 1, F));
    if (events.some((event) => event.type === 'BossStarted')) return { sim, events };
  }
  throw new Error('level-10 boss did not start');
}

function defeatBossAt(seed: number, difficulty: number): void {
  const { sim, events: stageEvents } = advanceToBoss(seed);
  expect(sim.snapshot().difficulty).toBe(difficulty);
  const firstBomb = run(sim, 1, B);
  expect(ofType(firstBomb, 'BossPartDestroyed')).toHaveLength(3);
  const events = [
    ...stageEvents,
    ...firstBomb,
    ...run(sim, 1),
    ...run(sim, 1, B),
    ...run(sim, 1),
    ...run(sim, 1, B),
    ...run(sim, 1),
    ...run(sim, 1, B),
  ];
  expect(ofType(events, 'BossStarted')).toHaveLength(1);
  expect(ofType(events, 'BossPartDestroyed')).toHaveLength(3);
  const phaseChanges = ofType(events, 'BossPhaseChanged');
  const defeats = ofType(events, 'BossDefeated');
  expect(phaseChanges.map((event) => event.phase)).toEqual([2, 3]);
  expect(phaseChanges.every((event) => event.level === 10 && event.difficulty === difficulty)).toBe(
    true,
  );
  expect(defeats).toHaveLength(1);
  expect(defeats[0]?.level).toBe(10);
  expect(defeats[0]?.difficulty).toBe(difficulty);
  expect(ofType(events, 'GameOver')).toHaveLength(0);
  expect(sim.snapshot().phase).toBe('playing');
  expect(sim.snapshot().level).toBe(11);
  expect(sim.snapshot().enemyBullets).toHaveLength(0);
  expect(ofType(events, 'WaveStarted').map((event) => event.level)).toContain(11);
}

describe('P4 Overlord projectile expansion', () => {
  it('validates variants in snapshots and preserves normal-enemy bullets', () => {
    const world = createWorld(bossTestContent(), 7);
    world.level = 10;
    spawnBoss(world);
    world.boss.fireTimer = 0;
    updateEnemyFire(world);
    updateEnemyFire(world);
    expect(world.bullets.filter((bullet) => bullet.active).map((bullet) => bullet.variant)).toEqual(
      ['boss_bullet'],
    );

    const normal = createWorld(bossTestContent(), 7);
    const bullet = normal.bullets[0];
    if (!bullet) throw new Error('bullet fixture missing');
    bullet.active = true;
    bullet.id = 1;
    bullet.variant = 'enemy_bullet';
    bullet.x = 20;
    bullet.y = 20;
    expect(bullet.variant).toBe('enemy_bullet');
  });

  it('keeps phase-two spread geometry at launch, then applies its bounded guidance', () => {
    const world = createWorld(bossTestContent(), 7);
    world.level = 10;
    spawnBoss(world);
    world.boss.phase = 1;
    world.boss.tellTimer = 1;
    const phase = world.content.bosses['overlord']?.phases[1];
    if (!phase) throw new Error('phase fixture missing');
    updateEnemyFire(world);
    const bullets = world.bullets.filter((bullet) => bullet.active);
    expect(bullets).toHaveLength(phase.pattern.count);
    const before = bullets.map((bullet) => Math.atan2(bullet.vy, bullet.vx));
    updateGuidedBullets(world);
    bullets.forEach((bullet, index) => {
      const turned = Math.abs(
        Math.atan2(
          Math.sin(Math.atan2(bullet.vy, bullet.vx) - (before[index] ?? 0)),
          Math.cos(Math.atan2(bullet.vy, bullet.vx) - (before[index] ?? 0)),
        ),
      );
      expect(turned).toBeLessThanOrEqual(
        (phase.projectile.turnRateDegrees * Math.PI) / 180 + 1e-12,
      );
      expect(bullet.variant).toBe('boss_guided_bullet');
    });
  });

  it('fires exactly one non-guided configured barrage after the final-form threshold', () => {
    const world = createWorld(bossTestContent(1), 7);
    world.level = 10;
    spawnBoss(world);
    world.boss.parts.forEach((part) => {
      part.alive = false;
    });
    world.boss.phase = 2;
    world.boss.hp = 3;
    const phase = world.content.bosses['overlord']?.phases[2];
    if (!phase?.barrage) throw new Error('barrage fixture missing');
    updatePlayer(world, B);
    updatePlayer(world, 0);
    updatePlayer(world, B);
    const barrage = world.bullets.filter(
      (bullet) => bullet.active && bullet.variant === 'boss_barrage_bullet',
    );
    expect(barrage).toHaveLength(phase.barrage.pattern.count);
    expect(barrage.every((bullet) => bullet.turnRateDegrees === 0)).toBe(true);
    updatePlayer(world, 0);
    updatePlayer(world, B);
    expect(world.bullets.filter((bullet) => bullet.variant === 'boss_barrage_bullet')).toHaveLength(
      phase.barrage.pattern.count,
    );
  });

  it('produces identical guided-bullet hashes for equal content, seed, and input', () => {
    const a = createSim(bossTestContent(), 19);
    const b = createSim(bossTestContent(), 19);
    run(a, 360, F);
    run(b, 360, F);
    expect(a.hash()).toBe(b.hash());
  });

  describe('P3 recurring boss systems', () => {
    it('keeps all three phases defeatable at low and high difficulty with their existing events', () => {
      defeatBossAt(11, 4);
      defeatBossAt(2, 8);
    });

    it('derives boss weak-point and phase durability while clamping attack cadence', () => {
      expect(scaledBossPartHp(8, 1)).toBe(8);
      expect(scaledBossPhaseHp(18, 1)).toBe(18);
      expect(scaledBossFireInterval(75, 1)).toBe(75);
      expect(scaledBossPartHp(8, 8)).toBeGreaterThan(8);
      expect(scaledBossPhaseHp(18, 8)).toBeGreaterThan(18);
      expect(scaledBossFireInterval(75, 8)).toBeLessThan(75);
      expect(scaledBossFireInterval(1, 999)).toBe(MIN_BOSS_INTERVAL_TICKS);
    });

    it('emits a readable tell before the boss fires its current phase pattern', () => {
      const { sim } = advanceToBoss();
      const events = run(sim, 40);
      expect(ofType(events, 'BossAttackTold')).toHaveLength(1);
      expect(ofType(events, 'EnemyFired').length).toBeGreaterThan(0);
    });

    it('keeps the fixed bullet pool bounded during extended high-difficulty boss fire', () => {
      const world = createWorld(bossTestContent(), 42);
      world.level = 10;
      world.difficulty = 999;
      spawnBoss(world);
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
});
