import { describe, expect, it } from 'vitest';
import {
  composeInputBits,
  createTouchInputAdapter,
  keyBit,
  padBits,
  touchZoneBit,
  type PadState,
  type TouchLifecycleDocument,
  type TouchLifecycleWindow,
  type TouchSurface,
} from '../../src/platform/index.ts';
import { InputBit } from '../../src/shared/index.ts';

function pad(x: number, pressed: number[] = []): PadState {
  return {
    axes: [x, 0],
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) })),
  };
}

describe('keyboard mapping (FR-02)', () => {
  it('maps arrows, A/D, Z and Space', () => {
    expect(keyBit('ArrowLeft')).toBe(InputBit.left);
    expect(keyBit('KeyA')).toBe(InputBit.left);
    expect(keyBit('ArrowRight')).toBe(InputBit.right);
    expect(keyBit('KeyD')).toBe(InputBit.right);
    expect(keyBit('KeyZ')).toBe(InputBit.fire);
    expect(keyBit('Space')).toBe(InputBit.fire);
    expect(keyBit('KeyX')).toBe(InputBit.bomb);
    expect(keyBit('KeyQ')).toBe(0);
  });
});

class FakeTouchSurface implements TouchSurface {
  readonly captured: number[] = [];
  private readonly listeners = new Map<string, (event: PointerEvent) => void>();

  getBoundingClientRect() {
    return { left: 10, top: 20, width: 400, height: 500 };
  }
  setPointerCapture(pointerId: number): void {
    this.captured.push(pointerId);
  }
  addEventListener(type: string, listener: (event: PointerEvent) => void): void {
    this.listeners.set(type, listener);
  }
  removeEventListener(type: string, listener: (event: PointerEvent) => void): void {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
  }
  emit(type: string, pointerId: number, x = 0, y = 0, pointerType = 'touch'): void {
    let prevented = false;
    this.listeners.get(type)?.({
      pointerId,
      clientX: x,
      clientY: y,
      pointerType,
      preventDefault: () => {
        prevented = true;
      },
    } as PointerEvent);
    if (type === 'pointerdown' && pointerType === 'touch') expect(prevented).toBe(y >= 320);
  }
}

class FakeTouchWindow implements TouchLifecycleWindow {
  private listener?: () => void;
  addEventListener(_type: 'blur', listener: () => void): void {
    this.listener = listener;
  }
  removeEventListener(_type: 'blur', listener: () => void): void {
    if (this.listener === listener) this.listener = undefined;
  }
  blur(): void {
    this.listener?.();
  }
}

class FakeTouchDocument implements TouchLifecycleDocument {
  hidden = false;
  private listener?: () => void;
  addEventListener(_type: 'visibilitychange', listener: () => void): void {
    this.listener = listener;
  }
  removeEventListener(_type: 'visibilitychange', listener: () => void): void {
    if (this.listener === listener) this.listener = undefined;
  }
  change(hidden: boolean): void {
    this.hidden = hidden;
    this.listener?.();
  }
}

describe('input composition (M10)', () => {
  it('preserves every held bit across keyboard, gamepad, and touch frames', () => {
    expect(composeInputBits(InputBit.left, InputBit.fire, InputBit.bomb)).toBe(
      InputBit.left | InputBit.fire | InputBit.bomb,
    );
  });
});

describe('touch input adapter (M10)', () => {
  it('classifies the four lower-screen zones without DOM state', () => {
    const point = { y: 300, width: 400, height: 500 };
    expect(touchZoneBit({ ...point, x: 0 })).toBe(InputBit.left);
    expect(touchZoneBit({ ...point, x: 100 })).toBe(InputBit.right);
    expect(touchZoneBit({ ...point, x: 200 })).toBe(InputBit.fire);
    expect(touchZoneBit({ ...point, x: 400 })).toBe(InputBit.bomb);
    expect(touchZoneBit({ ...point, x: 200, y: 299 })).toBe(0);
  });

  it('captures independent touch pointers and retains move plus fire', () => {
    const surface = new FakeTouchSurface();
    const adapter = createTouchInputAdapter(
      surface,
      new FakeTouchWindow(),
      new FakeTouchDocument(),
    );
    surface.emit('pointerdown', 1, 30, 320);
    surface.emit('pointerdown', 2, 250, 320);
    expect(surface.captured).toEqual([1, 2]);
    expect(adapter.poll()).toBe(InputBit.left | InputBit.fire);
    surface.emit('pointerdown', 3, 350, 320);
    expect(adapter.poll()).toBe(InputBit.left | InputBit.fire | InputBit.bomb);
    surface.emit('pointerup', 3);
    expect(adapter.poll()).toBe(InputBit.left | InputBit.fire);
  });

  it('clears touch state for cancellation, capture loss, blur, visibility, and disposal', () => {
    const surface = new FakeTouchSurface();
    const win = new FakeTouchWindow();
    const document = new FakeTouchDocument();
    const adapter = createTouchInputAdapter(surface, win, document);
    for (const interruption of ['pointercancel', 'lostpointercapture'] as const) {
      surface.emit('pointerdown', 1, 30, 320);
      surface.emit(interruption, 1);
      expect(adapter.poll()).toBe(0);
    }
    surface.emit('pointerdown', 1, 30, 320);
    win.blur();
    expect(adapter.poll()).toBe(0);
    surface.emit('pointerdown', 1, 30, 320);
    document.change(true);
    expect(adapter.poll()).toBe(0);
    surface.emit('pointerdown', 1, 30, 320);
    adapter.dispose();
    expect(adapter.poll()).toBe(0);
  });

  it('accepts touch only and unlocks audio once for the first valid touch', () => {
    const surface = new FakeTouchSurface();
    let unlocks = 0;
    const adapter = createTouchInputAdapter(
      surface,
      new FakeTouchWindow(),
      new FakeTouchDocument(),
      () => {
        unlocks += 1;
      },
    );
    surface.emit('pointerdown', 1, 30, 200);
    surface.emit('pointerdown', 2, 30, 320, 'mouse');
    surface.emit('pointerdown', 3, 30, 320);
    surface.emit('pointerdown', 4, 130, 320);
    expect(unlocks).toBe(1);
    expect(adapter.poll()).toBe(InputBit.left | InputBit.right);
  });
});

describe('gamepad mapping', () => {
  it('uses the stick with a dead zone', () => {
    expect(padBits(pad(0.2))).toBe(0);
    expect(padBits(pad(-0.9))).toBe(InputBit.left);
    expect(padBits(pad(0.9))).toBe(InputBit.right);
  });

  it('uses the d-pad and face buttons', () => {
    expect(padBits(pad(0, [14]))).toBe(InputBit.left);
    expect(padBits(pad(0, [15, 0]))).toBe(InputBit.right | InputBit.fire);
    expect(padBits(pad(0, [3]))).toBe(InputBit.fire);
    expect(padBits(pad(0, [4]))).toBe(InputBit.bomb);
  });

  it('tolerates pads with missing axes/buttons', () => {
    expect(padBits({ axes: [], buttons: [] })).toBe(0);
  });
});
