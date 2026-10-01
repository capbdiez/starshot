import { z } from 'zod';

/** Event names are sim event `type`s (PascalCase); tests check them against the catalogue. */
export const EVENT_NAME_PATTERN = /^[A-Z][A-Za-z]+$/;

/** Audio-sprite clip names, e.g. `sfx_shot`, `sfx_explode_s`. */
export const SFX_KEY_PATTERN = /^sfx_[a-z0-9]+(?:_[a-z0-9]+)*$/;

/** What presentation does for one sim event (M1: basic SFX + flash; M2 adds particles etc.). */
export const fxEntrySchema = z.strictObject({
  /** Audio-sprite clip to play. */
  sfx: z.string().regex(SFX_KEY_PATTERN).optional(),
  /** Short full-screen flash (the only M1 visual effect). */
  flash: z.boolean().optional(),
});

/** Schema for `content/fx/*.json`. */
export const fxFileSchema = z.strictObject({
  events: z.record(z.string().regex(EVENT_NAME_PATTERN, 'must be a sim event type'), fxEntrySchema),
});

export type FxEntry = z.infer<typeof fxEntrySchema>;
