import { burstFrame, type Grid } from '../lib/pixel-art.ts';
import { seededNoise } from './toolkit.ts';

/** Deterministic cooling explosion frames shared by sprite recipe categories. */
export function burst(size: number, count: number, tint: string): Grid[] {
  return Array.from({ length: count }, (_, index) => burstFrame(size, index, count, tint));
}

/** Breaks a material silhouette into seeded, outward-scattering chips and a bounded hot core. */
export function materialDebris(
  source: Grid,
  count: number,
  seed: number,
  chips: readonly string[],
): Grid[] {
  const height = source.length;
  const width = source[0]?.length ?? 0;
  return Array.from({ length: count }, (_, frame) => {
    const t = (frame + 1) / count;
    return source.map((row, y) =>
      Array.from(row, (pixel, x) => {
        const noise = seededNoise(seed + frame * 0x9e37, x, y);
        if (pixel !== '.') {
          const breakage = noise % 10;
          if (breakage < Math.ceil(t * 8)) return breakage < 3 ? chips[noise % chips.length] : '.';
          if (frame < 3 && noise % 17 === 0) return frame === 0 ? 'W' : 'Y';
          return pixel;
        }
        const dx = x - (width - 1) / 2;
        const dy = y - (height - 1) / 2;
        const radius = Math.max(2, t * Math.min(width, height) * 0.55);
        const distance = Math.hypot(dx, dy);
        return frame > 0 && distance < radius && distance > radius - 1.5 && noise % 7 === 0
          ? chips[noise % chips.length]
          : '.';
      }).join(''),
    );
  });
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
