import { describe, expect, it } from 'vitest';
import { findPaletteViolations, parsePalette } from '../../tools/lib/palette.ts';
import { readFileSync } from 'node:fs';
import { PATHS } from '../../tools/lib/repo.ts';
import { BOSS_ART } from '../../tools/art/boss-recipes.ts';
import { ENEMY_ART } from '../../tools/art/enemy-recipes.ts';
import { PLAYER_ART } from '../../tools/art/player-recipes.ts';
import { PROJECTILE_ART } from '../../tools/art/projectile-recipes.ts';
import { RECIPE_METADATA } from '../../tools/art/sprites.ts';
import {
  glowMask,
  materialNoise,
  ramp,
  RasterCanvas,
  seededNoise,
} from '../../tools/art/toolkit.ts';

const palette = new Set(parsePalette(readFileSync(PATHS.palette, 'utf8')));

describe('G3 raster-art toolkit', () => {
  it('is deterministic for identical recipe inputs', () => {
    const build = () =>
      materialNoise(new RasterCanvas(7, 5).fillRect(2, 1, 3, 3, 'C'), 42, 'C', 'c').image(2);
    const first = build();
    const second = build();
    expect(Buffer.from(first.data).equals(Buffer.from(second.data))).toBe(true);
    expect(seededNoise(42, 3, 4)).toBe(seededNoise(42, 3, 4));
  });

  it('builds mirrored, outlined, dithered palette-safe 2× raster output', () => {
    const canvas = new RasterCanvas(7, 5)
      .set(3, 1, 'C')
      .set(2, 2, 'C')
      .set(3, 2, 'C')
      .mirrorVertical('C', 3)
      .outline('C', 'B')
      .dither(2, 1, 3, 2, ['C', 'c']);
    expect(canvas.grid()).toEqual(['...B...', '..cCc..', '.BCcCB.', '..BBB..', '.......']);
    const image = canvas.image(2);
    expect([image.width, image.height]).toEqual([14, 10]);
    expect(findPaletteViolations(image, palette)).toEqual([]);
  });

  it('records versioned recipe inputs and uses bounded palette ramps and opaque glow masks', () => {
    expect(RECIPE_METADATA.every((recipe) => recipe.version > 0 && recipe.seed >= 0)).toBe(true);
    expect(RECIPE_METADATA.some((recipe) => recipe.detailScale === 2)).toBe(true);
    expect(ramp(['B', 'b', 'C'], -1)).toBe('B');
    expect(ramp(['B', 'b', 'C'], 9)).toBe('C');
    expect(glowMask(['...', '.C.', '...'], 'C', 'c')).toEqual(['.c.', 'cCc', '.c.']);
  });

  it('uses purpose-built G4 combat silhouettes while preserving animation contracts', () => {
    const player = PLAYER_ART.player_ship;
    const projectileRecipe = RECIPE_METADATA.find((recipe) => recipe.id === 'projectiles_pickup');
    const playerRecipe = RECIPE_METADATA.find((recipe) => recipe.id === 'player_ship');
    if (!player || !projectileRecipe || !playerRecipe) throw new Error('G4 recipes are missing');

    const idle = player.idle;
    const bankLeft = player.bank_left;
    const bankRight = player.bank_right;
    const death = player.death;
    const shot = PROJECTILE_ART.player_shot?.idle;
    const hostile = PROJECTILE_ART.enemy_bullet?.idle;
    const pickup = PROJECTILE_ART.pickup_weapon?.idle;
    if (!idle || !bankLeft || !bankRight || !death || !shot || !hostile || !pickup)
      throw new Error('G4 animation clips are missing');

    expect(bankLeft).not.toEqual(idle);
    expect(bankRight).not.toEqual(idle);
    expect(bankLeft).not.toEqual(bankRight);
    expect(death).toHaveLength(8);
    expect(death[0]).not.toEqual(death[7]);
    expect(playerRecipe.version).toBe(2);
    expect(projectileRecipe.version).toBe(3);
    expect(projectileRecipe.detailScale).toBe(2);

    const playerPixels = idle[0]?.join('') ?? '';
    const shotPixels = shot[0]?.join('') ?? '';
    const hostilePixels = hostile[0]?.join('') ?? '';
    const pickupPixels = pickup[2]?.join('') ?? '';
    expect(playerPixels).toMatch(/[cCbBW]/);
    expect(shotPixels).toMatch(/[cCbBW]/);
    expect(hostilePixels).toMatch(/[pP]/);
    expect(pickupPixels).toMatch(/[Y]/);
    expect(pickupPixels).toMatch(/[B]/);

    const pickupBounds = pickup.map((frame) => {
      const pixels = frame.flatMap((row, y) =>
        Array.from(row, (pixel, x) => (pixel === '.' ? undefined : ([x, y] as const))).filter(
          (point): point is readonly [number, number] => point !== undefined,
        ),
      );
      return {
        left: Math.min(...pixels.map(([x]) => x)),
        right: Math.max(...pixels.map(([x]) => x)),
        top: Math.min(...pixels.map(([, y]) => y)),
        bottom: Math.max(...pixels.map(([, y]) => y)),
      };
    });
    expect(pickupBounds).toEqual(Array.from({ length: 4 }, () => pickupBounds[0]));
  });

  it('uses distinct G5 enemy material families, visible tells, and seeded debris', () => {
    const roster = ['enemy_grunt', 'enemy_swooper', 'enemy_tank', 'enemy_elite'] as const;
    const recipe = RECIPE_METADATA.find((entry) => entry.id === 'enemy_roster');
    if (!recipe) throw new Error('G5 enemy recipe is missing');
    const idleFrames = roster.map((key) => ENEMY_ART[key]?.idle?.[0]?.join('') ?? '');
    expect(new Set(idleFrames).size).toBe(roster.length);
    expect(recipe.version).toBe(2);
    for (const key of roster) {
      const art = ENEMY_ART[key];
      const idle = art?.idle;
      const tell = art?.attack_tell;
      const death = art?.death;
      if (!idle || !tell || !death) throw new Error(`${key} G5 clips are missing`);
      expect(tell[0]).not.toEqual(idle[0]);
      expect(death[0]).not.toEqual(death[death.length - 1]);
      expect(death.flat().join('')).toMatch(/[WY]/);
    }
  });

  it('keeps the G5 boss modular while using part-specific destruction debris', () => {
    const recipe = RECIPE_METADATA.find((entry) => entry.id === 'boss_parts');
    const core = BOSS_ART.boss_core;
    const wing = BOSS_ART.boss_wing;
    const cannon = BOSS_ART.boss_cannon;
    if (!recipe || !core || !wing || !cannon) throw new Error('G5 boss recipes are missing');
    expect(recipe.version).toBe(2);
    expect(core.attack_tell?.[0]).not.toEqual(core.idle?.[0]);
    expect(core.death).toHaveLength(8);
    expect(wing.death).toHaveLength(6);
    expect(cannon.death).toHaveLength(6);
    expect(wing.death?.[0]).not.toEqual(cannon.death?.[0]);
    expect(core.death?.[0]?.join('')).toMatch(/[VvMP]/);
    expect(cannon.death?.[0]?.join('')).toMatch(/[OoyYM]/);
  });
});
