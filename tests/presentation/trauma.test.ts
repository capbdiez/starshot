import { describe, expect, it } from 'vitest';
import { Trauma } from '../../src/presentation/fx/trauma.ts';

describe('camera trauma', () => {
  it('squares intensity and decays independently of render frame rate', () => {
    const trauma = new Trauma();
    trauma.add(0.5);
    expect(trauma.advance(0, 1)).toBeCloseTo(0.25);
    expect(trauma.advance(100, 1)).toBeCloseTo(0.16);
    expect(trauma.amount).toBeCloseTo(0.4);
  });

  it('saturates additions and never decays below zero', () => {
    const trauma = new Trauma();
    trauma.add(2);
    expect(trauma.amount).toBe(1);
    expect(trauma.advance(2_000, 1)).toBe(0);
  });
});
