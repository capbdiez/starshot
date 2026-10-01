import type { Content, FxEntry } from '../../content/index.ts';
import type { SimEvent } from '../../sim/index.ts';

/** What presentation should do this frame for a batch of sim events. */
export interface FxReactions {
  /** Audio-sprite clips to play, in event order. */
  readonly sfx: readonly string[];
  /** Whether any event asked for a screen flash. */
  readonly flash: boolean;
}

/** Looks up the data-driven reaction (`content/fx`) for each event. Pure: no Phaser. */
export function reactionsFor(fx: Content['fx'], events: readonly SimEvent[]): FxReactions {
  const sfx: string[] = [];
  let flash = false;
  for (const event of events) {
    const entry: FxEntry | undefined = fx[event.type];
    if (!entry) continue;
    if (entry.sfx !== undefined) sfx.push(entry.sfx);
    if (entry.flash === true) flash = true;
  }
  return { sfx, flash };
}

/** Linear interpolation from the previous to the current tick position (render smoothing). */
export function smooth(prev: number, current: number, alpha: number): number {
  return Math.round(prev + (current - prev) * alpha);
}
