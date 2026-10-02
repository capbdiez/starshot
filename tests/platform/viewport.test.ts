import { describe, expect, it } from 'vitest';
import {
  readViewport,
  watchViewport,
  type MediaQueryPort,
  type ViewportWindow,
  type VisualViewportPort,
} from '../../src/platform/index.ts';

type EventName = 'resize' | 'orientationchange';
type VisualEventName = 'resize' | 'scroll';

class FakeMediaQuery implements MediaQueryPort {
  private listener?: () => void;

  addEventListener(_type: 'change', listener: () => void): void {
    this.listener = listener;
  }

  removeEventListener(_type: 'change', listener: () => void): void {
    if (this.listener === listener) this.listener = undefined;
  }

  change(): void {
    this.listener?.();
  }
}

class FakeVisualViewport implements VisualViewportPort {
  width = 390;
  height = 664;
  private readonly listeners = new Map<VisualEventName, () => void>();

  addEventListener(type: VisualEventName, listener: () => void): void {
    this.listeners.set(type, listener);
  }

  removeEventListener(type: VisualEventName, listener: () => void): void {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
  }

  emit(type: VisualEventName): void {
    this.listeners.get(type)?.();
  }
}

class FakeWindow implements ViewportWindow {
  innerWidth = 400;
  innerHeight = 700;
  devicePixelRatio = 2;
  visualViewport?: FakeVisualViewport | null;
  readonly mediaQueries: FakeMediaQuery[] = [];
  private readonly listeners = new Map<EventName, () => void>();

  addEventListener(type: EventName, listener: () => void): void {
    this.listeners.set(type, listener);
  }

  removeEventListener(type: EventName, listener: () => void): void {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
  }

  matchMedia(): MediaQueryPort {
    const query = new FakeMediaQuery();
    this.mediaQueries.push(query);
    return query;
  }

  emit(type: EventName): void {
    this.listeners.get(type)?.();
  }
}

describe('viewport adapter', () => {
  it('prefers a valid VisualViewport and falls back to the layout viewport', () => {
    const win = new FakeWindow();
    win.visualViewport = new FakeVisualViewport();
    expect(readViewport(win)).toEqual({ width: 390, height: 664, pixelRatio: 2 });

    win.visualViewport.width = 0;
    expect(readViewport(win)).toEqual({ width: 400, height: 700, pixelRatio: 2 });
  });

  it('observes visual viewport, layout viewport, orientation, and pixel-ratio changes', () => {
    const win = new FakeWindow();
    const visual = new FakeVisualViewport();
    win.visualViewport = visual;
    const sizes: { width: number; height: number; pixelRatio: number }[] = [];
    const stop = watchViewport(win, (size) => sizes.push(size));

    visual.height = 620;
    visual.emit('resize');
    win.innerWidth = 700;
    win.innerHeight = 400;
    visual.width = 700;
    visual.height = 400;
    win.emit('orientationchange');
    win.devicePixelRatio = 3;
    win.mediaQueries.at(-1)?.change();
    stop();
    visual.height = 380;
    visual.emit('scroll');

    expect(sizes).toEqual([
      { width: 390, height: 664, pixelRatio: 2 },
      { width: 390, height: 620, pixelRatio: 2 },
      { width: 700, height: 400, pixelRatio: 2 },
      { width: 700, height: 400, pixelRatio: 3 },
    ]);
  });
});
