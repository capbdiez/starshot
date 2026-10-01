import { describe, expect, it } from 'vitest';
import { MUSIC_TRACKS, renderMusic } from '../../tools/lib/music-synth.ts';
import { SAMPLE_RATE } from '../../tools/lib/sfx-synth.ts';

describe('generated music', () => {
  it('renders deterministic, non-clipping loops and end-of-run cues', () => {
    const durations = {
      music_title: 8,
      music_stage: 8,
      music_boss: 8,
      music_game_over: 2,
      music_victory: 2,
    } as const;
    expect(Object.keys(MUSIC_TRACKS).sort()).toEqual(Object.keys(durations).sort());
    for (const [key, track] of Object.entries(MUSIC_TRACKS)) {
      const samples = renderMusic(track);
      expect(samples).toEqual(renderMusic(track));
      expect(samples.length / SAMPLE_RATE).toBe(durations[key as keyof typeof durations]);
      expect(
        samples.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0),
      ).toBeLessThanOrEqual(1);
    }
  }, 30_000);
});
