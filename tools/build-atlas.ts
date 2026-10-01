/**
 * Packs `assets/atlas/main.{png,json}` and `assets/manifest.json` from `content/animations`.
 * Sprites exported by `tools/export-aseprite.ts` (art-src/export/<key>.{png,json}) are used as-is;
 * all others get generated greybox placeholders.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadContent } from '../src/content/index.ts';
import { buildAtlas, MAIN_ATLAS, type SpriteSource } from './lib/atlas.ts';
import { asepriteSheetSchema } from './lib/formats.ts';
import { readPng, writePng } from './lib/image.ts';
import { PATHS, readContentFiles, readJson, ROOT } from './lib/repo.ts';

function loadSources(spriteKeys: readonly string[]): Map<string, SpriteSource> {
  const sources = new Map<string, SpriteSource>();
  for (const key of spriteKeys) {
    const png = join(PATHS.artExport, `${key}.png`);
    const json = join(PATHS.artExport, `${key}.json`);
    if (existsSync(png) && existsSync(json)) {
      sources.set(key, { image: readPng(png), sheet: asepriteSheetSchema.parse(readJson(json)) });
    }
  }
  return sources;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

const content = loadContent(readContentFiles());
const sources = loadSources(Object.keys(content.sprites));
const built = buildAtlas(content.sprites, sources);

mkdirSync(PATHS.atlasDir, { recursive: true });
writePng(join(PATHS.atlasDir, `${MAIN_ATLAS}.png`), built.image);
writeJson(join(PATHS.atlasDir, `${MAIN_ATLAS}.json`), built.data);
writeJson(PATHS.manifest, built.manifest);

const total = Object.keys(built.manifest.sprites).length;
const placeholders = Object.values(built.manifest.sprites).filter((s) => s.placeholder).length;
process.stdout.write(
  `Atlas ${relative(ROOT, PATHS.atlasDir)}/${MAIN_ATLAS}.png ` +
    `${String(built.image.width)}×${String(built.image.height)}: ` +
    `${String(Object.keys(built.data.frames).length)} frames, ${String(total)} sprites ` +
    `(${String(placeholders)} placeholder)\n`,
);
