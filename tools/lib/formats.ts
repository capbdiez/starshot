import { z } from 'zod';

const rect = z.object({ x: z.int(), y: z.int(), w: z.int().positive(), h: z.int().positive() });
const size = z.object({ w: z.int().positive(), h: z.int().positive() });

/** Subset of Aseprite's `--format json-array --list-tags` sheet data that the pipeline uses. */
export const asepriteSheetSchema = z.object({
  frames: z.array(z.object({ frame: rect, sourceSize: size })).min(1),
  meta: z.object({
    frameTags: z.array(z.object({ name: z.string(), from: z.int().min(0), to: z.int().min(0) })),
  }),
});

/** Phaser "JSON Hash" atlas as written by `tools/build-atlas.ts` (pivot = normalized anchor). */
export const phaserAtlasSchema = z.object({
  frames: z.record(
    z.string(),
    z.object({
      frame: rect,
      rotated: z.literal(false),
      trimmed: z.literal(false),
      spriteSourceSize: rect,
      sourceSize: size,
      pivot: z.object({ x: z.number(), y: z.number() }),
    }),
  ),
  meta: z.object({
    image: z.string(),
    size,
  }),
});

export type AsepriteSheet = z.infer<typeof asepriteSheetSchema>;
export type PhaserAtlas = z.infer<typeof phaserAtlasSchema>;
