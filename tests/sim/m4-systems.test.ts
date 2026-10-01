import { describe, expect, it } from 'vitest';
import { createSim } from '../../src/sim/index.ts';
import { B, contentWith, ofType, peaceful, run } from './helpers.ts';

describe('M4 scoring, pickups, bombs and lives', () => {
  it('awards chained score and every configured extra life threshold', () => {
    const content = contentWith((g) => {
      g['scoring'] = {
        basePoints: { grunt: 10, swooper: 10, tank: 10, elite: 10 },
        chainWindowTicks: 180,
        maxMultiplier: 8,
        diveBonus: 0,
        extraLifeFirstScore: 10,
        extraLifeEveryScore: 10,
      };
      g['enemyFire'] = { minIntervalTicks: 36_000, maxIntervalTicks: 36_000, aimChance: 0 };
    });
    const events = run(createSim(content, 1), 1, B);
    expect(ofType(events, 'ScoreAwarded').map((event) => event.multiplier)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 8, 8,
    ]);
    expect(ofType(events, 'ExtraLifeAwarded')).toHaveLength(52);
  });

  it('spawns pickups, upgrades weapons through level 3, and drops a level on death', () => {
    const pickupContent = contentWith((g) => {
      g['enemyFire'] = { minIntervalTicks: 36_000, maxIntervalTicks: 36_000, aimChance: 0 };
      g['player'] = { ...g['player'], hitbox: { w: 64, h: 64 } };
      g['pickups'] = { ...g['pickups'], hitbox: { w: 64, h: 64 }, speed: 5, dropEveryKills: 1 };
    });
    const sim = createSim(pickupContent, 1);
    const bombEvents = run(sim, 1, B);
    expect(ofType(bombEvents, 'PickupSpawned')).toHaveLength(8);
    const collected = ofType(run(sim, 80), 'PickupCollected');
    expect(collected.map((event) => event.weaponLevel).slice(0, 2)).toEqual([2, 3]);
    expect(sim.snapshot().weaponLevel).toBe(3);

    const deadly = contentWith((g) => {
      g['enemyFire'] = { minIntervalTicks: 1, maxIntervalTicks: 1, aimChance: 1 };
      g['player'] = { ...g['player'], hitbox: { w: 64, h: 64 } };
      g['pickups'] = { ...g['pickups'], hitbox: { w: 64, h: 64 }, speed: 5, dropEveryKills: 1 };
    });
    const hitSim = createSim(deadly, 1);
    run(hitSim, 1, B);
    run(hitSim, 80);
    expect(hitSim.snapshot().weaponLevel).toBe(3);
    for (let i = 0; i < 600; i += 1) {
      hitSim.step(0);
      if (hitSim.drainEvents().some((event) => event.type === 'PlayerHit')) break;
    }
    expect(hitSim.snapshot().weaponLevel).toBe(2);
  });

  it('uses one bomb per press, clears bullets, damages all enemies and grants invulnerability', () => {
    const sim = createSim(peaceful, 1);
    const events = run(sim, 1, B);
    expect(ofType(events, 'BombUsed')).toMatchObject([{ enemiesHit: 10 }]);
    expect(sim.snapshot().enemyBullets).toHaveLength(0);
    expect(sim.snapshot().grunts).toHaveLength(0);
    expect(sim.snapshot().bombs).toBe(1);
    expect(sim.snapshot().player.invulnerable).toBe(true);
    expect(ofType(run(sim, 5, B), 'BombUsed')).toHaveLength(0);
  });
});
