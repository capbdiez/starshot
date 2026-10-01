import { z } from 'zod';

const key = z.string().regex(/^[a-z][a-z0-9-]*$/, 'must be a lower-case kebab-case key');
const point = z.strictObject({
  x: z.number().min(-270).max(540),
  y: z.number().min(-100).max(580),
});

export const waveSchema = z.strictObject({
  key,
  formation: z.strictObject({
    columns: z.int().min(1).max(12),
    spacingX: z.number().positive().max(64),
    spacingY: z.number().positive().max(64),
    y: z.number().min(0).max(300),
    sway: z.number().min(0).max(32),
    swayTicks: z.int().min(1).max(3600),
  }),
  entries: z
    .array(
      z.strictObject({
        enemy: key,
        count: z.int().min(1).max(24),
        path: z.tuple([point, point, point, point]),
        delayTicks: z.int().min(0).max(3600),
      }),
    )
    .min(1),
  dive: z
    .strictObject({
      minIntervalTicks: z.int().min(1).max(3600),
      maxIntervalTicks: z.int().min(1).max(3600),
      durationTicks: z.int().min(30).max(3600),
    })
    .refine(
      (v) => v.minIntervalTicks <= v.maxIntervalTicks,
      'minIntervalTicks must be <= maxIntervalTicks',
    ),
});
export const waveFileSchema = z.strictObject({ waves: z.array(waveSchema).min(1) });
export const stagesSchema = z.strictObject({
  stages: z
    .array(
      z.discriminatedUnion('type', [
        z.strictObject({ key, type: z.literal('wave'), wave: key }),
        z.strictObject({ key, type: z.literal('boss'), boss: key }),
      ]),
    )
    .length(5),
});
export type WaveSpec = z.infer<typeof waveSchema>;
export type StageSpec = z.infer<typeof stagesSchema>['stages'][number];
