import { InputBit, NO_INPUT, type InputFrame } from '../../shared/index.ts';

/** Position relative to the touch-control surface in CSS pixels. */
export interface TouchPoint {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Maps the lower four equal-width control zones to the stable replay input bits. */
export function touchZoneBit(point: TouchPoint): InputFrame {
  if (point.width <= 0 || point.height <= 0 || point.y < point.height * 0.6) return NO_INPUT;
  if (point.x < 0 || point.x > point.width) return NO_INPUT;
  const zone = Math.min(3, Math.floor((point.x / point.width) * 4));
  return [InputBit.left, InputBit.right, InputBit.fire, InputBit.bomb][zone] ?? NO_INPUT;
}

/** DOM surface required by the Pointer Events touch adapter. */
export interface TouchSurface {
  getBoundingClientRect(): {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
  setPointerCapture(pointerId: number): void;
  addEventListener(type: string, listener: (event: PointerEvent) => void): void;
  removeEventListener(type: string, listener: (event: PointerEvent) => void): void;
}

/** Browser lifecycle surface used to make held touch state interruption-safe. */
export interface TouchLifecycleWindow {
  addEventListener(type: 'blur', listener: () => void): void;
  removeEventListener(type: 'blur', listener: () => void): void;
}

export interface TouchLifecycleDocument {
  readonly hidden: boolean;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

/** Held touch controls, independently tracked by pointer ID. */
export interface TouchInputAdapter {
  poll(): InputFrame;
  clear(): void;
  dispose(): void;
}

/**
 * Converts captured touch pointers on `surface` into existing input bits. The lower 40% is split
 * left-to-right into move-left, move-right, held fire, and bomb zones. It intentionally has no UI.
 */
export function createTouchInputAdapter(
  surface: TouchSurface,
  win: TouchLifecycleWindow,
  document: TouchLifecycleDocument,
  onFirstTouch?: () => void,
): TouchInputAdapter {
  const held = new Map<number, InputFrame>();
  let touched = false;
  const clear = (): void => {
    held.clear();
  };
  const onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') return;
    const rect = surface.getBoundingClientRect();
    const bit = touchZoneBit({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    });
    if (bit === NO_INPUT) return;
    event.preventDefault();
    surface.setPointerCapture(event.pointerId);
    held.set(event.pointerId, bit);
    if (!touched) {
      touched = true;
      onFirstTouch?.();
    }
  };
  const onPointerEnd = (event: PointerEvent): void => {
    held.delete(event.pointerId);
  };
  const onVisibilityChange = (): void => {
    if (document.hidden) clear();
  };
  surface.addEventListener('pointerdown', onPointerDown);
  surface.addEventListener('pointerup', onPointerEnd);
  surface.addEventListener('pointercancel', onPointerEnd);
  surface.addEventListener('lostpointercapture', onPointerEnd);
  win.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    poll() {
      let bits = NO_INPUT;
      for (const bit of held.values()) bits |= bit;
      return bits;
    },
    clear,
    dispose() {
      surface.removeEventListener('pointerdown', onPointerDown);
      surface.removeEventListener('pointerup', onPointerEnd);
      surface.removeEventListener('pointercancel', onPointerEnd);
      surface.removeEventListener('lostpointercapture', onPointerEnd);
      win.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clear();
    },
  };
}

/** Produces one {@link InputFrame} per simulation tick from the physical devices. */
export interface InputSource {
  /** Current state of every device, encoded as an InputFrame. */
  poll(): InputFrame;
  /** Clears captured touch pointers after a viewport interruption. */
  clearTouchState(): void;
  /** Removes all DOM listeners. */
  dispose(): void;
}

/** Keyboard layout from FR-02 (KeyboardEvent.code values, layout independent). */
const KEY_BITS: Readonly<Record<string, number>> = {
  ArrowLeft: InputBit.left,
  KeyA: InputBit.left,
  ArrowRight: InputBit.right,
  KeyD: InputBit.right,
  KeyZ: InputBit.fire,
  Space: InputBit.fire,
  KeyX: InputBit.bomb,
};

/** Analog stick dead zone. */
const STICK_DEAD_ZONE = 0.4;
/** Standard-mapping buttons: A/B/X/Y fire, d-pad left/right move. */
const PAD_FIRE_BUTTONS = [0, 1, 2, 3];
const PAD_BOMB_BUTTON = 4;
const PAD_LEFT = 14;
const PAD_RIGHT = 15;

/** Minimal Gamepad shape used here (keeps the mapper testable without a browser). */
export interface PadState {
  readonly axes: readonly number[];
  readonly buttons: readonly { readonly pressed: boolean }[];
}

/** Combines independently sampled device frames without changing the replay bit layout. */
export function composeInputBits(...frames: readonly InputFrame[]): InputFrame {
  let bits = NO_INPUT;
  for (const frame of frames) bits |= frame;
  return bits;
}

/** Maps one gamepad (standard mapping) to input bits. */
export function padBits(pad: PadState): InputFrame {
  let bits = NO_INPUT;
  const x = pad.axes[0] ?? 0;
  if (x < -STICK_DEAD_ZONE || pad.buttons[PAD_LEFT]?.pressed) bits |= InputBit.left;
  if (x > STICK_DEAD_ZONE || pad.buttons[PAD_RIGHT]?.pressed) bits |= InputBit.right;
  if (PAD_FIRE_BUTTONS.some((i) => pad.buttons[i]?.pressed)) bits |= InputBit.fire;
  if (pad.buttons[PAD_BOMB_BUTTON]?.pressed) bits |= InputBit.bomb;
  return bits;
}

/** Input bit for a keyboard `code`, or 0 if the key is not bound. */
export function keyBit(code: string): number {
  return KEY_BITS[code] ?? 0;
}

/**
 * Keyboard + gamepad input. Keys are tracked as a held set (keydown/keyup); gamepads are
 * polled each tick. Bound keys have their default action (page scroll) suppressed.
 */
export function createInputSource(
  win: Window,
  surface?: HTMLElement,
  onFirstTouch?: () => void,
): InputSource {
  const touch = surface
    ? createTouchInputAdapter(surface, win, surface.ownerDocument, onFirstTouch)
    : undefined;
  const held = new Set<string>();
  const onKeyDown = (event: KeyboardEvent): void => {
    if (keyBit(event.code) === 0) return;
    event.preventDefault();
    held.add(event.code);
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    held.delete(event.code);
  };
  const onBlur = (): void => {
    held.clear();
  };
  win.addEventListener('keydown', onKeyDown);
  win.addEventListener('keyup', onKeyUp);
  win.addEventListener('blur', onBlur);

  return {
    poll() {
      let bits = NO_INPUT;
      for (const code of held) bits |= keyBit(code);
      const pads =
        typeof win.navigator.getGamepads === 'function' ? win.navigator.getGamepads() : [];
      for (const pad of pads) {
        if (pad?.connected) bits |= padBits(pad);
      }
      return composeInputBits(bits, touch?.poll() ?? NO_INPUT);
    },
    clearTouchState() {
      touch?.clear();
    },
    dispose() {
      win.removeEventListener('keydown', onKeyDown);
      win.removeEventListener('keyup', onKeyUp);
      win.removeEventListener('blur', onBlur);
      touch?.dispose();
      held.clear();
    },
  };
}
