import type { Content } from '../content/index.ts';
import type { InputFrame } from '../shared/index.ts';
import type { SimEvent } from './events.ts';
import { fnv1a32 } from './hash.ts';

/** Read-only snapshot of the simulation handed to presentation each frame. */
export interface SimView {
  /** Number of fixed steps simulated so far. */
  readonly tick: number;
}

/** Handle to one deterministic simulation run. */
export interface Sim {
  /** Advances the simulation by exactly one fixed tick using `input`. */
  step(input: InputFrame): void;
  /** Returns a frozen snapshot of the current state; presentation must never mutate it. */
  snapshot(): Readonly<SimView>;
  /**
   * Returns the events emitted since the previous call. The returned array is reused and only
   * valid until the next `drainEvents()` call (no per-tick allocation).
   */
  drainEvents(): readonly SimEvent[];
  /** Deterministic fingerprint of the full simulation state, used by replay tests. */
  hash(): string;
}

/**
 * Creates a simulation for `content`, seeded with `seed` (coerced to uint32).
 * M0 only tracks the tick counter; gameplay state arrives in M1.
 */
export function createSim(content: Content, seed: number): Sim {
  const state = {
    seed: seed >>> 0,
    tick: 0,
    lastInput: 0,
  };
  // Kept for M1 systems; referenced so the dependency on content is explicit.
  const sprites = content.sprites;
  // Double-buffered event queue: systems push to `pending`; drainEvents swaps the buffers.
  let pending: SimEvent[] = [];
  let drained: SimEvent[] = [];

  return {
    step(input) {
      state.lastInput = input >>> 0;
      state.tick += 1;
    },
    snapshot() {
      return Object.freeze({ tick: state.tick });
    },
    drainEvents() {
      drained.length = 0;
      [drained, pending] = [pending, drained];
      return drained;
    },
    hash() {
      return fnv1a32([state.seed, state.tick, state.lastInput, Object.keys(sprites).length]);
    },
  };
}
