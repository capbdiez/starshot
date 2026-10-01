import { z } from 'zod';

/** Atlas key naming: `<category>_<name>` (ART_DIRECTION §4), e.g. `player_ship`, `enemy_grunt`. */
export const SPRITE_KEY_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/;

/** Animation clip names, e.g. `idle`, `bank_left`, `attack_tell`. */
export const CLIP_NAME_PATTERN = /^[a-z]+(?:_[a-z]+)*$/;

/** Gameplay role; drives the placeholder colour/shape and the palette role rules (ART_DIRECTION §3). */
export const spriteRoleSchema = z.enum([
  'player',
  'player_shot',
  'enemy',
  'enemy_bullet',
  'pickup',
  'fx',
  'ui',
]);

/** Roles that are gameplay entities and therefore need the ART_DIRECTION §5 required clips. */
export const ENTITY_ROLES: readonly SpriteRole[] = ['player', 'enemy'];

/**
 * Clips every entity must have as frames. `hit` is also required by ART_DIRECTION §5, but it
 * "may use a shader", so it is not enforced as atlas frames.
 */
export const REQUIRED_ENTITY_CLIPS: readonly string[] = ['idle', 'death'];

const pixelSize = z.int().min(1).max(256);
const normalized = z.number().min(0).max(1);

export const clipSpecSchema = z.strictObject({
  /** Number of frames in the clip. */
  frames: z.int().min(1).max(64),
  /** Playback rate; ART_DIRECTION §2 authors at 8–12 FPS. */
  fps: z.number().positive().max(60),
  /** Extra repetitions; -1 loops forever, 0 plays once. */
  repeat: z.int().min(-1),
});

export const spriteSpecSchema = z
  .strictObject({
    key: z.string().regex(SPRITE_KEY_PATTERN, 'must match <category>_<name> in snake_case'),
    role: spriteRoleSchema,
    size: z.strictObject({ w: pixelSize, h: pixelSize }),
    /** Normalized pivot (0–1) written into the atlas data; never set in code. */
    anchor: z.strictObject({ x: normalized, y: normalized }),
    clips: z
      .record(z.string().regex(CLIP_NAME_PATTERN, 'must be snake_case'), clipSpecSchema)
      .refine((clips) => Object.keys(clips).length > 0, 'must define at least one clip'),
  })
  .superRefine((spec, ctx) => {
    if (!ENTITY_ROLES.includes(spec.role)) {
      return;
    }
    for (const clip of REQUIRED_ENTITY_CLIPS) {
      if (!(clip in spec.clips)) {
        ctx.addIssue({
          code: 'custom',
          path: ['clips', clip],
          message: `role "${spec.role}" requires a "${clip}" clip (ART_DIRECTION §5)`,
        });
      }
    }
  });

/** Schema for `content/animations/*.json`. */
export const spriteFileSchema = z.strictObject({
  sprites: z.array(spriteSpecSchema).min(1),
});

export type SpriteRole = z.infer<typeof spriteRoleSchema>;
export type ClipSpec = z.infer<typeof clipSpecSchema>;
export type SpriteSpec = z.infer<typeof spriteSpecSchema>;
export type SpriteFile = z.infer<typeof spriteFileSchema>;
