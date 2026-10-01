/** Renders deterministic M5 music loops into `assets/audio/music_*.{ogg,m4a}` using ffmpeg. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MUSIC_TRACKS, renderMusic } from './lib/music-synth.ts';
import { PATHS } from './lib/repo.ts';
import { encodeWav } from './lib/sfx-synth.ts';

const ffmpeg = process.env['FFMPEG'] ?? 'ffmpeg';
mkdirSync(PATHS.audioDir, { recursive: true });

for (const [name, track] of Object.entries(MUSIC_TRACKS)) {
  const wav = join(tmpdir(), `starshot-${name}-${String(process.pid)}.wav`);
  writeFileSync(wav, encodeWav(renderMusic(track)));
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
      join(PATHS.audioDir, `${name}.ogg`),
    ]);
    execFileSync(ffmpeg, [
      ...common,
      '-c:a',
      'aac',
      '-b:a',
      '96k',
      '-fflags',
      '+bitexact',
      join(PATHS.audioDir, `${name}.m4a`),
    ]);
  } finally {
    rmSync(wav, { force: true });
  }
  process.stdout.write(`Music assets/audio/${name}: ${String(track.beats)} beats\n`);
}
