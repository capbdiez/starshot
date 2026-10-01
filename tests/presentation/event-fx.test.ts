import { describe, expect, it } from 'vitest';
import { reactionsFor, smooth } from '../../src/presentation/fx/event-fx.ts';

const fx = {
  PlayerFired: { sfx: 'sfx_shot' },
  PlayerHit: { sfx: 'sfx_explode_s', flash: true },
};

describe('event → effect mapping', () => {
  it('plays mapped SFX in order and ignores unmapped events', () => {
    const reactions = reactionsFor(fx, [
      { type: 'WaveStarted', wave: 1 },
      { type: 'PlayerFired', id: 1, x: 0, y: 0 },
      { type: 'PlayerFired', id: 2, x: 0, y: 0 },
    ]);
    expect(reactions).toEqual({
      reactions: [
        { event: { type: 'PlayerFired', id: 1, x: 0, y: 0 }, entry: { sfx: 'sfx_shot' } },
        { event: { type: 'PlayerFired', id: 2, x: 0, y: 0 }, entry: { sfx: 'sfx_shot' } },
      ],
      flash: false,
    });
  });

  it('requests a flash when any event asks for one', () => {
    const reactions = reactionsFor(fx, [{ type: 'PlayerHit', x: 1, y: 2, livesLeft: 2 }]);
    expect(reactions.flash).toBe(true);
  });
});

describe('render smoothing', () => {
  it('interpolates between ticks and snaps to whole pixels', () => {
    expect(smooth(10, 20, 0)).toBe(10);
    expect(smooth(10, 20, 0.5)).toBe(15);
    expect(smooth(10, 12.5, 0.99)).toBe(12);
  });
});
