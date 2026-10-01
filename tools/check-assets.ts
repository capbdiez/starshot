/**
 * CI asset gates (ART_DIRECTION §9): content schemas, palette, manifest ↔ atlas keys,
 * required clips and frame sizes. Exits non-zero with a list of every problem found.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assetManifestSchema, validateContent } from '../src/content/index.ts';
import { checkManifest, checkPalette, type LoadedAtlas } from './lib/check.ts';
import { phaserAtlasSchema } from './lib/formats.ts';
import { readPng } from './lib/image.ts';
import { parsePalette } from './lib/palette.ts';
import { PATHS, readContentFiles, readJson } from './lib/repo.ts';

function run(): string[] {
  const contentResult = validateContent(readContentFiles());
  if (!contentResult.ok) {
    return contentResult.issues.map((issue) => `content/${issue.file}: ${issue.message}`);
  }

  const palette = new Set(parsePalette(readFileSync(PATHS.palette, 'utf8')));
  const manifestResult = assetManifestSchema.safeParse(readJson(PATHS.manifest));
  if (!manifestResult.success) {
    return manifestResult.error.issues.map(
      (issue) => `assets/manifest.json: ${issue.path.join('.')}: ${issue.message}`,
    );
  }

  const errors: string[] = [];
  const atlases = new Map<string, LoadedAtlas>();
  for (const ref of manifestResult.data.atlases) {
    const parsed = phaserAtlasSchema.safeParse(readJson(join(PATHS.atlasDir, ref.data)));
    if (!parsed.success) {
      errors.push(`assets/atlas/${ref.data}: ${parsed.error.message}`);
      continue;
    }
    const atlas = {
      key: ref.key,
      data: parsed.data,
      image: readPng(join(PATHS.atlasDir, ref.image)),
    };
    atlases.set(ref.key, atlas);
    errors.push(...checkPalette(atlas, palette));
  }
  errors.push(...checkManifest(contentResult.content, manifestResult.data, atlases));
  for (const [key, sprite] of Object.entries(manifestResult.data.sprites)) {
    if (sprite.placeholder)
      errors.push(`assets/manifest.json: sprite "${key}" is still a placeholder`);
  }
  return errors;
}

const errors = run();
if (errors.length > 0) {
  process.stderr.write(`check:assets failed with ${String(errors.length)} error(s):\n`);
  for (const error of errors) {
    process.stderr.write(`  ✗ ${error}\n`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write('check:assets passed (content, palette, manifest, sizes)\n');
}
