import { z } from 'zod';

const paletteRoleSchema = z.enum(['indigo', 'violet', 'teal', 'amber', 'crimson']);
const densitySchema = z.int().min(0).max(160);
const speedSchema = z.number().min(0).max(80);

/** Presentation-only recipe for one deterministic 540×960 stage environment. */
export const stageEnvironmentSchema = z.strictObject({
  stage: z.int().min(1).max(5),
  theme: z.string().regex(/^[a-z][a-z0-9-]*$/, 'must be a lower-case kebab-case key'),
  seed: z.int().min(0).max(0xffff_ffff),
  paletteRole: paletteRoleSchema,
  layers: z.strictObject({
    nebulae: densitySchema.max(4),
    distantStars: densitySchema,
    largeObjects: densitySchema.max(6),
    foreground: densitySchema.max(24),
  }),
  motion: z.strictObject({
    distantStars: speedSchema,
    largeObjects: speedSchema,
    foreground: speedSchema,
  }),
});

export const stageEnvironmentFileSchema = z.strictObject({
  environments: z.array(stageEnvironmentSchema).length(5),
});

export type StageEnvironment = z.infer<typeof stageEnvironmentSchema>;
