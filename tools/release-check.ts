/**
 * G9 release-candidate gate: verifies locally reproducible release artifacts.
 * Device performance, cold-load timing, and target-browser evidence remain manual checklist items.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { assetManifestSchema } from '../src/content/index.ts';
import { findFiles, PATHS, readJson, ROOT } from './lib/repo.ts';
import { join } from 'node:path';

const GZIP_BUDGET_BYTES = 5 * 1024 * 1024;
const REQUIRED_RELEASE_FILES = [
  'CHANGELOG.md',
  'docs/known-issues.md',
  'docs/release-checklist.md',
  'docs/ART_DIRECTION.md',
  'release/store-page.md',
  'release/capture-guide.md',
] as const;
const DIST = join(ROOT, 'dist');

function compressedSize(paths: readonly string[]): number {
  return paths.reduce(
    (total, path) => total + gzipSync(readFileSync(path), { level: 9 }).byteLength,
    0,
  );
}

function run(): string[] {
  const errors: string[] = [];
  for (const file of REQUIRED_RELEASE_FILES) {
    if (!existsSync(join(ROOT, file))) errors.push(`missing required release file: ${file}`);
  }

  const manifest = assetManifestSchema.safeParse(readJson(PATHS.manifest));
  if (!manifest.success) {
    errors.push(`assets/manifest.json is invalid: ${manifest.error.message}`);
  } else {
    const placeholders = Object.entries(manifest.data.sprites)
      .filter(([, sprite]) => sprite.placeholder)
      .map(([key]) => key);
    if (placeholders.length > 0)
      errors.push(`placeholder sprites remain: ${placeholders.join(', ')}`);
  }

  if (!existsSync(DIST)) {
    errors.push('dist/ is missing; run npm run build before release:check');
    return errors;
  }
  const files = findFiles(DIST, '');
  if (files.length === 0) errors.push('dist/ contains no release files');
  const bytes = compressedSize(files.filter((path) => statSync(path).isFile()));
  if (bytes > GZIP_BUDGET_BYTES)
    errors.push(
      `gzip distribution is ${String(bytes)} bytes; budget is ${String(GZIP_BUDGET_BYTES)} bytes`,
    );
  else process.stdout.write(`release:check gzip_total_bytes=${String(bytes)}\n`);
  return errors;
}

const errors = run();
if (errors.length > 0) {
  process.stderr.write(`release:check failed with ${String(errors.length)} error(s):\n`);
  for (const error of errors) process.stderr.write(`  ✗ ${error}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('release:check passed (release docs, final manifest, gzip budget)\n');
}
