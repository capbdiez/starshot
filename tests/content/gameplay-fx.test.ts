import { describe, expect, it } from 'vitest';
import { validateContent, type RawContentFiles } from '../../src/content/index.ts';
import type { SimEventType } from '../../src/sim/index.ts';
import { readContentFiles } from '../../tools/lib/repo.ts';
import { SFX_RECIPES } from '../../tools/lib/sfx-synth.ts';

const real = readContentFiles();

function issues(files: RawContentFiles): string {
  const result = validateContent(files);
  return result.ok ? '' : result.issues.map((i) => `${i.file}: ${i.message}`).join('\n');
}

function withGameplay(patch: (g: Record<string, Record<string, unknown>>) => void) {
  const g = structuredClone(real['gameplay.json']) as Record<string, Record<string, unknown>>;
  patch(g);
  return { ...real, 'gameplay.json': g };
}

/** Exhaustive list: adding a sim event type without updating this fails typecheck. */
const EVENT_TYPES: Record<SimEventType, true> = {
  PlayerFired: true,
  EnemyFired: true,
  EnemyAttackTold: true,
  EnemyHit: true,
  EnemyKilled: true,
  PlayerHit: true,
  PlayerRespawned: true,
  WaveStarted: true,
  GameOver: true,
  PickupSpawned: true,
  PickupCollected: true,
  BombUsed: true,
  ScoreAwarded: true,
  ExtraLifeAwarded: true,
  GameRestarted: true,
};

describe('gameplay.json', () => {
  it('is required', () => {
    const rest = Object.fromEntries(Object.entries(real).filter(([f]) => f !== 'gameplay.json'));
    expect(issues(rest)).toMatch(/gameplay\.json: required file is missing/);
  });

  it('rejects a sprite reference that is not defined in animations', () => {
    const bad = withGameplay((g) => {
      g['grunt'] = { ...g['grunt'], sprite: 'enemy_ghost' };
    });
    expect(issues(bad)).toMatch(/grunt\.sprite: sprite "enemy_ghost" is not defined/);
  });

  it('rejects malformed M4 tuning values', () => {
    expect(
      issues(
        withGameplay((g) => {
          g['bomb'] = { damage: 0, invulnerableTicks: 1 };
        }),
      ),
    ).toMatch(/bomb.damage/);
    expect(
      issues(
        withGameplay((g) => {
          g['player'] = { ...g['player'], weaponLevels: [] };
        }),
      ),
    ).toMatch(/weaponLevels/);
  });

  it('rejects out-of-range numbers and unknown keys', () => {
    expect(
      issues(
        withGameplay((g) => {
          g['player'] = { ...g['player'], lives: 0 };
        }),
      ),
    ).toMatch(/player\.lives/);
    expect(
      issues(
        withGameplay((g) => {
          g['player'] = { ...g['player'], speeed: 1 };
        }),
      ),
    ).not.toBe('');
  });

  it('rejects an inverted enemy fire interval and a row wider than the screen', () => {
    expect(
      issues(
        withGameplay((g) => {
          g['enemyFire'] = { minIntervalTicks: 60, maxIntervalTicks: 30, aimChance: 0 };
        }),
      ),
    ).toMatch(/minIntervalTicks must be <= maxIntervalTicks/);
    expect(
      issues(
        withGameplay((g) => {
          g['grunt'] = { ...g['grunt'], row: { count: 16, y: 80, spacing: 40 } };
        }),
      ),
    ).toMatch(/does not fit/);
  });

  it('keeps the game-over restart within the 2 s acceptance limit', () => {
    expect(
      issues(
        withGameplay((g) => {
          g['gameOverTicks'] = 121 as unknown as Record<string, unknown>;
        }),
      ),
    ).toMatch(/gameOverTicks/);
  });
});

describe('fx event map', () => {
  const result = validateContent(real);
  if (!result.ok) throw new Error('content invalid');
  const { fx } = result.content;

  it('only maps real sim event types', () => {
    for (const event of Object.keys(fx)) expect(EVENT_TYPES).toHaveProperty(event);
  });

  it('only plays SFX that exist in the audio sprite', () => {
    for (const entry of Object.values(fx)) {
      if (entry.sfx !== undefined) expect(SFX_RECIPES).toHaveProperty(entry.sfx);
    }
  });

  it('maps the three M1 sounds', () => {
    expect(fx['PlayerFired']?.sfx).toBe('sfx_shot');
    expect(fx['EnemyHit']?.sfx).toBe('sfx_hit');
    expect(fx['EnemyKilled']?.sfx).toBe('sfx_explode_s');
  });

  it('rejects malformed entries and duplicate events across files', () => {
    expect(issues({ ...real, 'fx/x.json': { events: { PlayerFired: { sfx: 'boom' } } } })).toMatch(
      /fx\/x\.json/,
    );
    expect(issues({ ...real, 'fx/x.json': { events: { PlayerFired: {} } } })).toMatch(
      /duplicate fx entry for event "PlayerFired"/,
    );
  });
});
