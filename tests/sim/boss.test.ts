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
      bomb: { damage: 99, invulnerableTicks: 90 },
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
  for (let tick = 0; tick < 2_000; tick += 1) {
    events.push(...run(sim, 1, F));
    if (events.some((event) => event.type === 'BossStarted')) return { sim, events };
  }
  throw new Error('level-10 boss did not start');
}

describe('P3 recurring boss systems', () => {
  it('requires parts to be destroyed before progressing through all three phases', () => {
    const { sim, events: stageEvents } = advanceToBoss();
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
    expect(phaseChanges.every((event) => event.level === 10 && event.difficulty > 0)).toBe(true);
    expect(defeats).toHaveLength(1);
    expect(defeats[0]?.level).toBe(10);
    expect(defeats[0]?.difficulty).toBeGreaterThan(0);
    expect(sim.snapshot().phase).toBe('playing');
    expect(sim.snapshot().level).toBe(11);
    expect(ofType(events, 'WaveStarted').map((event) => event.level)).toContain(11);
  });

  it('emits a readable tell before the boss fires its current phase pattern', () => {
    const { sim } = advanceToBoss();
    const events = run(sim, 40);
    expect(ofType(events, 'BossAttackTold')).toHaveLength(1);
    expect(ofType(events, 'EnemyFired').length).toBeGreaterThan(0);
  });
});
