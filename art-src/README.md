# art-src — Art & Audio Sources (Git LFS)

## Sprite pipeline

```
art-src/sprites/<sprite_key>.aseprite          (source, LFS)
   │  npm run assets:export   (Aseprite CLI; set ASEPRITE=/path/to/aseprite if not on PATH)
   ▼
art-src/export/<sprite_key>.png + .json        (sheet + json-array with frame tags)
   │  npm run assets:atlas
   ▼
assets/atlas/main.png + main.json  +  assets/manifest.json   (committed, loaded by the game)
   │  npm run check:assets    (palette, manifest ↔ content, clip frame counts, sizes, anchors)
```

`npm run assets:build` runs every step.

**Code-authored sprites (ADR 0003):** `tools/art/sprites.ts` holds the M1 sprites as palette-letter
grids; `npm run assets:art` writes them to `art-src/export/` in the same format. Adding
`art-src/sprites/<key>.aseprite` replaces one (`assets:art` skips keys with an Aseprite source).

**SFX:** recipes in `tools/lib/sfx-synth.ts` → `npm run assets:sfx` (needs `ffmpeg`) →
`assets/audio/sfx.{ogg,m4a,json}` audio sprite.

## Rules for a sprite file

- File name = sprite key from `content/animations/*.json` (e.g. `player_ship.aseprite`).
- Canvas size = the `size` in content. Export untrimmed.
- One **frame tag per clip**, named exactly like the clip (`idle`, `bank_left`, `death`, …),
  with exactly the frame count given in content.
- Only colours from `assets/palette/starshot.hex` (load it in Aseprite as the palette).
  Pixels are fully opaque or fully transparent; glow and fades are runtime effects.
- The anchor comes from content (`anchor`), not the file.

Any sprite in content **without** an export gets a generated greybox placeholder with the same
key, size, anchor and clips, so dropping in the final `.aseprite` needs zero code changes.
`assets/manifest.json` marks each sprite with `"placeholder": true|false`.
