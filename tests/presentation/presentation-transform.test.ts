import { describe, expect, it } from 'vitest';
import {
  PRESENTATION_HEIGHT,
  PRESENTATION_SCALE,
  PRESENTATION_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../../src/shared/index.ts';

describe('G2 world-to-presentation contract', () => {
  it('maps the complete world into the presentation buffer at the fixed 2× scale', () => {
    expect(PRESENTATION_SCALE).toBe(2);
    expect(WORLD_WIDTH * PRESENTATION_SCALE).toBe(PRESENTATION_WIDTH);
    expect(WORLD_HEIGHT * PRESENTATION_SCALE).toBe(PRESENTATION_HEIGHT);
  });

  it('keeps gameplay-relative world coordinates unchanged before presentation scaling', () => {
    const worldPosition = { x: 135, y: 420 };
    expect(worldPosition).toEqual({ x: WORLD_WIDTH / 2, y: 420 });
    expect({
      x: worldPosition.x * PRESENTATION_SCALE,
      y: worldPosition.y * PRESENTATION_SCALE,
    }).toEqual({ x: 270, y: 840 });
  });
});
