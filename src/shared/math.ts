/**
 * Largest integer scale at which a `width`×`height` image fits inside `availWidth`×`availHeight`.
 * Never returns less than 1 (the canvas is shown at 1× and overflows instead of shrinking blurrily).
 */
/** Shared trigonometry boundary for deterministic simulation path and pattern helpers. */
export function trigSin(radians: number): number {
  return Math.sin(radians);
}
/** Shared trigonometry boundary for deterministic simulation path and pattern helpers. */
export function trigCos(radians: number): number {
  return Math.cos(radians);
}
/** Shared trigonometry boundary for deterministic simulation path and pattern helpers. */
export function trigAtan2(y: number, x: number): number {
  return Math.atan2(y, x);
}

export function integerScale(
  availWidth: number,
  availHeight: number,
  width: number,
  height: number,
): number {
  if (!(availWidth > 0 && availHeight > 0 && width > 0 && height > 0)) {
    return 1;
  }
  const fit = Math.floor(Math.min(availWidth / width, availHeight / height));
  return Math.max(1, fit);
}
