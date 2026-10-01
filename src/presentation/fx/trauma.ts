/** Camera trauma with frame-rate-independent linear decay. */
export class Trauma {
  private value = 0;

  /** Adds trauma, saturating at one. */
  add(amount: number): void {
    this.value = Math.min(1, this.value + Math.max(0, amount));
  }

  /** Decays trauma and returns squared shake intensity. */
  advance(deltaMs: number, decayPerSecond = 1.8): number {
    this.value = Math.max(0, this.value - (Math.max(0, deltaMs) / 1000) * decayPerSecond);
    return this.value * this.value;
  }

  /** Current unsquared trauma, useful for tests and settings previews. */
  get amount(): number {
    return this.value;
  }
}
