/**
 * Renders `SFX_RECIPES` into the SFX audio sprite: `assets/audio/sfx.{ogg,m4a,json}`
 * (ART_DIRECTION §8). Needs `ffmpeg` on PATH (set FFMPEG to override).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildAudioSprite, encodeWav, SFX_RECIPES } from './lib/sfx-synth.ts';
import { PATHS } from './lib/repo.ts';

const NAME = 'sfx';
const resources = [`${NAME}.ogg`, `${NAME}.m4a`];
const { samples, data } = buildAudioSprite(SFX_RECIPES, resources);

mkdirSync(PATHS.audioDir, { recursive: true });
const wav = join(tmpdir(), `starshot-${NAME}-${String(process.pid)}.wav`);
writeFileSync(wav, encodeWav(samples));
const ffmpeg = process.env['FFMPEG'] ?? 'ffmpeg';
const common = ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-map_metadata', '-1'];
try {
  execFileSync(ffmpeg, [
    ...common,
    '-c:a',
    'libvorbis',
    '-q:a',
    '5',
    '-fflags',
    '+bitexact',
    join(PATHS.audioDir, resources[0] ?? ''),
  ]);
  execFileSync(ffmpeg, [
    ...common,
    '-c:a',
    'aac',
    '-b:a',
    '96k',
    '-fflags',
    '+bitexact',
    join(PATHS.audioDir, resources[1] ?? ''),
  ]);
} finally {
  rmSync(wav, { force: true });
}
writeFileSync(join(PATHS.audioDir, `${NAME}.json`), `${JSON.stringify(data, null, 2)}\n`);
process.stdout.write(
  `Audio sprite assets/audio/${NAME}: ${String(Object.keys(data.spritemap).length)} clips\n`,
);
