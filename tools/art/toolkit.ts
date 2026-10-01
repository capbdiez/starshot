import { createImage, setPixel, type RgbaImage } from '../lib/image.ts';
import { PIXEL_KEY, type Grid } from '../lib/pixel-art.ts';

/** Versioned description of a reproducible code-authored raster recipe. */
export interface RecipeMetadata {
  readonly id: string;
  readonly version: number;
  readonly seed: number;
  readonly detailScale: 1 | 2;
}

/** A palette-letter raster canvas; `.` is transparent. */
export class RasterCanvas {
  readonly width: number;
  readonly height: number;
  private readonly pixels: string[];

  constructor(width: number, height: number, fill = '.') {
    if (width < 1 || height < 1) throw new Error('Raster canvas dimensions must be positive');
    this.width = width;
    this.height = height;
    this.pixels = Array.from({ length: width * height }, () => fill);
  }

  set(x: number, y: number, colour: string): this {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height)
      this.pixels[y * this.width + x] = colour;
    return this;
  }

  get(x: number, y: number): string {
    return x >= 0 && y >= 0 && x < this.width && y < this.height
      ? (this.pixels[y * this.width + x] ?? '.')
      : '.';
  }

  fillRect(x: number, y: number, width: number, height: number, colour: string): this {
    for (let py = y; py < y + height; py += 1)
      for (let px = x; px < x + width; px += 1) this.set(px, py, colour);
    return this;
  }

  outline(source: string, colour: string): this {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (this.get(x, y) !== source) continue;
        for (const [dx, dy] of ORTHOGONAL)
          if (this.get(x + dx, y + dy) === '.') this.set(x + dx, y + dy, colour);
      }
    }
    return this;
  }

  mirrorVertical(source: string, centreX: number): this {
    for (let y = 0; y < this.height; y += 1)
      for (let x = 0; x < this.width; x += 1)
        if (this.get(x, y) === source) this.set(Math.round(centreX * 2 - x), y, source);
    return this;
  }

  dither(
    x: number,
    y: number,
    width: number,
    height: number,
    colours: readonly [string, string],
  ): this {
    for (let py = y; py < y + height; py += 1)
      for (let px = x; px < x + width; px += 1)
        if (this.get(px, py) !== '.') this.set(px, py, colours[(px + py) & 1] ?? colours[0]);
    return this;
  }

  grid(): Grid {
    return Array.from({ length: this.height }, (_, y) =>
      Array.from({ length: this.width }, (_, x) => this.get(x, y)).join(''),
    );
  }

  image(detailScale: 1 | 2 = 1): RgbaImage {
    const image = createImage(this.width * detailScale, this.height * detailScale);
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const rgb = PIXEL_KEY[this.get(x, y)];
        if (rgb === undefined) continue;
        for (let sy = 0; sy < detailScale; sy += 1)
          for (let sx = 0; sx < detailScale; sx += 1)
            setPixel(image, x * detailScale + sx, y * detailScale + sy, rgb);
      }
    }
    return image;
  }
}

const ORTHOGONAL: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** Stable 32-bit pseudo-random value for a recipe seed and pixel coordinate. */
export function seededNoise(seed: number, x: number, y: number): number {
  let value = (seed ^ Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca6b)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d) >>> 0;
  value ^= value >>> 15;
  return (Math.imul(value, 0x846ca68b) ^ (value >>> 16)) >>> 0;
}

/** Applies a seeded, bounded material-speck pass without introducing new palette colours. */
export function materialNoise(
  canvas: RasterCanvas,
  seed: number,
  base: string,
  accent: string,
  chance = 4,
): RasterCanvas {
  for (let y = 0; y < canvas.height; y += 1)
    for (let x = 0; x < canvas.width; x += 1)
      if (canvas.get(x, y) === base && seededNoise(seed, x, y) % chance === 0)
        canvas.set(x, y, accent);
  return canvas;
}

/** Returns a controlled palette ramp step, clamped to its endpoints. */
export function ramp(colours: readonly string[], step: number): string {
  return colours[Math.max(0, Math.min(colours.length - 1, step))] ?? '.';
}

/** Builds an opaque palette-only emissive mask around a colour region. */
export function glowMask(grid: Grid, source: string, glow: string): Grid {
  const canvas = new RasterCanvas(grid[0]?.length ?? 0, grid.length);
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) canvas.set(x, y, row.charAt(x));
  });
  return canvas.outline(source, glow).grid();
}
