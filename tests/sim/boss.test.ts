import { describe, expect, it } from 'vitest';
import { createSim } from '../../src/sim/index.ts';
import { B, F, filesWith, ofType, run } from './helpers.ts';

function bossTestContent() {
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
      bomb: { damage: 1, invulnerableTicks: 90 },
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
    boss['phases'] = (boss['phases'] as Record<string, unknown>[]).map((phase) => ({
      ...phase,
      hp: 2,
      fireIntervalTicks: 1,
      tellTicks: 1,
    }));
  });
}

function advanceToBoss() {
  const sim = createSim(bossTestContent(), 7);
  const events = [];
  for (let stage = 0; stage < 4; stage += 1) {
    events.push(...run(sim, 35, F), ...run(sim, 2));
  }
  return { sim, events };
}

describe('M6 boss and full-run systems', () => {
  it('requires parts to be destroyed before progressing through all three phases', () => {
    const { sim, events: stageEvents } = advanceToBoss();
    const firstBomb = run(sim, 1, B);
    expect(ofType(firstBomb, 'BossPartDestroyed')).toHaveLength(0);
    const events = [
      ...stageEvents,
      ...firstBomb,
      ...run(sim, 1),
      ...run(sim, 1, B),
      ...run(sim, 1),
      ...run(sim, 1, B),
      ...run(sim, 1),
      ...run(sim, 1, B),
      ...run(sim, 1),
      ...run(sim, 1, B),
      ...run(sim, 1),
      ...run(sim, 1, B),
      ...run(sim, 1),
      ...run(sim, 1, B),
      ...run(sim, 1),
      ...run(sim, 1, B),
    ];
    expect(ofType(events, 'BossStarted')).toHaveLength(1);
    expect(ofType(events, 'BossPartDestroyed')).toHaveLength(3);
    expect(ofType(events, 'BossPhaseChanged').map((event) => event.phase)).toEqual([2, 3]);
    expect(ofType(events, 'BossDefeated')).toHaveLength(1);
    expect(ofType(events, 'RunCompleted')).toHaveLength(1);
    expect(sim.snapshot().phase).toBe('completed');
    expect(sim.hash()).toBe('913bc1a8');
  });

  it('emits a readable tell before the boss fires its current phase pattern', () => {
    const { sim } = advanceToBoss();
    const events = run(sim, 3);
    expect(ofType(events, 'BossAttackTold')).toHaveLength(1);
    expect(ofType(events, 'EnemyFired').length).toBeGreaterThan(0);
  });
});
