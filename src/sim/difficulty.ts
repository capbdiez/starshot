/** Lowest readable interval for normal enemy fire and dive scheduling. */
export const MIN_NORMAL_WAVE_INTERVAL_TICKS = 18;

/** Lowest readable fire interval for the recurring boss. */
export const MIN_BOSS_INTERVAL_TICKS = 36;

function scaledHp(base: number, difficulty: number): number {
  return Math.ceil(base * (1 + (difficulty - 1) * 0.2));
}

/** Returns normal-enemy hit points derived from difficulty without changing authored content. */
export function scaledNormalEnemyHp(base: number, difficulty: number): number {
  return scaledHp(base, difficulty);
}

/** Returns recurring-boss weak-point hit points derived from difficulty. */
export function scaledBossPartHp(base: number, difficulty: number): number {
  return scaledHp(base, difficulty);
}

/** Returns recurring-boss phase hit points derived from difficulty. */
export function scaledBossPhaseHp(base: number, difficulty: number): number {
  return scaledHp(base, difficulty);
}

/** Returns a normal-wave interval with a readability and bullet-pool safety floor. */
export function scaledNormalWaveInterval(base: number, difficulty: number): number {
  return Math.max(MIN_NORMAL_WAVE_INTERVAL_TICKS, Math.round(base / (1 + (difficulty - 1) * 0.08)));
}

/** Returns a boss fire interval with a readability and bullet-pool safety floor. */
export function scaledBossFireInterval(base: number, difficulty: number): number {
  return Math.max(MIN_BOSS_INTERVAL_TICKS, Math.round(base / (1 + (difficulty - 1) * 0.08)));
}
