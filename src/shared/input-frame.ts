/**
 * One tick of player input, encoded as a bitmask so it is cheap to record and replay.
 * Bits are defined by {@link InputBit}; unknown bits are ignored by the simulation.
 */
export type InputFrame = number;

/** An input frame with nothing pressed. */
export const NO_INPUT: InputFrame = 0;

/** Bit layout of an {@link InputFrame}. Changing a value breaks every recorded replay. */
export const InputBit = {
  left: 1 << 0,
  right: 1 << 1,
  fire: 1 << 2,
  bomb: 1 << 3,
} as const;

/** Whether `bit` is set in `frame`. */
export function hasInput(frame: InputFrame, bit: number): boolean {
  return (frame & bit) !== 0;
}
