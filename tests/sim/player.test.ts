import { describe, expect, it } from 'vitest';
import { GAME_WIDTH } from '../../src/shared/index.ts';
import { createSim } from '../../src/sim/index.ts';
import { contentWith, F, L, ofType, peaceful, R, realContent, run } from './helpers.ts';

const rules = realContent.gameplay;

describe('player movement', () => {
  it('moves by the configured speed per tick and ignores left+right together', () => {
    const sim = createSim(peaceful, 1);
    run(sim, 1, R);
    expect(sim.snapshot().player.x).toBe(GAME_WIDTH / 2 + rules.player.speed);
    run(sim, 1, L | R);
    expect(sim.snapshot().player.x).toBe(GAME_WIDTH / 2 + rules.player.speed);
    expect(sim.snapshot().player.dir).toBe(0);
  });

  it('is clamped to the screen edges', () => {
    const sim = createSim(peaceful, 1);
    run(sim, 200, L);
    expect(sim.snapshot().player.x).toBe(rules.player.edgeMargin);
    run(sim, 200, R);
    expect(sim.snapshot().player.x).toBe(GAME_WIDTH - rules.player.edgeMargin);
  });

  it('never moves vertically', () => {
    const sim = createSim(peaceful, 1);
    run(sim, 50, L | F);
    expect(sim.snapshot().player.y).toBe(rules.player.y);
  });
});

describe('autofire', () => {
  it('fires once per fire interval while held', () => {
    const sim = createSim(peaceful, 1);
    run(sim, 200, L);
    const fired = ofType(run(sim, rules.player.fireIntervalTicks * 3, L | F), 'PlayerFired');
    expect(fired).toHaveLength(3);
  });

  it('caps shots on screen at maxShots', () => {
    const fast = contentWith((g) => {
      g['player'] = { ...g['player'], fireIntervalTicks: 1 };
      g['enemyFire'] = { minIntervalTicks: 36_000, maxIntervalTicks: 36_000, aimChance: 0 };
    });
    const sim = createSim(fast, 1);
    run(sim, 200, L);
    run(sim, 10, L | F);
    expect(sim.snapshot().shots).toHaveLength(fast.gameplay.player.maxShots);
  });

  it('does not fire without the fire bit', () => {
    expect(ofType(run(createSim(peaceful, 1), 60), 'PlayerFired')).toHaveLength(0);
  });
});

describe('collisions', () => {
  it('player shot kills the grunt above it (shot ↔ enemy)', () => {
    const sim = createSim(peaceful, 1);
    const killed = ofType(run(sim, 120, F), 'EnemyKilled');
    expect(killed.length).toBeGreaterThan(0);
    expect(killed[0]?.kind).toBe('grunt');
    expect(sim.snapshot().grunts.length).toBeLessThan(10);
  });

  it('emits an attack tell before a roster enemy fires', () => {
    const events = run(createSim(peaceful, 1), 220);
    const tell = events.findIndex((event) => event.type === 'EnemyAttackTold');
    const fire = events.findIndex((event) => event.type === 'EnemyFired');
    expect(tell).toBeGreaterThanOrEqual(0);
    expect(fire).toBeGreaterThan(tell);
  });

  it('enemy bullet kills the player (bullet ↔ player)', () => {
    const deadly = contentWith((g) => {
      g['enemyFire'] = { minIntervalTicks: 1, maxIntervalTicks: 1, aimChance: 1 };
    });
    const sim = createSim(deadly, 1);
    const hits = ofType(run(sim, 420), 'PlayerHit');
    expect(hits[0]).toMatchObject({ livesLeft: rules.player.lives - 1 });
  });

  it('reports the configured Grunt roster in the first stage', () => {
    const roster = createSim(peaceful, 1).snapshot().grunts;
    expect(roster).toHaveLength(10);
    expect(roster.every((enemy) => enemy.kind === 'grunt')).toBe(true);
  });
});
