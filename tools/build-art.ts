/**
 * Writes the code-authored sprites in `tools/art/sprites.ts` to `art-src/export/<key>.{png,json}`
 * (the same format `npm run assets:export` produces from Aseprite). Run before `assets:atlas`.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadContent } from '../src/content/index.ts';
import { SPRITE_ART } from './art/sprites.ts';
import { writePng } from './lib/image.ts';
import { buildSheet } from './lib/pixel-art.ts';
import { PATHS, readContentFiles } from './lib/repo.ts';

const content = loadContent(readContentFiles());
mkdirSync(PATHS.artExport, { recursive: true });
for (const [key, clips] of Object.entries(SPRITE_ART)) {
  const spec = content.sprites[key];
  if (!spec) throw new Error(`tools/art/sprites.ts: "${key}" is not defined in content`);
  // An artist's Aseprite source always takes precedence over the code-authored version.
  const aseprite = ['.aseprite', '.ase'].some((ext) =>
    existsSync(join(PATHS.artSprites, `${key}${ext}`)),
  );
  if (aseprite) {
    process.stdout.write(`Skipped ${key} (Aseprite source present)\n`);
    continue;
  }
  const { image, sheet } = buildSheet(spec, clips);
  writePng(join(PATHS.artExport, `${key}.png`), image);
  writeFileSync(join(PATHS.artExport, `${key}.json`), `${JSON.stringify(sheet, null, 2)}\n`);
  process.stdout.write(`Exported ${key} (${String(sheet.frames.length)} frames)\n`);
}
