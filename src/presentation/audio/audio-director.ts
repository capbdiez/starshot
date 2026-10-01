/** Sound implementation needed by the data-driven AudioDirector. */
export interface SoundPlayer {
  play(
    clip: string,
    config: Readonly<{ volume: number; rate: number }>,
  ): { once(event: string, cb: () => void): void } | undefined;
}

/** Per-bus gain configuration; settings UI will own these values in M5. */
export interface AudioSettings {
  readonly music: number;
  readonly sfx: number;
  readonly ui: number;
}

const DEFAULT_SETTINGS: AudioSettings = { music: 1, sfx: 1, ui: 1 };

/**
 * Applies voice caps and pitch variance to event-driven SFX. Phaser owns decoding and playback;
 * this class owns the policy, so it is independently testable.
 */
export class AudioDirector {
  private readonly active = new Map<string, number>();
  private settings: AudioSettings = DEFAULT_SETTINGS;
  private readonly player: SoundPlayer;
  private readonly random: () => number;

  constructor(player: SoundPlayer, random: () => number = Math.random) {
    this.player = player;
    this.random = random;
  }

  setSettings(settings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  play(clip: string, voiceLimit = 4, pitchVariance = 0): boolean {
    const count = this.active.get(clip) ?? 0;
    if (count >= voiceLimit) return false;
    const rate = 1 + (this.random() * 2 - 1) * pitchVariance;
    const sound = this.player.play(clip, { volume: this.settings.sfx, rate });
    if (!sound) return false;
    this.active.set(clip, count + 1);
    sound.once('complete', () => {
      this.release(clip);
    });
    return true;
  }

  /** Number of active voices for a clip, exposed for tests and debug tooling. */
  voices(clip: string): number {
    return this.active.get(clip) ?? 0;
  }

  private release(clip: string): void {
    const count = this.active.get(clip) ?? 0;
    if (count <= 1) this.active.delete(clip);
    else this.active.set(clip, count - 1);
  }
}
