import { z } from 'zod';

/** Event names are sim event `type`s (PascalCase); tests check them against the catalogue. */
export const EVENT_NAME_PATTERN = /^[A-Z][A-Za-z]+$/;

/** Audio-sprite clip names, e.g. `sfx_shot`, `sfx_explode_s`. */
export const SFX_KEY_PATTERN = /^sfx_[a-z0-9]+(?:_[a-z0-9]+)*$/;

const count = z.int().min(0).max(400);
const milliseconds = z.int().min(0).max(300);

/** Declarative presentation reaction for one simulation event. */
export const fxEntrySchema = z.strictObject({
  /** Audio-sprite clip to play. */
  sfx: z.string().regex(SFX_KEY_PATTERN).optional(),
  /** Maximum simultaneous copies of the mapped SFX. */
  voiceLimit: z.int().min(1).max(16).optional(),
  /** Symmetric random pitch range, e.g. 0.05 is ±5 %. */
  pitchVariance: z.number().min(0).max(0.2).optional(),
  /** Short full-screen flash. */
  flash: z.boolean().optional(),
  /** A two-frame muzzle flash at the event position. */
  muzzle: z.boolean().optional(),
  /** Reuse the event's animated death sprite as an explosion. */
  explosion: z.boolean().optional(),
  /** Number of pooled sparks to emit at the event position. */
  particles: count.optional(),
  /** Trauma added to the camera; rendered intensity is trauma squared. */
  trauma: z.number().min(0).max(1).optional(),
  /** Real-time hit stop, capped to the ART_DIRECTION range. */
  hitStopMs: z.int().min(0).max(60).optional(),
  /** Real-time slow-motion duration. */
  slowMotionMs: milliseconds.optional(),
  /** Simulation time scale while slow motion is active. */
  slowScale: z.number().min(0.1).max(1).optional(),
  /** Reserved score-popup text; the M4 score system supplies its value. */
  popup: z.boolean().optional(),
});

/** Schema for `content/fx/*.json`. */
export const fxFileSchema = z.strictObject({
  events: z.record(z.string().regex(EVENT_NAME_PATTERN, 'must be a sim event type'), fxEntrySchema),
});

export type FxEntry = z.infer<typeof fxEntrySchema>;
