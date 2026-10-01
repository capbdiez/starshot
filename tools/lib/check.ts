import type { AssetManifest, Content } from '../../src/content/index.ts';
import type { PhaserAtlas } from './formats.ts';
import type { RgbaImage } from './image.ts';
import { findPaletteViolations } from './palette.ts';

/** One loaded atlas: its manifest key, parsed data and pixels. */
export interface LoadedAtlas {
  readonly key: string;
  readonly data: PhaserAtlas;
  readonly image: RgbaImage;
}

/** Palette gate: every opaque pixel of every atlas frame must be a master palette colour. */
export function checkPalette(atlas: LoadedAtlas, palette: ReadonlySet<number>): string[] {
  const errors: string[] = [];
  if (
    atlas.image.width !== atlas.data.meta.size.w ||
    atlas.image.height !== atlas.data.meta.size.h
  ) {
    errors.push(`${atlas.key}: PNG size does not match the atlas data meta.size`);
  }
  const violations = findPaletteViolations(atlas.image, palette, 50);
  for (const violation of violations) {
    const owner = Object.entries(atlas.data.frames).find(
      ([, entry]) =>
        violation.x >= entry.frame.x &&
        violation.x < entry.frame.x + entry.frame.w &&
        violation.y >= entry.frame.y &&
        violation.y < entry.frame.y + entry.frame.h,
    );
    const where = owner
      ? `frame "${owner[0]}" at (${String(violation.x - owner[1].frame.x)}, ${String(violation.y - owner[1].frame.y)})`
      : `atlas pixel (${String(violation.x)}, ${String(violation.y)}) outside any frame`;
    errors.push(`${atlas.key}: ${where}: ${violation.reason}`);
  }
  return errors;
}

/**
 * Manifest and size gates: every content sprite and clip exists in the manifest with the right
 * frame count, every manifest frame exists in its atlas, and frame size/anchor match the spec.
 */
export function checkManifest(
  content: Content,
  manifest: AssetManifest,
  atlases: ReadonlyMap<string, LoadedAtlas>,
): string[] {
  const errors: string[] = [];

  for (const key of Object.keys(manifest.sprites)) {
    if (!(key in content.sprites)) {
      errors.push(`manifest: sprite "${key}" is not defined in content (stale atlas?)`);
    }
  }

  for (const [key, spec] of Object.entries(content.sprites)) {
    const entry = manifest.sprites[key];
    if (!entry) {
      errors.push(`manifest: content sprite "${key}" is missing (run npm run assets:atlas)`);
      continue;
    }
    const atlas = atlases.get(entry.atlas);
    if (!atlas) {
      errors.push(`manifest: sprite "${key}" refers to unknown atlas "${entry.atlas}"`);
      continue;
    }
    for (const [clip, clipSpec] of Object.entries(spec.clips)) {
      const frames = entry.clips[clip];
      if (!frames) {
        errors.push(`manifest: required clip "${key}/${clip}" is missing`);
        continue;
      }
      if (frames.length !== clipSpec.frames) {
        errors.push(
          `manifest: "${key}/${clip}" has ${String(frames.length)} frames, content expects ${String(clipSpec.frames)}`,
        );
      }
      for (const frame of frames) {
        const atlasFrame = atlas.data.frames[frame];
        if (!atlasFrame) {
          errors.push(`atlas ${atlas.key}: frame "${frame}" is missing`);
          continue;
        }
        const { w, h } = atlasFrame.sourceSize;
        if (w !== spec.size.w || h !== spec.size.h) {
          errors.push(
            `size: "${frame}" is ${String(w)}×${String(h)}, content expects ${String(spec.size.w)}×${String(spec.size.h)}`,
          );
        }
        if (atlasFrame.pivot.x !== spec.anchor.x || atlasFrame.pivot.y !== spec.anchor.y) {
          errors.push(`anchor: "${frame}" pivot does not match the content anchor`);
        }
      }
    }
    for (const clip of Object.keys(entry.clips)) {
      if (!(clip in spec.clips)) {
        errors.push(`manifest: clip "${key}/${clip}" is not defined in content`);
      }
    }
  }
  return errors;
}
