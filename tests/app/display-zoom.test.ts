import { describe, expect, it } from 'vitest';
import { displayZoom } from '../../src/app/display-zoom.ts';
import { integerScale, PRESENTATION_HEIGHT, PRESENTATION_WIDTH } from '../../src/shared/index.ts';

describe('integer scaling', () => {
  it('picks the largest whole scale that fits', () => {
    expect(integerScale(1920, 1080, PRESENTATION_WIDTH, PRESENTATION_HEIGHT)).toBe(1);
    expect(integerScale(1080, 1920, PRESENTATION_WIDTH, PRESENTATION_HEIGHT)).toBe(2);
  });

  it('never goes below 1× and handles empty sizes', () => {
    expect(integerScale(100, 100, PRESENTATION_WIDTH, PRESENTATION_HEIGHT)).toBe(1);
    expect(integerScale(0, 0, PRESENTATION_WIDTH, PRESENTATION_HEIGHT)).toBe(1);
  });

  it('maps each game pixel to whole device pixels at fractional devicePixelRatio', () => {
    const zoom = displayZoom(
      { width: 1600, height: 900, pixelRatio: 1.2 },
      PRESENTATION_WIDTH,
      PRESENTATION_HEIGHT,
    );
    // 900 CSS px × 1.2 = 1080 device px → 1× device scale → CSS zoom 1 / 1.2.
    expect(zoom * 1.2).toBeCloseTo(1);
    expect(PRESENTATION_HEIGHT * zoom).toBeLessThanOrEqual(900);
  });

  it('uses a fitting fractional fallback below 1×', () => {
    expect(
      displayZoom(
        { width: 270, height: 480, pixelRatio: 1 },
        PRESENTATION_WIDTH,
        PRESENTATION_HEIGHT,
      ),
    ).toBe(0.5);
  });

  it('treats an invalid pixel ratio as 1', () => {
    expect(
      displayZoom(
        { width: 1920, height: 1080, pixelRatio: 0 },
        PRESENTATION_WIDTH,
        PRESENTATION_HEIGHT,
      ),
    ).toBe(1);
  });
});
