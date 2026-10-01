import { z } from 'zod';
import { patternSchema } from './enemies.ts';
import { SPRITE_KEY_PATTERN } from './sprites.ts';

const key = z.string().regex(/^[a-z][a-z0-9-]*$/, 'must be a lower-case kebab-case key');
const sprite = z.string().regex(SPRITE_KEY_PATTERN, 'must be a sprite key');
const hitbox = z.strictObject({ w: z.int().min(1).max(96), h: z.int().min(1).max(64) });

const partSchema = z.strictObject({
  key,
  sprite,
  hp: z.int().min(1).max(99),
  hitbox,
  offset: z.strictObject({ x: z.number().min(-96).max(96), y: z.number().min(-64).max(64) }),
});

const phaseSchema = z.strictObject({
  hp: z.int().min(1).max(999),
  pattern: patternSchema,
  tellTicks: z.int().min(1).max(3600),
  fireIntervalTicks: z.int().min(1).max(3600),
});

/** Schema for data-defined multi-part bosses. */
export const bossSchema = z.strictObject({
  key,
  sprite,
  x: z.number().min(0).max(270),
  y: z.number().min(0).max(240),
  hitbox,
  parts: z.array(partSchema).min(1).max(8),
  phases: z.array(phaseSchema).length(3),
});

export const bossFileSchema = z.strictObject({ bosses: z.array(bossSchema).min(1) });
export type BossSpec = z.infer<typeof bossSchema>;
export type BossPartSpec = z.infer<typeof partSchema>;
