import { describe, expect, it } from 'vitest';
import { AudioDirector, type SoundPlayer } from '../../src/presentation/index.ts';

function player(): {
  readonly player: SoundPlayer;
  readonly complete: () => void;
  readonly calls: unknown[];
} {
  let onComplete: (() => void) | undefined;
  const calls: unknown[] = [];
  return {
    player: {
      play: (clip, config) => {
        calls.push({ clip, config });
        return { once: (_event, callback) => (onComplete = callback) };
      },
    },
    complete: () => onComplete?.(),
    calls,
  };
}

describe('AudioDirector', () => {
  it('enforces voice caps and releases a voice when playback completes', () => {
    const fake = player();
    const audio = new AudioDirector(fake.player, () => 0.5);
    expect(audio.play('sfx_shot', 1)).toBe(true);
    expect(audio.play('sfx_shot', 1)).toBe(false);
    expect(audio.voices('sfx_shot')).toBe(1);
    fake.complete();
    expect(audio.voices('sfx_shot')).toBe(0);
    expect(audio.play('sfx_shot', 1)).toBe(true);
  });

  it('uses the configured SFX bus volume and pitch variance', () => {
    const fake = player();
    const audio = new AudioDirector(fake.player, () => 1);
    audio.setSettings({ sfx: 0.4 });
    audio.play('sfx_hit', 2, 0.05);
    expect(fake.calls).toEqual([{ clip: 'sfx_hit', config: { volume: 0.4, rate: 1.05 } }]);
  });
});
