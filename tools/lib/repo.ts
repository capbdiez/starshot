import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawContentFiles } from '../../src/content/index.ts';

/** Absolute path of the repository root. */
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Well-known repository paths used by the asset tools. */
export const PATHS = {
  content: join(ROOT, 'content'),
  palette: join(ROOT, 'assets', 'palette', 'starshot.hex'),
  atlasDir: join(ROOT, 'assets', 'atlas'),
  manifest: join(ROOT, 'assets', 'manifest.json'),
  artSprites: join(ROOT, 'art-src', 'sprites'),
  artExport: join(ROOT, 'art-src', 'export'),
} as const;

function listFiles(dir: string, extension: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      return listFiles(full, extension);
    }
    return name.endsWith(extension) ? [full] : [];
  });
}

/** Lists files ending in `extension` under `dir`, recursively and sorted. */
export function findFiles(dir: string, extension: string): string[] {
  return listFiles(dir, extension).sort();
}

/** Reads and parses a JSON file, naming the file in any error. */
export function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch (error) {
    throw new Error(
      `${relative(ROOT, path)}: ${error instanceof Error ? error.message : String(error)}`,
      {
        cause: error,
      },
    );
  }
}

/** Reads every `content/**.json` file, keyed by its path relative to `content/`. */
export function readContentFiles(dir: string = PATHS.content): RawContentFiles {
  const files: Record<string, unknown> = {};
  for (const path of findFiles(dir, '.json')) {
    files[relative(dir, path).split(sep).join('/')] = readJson(path);
  }
  return files;
}
