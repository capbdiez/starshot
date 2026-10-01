import { describe, expect, it } from 'vitest';
import { starHash } from '../../src/presentation/fx/visual-fx.ts';

describe('starfield distribution', () => {
  it('is deterministic and scatters consecutive seeds', () => {
    expect(starHash(42)).toBe(starHash(42));
    expect(starHash(42)).not.toBe(starHash(43));
  });
});
