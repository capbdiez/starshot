import { describe, expect, it } from 'vitest';
import { displayZoom } from '../../src/app/display-zoom.ts';
import { GAME_HEIGHT, GAME_WIDTH, integerScale } from '../../src/shared/index.ts';

describe('integer scaling', () => {
  it('picks the largest whole scale that fits', () => {
    expect(integerScale(1920, 1080, GAME_WIDTH, GAME_HEIGHT)).toBe(2);
    expect(integerScale(1080, 1920, GAME_WIDTH, GAME_HEIGHT)).toBe(4);
  });

  it('never goes below 1× and handles empty sizes', () => {
    expect(integerScale(100, 100, GAME_WIDTH, GAME_HEIGHT)).toBe(1);
    expect(integerScale(0, 0, GAME_WIDTH, GAME_HEIGHT)).toBe(1);
  });

  it('maps each game pixel to whole device pixels at fractional devicePixelRatio', () => {
    const zoom = displayZoom(
      { width: 1600, height: 900, pixelRatio: 1.2 },
      GAME_WIDTH,
      GAME_HEIGHT,
    );
    // 900 CSS px × 1.2 = 1080 device px → 2× device scale → CSS zoom 2 / 1.2.
    expect(zoom * 1.2).toBeCloseTo(2);
    expect(GAME_HEIGHT * zoom).toBeLessThanOrEqual(900);
  });

  it('treats an invalid pixel ratio as 1', () => {
    expect(displayZoom({ width: 1920, height: 1080, pixelRatio: 0 }, GAME_WIDTH, GAME_HEIGHT)).toBe(
      2,
    );
  });
});
