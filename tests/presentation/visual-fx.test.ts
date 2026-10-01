import { describe, expect, it } from 'vitest';
import { MAX_FX_PARTICLES, supportsOptionalPostFx } from '../../src/presentation/fx/visual-fx.ts';

describe('G7 FX compositor limits', () => {
  it('keeps the particle pool fixed at the 400-particle stress budget', () => {
    expect(MAX_FX_PARTICLES).toBe(400);
  });

  it('uses generated-geometry fallback when optional WebGL pipelines are unavailable', () => {
    expect(supportsOptionalPostFx(undefined)).toBe(false);
    expect(supportsOptionalPostFx({})).toBe(false);
    expect(supportsOptionalPostFx({ pipelines: {} })).toBe(true);
  });
});
