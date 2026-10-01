import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createImage, setPixel } from '../../tools/lib/image.ts';
import { packShelves } from '../../tools/lib/pack.ts';
import { findPaletteViolations, parsePalette } from '../../tools/lib/palette.ts';
import { placeholderFrame, ROLE_COLOURS } from '../../tools/lib/placeholder.ts';
import { PATHS } from '../../tools/lib/repo.ts';

const palette = new Set(parsePalette(readFileSync(PATHS.palette, 'utf8')));

describe('palette', () => {
  it('master palette has 32 unique colours', () => {
    expect(palette.size).toBe(32);
  });

  it('rejects malformed palettes', () => {
    expect(() => parsePalette('ffffff\n')).toThrow(/exactly 32/);
    expect(() => parsePalette('zzzzzz\n')).toThrow(/not RRGGBB/);
  });

  it('every placeholder role colour is in the palette', () => {
    for (const { fill, detail } of Object.values(ROLE_COLOURS)) {
      expect(palette.has(fill)).toBe(true);
      expect(palette.has(detail)).toBe(true);
    }
  });

  it('flags off-palette and semi-transparent pixels', () => {
    const image = createImage(2, 1);
    setPixel(image, 0, 0, 0x123456);
    image.data[7] = 128;
    const reasons = findPaletteViolations(image, palette).map((v) => v.reason);
    expect(reasons).toHaveLength(2);
    expect(reasons[0]).toMatch(/#123456 is not in the master palette/);
    expect(reasons[1]).toMatch(/semi-transparent/);
  });
});

describe('placeholder generator', () => {
  it('produces frames of the exact spec size, different per frame index', () => {
    const a = placeholderFrame('player', 16, 16, 0);
    const b = placeholderFrame('player', 16, 16, 1);
    expect([a.width, a.height]).toEqual([16, 16]);
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(false);
  });

  it('only uses palette colours for every role', () => {
    for (const role of Object.keys(ROLE_COLOURS) as (keyof typeof ROLE_COLOURS)[]) {
      expect(findPaletteViolations(placeholderFrame(role, 24, 24, 7), palette)).toEqual([]);
    }
  });
});

describe('packer', () => {
  it('places rects without overlap inside power-of-two bounds', () => {
    const inputs = Array.from({ length: 40 }, (_, i) => ({
      id: `r${String(i)}`,
      w: 8 + (i % 5) * 4,
      h: 8 + (i % 3) * 8,
    }));
    const result = packShelves(inputs, 128, 1);
    expect(Number.isInteger(Math.log2(result.width))).toBe(true);
    expect(Number.isInteger(Math.log2(result.height))).toBe(true);
    for (const a of result.placements) {
      expect(a.x + a.w).toBeLessThanOrEqual(result.width);
      expect(a.y + a.h).toBeLessThanOrEqual(result.height);
      for (const b of result.placements) {
        if (a === b) continue;
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap).toBe(false);
      }
    }
  });

  it('rejects rects wider than the atlas', () => {
    expect(() => packShelves([{ id: 'big', w: 300, h: 1 }], 256, 1)).toThrow(
      /wider than the atlas/,
    );
  });
});
