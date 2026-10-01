/** Returns the next dive delay, decreasing linearly as a formation is thinned. */
export function diveInterval(
  minTicks: number,
  maxTicks: number,
  alive: number,
  total: number,
): number {
  if (total <= 0) return maxTicks;
  const remaining = Math.min(1, Math.max(0, alive / total));
  return Math.round(minTicks + (maxTicks - minTicks) * remaining);
}
