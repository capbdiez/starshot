/**
 * Versioned G3 raster recipes. Category modules preserve the sprite-key/clip contract consumed by
 * `build-art.ts`, which continues to emit Aseprite-compatible sheets for the existing atlas path.
 */
import { BOSS_ART } from './boss-recipes.ts';
import { ENEMY_ART } from './enemy-recipes.ts';
import { PLAYER_ART } from './player-recipes.ts';
import { PROJECTILE_ART } from './projectile-recipes.ts';
import type { RecipeRecord, SpriteArt } from './recipe-types.ts';

/** Recipe manifest: stable IDs, versions, seeds, and intended raster detail for review/reproduction. */
export const RECIPE_METADATA: readonly RecipeRecord[] = [
  { id: 'player_ship', version: 1, seed: 0x501, detailScale: 2 },
  { id: 'enemy_roster', version: 1, seed: 0xe301, detailScale: 2 },
  { id: 'boss_parts', version: 1, seed: 0xb055, detailScale: 2 },
  { id: 'projectiles_pickup', version: 1, seed: 0xa11, detailScale: 1 },
  { id: 'explosion_fx', version: 1, seed: 0xf10, detailScale: 2 },
];

/** Combined sprite key → clip → frames used by the stable export contract. */
export const SPRITE_ART: SpriteArt = {
  ...PLAYER_ART,
  ...ENEMY_ART,
  ...BOSS_ART,
  ...PROJECTILE_ART,
};
