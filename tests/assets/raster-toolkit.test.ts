import { describe, expect, it } from 'vitest';
import { findPaletteViolations, parsePalette } from '../../tools/lib/palette.ts';
import { readFileSync } from 'node:fs';
import { PATHS } from '../../tools/lib/repo.ts';
import { RECIPE_METADATA } from '../../tools/art/sprites.ts';
import {
  glowMask,
  materialNoise,
  ramp,
  RasterCanvas,
  seededNoise,
} from '../../tools/art/toolkit.ts';

const palette = new Set(parsePalette(readFileSync(PATHS.palette, 'utf8')));

describe('G3 raster-art toolkit', () => {
  it('is deterministic for identical recipe inputs', () => {
    const build = () =>
      materialNoise(new RasterCanvas(7, 5).fillRect(2, 1, 3, 3, 'C'), 42, 'C', 'c').image(2);
    const first = build();
    const second = build();
    expect(Buffer.from(first.data).equals(Buffer.from(second.data))).toBe(true);
    expect(seededNoise(42, 3, 4)).toBe(seededNoise(42, 3, 4));
  });

  it('builds mirrored, outlined, dithered palette-safe 2× raster output', () => {
    const canvas = new RasterCanvas(7, 5)
      .set(3, 1, 'C')
      .set(2, 2, 'C')
      .set(3, 2, 'C')
      .mirrorVertical('C', 3)
      .outline('C', 'B')
      .dither(2, 1, 3, 2, ['C', 'c']);
    expect(canvas.grid()).toEqual(['...B...', '..cCc..', '.BCcCB.', '..BBB..', '.......']);
    const image = canvas.image(2);
    expect([image.width, image.height]).toEqual([14, 10]);
    expect(findPaletteViolations(image, palette)).toEqual([]);
  });

  it('records versioned recipe inputs and uses bounded palette ramps and opaque glow masks', () => {
    expect(RECIPE_METADATA.every((recipe) => recipe.version > 0 && recipe.seed >= 0)).toBe(true);
    expect(RECIPE_METADATA.some((recipe) => recipe.detailScale === 2)).toBe(true);
    expect(ramp(['B', 'b', 'C'], -1)).toBe('B');
    expect(ramp(['B', 'b', 'C'], 9)).toBe('C');
    expect(glowMask(['...', '.C.', '...'], 'C', 'c')).toEqual(['.c.', 'cCc', '.c.']);
  });
});
