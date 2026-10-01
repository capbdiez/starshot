import type { StageEnvironment } from '../../content/index.ts';
import { PRESENTATION_HEIGHT, PRESENTATION_WIDTH } from '../../shared/index.ts';

export interface BackgroundPoint {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

export interface BackgroundLayout {
  readonly nebulae: readonly BackgroundPoint[];
  readonly distantStars: readonly BackgroundPoint[];
  readonly largeObjects: readonly BackgroundPoint[];
  readonly foreground: readonly BackgroundPoint[];
}

/** Stable integer mixer for presentation-only seeded layout generation. */
export function backgroundHash(value: number): number {
  let hash = value >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function points(seed: number, count: number, minSize: number, maxSize: number): BackgroundPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const base = seed + index * 0x9e3779b9;
    return {
      x: backgroundHash(base) % PRESENTATION_WIDTH,
      y: backgroundHash(base + 1) % PRESENTATION_HEIGHT,
      size: minSize + (backgroundHash(base + 2) % (maxSize - minSize + 1)),
    };
  });
}

/** Creates bounded, reproducible placements from a stage recipe and the current run seed. */
export function createBackgroundLayout(
  environment: StageEnvironment,
  runSeed: number,
): BackgroundLayout {
  const seed = backgroundHash(environment.seed ^ runSeed);
  return {
    nebulae: points(seed + 0x1000, environment.layers.nebulae, 120, 220),
    distantStars: points(seed + 0x2000, environment.layers.distantStars, 1, 3),
    largeObjects: points(seed + 0x3000, environment.layers.largeObjects, 24, 52),
    foreground: points(seed + 0x4000, environment.layers.foreground, 2, 5),
  };
}
