import { describe, expect, it } from 'vitest';
import { createGameLoop } from '../../src/app/game-loop.ts';
import { TICK_MS } from '../../src/shared/index.ts';

function makeLoop(maxFrameMs = 250) {
  let steps = 0;
  const loop = createGameLoop({
    stepMs: TICK_MS,
    maxFrameMs,
    step: () => {
      steps += 1;
    },
  });
  return { loop, steps: () => steps };
}

describe('GameLoop accumulator', () => {
  it('runs exactly one step per 60 Hz frame, with no drift over a long session', () => {
    const { loop, steps } = makeLoop();
    for (let i = 0; i < 3600; i += 1) {
      expect(loop.advance(TICK_MS)).toBe(1);
    }
    expect(steps()).toBe(3600);
  });

  it('accumulates short frames until a whole step fits', () => {
    const { loop, steps } = makeLoop();
    expect(loop.advance(TICK_MS / 2)).toBe(0);
    expect(loop.alpha).toBeCloseTo(0.5);
    expect(loop.advance(TICK_MS / 2)).toBe(1);
    expect(steps()).toBe(1);
    expect(loop.alpha).toBeCloseTo(0);
  });

  it('runs several steps for a long frame and keeps the remainder as alpha', () => {
    const { loop } = makeLoop();
    expect(loop.advance(TICK_MS * 2.25)).toBe(2);
    expect(loop.alpha).toBeCloseTo(0.25);
  });

  it('is frame-rate independent: 144 Hz and 30 Hz simulate the same number of steps', () => {
    const fast = makeLoop();
    const slow = makeLoop();
    for (let i = 0; i < 144; i += 1) fast.loop.advance(1000 / 144);
    for (let i = 0; i < 30; i += 1) slow.loop.advance(1000 / 30);
    expect(fast.steps()).toBe(60);
    expect(slow.steps()).toBe(60);
  });

  it('clamps huge gaps (tab switch) to maxFrameMs to avoid a spiral of death', () => {
    const { loop } = makeLoop(250);
    // 250 ms is exactly 15 ticks; float division alone would round this down to 14.
    expect(loop.advance(10_000)).toBe(15);
    expect(loop.alpha).toBeCloseTo(0);
  });

  it('ignores zero, negative and non-finite elapsed times', () => {
    const { loop, steps } = makeLoop();
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(loop.advance(bad)).toBe(0);
    }
    expect(steps()).toBe(0);
    expect(loop.alpha).toBe(0);
  });

  it('reset() drops accumulated time', () => {
    const { loop } = makeLoop();
    loop.advance(TICK_MS * 0.9);
    loop.reset();
    expect(loop.alpha).toBe(0);
    expect(loop.advance(TICK_MS * 0.5)).toBe(0);
  });

  it('rejects invalid configuration', () => {
    const step = (): void => undefined;
    expect(() => createGameLoop({ stepMs: 0, maxFrameMs: 100, step })).toThrow(RangeError);
    expect(() => createGameLoop({ stepMs: 10, maxFrameMs: 5, step })).toThrow(RangeError);
  });
});
