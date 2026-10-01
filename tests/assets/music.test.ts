import { describe, expect, it } from 'vitest';
import { MUSIC_TRACKS, renderMusic } from '../../tools/lib/music-synth.ts';
import { SAMPLE_RATE } from '../../tools/lib/sfx-synth.ts';

describe('M5 generated music', () => {
  it('renders deterministic, non-clipping eight-second title and stage loops', () => {
    for (const track of Object.values(MUSIC_TRACKS)) {
      const samples = renderMusic(track);
      expect(samples).toEqual(renderMusic(track));
      expect(samples.length / SAMPLE_RATE).toBe(8);
      expect(
        samples.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0),
      ).toBeLessThanOrEqual(1);
    }
  });
});
