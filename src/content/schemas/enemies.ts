import { z } from 'zod';
import { SPRITE_KEY_PATTERN } from './sprites.ts';

const key = z.string().regex(/^[a-z][a-z0-9-]*$/, 'must be a lower-case kebab-case key');
const sprite = z.string().regex(SPRITE_KEY_PATTERN, 'must be a sprite key');
const ticks = z.int().min(15).max(3600);
const hitbox = z.strictObject({ w: z.int().min(1).max(64), h: z.int().min(1).max(64) });

export const patternSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('aimed'),
    speed: z.number().positive().max(16),
    count: z.literal(1),
  }),
  z.strictObject({
    type: z.literal('spread'),
    speed: z.number().positive().max(16),
    count: z.int().min(2).max(12),
    angle: z.number().positive().max(180),
  }),
  z.strictObject({
    type: z.literal('ring'),
    speed: z.number().positive().max(16),
    count: z.int().min(3).max(24),
  }),
  z.strictObject({
    type: z.literal('burst'),
    speed: z.number().positive().max(16),
    count: z.int().min(2).max(12),
    intervalTicks: z.int().min(1).max(120),
  }),
]);

export const enemySchema = z.strictObject({
  key,
  sprite,
  hp: z.int().min(1).max(99),
  hitbox,
  pattern: key,
  tellTicks: ticks,
  fireIntervalTicks: z.int().min(1).max(3600),
});

export const enemyFileSchema = z.strictObject({ enemies: z.array(enemySchema).min(1) });
export const patternFileSchema = z.strictObject({
  patterns: z.record(key, patternSchema).refine((v) => Object.keys(v).length > 0),
});
export type EnemySpec = z.infer<typeof enemySchema>;
export type BulletPattern = z.infer<typeof patternSchema>;
