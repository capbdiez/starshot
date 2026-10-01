import { describe, expect, it } from 'vitest';
import { keyBit, padBits, type PadState } from '../../src/platform/index.ts';
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
