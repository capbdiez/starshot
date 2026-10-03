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

const projectileVariantSchema = z.enum([
  'boss_bullet',
  'boss_guided_bullet',
  'boss_barrage_bullet',
]);

const projectileSchema = z.strictObject({
  variant: projectileVariantSchema,
  /** Maximum deterministic change in heading per simulation tick. Zero disables guidance. */
  turnRateDegrees: z.number().min(0).max(45),
});

const barrageSchema = z.strictObject({
  /** Fraction of scaled final-form HP at which the one-shot barrage fires. */
  healthThreshold: z.number().positive().max(1),
  pattern: patternSchema,
  variant: z.literal('boss_barrage_bullet'),
});

const phaseSchema = z.strictObject({
  hp: z.int().min(1).max(999),
  pattern: patternSchema,
  projectile: projectileSchema,
  /** Only the final phase may configure a one-shot low-health barrage. */
  barrage: barrageSchema.optional(),
  tellTicks: z.int().min(1).max(3600),
  fireIntervalTicks: z.int().min(1).max(3600),
});

export type ProjectileVariant = z.infer<typeof projectileVariantSchema>;

/** Schema for data-defined multi-part bosses. */
export const bossSchema = z.strictObject({
  key,
  sprite,
  x: z.number().min(0).max(270),
  y: z.number().min(0).max(240),
  hitbox,
  parts: z.array(partSchema).min(1).max(8),
  phases: z
    .array(phaseSchema)
    .length(3)
    .superRefine((phases, context) => {
      for (const [index, phase] of phases.entries()) {
        if (index < phases.length - 1 && phase.barrage !== undefined)
          context.addIssue({
            code: 'custom',
            path: [index, 'barrage'],
            message: 'is only allowed on the final phase',
          });
      }
    }),
});

export const bossFileSchema = z.strictObject({ bosses: z.array(bossSchema).min(1) });
export type BossSpec = z.infer<typeof bossSchema>;
export type BossPartSpec = z.infer<typeof partSchema>;
