import type { Content, FxEntry } from '../../content/index.ts';
import type { SimEvent } from '../../sim/index.ts';

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

/** Linear interpolation from the previous to the current tick position (render smoothing). */
export function smooth(prev: number, current: number, alpha: number): number {
  return Math.round(prev + (current - prev) * alpha);
}
