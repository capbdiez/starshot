import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContent } from '../../src/content/index.ts';
import { SPRITE_ART } from '../../tools/art/sprites.ts';
import { findPaletteViolations, parsePalette } from '../../tools/lib/palette.ts';
import { buildSheet, gridImage } from '../../tools/lib/pixel-art.ts';
import { PATHS, readContentFiles } from '../../tools/lib/repo.ts';
import {
  buildAudioSprite,
  renderSfx,
  SAMPLE_RATE,
  SFX_RECIPES,
} from '../../tools/lib/sfx-synth.ts';

const content = loadContent(readContentFiles());
const palette = new Set(parsePalette(readFileSync(PATHS.palette, 'utf8')));

describe('final M1 sprite art', () => {
  it('covers the player ship, Grunt and both bullet types', () => {
    expect(Object.keys(SPRITE_ART).sort()).toEqual(
      ['enemy_bullet', 'enemy_grunt', 'player_ship', 'player_shot'].sort(),
    );
  });

  it('matches content sizes and clip frame counts and uses only palette colours', () => {
    for (const [key, clips] of Object.entries(SPRITE_ART)) {
      const spec = content.sprites[key];
      if (!spec) throw new Error(`${key} missing from content`);
      const { image, sheet } = buildSheet(spec, clips);
      for (const tag of sheet.meta.frameTags) {
        expect(tag.to - tag.from + 1).toBe(spec.clips[tag.name]?.frames);
      }
      expect(findPaletteViolations(image, palette)).toEqual([]);
    }
  });

  it('rejects grids with the wrong size or unknown colours', () => {
    expect(() => gridImage(['..'], 2, 2, 't')).toThrow(/1 rows, expected 2/);
    expect(() => gridImage(['.Z'], 2, 1, 't')).toThrow(/unknown pixel "Z"/);
  });
});

describe('SFX audio sprite', () => {
  it('renders deterministic, short (< 400 ms), non-clipping sounds', () => {
    for (const recipe of Object.values(SFX_RECIPES)) {
      const a = renderSfx(recipe);
      expect(a).toEqual(renderSfx(recipe));
      expect(a.length / SAMPLE_RATE).toBeLessThan(0.4);
      expect(Math.max(...a.map(Math.abs))).toBeLessThanOrEqual(1);
    }
  });

  it('committed spritemap is up to date with the recipes', () => {
    const committed = JSON.parse(readFileSync(join(PATHS.audioDir, 'sfx.json'), 'utf8')) as unknown;
    const { data } = buildAudioSprite(SFX_RECIPES, ['sfx.ogg', 'sfx.m4a']);
    expect(committed).toEqual(data);
  });

  it('has non-overlapping clips', () => {
    const clips = Object.values(buildAudioSprite(SFX_RECIPES, []).data.spritemap).sort(
      (a, b) => a.start - b.start,
    );
    clips.slice(1).forEach((clip, i) => {
      expect(clip.start).toBeGreaterThan(clips[i]?.end ?? 0);
    });
  });
});
