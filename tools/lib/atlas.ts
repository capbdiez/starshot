import {
  ASSET_MANIFEST_VERSION,
  type AssetManifest,
  type Content,
  type SpriteSpec,
} from '../../src/content/index.ts';
import type { AsepriteSheet, PhaserAtlas } from './formats.ts';
import { blit, createImage, type RgbaImage } from './image.ts';
import { packShelves } from './pack.ts';
import { placeholderFrame } from './placeholder.ts';

/** Name of the single M0 atlas (one atlas per stage comes later, ARCHITECTURE §10). */
export const MAIN_ATLAS = 'main';
const MAX_ATLAS_WIDTH = 1024;
const PADDING = 1;

/** An Aseprite export for one sprite: the sheet pixels plus its JSON data. */
export interface SpriteSource {
  readonly image: RgbaImage;
  readonly sheet: AsepriteSheet;
}

/** Output of {@link buildAtlas}, ready to be written to `assets/`. */
export interface BuiltAtlas {
  readonly image: RgbaImage;
  readonly data: PhaserAtlas;
  readonly manifest: AssetManifest;
}

/** Atlas frame name for one frame of a clip, e.g. `player_ship/idle/0`. */
export function frameName(spriteKey: string, clip: string, index: number): string {
  return `${spriteKey}/${clip}/${String(index)}`;
}

interface PendingFrame {
  readonly name: string;
  readonly image: RgbaImage;
}

/** Cuts every clip frame out of an Aseprite export, checking it against the content spec. */
function framesFromSource(spec: SpriteSpec, source: SpriteSource): PendingFrame[] {
  const frames: PendingFrame[] = [];
  for (const [clip, clipSpec] of Object.entries(spec.clips)) {
    const tag = source.sheet.meta.frameTags.find((candidate) => candidate.name === clip);
    if (!tag) {
      throw new Error(`${spec.key}: Aseprite file has no tag "${clip}"`);
    }
    const count = tag.to - tag.from + 1;
    if (count !== clipSpec.frames) {
      throw new Error(
        `${spec.key}/${clip}: tag has ${String(count)} frames, content expects ${String(clipSpec.frames)}`,
      );
    }
    for (let i = 0; i < count; i += 1) {
      const entry = source.sheet.frames[tag.from + i];
      if (!entry) {
        throw new Error(`${spec.key}/${clip}: frame ${String(tag.from + i)} missing from sheet`);
      }
      if (entry.frame.w !== spec.size.w || entry.frame.h !== spec.size.h) {
        throw new Error(
          `${spec.key}: frames are ${String(entry.frame.w)}×${String(entry.frame.h)}, ` +
            `content expects ${String(spec.size.w)}×${String(spec.size.h)} (export without --trim)`,
        );
      }
      const image = createImage(spec.size.w, spec.size.h);
      blit(source.image, entry.frame, image, 0, 0);
      frames.push({ name: frameName(spec.key, clip, i), image });
    }
  }
  return frames;
}

function placeholderFrames(spec: SpriteSpec): PendingFrame[] {
  const frames: PendingFrame[] = [];
  for (const [clip, clipSpec] of Object.entries(spec.clips)) {
    for (let i = 0; i < clipSpec.frames; i += 1) {
      frames.push({
        name: frameName(spec.key, clip, i),
        image: placeholderFrame(spec.role, spec.size.w, spec.size.h, i),
      });
    }
  }
  return frames;
}

/**
 * Builds the main atlas and manifest from content sprite specs. Sprites with an Aseprite export
 * use it (final art); every other sprite gets generated greybox frames with the same keys, size,
 * anchor and clips, so swapping placeholder → final is a pure asset change.
 */
export function buildAtlas(
  sprites: Content['sprites'],
  sources: ReadonlyMap<string, SpriteSource>,
): BuiltAtlas {
  const manifest: AssetManifest = {
    version: ASSET_MANIFEST_VERSION,
    atlases: [{ key: MAIN_ATLAS, image: `${MAIN_ATLAS}.png`, data: `${MAIN_ATLAS}.json` }],
    sprites: {},
  };
  const pending: PendingFrame[] = [];
  const pivots = new Map<string, { x: number; y: number }>();

  for (const key of Object.keys(sprites).sort()) {
    const spec = sprites[key] as SpriteSpec;
    const source = sources.get(key);
    const frames = source ? framesFromSource(spec, source) : placeholderFrames(spec);
    const clips: Record<string, string[]> = {};
    for (const [clip, clipSpec] of Object.entries(spec.clips)) {
      clips[clip] = Array.from({ length: clipSpec.frames }, (_, i) => frameName(key, clip, i));
    }
    manifest.sprites[key] = { atlas: MAIN_ATLAS, placeholder: !source, clips };
    for (const frame of frames) {
      pivots.set(frame.name, { x: spec.anchor.x, y: spec.anchor.y });
      pending.push(frame);
    }
  }

  const packed = packShelves(
    pending.map((frame) => ({ id: frame.name, w: frame.image.width, h: frame.image.height })),
    MAX_ATLAS_WIDTH,
    PADDING,
  );
  const image = createImage(packed.width, packed.height);
  const byName = new Map(pending.map((frame) => [frame.name, frame.image]));
  const data: PhaserAtlas = {
    frames: {},
    meta: { image: `${MAIN_ATLAS}.png`, size: { w: packed.width, h: packed.height } },
  };

  const ordered = [...packed.placements].sort((a, b) => a.id.localeCompare(b.id));
  for (const place of ordered) {
    const frameImage = byName.get(place.id);
    const pivot = pivots.get(place.id);
    if (!frameImage || !pivot) {
      throw new Error(`Internal error: lost frame "${place.id}" while packing`);
    }
    blit(frameImage, { x: 0, y: 0, w: place.w, h: place.h }, image, place.x, place.y);
    data.frames[place.id] = {
      frame: { x: place.x, y: place.y, w: place.w, h: place.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: place.w, h: place.h },
      sourceSize: { w: place.w, h: place.h },
      pivot,
    };
  }

  return { image, data, manifest };
}
