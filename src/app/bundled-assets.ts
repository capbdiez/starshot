import manifestJson from '../../assets/manifest.json';
import { assetManifestSchema, type AssetManifest, type RawContentFiles } from '../content/index.ts';

const CONTENT_PREFIX = '../../content/';
const ATLAS_PREFIX = '../../assets/atlas/';

const contentModules = import.meta.glob<unknown>('../../content/**/*.json', {
  eager: true,
  import: 'default',
});

const atlasUrls = import.meta.glob<string>('../../assets/atlas/*.{png,json}', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Every `content/**.json` file bundled by Vite, keyed by its path relative to `content/`. */
export function bundledContentFiles(): RawContentFiles {
  const files: Record<string, unknown> = {};
  for (const [path, data] of Object.entries(contentModules)) {
    files[path.slice(CONTENT_PREFIX.length)] = data;
  }
  return files;
}

/** The generated asset manifest, validated against its schema. */
export function bundledManifest(): AssetManifest {
  return assetManifestSchema.parse(manifestJson);
}

/** Public URL of a file in `assets/atlas/`. */
export function atlasFileUrl(fileName: string): string {
  const url = atlasUrls[ATLAS_PREFIX + fileName];
  if (url === undefined) {
    throw new Error(`Atlas file "${fileName}" is listed in the manifest but was not bundled`);
  }
  return url;
}
