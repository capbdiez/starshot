import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadContent, type Content } from '../../src/content/index.ts';
import { buildAtlas, frameName, MAIN_ATLAS, type SpriteSource } from '../../tools/lib/atlas.ts';
import { checkManifest, checkPalette, type LoadedAtlas } from '../../tools/lib/check.ts';
import { createImage, setPixel } from '../../tools/lib/image.ts';
import { parsePalette } from '../../tools/lib/palette.ts';
import { PATHS, readContentFiles } from '../../tools/lib/repo.ts';

const palette = new Set(parsePalette(readFileSync(PATHS.palette, 'utf8')));
const content = loadContent(readContentFiles());

function build(
  sprites: Content['sprites'] = content.sprites,
  sources = new Map<string, SpriteSource>(),
) {
  const built = buildAtlas(sprites, sources);
  const atlas: LoadedAtlas = { key: MAIN_ATLAS, data: built.data, image: built.image };
  return { built, atlas, atlases: new Map([[MAIN_ATLAS, atlas]]) };
}

/** Fake Aseprite export for player_ship where every clip is a tag with the right frame count. */
function fakeShipExport(): SpriteSource {
  const spec = content.sprites['player_ship'];
  if (!spec) throw new Error('spec missing');
  let from = 0;
  const frameTags = Object.entries(spec.clips).map(([name, clip]) => {
    const tag = { name, from, to: from + clip.frames - 1 };
    from += clip.frames;
    return tag;
  });
  const image = createImage(16 * from, 16);
  for (let x = 0; x < image.width; x += 1) setPixel(image, x, 0, 0xffffff);
  const frames = Array.from({ length: from }, (_, i) => ({
    frame: { x: i * 16, y: 0, w: 16, h: 16 },
    sourceSize: { w: 16, h: 16 },
  }));
  return { image, sheet: { frames, meta: { frameTags } } };
}

describe('atlas build + asset gates', () => {
  it('generated placeholder atlas passes every gate', () => {
    const { built, atlas, atlases } = build();
    expect(checkPalette(atlas, palette)).toEqual([]);
    expect(checkManifest(content, built.manifest, atlases)).toEqual([]);
    // No sources passed in → every sprite is generated as a greybox placeholder.
    expect(built.manifest.sprites['player_ship']?.placeholder).toBe(true);
  });

  it('is deterministic (same input → byte-identical atlas)', () => {
    const a = build().built;
    const b = build().built;
    expect(Buffer.from(a.image.data).equals(Buffer.from(b.image.data))).toBe(true);
    expect(a.data).toEqual(b.data);
  });

  it('writes the content anchor as the Phaser pivot', () => {
    const { built } = build();
    const frame = built.data.frames[frameName('player_ship', 'idle', 0)];
    expect(frame?.pivot).toEqual({ x: 0.5, y: 0.5 });
  });

  it('palette gate fails when a sprite uses an off-palette colour', () => {
    const { atlas } = build();
    const frame = atlas.data.frames[frameName('player_ship', 'idle', 1)];
    if (!frame) throw new Error('frame missing');
    setPixel(atlas.image, frame.frame.x + 3, frame.frame.y + 4, 0x00ff00);
    const errors = checkPalette(atlas, palette);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/frame "player_ship\/idle\/1" at \(3, 4\): colour #00ff00/);
  });

  it('manifest gate fails on a missing clip, a wrong size and a stale sprite', () => {
    const { built, atlases } = build();
    const manifest = structuredClone(built.manifest);
    const ship = manifest.sprites['player_ship'];
    const idle = atlases.get(MAIN_ATLAS)?.data.frames[frameName('player_ship', 'idle', 0)];
    if (!ship || !idle) throw new Error('fixture missing');
    delete ship.clips['death'];
    manifest.sprites['enemy_ghost'] = { atlas: MAIN_ATLAS, placeholder: true, clips: {} };
    idle.sourceSize = { w: 15, h: 16 };
    const errors = checkManifest(content, manifest, atlases).join('\n');
    expect(errors).toMatch(/required clip "player_ship\/death" is missing/);
    expect(errors).toMatch(/size: "player_ship\/idle\/0" is 15×16/);
    expect(errors).toMatch(/"enemy_ghost" is not defined in content/);
  });

  it('swaps in an Aseprite export as final art with identical keys (zero code changes)', () => {
    const placeholder = build().built;
    const { built, atlas, atlases } = build(
      content.sprites,
      new Map([['player_ship', fakeShipExport()]]),
    );
    expect(built.manifest.sprites['player_ship']?.placeholder).toBe(false);
    expect(built.manifest.sprites['player_ship']?.clips).toEqual(
      placeholder.manifest.sprites['player_ship']?.clips,
    );
    expect(checkManifest(content, built.manifest, atlases)).toEqual([]);
    expect(checkPalette(atlas, palette)).toEqual([]);
  });

  it('rejects an Aseprite export whose tag frame count differs from content', () => {
    const sheet = {
      frames: [{ frame: { x: 0, y: 0, w: 16, h: 16 }, sourceSize: { w: 16, h: 16 } }],
      meta: { frameTags: [{ name: 'idle', from: 0, to: 0 }] },
    };
    const sources = new Map([['player_ship', { image: createImage(16, 16), sheet }]]);
    expect(() => build(content.sprites, sources)).toThrow(
      /idle: tag has 1 frames, content expects 2/,
    );
  });
});
