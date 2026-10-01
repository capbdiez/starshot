import { InputBit, NO_INPUT, type InputFrame } from '../../shared/index.ts';

/** Produces one {@link InputFrame} per simulation tick from the physical devices. */
export interface InputSource {
  /** Current state of every device, encoded as an InputFrame. */
  poll(): InputFrame;
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
};

/** Analog stick dead zone. */
const STICK_DEAD_ZONE = 0.4;
/** Standard-mapping buttons: A/B/X/Y fire, d-pad left/right move. */
const PAD_FIRE_BUTTONS = [0, 1, 2, 3];
const PAD_LEFT = 14;
const PAD_RIGHT = 15;

/** Minimal Gamepad shape used here (keeps the mapper testable without a browser). */
export interface PadState {
  readonly axes: readonly number[];
  readonly buttons: readonly { readonly pressed: boolean }[];
}

/** Maps one gamepad (standard mapping) to input bits. */
export function padBits(pad: PadState): InputFrame {
  let bits = NO_INPUT;
  const x = pad.axes[0] ?? 0;
  if (x < -STICK_DEAD_ZONE || pad.buttons[PAD_LEFT]?.pressed) bits |= InputBit.left;
  if (x > STICK_DEAD_ZONE || pad.buttons[PAD_RIGHT]?.pressed) bits |= InputBit.right;
  if (PAD_FIRE_BUTTONS.some((i) => pad.buttons[i]?.pressed)) bits |= InputBit.fire;
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
export function createInputSource(win: Window): InputSource {
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
      return bits;
    },
    dispose() {
      win.removeEventListener('keydown', onKeyDown);
      win.removeEventListener('keyup', onKeyUp);
      win.removeEventListener('blur', onBlur);
      held.clear();
    },
  };
}
