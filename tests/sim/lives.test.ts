import { describe, expect, it } from 'vitest';
import { createSim } from '../../src/sim/index.ts';
import { contentWith, F, L, ofType, realContent, run } from './helpers.ts';

const rules = realContent.gameplay;
const deadly = contentWith((g) => {
  g['enemyFire'] = { minIntervalTicks: 1, maxIntervalTicks: 1, aimChance: 1 };
});

describe('waves', () => {
  it('starts the first data-defined stage', () => {
    const sim = createSim(
      contentWith(() => undefined),
      1,
    );
    expect(ofType(run(sim, 1), 'WaveStarted').map((event) => event.wave)).toContain(1);
    expect(sim.snapshot().grunts).toHaveLength(10);
  });
});

describe('lives, respawn and game over', () => {
  it('loses one life per hit and respawns', () => {
    const events = run(createSim(deadly, 1), 1200);
    expect(ofType(events, 'PlayerRespawned').length).toBeGreaterThan(0);
    expect(
      ofType(events, 'PlayerHit')
        .map((h) => h.livesLeft)
        .slice(0, 3),
    ).toEqual([2, 1, 0]);
  });

  it('is invulnerable right after respawning', () => {
    const sim = createSim(deadly, 1);
    for (let i = 0; i < 600; i += 1) {
      sim.step(0);
      if (sim.drainEvents().some((e) => e.type === 'PlayerRespawned')) break;
    }
    expect(sim.snapshot().player.invulnerable).toBe(true);
    expect(ofType(run(sim, rules.player.invulnerableTicks - 1), 'PlayerHit')).toHaveLength(0);
  });

  it('0 lives → game over → restarts with full lives within 2 s', () => {
    const sim = createSim(deadly, 1);
    let overTick = -1;
    for (let tick = 1; tick <= 2000; tick += 1) {
      sim.step(0);
      const events = sim.drainEvents();
      if (events.some((e) => e.type === 'GameOver')) overTick = tick;
      if (events.some((e) => e.type === 'GameRestarted')) {
        expect(overTick).toBeGreaterThan(0);
        expect(tick - overTick).toBeLessThanOrEqual(120);
        expect(sim.snapshot().lives).toBe(rules.player.lives);
        expect(sim.snapshot().phase).toBe('playing');
        expect(sim.snapshot().wave).toBe(1);
        return;
      }
    }
    throw new Error('never restarted');
  });

  it('ignores input during game over', () => {
    const sim = createSim(deadly, 1);
    for (let i = 0; i < 2000 && sim.snapshot().phase !== 'gameOver'; i += 1) run(sim, 1);
    expect(sim.snapshot().phase).toBe('gameOver');
    const x = sim.snapshot().player.x;
    expect(ofType(run(sim, 5, L | F), 'PlayerFired')).toHaveLength(0);
    expect(sim.snapshot().player.x).toBe(x);
  });
});
