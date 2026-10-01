import type { SpriteSpec } from '../../src/content/index.ts';
import type { AsepriteSheet } from './formats.ts';
import { blit, createImage, setPixel, type RgbaImage } from './image.ts';

/** Palette letters used by hand-authored grids. `.` is transparent. Values are palette colours. */
export const PIXEL_KEY: Readonly<Record<string, number>> = {
  K: 0x0b0b1a,
  W: 0xffffff,
  c: 0xa6f6ff,
  C: 0x3ee0ff,
  b: 0x1a9fc0,
  B: 0x0f5f7a,
  m: 0xb8237a,
  M: 0x6b1850,
  p: 0xff3fa4,
  P: 0xff9ed2,
  o: 0xff9433,
  O: 0xd9571c,
  y: 0xffd08a,
  Y: 0xffe14d,
  v: 0x7a3cc2,
  V: 0xb98cff,
  r: 0xff5a4d,
};

/** A frame as rows of palette letters. */
export type Grid = readonly string[];

/** Renders a grid, checking its exact size and that every letter is known. */
export function gridImage(grid: Grid, w: number, h: number, label: string): RgbaImage {
  if (grid.length !== h) {
    throw new Error(`${label}: ${String(grid.length)} rows, expected ${String(h)}`);
  }
  const image = createImage(w, h);
  grid.forEach((row, y) => {
    if (row.length !== w) {
      throw new Error(
        `${label}: row ${String(y)} is ${String(row.length)} wide, expected ${String(w)}`,
      );
    }
    for (let x = 0; x < w; x += 1) {
      const ch = row.charAt(x);
      if (ch === '.') continue;
      const rgb = PIXEL_KEY[ch];
      if (rgb === undefined)
        throw new Error(`${label}: unknown pixel "${ch}" at ${String(x)},${String(y)}`);
      setPixel(image, x, y, rgb);
    }
  });
  return image;
}

/** Replaces letters in the columns [from, to) of every row (used for banking shading). */
export function recolour(grid: Grid, from: number, to: number, map: Record<string, string>): Grid {
  return grid.map((row) =>
    row.replace(/./g, (ch, x: number) => (x >= from && x < to ? (map[ch] ?? ch) : ch)),
  );
}

/** Ring colours of a procedural explosion, hot core → cooling smoke. */
const BURST_RAMP = ['W', 'Y', 'o', 'O', 'r', 'M'];

/**
 * Procedural explosion frame `index` of `count` on a `size`×`size` canvas: an expanding ring
 * whose colour cools over time, plus deterministic debris specks.
 */
export function burstFrame(size: number, index: number, count: number, tint: string): Grid {
  const centre = (size - 1) / 2;
  const t = (index + 1) / count;
  const outer = 1.5 + t * (size / 2 - 1);
  const inner = Math.max(0, outer - 2.5 - (1 - t) * 2);
  const colour = BURST_RAMP[Math.min(BURST_RAMP.length - 1, Math.floor(t * BURST_RAMP.length))];
  const rows: string[] = [];
  for (let y = 0; y < size; y += 1) {
    let row = '';
    for (let x = 0; x < size; x += 1) {
      const d = Math.hypot(x - centre, y - centre);
      const speck = (x * 73 + y * 151 + index * 37) % 23 === 0 && d < outer + 1.5;
      if (d <= outer && d >= inner && (t < 0.7 || (x + y + index) % 2 === 0)) {
        row += d > outer - 1 ? tint : (colour ?? 'M');
      } else if (speck && index > 0) {
        row += 'y';
      } else {
        row += '.';
      }
    }
    rows.push(row);
  }
  return rows;
}

/** Packs clip frames into a horizontal sheet in Aseprite `json-array --list-tags` format. */
export function buildSheet(
  spec: SpriteSpec,
  clips: Readonly<Record<string, readonly Grid[]>>,
): { image: RgbaImage; sheet: AsepriteSheet } {
  const { w, h } = spec.size;
  const frames: RgbaImage[] = [];
  const frameTags: AsepriteSheet['meta']['frameTags'] = [];
  for (const clip of Object.keys(spec.clips)) {
    const grids = clips[clip];
    if (!grids) throw new Error(`${spec.key}: no art for clip "${clip}"`);
    frameTags.push({ name: clip, from: frames.length, to: frames.length + grids.length - 1 });
    grids.forEach((grid, i) =>
      frames.push(gridImage(grid, w, h, `${spec.key}/${clip}/${String(i)}`)),
    );
  }
  const image = createImage(w * frames.length, h);
  frames.forEach((frame, i) => {
    blit(frame, { x: 0, y: 0, w, h }, image, i * w, 0);
  });
  return {
    image,
    sheet: {
      frames: frames.map((_, i) => ({ frame: { x: i * w, y: 0, w, h }, sourceSize: { w, h } })),
      meta: { frameTags },
    },
  };
}
