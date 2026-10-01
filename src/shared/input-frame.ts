/**
 * One tick of player input, encoded as a bitmask so it is cheap to record and replay.
 * The individual bits are defined together with the input system in M1.
 */
export type InputFrame = number;

/** An input frame with nothing pressed. */
export const NO_INPUT: InputFrame = 0;
