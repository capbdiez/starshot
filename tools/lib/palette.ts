import type { RgbaImage } from './image.ts';

/** Number of colours in the master palette (ART_DIRECTION §3). */
export const PALETTE_SIZE = 32;

/** Parses a `.hex` palette (one `RRGGBB` per line, as exported by Aseprite / Lospec). */
export function parsePalette(text: string): number[] {
  const colours: number[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (line === '' || line.startsWith(';') || line.startsWith('#')) {
      return;
    }
    if (!/^[0-9a-fA-F]{6}$/.test(line)) {
      throw new Error(`Palette line ${String(index + 1)}: "${line}" is not RRGGBB`);
    }
    colours.push(Number.parseInt(line, 16));
  });
  if (colours.length !== PALETTE_SIZE) {
    throw new Error(
      `Palette must have exactly ${String(PALETTE_SIZE)} colours, found ${String(colours.length)}`,
    );
  }
  if (new Set(colours).size !== colours.length) {
    throw new Error('Palette contains duplicate colours');
  }
  return colours;
}

/** Formats 0xRRGGBB as `#rrggbb`. */
export function hex(rgb: number): string {
  return `#${rgb.toString(16).padStart(6, '0')}`;
}

/** One pixel that breaks the palette rules. */
export interface PaletteViolation {
  readonly x: number;
  readonly y: number;
  readonly reason: string;
}

/**
 * Finds pixels that are not fully transparent and not an opaque palette colour.
 * Partial alpha is rejected too: glow and fades are runtime effects, never baked into sprites.
 */
export function findPaletteViolations(
  image: RgbaImage,
  palette: ReadonlySet<number>,
  limit = 20,
): PaletteViolation[] {
  const violations: PaletteViolation[] = [];
  const { data, width } = image;
  for (let i = 0; i < data.length && violations.length < limit; i += 4) {
    const alpha = data[i + 3] ?? 0;
    if (alpha === 0) {
      continue;
    }
    const x = (i / 4) % width;
    const y = Math.floor(i / 4 / width);
    if (alpha !== 255) {
      violations.push({ x, y, reason: `semi-transparent pixel (alpha ${String(alpha)})` });
      continue;
    }
    const rgb = ((data[i] ?? 0) << 16) | ((data[i + 1] ?? 0) << 8) | (data[i + 2] ?? 0);
    if (!palette.has(rgb)) {
      violations.push({ x, y, reason: `colour ${hex(rgb)} is not in the master palette` });
    }
  }
  return violations;
}
