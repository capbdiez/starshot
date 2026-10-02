/** Lowest readable interval for normal enemy fire and dive scheduling. */
export const MIN_NORMAL_WAVE_INTERVAL_TICKS = 18;

/** Returns normal-enemy hit points derived from difficulty without changing authored content. */
export function scaledNormalEnemyHp(base: number, difficulty: number): number {
  return Math.ceil(base * (1 + (difficulty - 1) * 0.2));
}

/** Returns a normal-wave interval with a readability and bullet-pool safety floor. */
export function scaledNormalWaveInterval(base: number, difficulty: number): number {
  return Math.max(MIN_NORMAL_WAVE_INTERVAL_TICKS, Math.round(base / (1 + (difficulty - 1) * 0.08)));
}
