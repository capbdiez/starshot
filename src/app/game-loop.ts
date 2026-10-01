/** Configuration for {@link createGameLoop}. */
export interface GameLoopOptions {
  /** Fixed simulation step in milliseconds. */
  readonly stepMs: number;
  /** Longest frame time that is simulated; longer gaps (tab switches, breakpoints) are clamped. */
  readonly maxFrameMs: number;
  /** Runs one fixed simulation step. */
  readonly step: () => void;
}

/** Fixed-timestep accumulator (ARCHITECTURE §4): variable frame time in, whole steps out. */
export interface GameLoop {
  /** Adds `elapsedMs` of real time and runs every whole step that fits. Returns the steps run. */
  advance(elapsedMs: number): number;
  /** Fraction (0 ≤ alpha < 1) of a step left in the accumulator, used to smooth rendering. */
  readonly alpha: number;
  /** Drops any accumulated time. */
  reset(): void;
}

/** Absorbs float error so that frames of exactly `stepMs` never skip a step. */
const EPSILON_MS = 1e-6;

/** Creates a fixed-timestep loop driver. It has no clock of its own; callers pass elapsed time. */
export function createGameLoop(options: GameLoopOptions): GameLoop {
  const { stepMs, maxFrameMs, step } = options;
  if (!(stepMs > 0) || !Number.isFinite(stepMs)) {
    throw new RangeError(`stepMs must be a positive finite number, got ${String(stepMs)}`);
  }
  if (!(maxFrameMs >= stepMs) || !Number.isFinite(maxFrameMs)) {
    throw new RangeError(`maxFrameMs must be finite and >= stepMs, got ${String(maxFrameMs)}`);
  }

  let accumulator = 0;

  return {
    advance(elapsedMs) {
      if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
        return 0;
      }
      accumulator += Math.min(elapsedMs, maxFrameMs);
      let steps = 0;
      while (accumulator + EPSILON_MS >= stepMs) {
        step();
        accumulator = Math.max(0, accumulator - stepMs);
        steps += 1;
      }
      return steps;
    },
    get alpha() {
      return accumulator / stepMs;
    },
    reset() {
      accumulator = 0;
    },
  };
}
