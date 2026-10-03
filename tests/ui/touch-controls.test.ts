import { describe, expect, it } from 'vitest';
import { supportsTouchControls, touchControlLayout } from '../../src/ui/index.ts';
import {
  PRESENTATION_HEIGHT,
  PRESENTATION_SCALE,
  PRESENTATION_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../../src/shared/index.ts';

function capabilities(maxTouchPoints: number, coarse: boolean) {
  return {
    maxTouchPoints,
    matchMedia: () => ({ matches: coarse }),
  };
}

describe('M11 touch-control HUD layout', () => {
  it('uses fixed presentation coordinates inside the canvas bounds', () => {
    const layout = touchControlLayout();
    for (const bounds of [layout.left, layout.right, layout.fire, layout.bomb, layout.pause]) {
      expect(bounds.x - bounds.width / 2).toBeGreaterThanOrEqual(0);
      expect(bounds.y - bounds.height / 2).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width / 2).toBeLessThanOrEqual(WORLD_WIDTH);
      expect(bounds.y + bounds.height / 2).toBeLessThanOrEqual(WORLD_HEIGHT);
    }
    expect(WORLD_WIDTH * PRESENTATION_SCALE).toBe(PRESENTATION_WIDTH);
    expect(WORLD_HEIGHT * PRESENTATION_SCALE).toBe(PRESENTATION_HEIGHT);
    expect(layout.left).toMatchObject({ x: WORLD_WIDTH / 8, width: 28, height: 28 });
    expect(layout.right).toMatchObject({ x: (WORLD_WIDTH * 3) / 8, width: 28, height: 28 });
    expect(layout.fire).toMatchObject({ x: (WORLD_WIDTH * 5) / 8, width: 28, height: 28 });
    expect(layout.bomb).toMatchObject({ x: (WORLD_WIDTH * 7) / 8, width: 28, height: 28 });
    expect(layout.pause).toMatchObject({ width: 22, height: 18 });
    expect(layout.pause.y).toBeLessThan(layout.fire.y);
  });

  it('is capability-gated to coarse touch contexts', () => {
    expect(supportsTouchControls(capabilities(1, true))).toBe(true);
    expect(supportsTouchControls(capabilities(0, true))).toBe(false);
    expect(supportsTouchControls(capabilities(4, false))).toBe(false);
  });
});
