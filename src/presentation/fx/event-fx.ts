import type { Content, FxEntry, FxKind } from '../../content/index.ts';
import type { SimEvent } from '../../sim/index.ts';

const PARTICLE_POOL_LIMIT = 400;

/** Presentation quality tier; low drops cosmetic work before gameplay cues. */
export type VisualQuality = 'low' | 'high';

/** User-controlled G7 effect budget settings. */
export interface FxBudgetSettings {
  readonly visualQuality: VisualQuality;
  readonly effectsIntensity: number;
  readonly flashReduction: boolean;
}

/** A validated event reaction converted into bounded visual work for the renderer. */
export interface PlannedFx {
  readonly event: SimEvent;
  readonly entry: FxEntry;
  readonly effect: FxKind;
  readonly particles: number;
}

const LOW_QUALITY_SCALE: Record<FxKind, number> = {
  trail: 0,
  muzzle: 0.75,
  hit: 0.75,
  debris: 0.35,
  explosion: 0.5,
  bomb: 0.5,
  tell: 1,
  pickup: 0.75,
  boss: 0.5,
};

const REDUCED_FLASH_SCALE: Partial<Record<FxKind, number>> = {
  explosion: 0.55,
  bomb: 0.55,
  boss: 0.55,
};

/** One event paired with its validated, data-driven presentation reaction. */
export interface FxReaction {
  readonly event: SimEvent;
  readonly entry: FxEntry;
}

/** Effects requested by a batch of simulation events. */
export interface FxReactions {
  readonly reactions: readonly FxReaction[];
  readonly flash: boolean;
}

/** Looks up data-driven reactions (`content/fx`) for events. Pure: no Phaser. */
export function reactionsFor(fx: Content['fx'], events: readonly SimEvent[]): FxReactions {
  const reactions: FxReaction[] = [];
  let flash = false;
  for (const event of events) {
    const entry: FxEntry | undefined = fx[event.type];
    if (!entry) continue;
    reactions.push({ event, entry });
    flash ||= entry.flash === true;
  }
  return { reactions, flash };
}

/** Converts one content reaction into bounded visual work for the active quality tier. */
export function planFx(
  reaction: FxReaction,
  settings: FxBudgetSettings,
  remainingPool = PARTICLE_POOL_LIMIT,
): PlannedFx | undefined {
  const effect = reaction.entry.effect;
  if (effect === undefined || remainingPool <= 0) return undefined;
  const requested = reaction.entry.particles ?? 0;
  // Attack tells are a gameplay cue and remain visible even when cosmetic FX are disabled.
  let scale = effect === 'tell' ? 1 : settings.effectsIntensity;
  if (scale <= 0) return undefined;
  if (settings.visualQuality === 'low') scale *= LOW_QUALITY_SCALE[effect];
  if (settings.flashReduction) scale *= REDUCED_FLASH_SCALE[effect] ?? 1;
  const count = Math.min(PARTICLE_POOL_LIMIT, remainingPool, Math.ceil(requested * scale));
  if (count <= 0 && effect !== 'muzzle' && effect !== 'tell') return undefined;
  return { ...reaction, effect, particles: count };
}

/** Plans a batch without exceeding the fixed particle pool budget. */
export function planFxBatch(
  reactions: readonly FxReaction[],
  settings: FxBudgetSettings,
  poolLimit = PARTICLE_POOL_LIMIT,
): readonly PlannedFx[] {
  const planned: PlannedFx[] = [];
  let remaining = Math.max(0, Math.min(PARTICLE_POOL_LIMIT, poolLimit));
  for (const reaction of reactions) {
    const plan = planFx(reaction, settings, remaining);
    if (!plan) continue;
    planned.push(plan);
    remaining -= plan.particles;
  }
  return planned;
}

/** Linear interpolation from the previous to the current tick position (render smoothing). */
export function smooth(prev: number, current: number, alpha: number): number {
  return Math.round(prev + (current - prev) * alpha);
}
