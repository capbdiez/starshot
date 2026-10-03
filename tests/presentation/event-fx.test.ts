import { describe, expect, it } from 'vitest';
import { loadContent } from '../../src/content/index.ts';
import { hostileBulletTransform, projectileSpriteKeys } from '../../src/presentation/presenter.ts';
import { planFxBatch, reactionsFor, smooth } from '../../src/presentation/fx/event-fx.ts';
import { readContentFiles } from '../../tools/lib/repo.ts';

const fx = {
  PlayerFired: { sfx: 'sfx_shot' },
  PlayerHit: { sfx: 'sfx_explode_s', flash: true },
};

describe('event → effect mapping', () => {
  it('plays mapped SFX in order and ignores unmapped events', () => {
    const reactions = reactionsFor(fx, [
      { type: 'WaveStarted', level: 1, difficulty: 1 },
      { type: 'PlayerFired', id: 1, x: 0, y: 0 },
      { type: 'PlayerFired', id: 2, x: 0, y: 0 },
    ]);
    expect(reactions).toEqual({
      reactions: [
        { event: { type: 'PlayerFired', id: 1, x: 0, y: 0 }, entry: { sfx: 'sfx_shot' } },
        { event: { type: 'PlayerFired', id: 2, x: 0, y: 0 }, entry: { sfx: 'sfx_shot' } },
      ],
      flash: false,
    });
  });

  it('requests a flash when any event asks for one', () => {
    const reactions = reactionsFor(fx, [{ type: 'PlayerHit', x: 1, y: 2, livesLeft: 2 }]);
    expect(reactions.flash).toBe(true);
  });
});

describe('quality-tier FX planning', () => {
  const settings = { visualQuality: 'high' as const, effectsIntensity: 1, flashReduction: false };

  it('keeps gameplay tells while dropping cosmetic trails at low quality', () => {
    const reactions = reactionsFor(
      {
        EnemyFired: { effect: 'trail', particles: 12 },
        EnemyAttackTold: { effect: 'tell', particles: 8 },
      },
      [
        { type: 'EnemyFired', id: 1, x: 10, y: 20 },
        { type: 'EnemyAttackTold', id: 2, x: 30, y: 40 },
      ],
    );
    expect(planFxBatch(reactions.reactions, { ...settings, visualQuality: 'low' })).toEqual([
      expect.objectContaining({ effect: 'tell', particles: 8 }),
    ]);
    expect(planFxBatch(reactions.reactions, { ...settings, effectsIntensity: 0 })).toEqual([
      expect.objectContaining({ effect: 'tell', particles: 8 }),
    ]);
  });

  it('caps a batch at its fixed pool budget and scales reduced flashes', () => {
    const reactions = reactionsFor({ BossDefeated: { effect: 'boss', particles: 400 } }, [
      { type: 'BossDefeated', level: 10, difficulty: 1, x: 135, y: 120 },
    ]);
    expect(planFxBatch(reactions.reactions, settings, 100)).toEqual([
      expect.objectContaining({ effect: 'boss', particles: 100 }),
    ]);
    expect(planFxBatch(reactions.reactions, { ...settings, flashReduction: true }, 400)).toEqual([
      expect.objectContaining({ effect: 'boss', particles: 221 }),
    ]);
  });
});

describe('P4.4 boss projectile presentation', () => {
  const content = loadContent(readContentFiles());

  it('creates pooled presentation layers for normal and every configured boss projectile variant', () => {
    expect(projectileSpriteKeys(content)).toEqual([
      'enemy_bullet',
      'boss_bullet',
      'boss_guided_bullet',
      'boss_barrage_bullet',
    ]);
  });

  it('applies the high-contrast accessibility treatment to every hostile projectile variant', () => {
    for (const key of projectileSpriteKeys(content)) {
      expect(key).toMatch(/^(enemy|boss)_/);
      expect(hostileBulletTransform(true)).toEqual({ tint: 0xffffff, scale: 1.5 });
      expect(hostileBulletTransform(false)).toEqual({ scale: 1 });
    }
  });
});

describe('render smoothing', () => {
  it('interpolates between ticks and snaps to whole pixels', () => {
    expect(smooth(10, 20, 0)).toBe(10);
    expect(smooth(10, 20, 0.5)).toBe(15);
    expect(smooth(10, 12.5, 0.99)).toBe(12);
  });
});
