/** Fixed simulation/world width in logical pixels (ART_DIRECTION coordinate contract). */
export const WORLD_WIDTH = 270;

/** Fixed simulation/world height in logical pixels (ART_DIRECTION coordinate contract). */
export const WORLD_HEIGHT = 480;

/** Fixed presentation scale: every world pixel occupies a 2×2 presentation-pixel area. */
export const PRESENTATION_SCALE = 2;

/** Phaser's internal presentation-buffer width in pixels. */
export const PRESENTATION_WIDTH = WORLD_WIDTH * PRESENTATION_SCALE;

/** Phaser's internal presentation-buffer height in pixels. */
export const PRESENTATION_HEIGHT = WORLD_HEIGHT * PRESENTATION_SCALE;

/** Fixed simulation rate in ticks per second (FR-03). */
export const TICK_RATE = 60;

/** Duration of one simulation tick in milliseconds. */
export const TICK_MS = 1000 / TICK_RATE;
