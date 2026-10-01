export interface PathPoint {
  readonly x: number;
  readonly y: number;
}

/** Samples a cubic Bézier path. Callers provide integer ticks so the result is replay-stable. */
export function sampleCubic(
  points: readonly [PathPoint, PathPoint, PathPoint, PathPoint],
  progress: number,
): PathPoint {
  const t = Math.min(1, Math.max(0, progress));
  const u = 1 - t;
  return {
    x:
      u * u * u * points[0].x +
      3 * u * u * t * points[1].x +
      3 * u * t * t * points[2].x +
      t * t * t * points[3].x,
    y:
      u * u * u * points[0].y +
      3 * u * u * t * points[1].y +
      3 * u * t * t * points[2].y +
      t * t * t * points[3].y,
  };
}

/** Smoothstep easing used for entry and dive paths. */
export function easeInOut(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return t * t * (3 - 2 * t);
}
