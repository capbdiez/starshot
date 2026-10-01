# Starshot — Art Direction (Phase 1)

Art, animation, audio and effects are **first-class systems**. They are designed now so that
placeholder → final replacement is a **data/asset swap, never a code rewrite**.

---

## 1. Visual Pillars

1. **Readability first** — The player must identify ship, threats, bullets and pickups in < 100 ms, even at peak bullet density.
2. **Juice with discipline** — Every action has feedback (flash, shake, particles, sound), all tuned by data and all toggleable for accessibility.
3. **Cohesion over detail** — One fixed palette, one pixel scale, one font family. Consistency beats fidelity.

## 2. Style: "Neo-Arcade Pixel"

- **Hand-made pixel art** at a fixed low internal resolution, plus **modern effects**: additive glow, particles, parallax, hit-stop, and an optional CRT filter.
- Chosen because a small team can make it look professional, it scales cleanly to any screen, and it fits the genre.

| Property | Value |
|----------|-------|
| Internal resolution | **270 × 480** (9:16 portrait), rendered to a low-res buffer |
| Scaling | Integer scale plus letterbox; nearest-neighbour filtering; no sub-pixel sprite positions on screen |
| Pixel density | 1 art pixel = 1 game pixel. Sprites are never scaled or rotated except by designed effects |
| Frame rate target | 60 FPS rendering; animations authored at 8–12 FPS |

## 3. Palette & Color Roles

- A single **32-colour master palette** (`assets/palette/starshot.hex`). Every sprite, UI element and particle uses only these colours; CI checks this (see §9).
- **Color is assigned by gameplay role**, and each role also has a distinct shape so it works for colour-blind players:

| Role | Hue family | Shape language | Value |
|------|-----------|----------------|-------|
| Player ship & player shots | Cyan / white | Angular, pointing upward, symmetrical | Brightest |
| Enemies | Magenta / orange / violet | Organic or insectoid, facing downward | Mid-high |
| **Enemy bullets** | Hot pink with a white core | **Round** orbs (never thin lines) | Highest contrast against the background |
| Pickups | Lime / yellow | Rotating diamonds or capsules, with a pulsing outline | High |
| Background | Deep navy / indigo, desaturated | Soft parallax star layers and nebulae | **Low** (≤ 30 % luminance) |
| UI / HUD | White + one accent color | Bitmap font, 1-px outlines | High |

**Readability rule:** anything that can damage the player must stay clearly visible in a **greyscale** screenshot against every background.

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
- Menus use the same bitmap font and palette. Screen transitions use 150–250 ms wipes or dissolves.
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

## 10. Accessibility (Visual/Audio)

- Settings: screen shake 0–100 %, flash reduction, CRT filter on/off, high-contrast bullets, separate volume buses, subtitles for boss callouts.
- No content flashes more than 3 times per second when flash reduction is on.

