import { describe, expect, it } from 'vitest';
import { backgroundHash } from '../../src/presentation/background/layout.ts';

describe('stage background distribution', () => {
  it('is deterministic and scatters consecutive seeds', () => {
    expect(backgroundHash(42)).toBe(backgroundHash(42));
    expect(backgroundHash(42)).not.toBe(backgroundHash(43));
  });
});
