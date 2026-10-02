# Starshot — Art Direction

## G1 Premium Neo-Arcade Contract

Art, animation, audio, and effects are **first-class presentation systems**. The graphics program upgrades visual quality without changing gameplay ownership: simulation remains deterministic and presentation only reads snapshots and events. Art replacement remains a **data/asset swap, never a simulation rewrite**.

### Coordinate and Resolution Contract

| Space | Size | Owner | Rules |
| --- | --- | --- | --- |
| World / simulation | **270×480 logical px** | `sim/`, gameplay content | Positions, hitboxes, paths, waves, and replay inputs use this space only. Never manually multiply gameplay coordinates. |
| Presentation buffer | **540×960 px** | Phaser presentation / UI | G2 canonical internal render target. The main presentation camera centrally maps each world pixel to a 2×2 presentation-pixel area. |
| Browser display | Variable CSS/device pixels | app scale layer | Integer scaling and letterboxing preserve aspect ratio when 1× fits. Below that, a centered fractional fit is used so the complete portrait canvas remains visible; browser DPR never changes world coordinates. |

G2 implements the 540×960 buffer without changing the 270×480 simulation, content tuning, hitboxes, or replay determinism. Current MVP art is rendered through the camera's 2× compatibility transform until later art milestones replace it.

## 1. Visual Pillars

1. **Readable combat first** — Identify player, hostile bullets, attack tells, enemies, and pickups in under 100 ms at peak density and in greyscale.
2. **Premium neo-arcade material** — Crisp raster silhouettes use selective highlights, controlled emissive colour, and deep negative space rather than noisy detail or generic glow.
3. **Juice with discipline** — Effects clarify actions and are bounded, data-driven, pooled, and accessibility-aware; spectacle never obscures gameplay.
4. **Cohesion over detail** — One fixed palette, pixel grid, border language, and emissive vocabulary make sprites, environments, effects, and UI feel authored together.

## 2. Silhouette, Value, and Role Hierarchy

Gameplay roles must be distinguishable by both outline and value before hue is considered. Review this contract with greyscale screenshots at native presentation scale and at peak density.

| Priority | Role | Silhouette / motion cue | Value requirement |
| --- | --- | --- | --- |
| 1 | Player ship | Compact upward-pointing, symmetrical wedge; unique cyan/white core | Bright lower-screen focal object with a separating dark edge. |
| 2 | Hostile bullets and attack tells | Round/non-player-shaped bullets; tell geometry is larger and stable before firing | Brighter core/rim contrast than adjacent background; never shares player-shot silhouette. |
| 3 | Pickups | Diamond/capsule with persistent outline or pulse | High local contrast distinct from both bullet families. |
| 4 | Enemies and boss parts | Downward/insectoid or plated shapes; distinct boss weak points | Mid-to-high value, below immediate hazards/player except for a bounded tell. |
| 5 | HUD and menus | Bitmap/display glyphs and 1-px borders | High value only in UI regions; never competes with the playfield. |
| 6 | Background | Large low-frequency shapes and sparse stars | Low contrast/luminance; no bullet-like clusters. |

**Greyscale gate:** title, representative gameplay, peak-density, boss, flash-reduction, and high-contrast-bullet captures must leave player, hostile projectiles, active tells, and pickups identifiable without hue.

## 3. Material, Palette, and Effect Limits

- The 32-colour master palette in `assets/palette/starshot.hex` remains authoritative in G1; palette changes are out of scope.
- Player/player shots use cyan/white; enemies use magenta/orange/violet; hostile bullets use hot-pink with white core; pickups use lime/yellow; UI uses white plus restrained accent; backgrounds use deep navy/indigo.
- Raster materials use dark structural edges, local body colour, and selective highlights. Highlights describe form; they are not full-surface noise.
- Emissive pixels are reserved for player energy, bullets, pickups, weapon muzzles, weak points, and explicit tells. Glow supports a readable silhouette; it never replaces one.
- Do not introduce gradients, anti-aliased raster edges, arbitrary alpha haze, or off-palette colours in generated art.
- Background stays deep/desaturated and **at or below 30% perceived luminance**. Motion stays slow and never resembles an attack tell. G6 stage environments are seeded, bounded 540×960 presentation layouts with cached layers; they never affect simulation state or gameplay coordinates.
- Effects are short, bounded, event/content-driven, pooled reactions. With flash reduction enabled, no content flashes more than three times per second.
- Quality tiers may remove cosmetic stars, debris, or secondary particles, but never bullets, tells, pickups, silhouettes, outlines, or accessibility cues.

## 4. Asset Specifications

| Asset | Canvas (px) | Frames | Notes |
|-------|-------------|--------|-------|
| Player ship | 16×16 | idle 2, bank L/R 2 each, explode 8 | 3×3 px hitbox, centered, shown in "focus" mode |
| Grunt enemy | 16×16 | idle 2–4, dive 2, hit flash (shader) | |
| Elite enemy | 24×24 | idle 4, attack tell 3 | |
| Boss | ≤ 96×64 plus separate part sprites | per part | Built from parts so pieces can be destroyed |
| Player bullet | 3×8 | 2 | Additive glow sprite underneath |
| Enemy bullet | 6×6 / 8×8 | 2 (pulse) | Additive glow sprite underneath |
| Pickups | 12×12 | 4 | |
| Explosions | 32×32 / 64×64 | 6–10 | Combined with particles and a light flash |
| Font | 8 px bitmap (plus 16 px display) | — | Exported as BMFont |

- Each sprite's anchor point is set in the atlas data, never in code.
- **Atlas key naming:** `<category>_<name>/<animation>` for example `enemy_grunt/idle`, `player_ship/bank_left`, `fx_explosion/small`.

## 5. Animation Rules

- Animation clips are defined in data (`content/animations`), not in code.
- Every entity has the required clips: `idle`, `hit` (may use a shader), `death`. Optional clips are `attack_tell`, `enter`, `dive`.
- **Tells:** every enemy attack plays a readable warning of at least 250 ms (flash or pose) before bullets appear.
- Motion comes from designed paths (Bézier/spline) with easing, so enemies swoop instead of moving in straight lines.

## 6. Effects (FX) Language

All effects are triggered by **simulation events** (see ARCHITECTURE.md), never directly by gameplay code.

| Event | Visual | Audio | Camera |
|-------|--------|-------|--------|
| Player fires | Muzzle flash (2 frames) | `sfx_shot` (pitch variance ±5 %) | — |
| Enemy hit | White flash (1–2 frames), 3–5 sparks | `sfx_hit` | — |
| Enemy destroyed | Explosion sprite + 8–20 particles + score popup | `sfx_explode_s/m/l` | Small shake (trauma 0.1) |
| Elite/boss part destroyed | Large explosion + debris | `sfx_explode_l` | Hit-stop 40–60 ms, trauma 0.4 |
| Player hit | Full-screen flash (can be reduced), slow-motion 300 ms | `sfx_player_die` + music low-pass | Trauma 0.7 |
| Pickup | Ring burst + text | `sfx_pickup` | — |
| Stage clear | UI sweep, starfield speeds up | `stinger_clear` | — |

- **Screen shake** uses a trauma model: intensity equals trauma², trauma decays over time, and it is scaled by the user's setting.
- **Budgets:** at most 400 live particles and 300 bullets. Past that, low-priority effects are skipped rather than letting the frame rate drop.

## 7. UI / HUD

- The HUD is a **top strip only** (score, hi-score, stage). Lives and bombs sit in the bottom corners. The play area stays clear.
- Menus use the same generated 5×7 bitmap/display glyphs, beveled panel frames, cyan emissive rails, and palette as the HUD and gameplay. Screen transitions use restrained 150–250 ms palette-safe wipes or dissolves.
- Every UI string goes through a string table, so the game can be localized later.

## 8. Audio Direction

- **Music:** synthwave and chiptune hybrid, 120–140 BPM, loops seamlessly. Tracks: title, stage (×2), boss, game over, victory stinger.
- **SFX:** crisp and short (< 400 ms), synthesized from deterministic in-repo recipes.
- **Mix buses:** `music`, `sfx`, `ui`, each with its own volume setting. The music is ducked by 6 dB during boss intros and player death.
- **Voice limits:** each SFX has a cap on how many copies play at once (for example `sfx_shot` at most 4) and a priority, so dense scenes don't clip or sound muddy.
- **Formats:** `.ogg` + `.m4a` fallback; SFX are packed into an **audio sprite**.
- **Code-authored audio policy:** all runtime audio—including SFX, looping music and stingers—uses version-controlled TypeScript recipe/sequence data under `tools/`. The generator renders deterministic PCM/WAV, then ffmpeg encodes committed `.ogg` and `.m4a` outputs in `assets/audio/`. `npm run assets:build` runs every audio generator. No external audio files, DAW project files or manual audio edits are required.

## 9. Pipeline & Quality Gates

**Pipeline:** Code-authored pixel grids/procedural graphics in `tools/art/` → generated Aseprite-compatible export in `art-src/export/` → texture packer → `assets/atlas/*.png + *.json` (Phaser atlas format) → typed asset manifest. The optional Aseprite-source route remains compatible, but it is not required.

**Code-authored asset policy:**
- All MVP visual assets can be created and maintained in the repository: player, enemy and boss sprites; bullets; pickups; explosions and other FX; backgrounds/parallax; UI/HUD art; bitmap font; and store/screenshot source art where applicable.
- New raster sprite frames use palette-letter grids or deterministic procedural generators under `tools/art/`; generated PNG/JSON exports and atlases remain committed and are checked by CI.
- Backgrounds that do not need atlas frames may be deterministic Phaser geometry/procedural rendering, but must use the master palette and preserve the fixed-resolution pixel-art rules.
- No contributor is expected to create, import, or manually place external image files to complete the game.

**Placeholder policy (critical):**
- A placeholder must match the final asset's **size, anchor, frame count, atlas key and animation names**.
- Placeholders are generated automatically as flat role-colored shapes with frame numbers ("greybox atlas").
- Replacing a placeholder must require **zero code changes**; this is checked by the asset manifest tests.

**Automated gates (CI):**
- Palette check: sprites use no colours outside the master palette.
- Manifest check: every key referenced in `content/` exists in the atlases, and every required animation clip exists.
- Size check: each frame's size matches its spec in `content/`.

**Manual gates (every milestone review):**
- Greyscale screenshot readability check.
- Peak-density test scene (300 bullets): the player can still find their ship and the incoming threats.
- Stays at 60 FPS on the reference low-end device (see TECH_STACK.md).

**G9 release-candidate audit:** `npm run release:check` verifies the production gzip budget, required release documentation, and absence of manifest placeholders after building. Approved fixed-seed Chromium captures live in `tests/e2e/graphics-baselines.spec.ts-snapshots/` under the `g9-` prefix. The reference-device, target-browser, greyscale/colour-blind, flash-safety, fullscreen, and cold-load results must be recorded in `docs/release-checklist.md`; automated checks do not stand in for that evidence.

## 10. Accessibility (Visual/Audio)

- Settings: screen shake 0–100 %, flash reduction, CRT filter on/off, high-contrast bullets, separate volume buses, subtitles for boss callouts.
- No content flashes more than 3 times per second when flash reduction is on.

