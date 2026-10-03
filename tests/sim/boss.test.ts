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
  resolveCollisions,
  updateEnemyFire,
  updateGuidedBullets,
  updatePlayer,
} from '../../src/sim/systems.ts';
import { patternVelocities } from '../../src/sim/patterns.ts';
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

function launchBossPhase(phaseIndex: number) {
  const world = createWorld(bossTestContent(), 7);
  world.level = 10;
  spawnBoss(world);
  world.boss.phase = phaseIndex;
  world.boss.tellTimer = 1;
  updateEnemyFire(world);
  const phase = world.content.bosses['overlord']?.phases[phaseIndex];
  if (!phase) throw new Error('boss phase fixture missing');
  return { world, phase, bullets: world.bullets.filter((bullet) => bullet.active) };
}

function heading(vx: number, vy: number): number {
  return Math.atan2(vy, vx);
}

function angleDifference(target: number, current: number): number {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
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
  it('exposes the configured boss projectile variant in a frozen snapshot', () => {
    const { sim } = advanceToBoss();
    run(sim, 40);
    const bullet = sim
      .snapshot()
      .enemyBullets.find((candidate) => candidate.variant === 'boss_bullet');
    expect(bullet).toBeDefined();
    expect(Object.isFrozen(bullet)).toBe(true);
  });

  it('keeps form one unguided and preserves forms two and three launch patterns', () => {
    const first = launchBossPhase(0);
    const firstVelocity = first.bullets[0];
    if (!firstVelocity) throw new Error('form-one bullet missing');
    const before = { vx: firstVelocity.vx, vy: firstVelocity.vy };
    updateGuidedBullets(first.world);
    expect(first.bullets).toHaveLength(1);
    expect(firstVelocity.turnRateDegrees).toBe(0);
    expect(firstVelocity).toMatchObject(before);

    for (const phaseIndex of [1, 2]) {
      const { world, phase, bullets } = launchBossPhase(phaseIndex);
      const expected = patternVelocities(
        phase.pattern,
        world.boss.x,
        world.boss.y,
        world.player.x,
        world.player.y,
      );
      expect(bullets).toHaveLength(phase.pattern.count);
      expect(bullets.map(({ vx, vy }) => ({ vx, vy }))).toEqual(expected);
      expect(
        bullets.every((bullet) => bullet.turnRateDegrees === phase.projectile.turnRateDegrees),
      ).toBe(true);
      expect(bullets.every((bullet) => bullet.variant === 'boss_guided_bullet')).toBe(true);
    }
  });

  it('curves guided bullets by no more than their configured turn rate without changing speed', () => {
    const { world, phase, bullets } = launchBossPhase(1);
    const before = bullets.map((bullet) => ({
      heading: heading(bullet.vx, bullet.vy),
      speed: Math.hypot(bullet.vx, bullet.vy),
    }));

    updateGuidedBullets(world);

    const maximum = (phase.projectile.turnRateDegrees * Math.PI) / 180;
    const target = heading(world.player.x - world.boss.x, world.player.y - world.boss.y);
    bullets.forEach((bullet, index) => {
      const initial = before[index];
      if (!initial) throw new Error('initial guided velocity missing');
      expect(
        Math.abs(angleDifference(heading(bullet.vx, bullet.vy), initial.heading)),
      ).toBeLessThanOrEqual(maximum + 1e-12);
      expect(Math.hypot(bullet.vx, bullet.vy)).toBeCloseTo(initial.speed, 12);
      expect(Math.abs(angleDifference(target, heading(bullet.vx, bullet.vy)))).toBeLessThanOrEqual(
        Math.abs(angleDifference(target, initial.heading)),
      );
    });
    expect(
      bullets.some((bullet, index) => heading(bullet.vx, bullet.vy) !== before[index]?.heading),
    ).toBe(true);
  });

  it('expires guided bullets after their fixed lifetime without affecting non-guided bullets', () => {
    const { world, phase, bullets } = launchBossPhase(1);
    const guided = bullets[0];
    if (!guided) throw new Error('guided bullet missing');
    expect(phase.projectile.turnRateDegrees).toBe(1);
    expect(phase.projectile.lifetimeTicks).toBe(300);
    guided.vx = 0;
    guided.vy = 0;

    for (let tick = 0; tick < phase.projectile.lifetimeTicks - 1; tick += 1)
      moveMovers(world.bullets);
    expect(guided.active).toBe(true);
    moveMovers(world.bullets);
    expect(guided.active).toBe(false);

    // Confirm zero-lifetime movers retain the established off-screen-only cull behavior.
    guided.active = true;
    guided.x = 135;
    guided.y = 100;
    guided.remainingLifetimeTicks = 0;
    moveMovers(world.bullets);
    expect(guided.active).toBe(true);
  });

  it('fires one configured non-guided barrage when final-form HP crosses its threshold', () => {
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
    const barrage = world.bullets.filter((bullet) => bullet.active);
    expect(barrage).toHaveLength(phase.barrage.pattern.count);
    expect(barrage.map(({ vx, vy }) => ({ vx, vy }))).toEqual(
      patternVelocities(
        phase.barrage.pattern,
        world.boss.x,
        world.boss.y,
        world.player.x,
        world.player.y,
      ),
    );
    expect(barrage.every((bullet) => bullet.variant === 'boss_barrage_bullet')).toBe(true);
    expect(barrage.every((bullet) => bullet.turnRateDegrees === 0)).toBe(true);

    updateEnemyFire(world);
    expect(world.boss.barrageFired).toBe(true);
    expect(world.bullets.filter((bullet) => bullet.active)).toHaveLength(
      phase.barrage.pattern.count,
    );
  });

  it('resets barrage state on boss spawn and phase changes, and clears it on defeat', () => {
    const world = createWorld(bossTestContent(1), 7);
    world.level = 10;
    spawnBoss(world);
    world.boss.barrageFired = true;
    spawnBoss(world);
    expect(world.boss.barrageFired).toBe(false);

    world.boss.parts.forEach((part) => {
      part.alive = false;
    });
    world.boss.barrageFired = true;
    world.boss.hp = 1;
    updatePlayer(world, B);
    expect(world.boss.phase).toBe(1);
    expect(world.boss.barrageFired).toBe(false);

    world.boss.phase = 2;
    world.boss.hp = 1;
    const bullet = world.bullets[0];
    if (!bullet) throw new Error('bullet fixture missing');
    bullet.active = true;
    updatePlayer(world, 0);
    updatePlayer(world, B);
    expect(world.boss.active).toBe(false);
    expect(world.bullets.every((bullet) => !bullet.active)).toBe(true);
  });

  it('stops a barrage safely when the fixed bullet pool is constrained', () => {
    const world = createWorld(bossTestContent(1), 7);
    world.level = 10;
    spawnBoss(world);
    world.boss.parts.forEach((part) => {
      part.alive = false;
    });
    world.boss.phase = 2;
    world.boss.hp = 2;
    for (const bullet of world.bullets.slice(0, ENEMY_BULLET_POOL - 4)) bullet.active = true;
    const shot = world.shots[0];
    if (!shot) throw new Error('shot fixture missing');
    shot.active = true;
    shot.x = world.boss.x;
    shot.y = world.boss.y;

    resolveCollisions(world);
    expect(world.bullets.filter((bullet) => bullet.active)).toHaveLength(ENEMY_BULLET_POOL);
    expect(
      world.bullets.filter((bullet) => bullet.active && bullet.variant === 'boss_barrage_bullet'),
    ).toHaveLength(4);
  });

  it('preserves the enemy_bullet variant for normal-enemy fire', () => {
    const world = createWorld(bossTestContent(), 7);
    const enemy = world.grunts[0];
    if (!enemy) throw new Error('enemy fixture missing');
    enemy.entryTimer = 0;
    enemy.tellTimer = 1;
    updateEnemyFire(world);
    expect(world.bullets.filter((bullet) => bullet.active).map((bullet) => bullet.variant)).toEqual(
      ['enemy_bullet'],
    );
  });

  it('produces identical variant-aware hashes for equal content, seed, and input', () => {
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
      world.boss.phase = 2;
      world.boss.fireTimer = 0;
      let peakBullets = 0;

      for (let tick = 0; tick < 10_000; tick += 1) {
        world.tick += 1;
        updateGuidedBullets(world);
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
