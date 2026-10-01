# Starshot — Milestones (Phase 5)

Small, vertical, shippable steps. Every milestone ends with a **playable build deployed to a preview URL**.
Art, audio and effects run through every milestone as tracks, not at the end.

## Global Definition of Done (applies to every milestone)

- [ ] Acceptance criteria met and demonstrated on the preview deploy.
- [ ] `typecheck`, `lint`, `lint:deps`, `test`, `check:assets` pass in CI.
- [ ] `sim/` coverage ≥ 80 %; golden replays pass (or were updated on purpose with a reason).
- [ ] Holds 60 FPS on the reference device for the milestone's content.
- [ ] Art gates (ART_DIRECTION §9) pass for all assets added in the milestone.
- [ ] Docs updated (spec/architecture/art) where behavior changed; ADRs written for decisions.
- [ ] No new items left out of scope without a note in `docs/BACKLOG.md`.

## Timeline Overview (≈ 10–12 weeks)

| # | Milestone | Est. | Art/Audio track |
|---|-----------|------|-----------------|
| M0 | Foundation & pipelines | 1 wk | Palette, placeholder generator, atlas pipeline |
| M1 | Core loop vertical slice | 1.5 wk | **Final** player ship, 1 enemy, bullets, first SFX |
| M2 | Juice & presentation layer | 1 wk | Explosions, particles, shake, hit-stop, parallax BG |
| M3 | Waves, formations & enemy roster | 1.5 wk | All 4 enemies final, attack tells |
| M4 | Scoring, power-ups, bombs, lives | 1 wk | Pickups, HUD art, bitmap font |
| M5 | Game flow, UI & persistence | 1 wk | Menus, transitions, title/stage music |
| M6 | Boss & full run content | 1.5 wk | Boss art (multi-part), boss music |
| M7 | Polish, accessibility, performance | 1 wk | CRT filter, final mix, remaining art |
| M8 | Release (MVP) | 0.5 wk | Store page art, trailer GIF |

---

## M0 — Foundation & Pipelines

**Scope**
- Repo scaffold matching the ARCHITECTURE §6 folders; Vite + TS strict + Phaser pinned; ESLint, Prettier, dependency-cruiser rules.
- Vitest + Playwright configured; GitHub Actions CI; Cloudflare Pages preview deploys.
- `content/` loader with Zod; an empty `sim` exposing `createSim`/`step`/`snapshot`/`drainEvents`/`hash`; fixed-timestep `GameLoop`.
- **Art pipeline:** master palette, Aseprite CLI export, atlas packing, placeholder (greybox) atlas generator, `check:assets` script.
- ADR 0001 (tech stack), ADR 0002 (sim/presentation split).

**Out of scope:** any gameplay, menus, audio content.

**Acceptance criteria**
- `npm run dev` shows a 270×480 integer-scaled, letterboxed canvas with a placeholder ship sprite loaded from the atlas.
- CI fails on purpose when: `sim/` imports Phaser; a sprite uses a colour outside the palette; a content file breaks its schema.
- A PR preview URL is created automatically.

**Testing:** smoke E2E (canvas boots, no console errors); unit test for the loop accumulator; content loader tests.

---

## M1 — Core Loop Vertical Slice

**Scope**
- Player horizontal movement (keyboard + gamepad → `InputFrame`), autofire, player shots.
- One enemy type (Grunt) in a static row; collisions; enemy death; player death and respawn; 3 lives; game over → instant restart.
- Seeded RNG; `sim.hash()`; first golden replay fixture.
- **Final art** for the player ship, Grunt and both bullet types; `sfx_shot`, `sfx_hit`, `sfx_explode_s`.
- Presentation: sprite sync with smoothing between steps, event → SFX mapping (basic).

**Out of scope:** formations and dives, scoring UI, effects beyond a basic flash, menus.

**Acceptance criteria**
- Playable loop: shoot all Grunts → they respawn; get hit → lose a life; 0 lives → restart in ≤ 2 s.
- Input-to-screen delay ≤ 2 frames (checked with a frame-step debug view).
- The same replay run twice gives the same hash.

**Testing:** unit tests for movement bounds, fire rate, collision pairs, lives; replay golden test; E2E: start → die ×3 → restart.

---

## M2 — Juice & Presentation Layer

**Scope**
- Data-driven FX map (`content/fx`): particles, explosion sprites, hit flash shader, score popups.
- Camera trauma shake, hit-stop and slow motion driven by the loop; parallax starfield (3 layers).
- AudioDirector: buses (music/sfx/ui), voice limits, pitch variance, ducking.
- Effect budgets and pools (400 particles); stress scene in `debug/`.

**Out of scope:** new enemies, settings UI (shake/flash scaling exists in code, set by config).

**Acceptance criteria**
- Every event in ART_DIRECTION §6 that exists so far triggers its effects purely through data. Changing the JSON changes the feel with no code edits.
- The stress scene (300 bullets + 400 particles) holds 60 FPS on the reference device.
- Greyscale readability check passes.

**Testing:** unit tests for the event → effect resolver, trauma decay, and voice-limit logic; visual screenshot baseline of the stress scene.

---

## M3 — Waves, Formations & Enemy Roster

**Scope**
- Path system (splines + easing) for entries and dives; formation grid with a sway animation; dive scheduler (dive rate rises as fewer enemies remain).
- Bullet pattern primitives (aimed, spread, ring, burst) described in data.
- Enemies: Grunt, Swooper, Tank, Elite, all defined in data, with **final art and attack tells** (≥ 250 ms).
- 4 wave stages defined in `content/waves` and `stages.json`.

**Out of scope:** boss, power-ups, scoring multiplier.

**Acceptance criteria**
- All 4 stages play start to finish; a designer can add a new wave by editing JSON only (shown in the PR).
- Every enemy attack has a visible tell; no bullet appears without one.
- Content cross-reference validation catches a wave that refers to a missing enemy.

**Testing:** path sampling tests, pattern output snapshot tests, dive scheduler tests, replay golden for stage 1; schema tests for every new content type.

---

## M4 — Scoring, Power-ups, Bombs, Lives

**Scope**
- Chain multiplier, bonus for mid-dive kills, extra lives at the set score thresholds.
- Weapon levels 1–3 from pickups, dropping one level on death; bombs (clear bullets, damage all enemies, brief invulnerability); invulnerability after respawn with blinking.
- HUD (top strip + bottom corners) with the **final bitmap font**; pickup art; `sfx_pickup`, bomb FX.

**Out of scope:** menus, persistence, boss.

**Acceptance criteria**
- Every rule in GAME_SPEC §4 for scoring, weapons, bombs and lives works and is tuned through `content/`.
- The HUD never covers the play area and stays readable at 1× scale.

**Testing:** unit tests for multiplier timing, extra-life thresholds, weapon-level changes, bomb effects, invulnerability windows; replay golden updated; HUD screenshot baseline.

---

## M5 — Game Flow, UI & Persistence

**Scope**
- Scene flow state machine: Boot → Preload → Title → Play ⇄ Pause → Results → Title/Play.
- Settings screen: volume buses, shake %, flash reduction, CRT on/off, fullscreen.
- `SaveStore`: top-10 local high scores and settings, schema-versioned with migrations; auto-pause when the tab is hidden.
- Screen transitions; title and stage **music**; WebAudio unlock handled in `platform`.
- String table (`content/strings/en.json`).

**Out of scope:** key rebinding, localization beyond English, touch controls.

**Acceptance criteria**
- From page load, the player can be playing in ≤ 2 inputs; settings persist across reloads; corrupt save data resets safely.
- Hiding the tab pauses both the game and the audio.

**Testing:** SaveStore unit tests (including corrupt/old-version data); scene-flow state machine tests; E2E full flow on Chromium + WebKit.

---

## M6 — Boss & Full Run Content

**Scope**
- Boss framework: parts that can be destroyed, phase state machine, phase-change events and effects.
- MVP boss (3 phases), **final multi-part art**, boss music, intro stinger, music ducking.
- Stage 5 (boss) and the full 5-stage run with difficulty tuning; results screen with run stats.

**Out of scope:** extra bosses, loop 2, daily seed.

**Acceptance criteria**
- A full run (stages 1–5) can be completed; the boss shows 3 clearly different phases, each with readable tells.
- Playtest (n ≥ 5): the median player reaches stage 3 on their first run, and ≥ 1 player beats the boss within 5 runs.

**Testing:** boss phase transition tests, part-destruction tests; full-run golden replay; performance check at the boss's peak bullet count.

---

## M7 — Polish, Accessibility, Performance

**Scope**
- CRT/scanline post-processing filter (optional); high-contrast bullet mode; flash reduction held to ≤ 3 Hz; subtitles for boss callouts.
- Final audio mix and loudness pass; replace every remaining placeholder asset.
- Performance pass: pooling audit, draw calls, bundle size ≤ 5 MB gzipped, load time ≤ 3 s.
- Bug bash; `assets/CREDITS.md` complete.

**Out of scope:** new mechanics or content.

**Acceptance criteria**
- **Zero placeholder assets** remain (the manifest check flags anything tagged `placeholder`).
- Every NFR in GAME_SPEC §6 is verified and recorded in `docs/release-checklist.md`.
- Playtest (n ≥ 10) meets the "Feel" success criteria.

**Testing:** full regression (unit, replay, E2E, visual); cross-browser manual pass; colour-blind simulation screenshots.

---

## M8 — Release (MVP)

**Release artifacts:** `CHANGELOG.md`, `docs/known-issues.md`, `release/store-page.md`,
`release/capture-guide.md`, and `.github/workflows/release.yml`. The checklist retains hosted/manual evidence until it
is actually recorded; no local change can substitute for a public deployment or device/browser validation.

**Scope**
- Production deploy to Cloudflare Pages and an itch.io HTML5 upload; store page art, screenshots, GIF trailer.
- Version tag `v1.0.0`, changelog, and a known-issues list.

**Out of scope:** leaderboards, PWA/touch, desktop/mobile builds (these go to the post-MVP roadmap).

**Acceptance criteria**
- The public URL loads and plays on the latest 2 versions of every target browser; no errors in the console.
- Release checklist is fully signed off.

**Testing:** smoke E2E against the production URL; manual final pass on the reference device.

---

## Graphics Overhaul Program (Post-MVP)

The MVP milestones above remain the historical release plan. This is a separate, incremental visual-modernization program for the `grpahics` branch. It upgrades Starshot to premium neo-arcade presentation while retaining the code-authored, deterministic asset workflow.

**Program constraints**
- Retain Phaser and the existing sim/presentation boundary; this is not an engine migration.
- Keep the current 270×480 simulation/world coordinate system for gameplay, content tuning, hitboxes, and replay determinism.
- Add a canonical 540×960 presentation buffer for higher-detail generated art, UI, backgrounds, masks, and effects.
- Centralize world-to-presentation conversion in presentation code. Gameplay systems and content should not manually multiply coordinates.
- Keep `sim/` unchanged unless separately approved. Graphics work belongs in `tools/`, `presentation/`, `ui/`, and presentation-only content.
- Generate all visual assets in-repository; no externally authored/imported art is required.
- Preserve sprite keys, anchors, and required clips unless a milestone explicitly migrates their content contract.
- Readability wins over spectacle: player, hostile bullets, pickups, and attack tells must remain distinct in greyscale and at peak density.
- Quality tiers may remove cosmetic work but never gameplay cues.

### Graphics Program Overview (≈ 9–13 weeks)

| # | Milestone | Est. | Primary deliverable |
|---|-----------|------|---------------------|
| G1 | Visual foundation & baselines | 0.5–1 wk | Art contract, ADR, visual/performance baselines |
| G2 | Presentation resolution migration | 1 wk | 270×480 world rendered through a 540×960 presentation buffer |
| G3 | Procedural raster-art toolkit | 1–1.5 wk | Palette-safe deterministic 2× art recipes |
| G4 | Player, projectile & pickup art pass | 1 wk | Premium core-combat silhouettes and animation |
| G5 | Enemy roster & boss art pass | 1.5–2 wk | Cohesive enemy materials, tells, and boss treatment |
| G6 | Stage backgrounds & scene composition | 1–1.5 wk | Seeded multi-layer 540×960 environments |
| G7 | Modern FX compositor & quality tiers | 1.5–2 wk | Pooled layered effects and accessible quality modes |
| G8 | HUD, menu & transition art pass | 1–1.5 wk | Cohesive title, UI, typography, and transitions |
| G9 | Visual QA, optimization & release candidate | 1 wk | Final regression, device validation, documentation |

---

## G1 — Visual Foundation & Baselines

**Scope**
- Rewrite `docs/ART_DIRECTION.md` into a premium neo-arcade style contract: silhouette/value hierarchy, material and emissive rules, background luminance limits, effect limits, and the 270×480 world → 540×960 presentation model.
- Add an ADR retaining Phaser and extending the deterministic code-authored asset pipeline instead of replacing the engine or importing external generation tooling.
- Add fixed-seed Playwright screenshot baselines for title, representative gameplay, peak bullet density, boss play, flash reduction, and high-contrast bullets at the current MVP resolution before migration.
- Record atlas dimensions, build/download size, and stress-scene performance in `docs/release-checklist.md`.

**Out of scope:** asset replacement, palette changes, shaders, simulation/gameplay changes, resolution implementation.

**Acceptance criteria**
- The art contract defines player/enemy/bullet/pickup hierarchy evaluable from greyscale screenshots.
- The resolution contract clearly distinguishes world coordinates from presentation pixels.
- Fixed-seed screenshots are deterministic and fail on an intentional visual change.
- Performance and bundle baselines are recorded before visual complexity increases.

**Testing:** full existing regression; visual screenshot coverage; manual greyscale review of baseline scenes.

---

## G2 — Presentation Resolution Migration

**Scope**
- Introduce explicit world and presentation constants, for example 270×480 world coordinates and 540×960 presentation pixels, instead of treating one size as both gameplay and rendering resolution.
- Configure Phaser to render to the 540×960 presentation buffer while preserving crisp scaling and portrait letterboxing on modern displays.
- Centralize the fixed 2× world-to-presentation transform in presentation helpers/layers; sprite sync, particles, camera effects, backgrounds, HUD, menus, and debug/status assumptions use the correct coordinate space.
- Preserve gameplay content coordinates, hitboxes, speeds, paths, boss positions, and replay hashes unless an individual visual contract requires a documented presentation-only mapping.
- Update E2E canvas-size expectations, display-zoom tests, visual-baseline dimensions, and documentation references that currently assume 270×480 is the render target.
- Define small-screen behavior: prefer integer display scaling when possible, and document any fallback scaling used when a viewport cannot fit 540×960 at 1×.

**Out of scope:** retuning gameplay to a 540×960 world, changing collision/hitboxes, new art generation, UI redesign beyond layout-space migration.

**Acceptance criteria**
- A fixed-seed replay produces the same simulation hash before and after the migration.
- The browser canvas reports a 540×960 internal render size while world entities appear at the same gameplay-relative positions.
- Existing MVP art can render correctly through the 2× presentation path as an interim compatibility layer.
- Title, play, pause, settings, results, boss, high-contrast bullets, and flash-reduction modes remain usable after the migration.
- Integer or documented fallback scaling keeps the canvas crisp and centered on desktop and the reference device.

**Testing:** display-zoom and presentation-transform unit tests; replay golden tests; Chromium/WebKit smoke and core-loop E2E; screenshot baseline refresh for 540×960; manual reference-device performance check.

---

## G3 — Procedural Raster-Art Toolkit

**Scope**
- Add reusable deterministic palette-safe tooling under `tools/art/`: layered raster canvas, mirrored silhouettes, primitives, outlines, palette ramps, dithering, seeded noise, material passes, glow masks, and animation helpers.
- Split monolithic sprite definitions into focused player, enemy, boss, projectile, pickup, and FX recipe modules.
- Retain `tools/build-art.ts` and its Aseprite-compatible output contract so atlas packing, manifests, and runtime loading remain compatible.
- Support 2× detail recipe output where appropriate, while keeping sprite anchors/clips stable and documenting any intentional frame-size migrations.
- Add recipe metadata/versioning sufficient to reproduce and review intended art changes.

**Out of scope:** runtime FX rewrite, gameplay coordinate changes, external image dependencies.

**Acceptance criteria**
- Identical recipe inputs produce byte-identical raster output and atlas metadata.
- The toolkit produces layered hull shading, emissive cores, controlled dithering, and mirrored silhouettes using only the master palette.
- Existing export, atlas, manifest, and asset gates pass with presentation-resolution-aware assets.

**Testing:** primitive/seed determinism tests; palette/size/clip tests; `npm run assets:build` and `npm run check:assets`.

---

## G4 — Player, Projectile & Pickup Art Pass

**Scope**
- Rebuild player ship art with a stronger silhouette, hull panels, cockpit/engine detail, designed bank frames, and staged destruction at presentation-buffer detail.
- Rebuild player shots, enemy bullets, and pickups through the new recipe toolkit.
- Add generated support art for thrusters, projectile glow, and pickup pulse while keeping enemy bullets round and high contrast.
- Preserve gameplay-relative size, position, anchors, and clip meaning; any frame-size changes are atlas/content migrations only, not collision changes.

**Out of scope:** enemy/boss redesign, background replacement, UI redesign, collision/hitbox changes.

**Acceptance criteria**
- The player is identifiable within 100 ms in the peak-density scene.
- Enemy bullets remain distinct from player shots, pickups, and backgrounds in colour and greyscale.
- New art works through existing gameplay/animation contracts with no simulation changes.

**Testing:** atlas/manifest/palette gates; combat screenshots; high-contrast setting coverage; reference-device stress check.

---

## G5 — Enemy Roster & Boss Art Pass

**Scope**
- Rebuild Grunt, Swooper, Tank, and Elite with distinct silhouettes, material families, energy/weak points, and escalating tells at presentation-buffer detail.
- Rebuild boss core, wings, and cannon as a unified modular machine with readable destruction and phase-state treatment.
- Add material-aware generated destruction/debris frames for enemies and boss parts.
- Retain all entity/boss keys, part-layout contracts, anchors, required animations, and gameplay hitboxes.

**Out of scope:** new enemy behavior, boss mechanics, balance changes, additional enemies/bosses.

**Acceptance criteria**
- Each enemy remains distinguishable by silhouette at gameplay scale and in greyscale.
- Existing attack tells are visible for their current duration and cannot be mistaken for player effects.
- Boss part destruction and phase changes are legible without audio or subtitles.

**Testing:** atlas/manifest/palette gates; seeded enemy/boss screenshots; existing boss/replay tests; peak-boss-density performance validation.

---

## G6 — Stage Backgrounds & Scene Composition

**Scope**
- Replace the simple starfield with deterministic 540×960 multi-layer presentation: deep-space field, low-contrast nebulae, distant stars, sparse large objects, and optional foreground detail.
- Add presentation-only stage environment schema/data for theme, seed, palette role, layer density, and motion speed.
- Derive layouts from stable stage/run seeds; backgrounds never affect simulation determinism.
- Pre-render/cache static layers and pool moving elements rather than rebuilding geometry each frame.

**Out of scope:** scrolling gameplay, mechanics changes, decorative objects resembling bullets, unbounded generation.

**Acceptance criteria**
- Every stage has a distinct atmosphere while background luminance stays within the art-direction limit.
- The same stage and seed always produce the same layout.
- Backgrounds preserve player/bullet readability in peak-density and greyscale checks.

**Testing:** deterministic layout tests; schema tests; stage screenshots; device performance with all background layers enabled.

---

## G7 — Modern FX Compositor & Quality Tiers

**Scope**
- Replace rectangle-only sparks with pooled layered 540×960 FX for thrusters, muzzle flashes, trails, hits, debris, explosions, bomb waves, tells, pickups, and boss destruction chains.
- Drive effect selection/budgets from `content/fx/` where appropriate and preserve the event-driven presentation boundary.
- Add visual-quality, background-motion, and effects-intensity settings while retaining shake, flash reduction, CRT, subtitles, and high-contrast bullets.
- Evaluate Phaser 4 WebGL post-processing only behind a tested optional path with generated-sprite fallback.

**Out of scope:** mandatory custom shaders, FX triggered directly from `sim/`, unbounded particles, gameplay/hitbox changes.

**Acceptance criteria**
- Every high-impact event has a readable pooled reaction and reduced-flash alternative.
- Low quality removes cosmetic work first while retaining bullets, tells, and accessibility cues.
- The 300-bullet/400-particle target holds 60 FPS at high and low quality on the reference device.
- Flash reduction remains at or below 3 Hz.

**Testing:** event/quality-tier unit tests; full/reduced FX screenshots; particle-pool budget tests; stress and renderer-fallback validation.

---

## G8 — HUD, Menu & Transition Art Pass

**Scope**
- Replace generic monospace/rectangle presentation with generated bitmap/display glyphs, panel frames, icons, and palette-safe ornaments targeting the 540×960 presentation buffer.
- Add title-logo treatment, animated title backdrop, compact HUD hierarchy, and stylized title/pause/results/settings panels.
- Add restrained palette-safe wipes or dissolves; retain the string-table, input, flow, and persistence contracts.

**Out of scope:** new menu features, rebinding, non-English localization, external font/image assets.

**Acceptance criteria**
- HUD remains legible at presentation 1× and never obstructs gameplay.
- Menus, HUD, title, and gameplay share one coherent palette, border, typography, and emissive language.
- Every flow state remains keyboard/pointer operable without console errors.

**Testing:** UI asset gates; title/HUD/menu screenshot baselines; existing scene-flow and Chromium/WebKit E2E tests.

---

## G9 — Visual QA, Optimization & Release Candidate

**Scope**
- Audit generated art, environments, effects, UI, and quality modes against the G1 contract.
- Optimize atlas packing, textures, pools, draw order, optional effects, and 540×960 rendering cost without reducing required readability.
- Complete accessibility/compatibility checks: greyscale/colour-blind screenshots, flash reduction, high-contrast bullets, quality tiers, fullscreen, and browser fallbacks.
- Update credits, release checklist, art documentation, baselines, and affected ADRs.

**Out of scope:** new gameplay content, engine migration, runtime dependencies without a new ADR, unrelated post-MVP work.

**Acceptance criteria**
- No visual asset is a placeholder; generated outputs are reproducible and committed.
- Graphics-program screenshot baselines are intentionally approved and passing.
- NFR-01 through NFR-08 remain met, including ≤ 5 MB gzipped initial download and ≤ 3 s first playable.
- Reference-device and target-browser checks confirm stable 60 FPS at peak visual load.

**Testing:** required command suite; Chromium/WebKit and production smoke tests; visual regression; device evidence; final colour-blind and flash-safety review.

---

## Post-MVP Roadmap (not scheduled in detail)

| ID | Milestone | Key Deliverables |
|----|-----------|------------------|
| P1 | Mobile & PWA | Touch controls (relative drag + autofire), PWA manifest and offline cache |
| P2 | Online leaderboards | Supabase anonymous auth, `LeaderboardPort`, edge function that verifies replays, RLS |
| P3 | Content expansion | New enemies and bosses, loop 2, daily seed, capturing enemies |
| P4 | Desktop / stores | Electron + steamworks.js build (ADR), achievements; Capacitor mobile builds |

