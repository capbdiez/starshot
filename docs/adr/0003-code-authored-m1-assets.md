# ADR 0003 — Code-authored M1 sprites and SFX

**Status:** Accepted (M1)

## Context

M1 requires final art for the player ship, Grunt and both bullets, plus `sfx_shot`, `sfx_hit`
and `sfx_explode_s`. No Aseprite binary or audio DAW is available in the dev/CI environment,
and binary sources would be hard to review in text-only, AI-assisted workflows.

## Decision

- Sprites are authored as palette-letter pixel grids in `tools/art/sprites.ts`.
  `npm run assets:art` writes them to `art-src/export/<key>.{png,json}` in the exact Aseprite
  `json-array --list-tags` format, so the existing atlas pipeline (and all §9 gates) treat them
  like an Aseprite export. Explosion (`death`) frames are generated procedurally.
- SFX are sfxr-style recipes in `tools/lib/sfx-synth.ts`. `npm run assets:sfx` renders them
  deterministically and encodes an audio sprite (`assets/audio/sfx.{ogg,m4a,json}`) with ffmpeg.
- Generated outputs are committed; CI re-runs `assets:art` + `assets:atlas` and fails on a diff.
  A test checks the committed spritemap against the recipes.

## Consequences

- No new dependencies (ffmpeg is a build-time tool only, needed just to regenerate audio).
- An artist can later replace any sprite with `art-src/sprites/<key>.aseprite`; `assets:art`
  skips keys that have an Aseprite source — a pure asset swap, no game-code changes.
