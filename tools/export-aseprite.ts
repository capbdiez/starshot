/**
 * Exports every `art-src/sprites/<sprite_key>.aseprite` with the Aseprite CLI to
 * `art-src/export/<sprite_key>.{png,json}` (one frame tag per animation clip, untrimmed).
 * Set ASEPRITE to the binary path if `aseprite` is not on PATH.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { SPRITE_KEY_PATTERN } from '../src/content/index.ts';
import { findFiles, PATHS, ROOT } from './lib/repo.ts';

const sources = [
  ...findFiles(PATHS.artSprites, '.aseprite'),
  ...findFiles(PATHS.artSprites, '.ase'),
];

if (sources.length === 0) {
  process.stdout.write('No Aseprite sources in art-src/sprites; every sprite uses placeholders.\n');
} else {
  const binary = process.env['ASEPRITE'] ?? 'aseprite';
  mkdirSync(PATHS.artExport, { recursive: true });
  for (const source of sources) {
    const key = basename(source).replace(/\.(aseprite|ase)$/, '');
    if (!SPRITE_KEY_PATTERN.test(key)) {
      throw new Error(
        `${relative(ROOT, source)}: file name must be the sprite key (e.g. player_ship)`,
      );
    }
    execFileSync(
      binary,
      [
        '--batch',
        source,
        '--sheet',
        join(PATHS.artExport, `${key}.png`),
        '--data',
        join(PATHS.artExport, `${key}.json`),
        '--format',
        'json-array',
        '--list-tags',
        '--sheet-type',
        'horizontal',
      ],
      { stdio: 'inherit' },
    );
    process.stdout.write(`Exported ${key}\n`);
  }
}
