import { burstFrame, type Grid } from '../lib/pixel-art.ts';

/** Deterministic cooling explosion frames shared by sprite recipe categories. */
export function burst(size: number, count: number, tint: string): Grid[] {
  return Array.from({ length: count }, (_, index) => burstFrame(size, index, count, tint));
}

/** Deterministic non-square explosion for large boss parts. */
export function partBurst(w: number, h: number, count: number, tint: string): Grid[] {
  return Array.from({ length: count }, (_, frame) => {
    const t = (frame + 1) / count;
    const outer = 1 + t * (Math.min(w, h) / 2 - 1);
    const inner = Math.max(0, outer - 2);
    const colour = ['W', 'Y', 'o', 'O', 'r', 'M'][Math.min(5, Math.floor(t * 6))] ?? tint;
    return Array.from({ length: h }, (_, y) =>
      Array.from({ length: w }, (_, x) => {
        const dx = (x - (w - 1) / 2) * (h / w);
        const dy = y - (h - 1) / 2;
        const distance = Math.hypot(dx, dy);
        if (distance <= outer && distance >= inner) return distance > outer - 0.8 ? tint : colour;
        return frame > 1 && (x * 17 + y * 31 + frame * 13) % 29 === 0 ? 'y' : '.';
      }).join(''),
    );
  });
}
