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

**Scope**
- Production deploy to Cloudflare Pages and an itch.io HTML5 upload; store page art, screenshots, GIF trailer.
- Version tag `v1.0.0`, changelog, and a known-issues list.

**Out of scope:** leaderboards, PWA/touch, desktop/mobile builds (these go to the post-MVP roadmap).

**Acceptance criteria**
- The public URL loads and plays on the latest 2 versions of every target browser; no errors in the console.
- Release checklist is fully signed off.

**Testing:** smoke E2E against the production URL; manual final pass on the reference device.

---

## Post-MVP Roadmap (not scheduled in detail)

| ID | Milestone | Key Deliverables |
|----|-----------|------------------|
| P1 | Mobile & PWA | Touch controls (relative drag + autofire), PWA manifest and offline cache |
| P2 | Online leaderboards | Supabase anonymous auth, `LeaderboardPort`, edge function that verifies replays, RLS |
| P3 | Content expansion | New enemies and bosses, loop 2, daily seed, capturing enemies |
| P4 | Desktop / stores | Electron + steamworks.js build (ADR), achievements; Capacitor mobile builds |

