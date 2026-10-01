/** Output sample rate for every SFX. */
export const SAMPLE_RATE = 44_100;

/** Parameters of one sfxr-style sound: an oscillator with a pitch slide and an AD envelope. */
export interface SfxRecipe {
  readonly wave: 'square' | 'saw' | 'noise' | 'triangle';
  /** Start / end frequency in Hz (exponential slide). */
  readonly freqStart: number;
  readonly freqEnd: number;
  readonly attackMs: number;
  readonly decayMs: number;
  /** Peak amplitude 0–1. */
  readonly volume: number;
  /** Square duty cycle 0–1. */
  readonly duty?: number;
}

/**
 * The three M1 sounds (ART_DIRECTION §6/§8: crisp, < 400 ms). Recipes are the source of truth;
 * `npm run assets:sfx` regenerates the audio sprite from them.
 */
export const SFX_RECIPES: Readonly<Record<string, SfxRecipe>> = {
  sfx_shot: {
    wave: 'square',
    freqStart: 1400,
    freqEnd: 500,
    attackMs: 2,
    decayMs: 90,
    volume: 0.35,
    duty: 0.25,
  },
  sfx_hit: {
    wave: 'saw',
    freqStart: 700,
    freqEnd: 200,
    attackMs: 1,
    decayMs: 70,
    volume: 0.45,
  },
  sfx_explode_s: {
    wave: 'noise',
    freqStart: 2200,
    freqEnd: 300,
    attackMs: 3,
    decayMs: 320,
    volume: 0.6,
  },
  sfx_pickup: {
    wave: 'triangle',
    freqStart: 700,
    freqEnd: 1800,
    attackMs: 2,
    decayMs: 140,
    volume: 0.45,
  },
  sfx_bomb: {
    wave: 'noise',
    freqStart: 180,
    freqEnd: 50,
    attackMs: 4,
    decayMs: 280,
    volume: 0.7,
  },
  sfx_player_die: {
    wave: 'saw',
    freqStart: 520,
    freqEnd: 90,
    attackMs: 8,
    decayMs: 360,
    volume: 0.65,
  },
  sfx_boss_phase: {
    wave: 'square',
    freqStart: 180,
    freqEnd: 680,
    attackMs: 12,
    decayMs: 260,
    volume: 0.6,
    duty: 0.35,
  },
};

/** Renders a recipe to mono float samples in [-1, 1]. Deterministic (own LCG for noise). */
export function renderSfx(recipe: SfxRecipe): Float32Array {
  const attack = Math.round((recipe.attackMs / 1000) * SAMPLE_RATE);
  const decay = Math.round((recipe.decayMs / 1000) * SAMPLE_RATE);
  const length = attack + decay;
  const out = new Float32Array(length);
  const duty = recipe.duty ?? 0.5;
  let phase = 0;
  let seed = 0x1234567;
  let noise = 0;
  let lastCycle = -1;
  for (let i = 0; i < length; i += 1) {
    const t = i / length;
    const freq = recipe.freqStart * (recipe.freqEnd / recipe.freqStart) ** t;
    phase += freq / SAMPLE_RATE;
    const frac = phase % 1;
    let sample: number;
    switch (recipe.wave) {
      case 'square':
        sample = frac < duty ? 1 : -1;
        break;
      case 'saw':
        sample = 2 * frac - 1;
        break;
      case 'triangle':
        sample = 1 - 4 * Math.abs(frac - 0.5);
        break;
      case 'noise': {
        // Sample-and-hold noise: a new random value every half cycle gives pitched noise.
        const cycle = Math.floor(phase * 2);
        if (cycle !== lastCycle) {
          lastCycle = cycle;
          seed = (Math.imul(seed, 1_103_515_245) + 12_345) >>> 0;
          noise = (seed / 0x1_0000_0000) * 2 - 1;
        }
        sample = noise;
        break;
      }
    }
    const env = i < attack ? i / Math.max(1, attack) : (1 - (i - attack) / decay) ** 2;
    out[i] = sample * env * recipe.volume;
  }
  return out;
}

/** Encodes mono float samples as a 16-bit PCM WAV file. */
export function encodeWav(samples: Float32Array): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32_767), i * 2);
  });
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

/** One clip inside the audio sprite (seconds). */
export interface SpriteClip {
  readonly start: number;
  readonly end: number;
  readonly loop: boolean;
}

/** Phaser audio-sprite JSON (`load.audioSprite`). */
export interface AudioSpriteData {
  readonly resources: readonly string[];
  readonly spritemap: Readonly<Record<string, SpriteClip>>;
}

/** Silence between clips so decoder padding never bleeds into the next sound. */
const GAP_SECONDS = 0.25;

/** Concatenates every recipe (sorted by key) into one buffer plus its spritemap. */
export function buildAudioSprite(
  recipes: Readonly<Record<string, SfxRecipe>>,
  resources: readonly string[],
): { samples: Float32Array; data: AudioSpriteData } {
  const gap = Math.round(GAP_SECONDS * SAMPLE_RATE);
  const rendered = Object.entries(recipes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, recipe]) => [key, renderSfx(recipe)] as const);
  const total = rendered.reduce((sum, [, s]) => sum + s.length + gap, 0);
  const samples = new Float32Array(total);
  const spritemap: Record<string, SpriteClip> = {};
  let offset = 0;
  for (const [key, clip] of rendered) {
    samples.set(clip, offset);
    spritemap[key] = {
      start: Number((offset / SAMPLE_RATE).toFixed(4)),
      end: Number(((offset + clip.length) / SAMPLE_RATE).toFixed(4)),
      loop: false,
    };
    offset += clip.length + gap;
  }
  return { samples, data: { resources, spritemap } };
}
