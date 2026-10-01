# Asset Credits & Licenses

Every runtime asset must be listed here (GAME_SPEC §7, AGENTS §4).

| Asset | Path | Author | License | Notes |
|-------|------|--------|---------|-------|
| Master palette (32 colours) | `assets/palette/starshot.hex` | Starshot team | Project-owned | Original; roles per ART_DIRECTION §3 |
| Main atlas | `assets/atlas/main.png` / `.json` | Packed by `tools/build-atlas.ts` | Project-owned | Per-sprite `placeholder` flag in `assets/manifest.json` |
| Player ship, Grunt, player shot, enemy bullet (final) | `tools/art/sprites.ts` → `art-src/export/` | Starshot team | Project-owned | Original pixel art (M1); explosions are procedural |
| SFX sprite: `sfx_shot`, `sfx_hit`, `sfx_explode_s` | `assets/audio/sfx.{ogg,m4a,json}` | Starshot team, synthesized by `tools/build-sfx.ts` | Project-owned | Original; encoded with ffmpeg (libvorbis / aac) |
