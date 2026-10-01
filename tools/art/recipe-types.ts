import type { Grid } from '../lib/pixel-art.ts';

/** Sprite key → clip → palette-grid frames, matching the content animation contract. */
export type SpriteArt = Readonly<Record<string, Readonly<Record<string, readonly Grid[]>>>>;

/** Versioned metadata recorded beside generated exports for reproducible recipe review. */
export interface RecipeRecord {
  readonly id: string;
  readonly version: number;
  readonly seed: number;
  readonly detailScale: 1 | 2;
}
