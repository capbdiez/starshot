import { SAMPLE_RATE } from './sfx-synth.ts';

/** One note in a code-authored looping chiptune sequence. */
export interface MusicNote {
  readonly beat: number;
  readonly length: number;
  readonly midi: number;
  readonly volume: number;
  readonly wave: 'square' | 'triangle';
}

/** One deterministic music loop rendered by `npm run assets:music`. */
export interface MusicTrack {
  readonly bpm: number;
  readonly beats: number;
  readonly notes: readonly MusicNote[];
}

const beat = (step: number, midi: number, wave: MusicNote['wave'], volume: number): MusicNote => ({
  beat: step / 2,
  length: 0.45,
  midi,
  wave,
  volume,
});

const arpeggio = (notes: readonly number[], wave: MusicNote['wave'], volume: number): MusicNote[] =>
  notes.flatMap((midi, step) => [beat(step, midi, wave, volume)]);

/** M5 loops are eight seconds; M7 end-of-run cues are two-second one-shots. */
export const MUSIC_TRACKS: Readonly<
  Record<
    'music_title' | 'music_stage' | 'music_boss' | 'music_game_over' | 'music_victory',
    MusicTrack
  >
> = {
  music_title: {
    bpm: 120,
    beats: 16,
    notes: [
      ...arpeggio(
        [60, 64, 67, 72, 67, 64, 62, 65, 69, 74, 69, 65, 55, 59, 62, 67],
        'triangle',
        0.18,
      ),
      ...[48, 48, 53, 53, 45, 45, 43, 43].flatMap((midi, step) => [
        { beat: step * 2, length: 1.7, midi, wave: 'square' as const, volume: 0.09 },
      ]),
    ],
  },
  music_stage: {
    bpm: 120,
    beats: 16,
    notes: [
      ...arpeggio([72, 76, 79, 84, 79, 76, 74, 77, 81, 86, 81, 77, 71, 74, 79, 83], 'square', 0.16),
      ...[36, 36, 41, 41, 43, 43, 38, 38].flatMap((midi, step) => [
        { beat: step * 2, length: 1.5, midi, wave: 'triangle' as const, volume: 0.13 },
      ]),
    ],
  },
  music_boss: {
    bpm: 120,
    beats: 16,
    notes: [
      ...arpeggio([48, 51, 55, 60, 55, 51, 46, 50, 53, 58, 53, 50, 45, 48, 52, 57], 'square', 0.18),
      ...[31, 31, 29, 29, 34, 34, 27, 27].flatMap((midi, step) => [
        { beat: step * 2, length: 1.6, midi, wave: 'triangle' as const, volume: 0.18 },
      ]),
    ],
  },
  music_game_over: {
    bpm: 120,
    beats: 4,
    notes: [
      { beat: 0, length: 0.8, midi: 57, wave: 'square', volume: 0.2 },
      { beat: 1, length: 0.8, midi: 52, wave: 'square', volume: 0.18 },
      { beat: 2, length: 1.6, midi: 45, wave: 'triangle', volume: 0.2 },
      { beat: 2.5, length: 0.7, midi: 33, wave: 'square', volume: 0.1 },
    ],
  },
  music_victory: {
    bpm: 120,
    beats: 4,
    notes: [
      ...arpeggio([72, 76, 79, 84], 'square', 0.2),
      { beat: 0, length: 1.6, midi: 48, wave: 'triangle', volume: 0.13 },
      { beat: 2, length: 1.8, midi: 60, wave: 'triangle', volume: 0.2 },
      { beat: 2, length: 1.8, midi: 67, wave: 'square', volume: 0.14 },
    ],
  },
};

function frequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Renders a deterministic mono PCM loop. Notes end before their beat boundary, so the loop is seamless. */
export function renderMusic(track: MusicTrack): Float32Array {
  const seconds = (track.beats * 60) / track.bpm;
  const samples = new Float32Array(Math.round(seconds * SAMPLE_RATE));
  for (const note of track.notes) {
    const start = Math.round(((note.beat * 60) / track.bpm) * SAMPLE_RATE);
    const length = Math.round(((note.length * 60) / track.bpm) * SAMPLE_RATE);
    const end = Math.min(samples.length, start + length);
    const freq = frequency(note.midi);
    for (let i = start; i < end; i += 1) {
      const progress = (i - start) / Math.max(1, end - start);
      const phase = ((i - start) * freq) / SAMPLE_RATE;
      const fraction = phase % 1;
      const oscillator =
        note.wave === 'square' ? (fraction < 0.25 ? 1 : -1) : 1 - 4 * Math.abs(fraction - 0.5);
      const envelope = Math.min(1, progress * 30, (1 - progress) * 16);
      const current = samples[i] ?? 0;
      samples[i] = Math.max(-1, Math.min(1, current + oscillator * envelope * note.volume));
    }
  }
  return samples;
}
