# Starshot — Architecture (Phase 4)

## 1. Guiding Principles

1. **Simulation and presentation are separate.** The gameplay simulation is plain TypeScript and knows nothing about Phaser, the DOM or audio.
2. **Events drive presentation.** The simulation emits typed events; the presentation layer turns them into sprites, animations, effects, audio and camera moves.
3. **Data over code.** Enemies, waves, bullet patterns, weapons, animations and effects are schema-checked data.
4. **Deterministic by design.** Fixed 60 Hz timestep, seeded RNG, no `Math.random`/`Date.now` inside the simulation.
5. **Boundaries are enforced by tooling** (dependency-cruiser), not by convention.

## 2. Major Subsystems

```
┌──────────────────────────────────────────────────────────────┐
│ app/        Boot, scene flow, dependency wiring (composition │
│             root). Only place that knows every module.       │
├──────────────┬───────────────────────────┬───────────────────┤
│ platform/    │ presentation/             │ ui/               │
│ input, save, │ renderer (sprite sync),   │ HUD, menus,       │
│ audio device,│ animation, fx, camera,    │ settings, results │
│ visibility,  │ audio director, parallax  │ (Phaser scenes)   │
│ fullscreen   │ (Phaser-dependent)        │                   │
├──────────────┴───────────┬───────────────┴───────────────────┤
│ sim/  (PURE TS)          │ content/  (DATA + SCHEMAS)        │
│ world, entities, systems │ enemies, waves, patterns, bosses, │
│ collision, scoring, rng, │ weapons, animations, fx, audio,   │
│ events, replay           │ strings; Zod schemas + loader     │
├──────────────────────────┴───────────────────────────────────┤
│ shared/  math, types, pools, constants                       │
└──────────────────────────────────────────────────────────────┘
```

| Subsystem | Responsibility | Depends on Phaser? |
|-----------|----------------|--------------------|
| `sim` | Game rules: movement, spawning, paths, bullet patterns, collision, damage, scoring, lives, wave and boss state machines, emitting events | **No** |
| `content` | JSON data, Zod schemas, typed loaders, cross-reference checks | No |
| `presentation` | Draws a read-only view of the simulation state each frame; reacts to events with effects, audio and camera; smooths motion between steps | Yes |
| `ui` | Menus, HUD, settings screens; reads a HUD view model; sends commands | Yes |
| `platform` | Wraps browser APIs: input devices → `InputFrame`, localStorage, WebAudio unlock, page visibility, fullscreen | Partly (input/audio) |
| `app` | Boot and preload, scene flow state machine, game loop driver, connecting modules together | Yes |
| `shared` | Pure utilities with no game knowledge | No |

## 3. Ownership Boundaries & Public vs Private State

| Owner | Private (mutable, internal) | Public API (what others may use) |
|-------|-----------------------------|----------------------------------|
| `sim` | `World` entity stores, pools, RNG state, system internals | `createSim(content, seed)`, `sim.step(input: InputFrame)`, `sim.snapshot(): Readonly<SimView>`, `sim.drainEvents(): readonly SimEvent[]`, `sim.hash()` |
| `content` | Raw JSON, parse cache | `loadContent(): Content` (frozen, typed), `validateContent()` |
| `presentation` | Phaser GameObjects, sprite↔entity-id map, emitters, tweens | `Presenter.sync(view, alpha)`, `Presenter.handle(events)`, `Presenter.setSettings(fx)` |
| `platform` | DOM listeners, raw gamepad state, storage keys | `InputSource.poll(): InputFrame`, `SaveStore.load/save<T>(key, schema)`, `AudioDevice`, `Visibility.onChange` |
| `ui` | Scene widgets | Emits `UiCommand` (`start`, `pause`, `resume`, `setSetting`, …) |
| `app` | Scene flow state, loop accumulator | None (top level) |

**Rules**
- `SimView` is a **read-only snapshot**: plain objects or typed arrays, frozen in dev builds. Presentation must never change it.
- Entities are referenced **by numeric ID**, never by object reference, across boundaries.
- Only `app` builds module instances; modules never create their own dependencies (they are passed in via constructors).
- Each module exposes its public API through its `index.ts`; importing another module's internal files is forbidden.

## 4. Data Flow

```
Keyboard/Gamepad ─► platform.InputSource.poll() ─► InputFrame (bitmask, per tick)
                                                    │
        ┌──────────── app.GameLoop (fixed 60 Hz accumulator) ─────────────┐
        │   while (acc >= DT) { sim.step(inputFrame); replay.record(); }  │
        └──────────────────────────────┬──────────────────────────────────┘
                                       │
                 sim.snapshot() ───────┼────────► sim.drainEvents()
                       │                                  │
                       ▼                                  ▼
       presentation.sync(view, alpha)        presentation.handle(events)
       (sprite positions, anims,             (fx spawn, sfx via AudioDirector,
        smoothing between steps)              shake/hit-stop, score popups)
                       │                                  │
                       └──────────► ui.HUD reads HudView ◄┘
                                       │
                                ui emits UiCommand ─► app (pause, settings, restart)
                                                      └► platform.SaveStore (hi-scores, settings)
```

- **Event catalogue** (examples, defined in `sim/events.ts` as a discriminated union): `PlayerFired`, `EnemyHit`, `EnemyKilled{kind,x,y,score}`, `PlayerHit`, `BombUsed`, `PickupCollected`, `WaveStarted`, `WaveCleared`, `BossPhaseChanged`, `ChainChanged`, `ExtraLife`, `GameOver`.
- **The presentation event map** (`content/fx/*.json`) links each event kind to the effects, SFX, camera trauma and hit-stop to play. Tuning the game's feel is a data change.
- **Hit-stop and slow motion** are commands the presentation sends to the game loop (pause or scale how often steps run). The simulation itself never changes speed.
- **Scene flow** (in `app`): `Boot → Preload → Title → Play ⇄ Pause → Results → (Title | Play)`. It is an explicit state machine; scenes never start other scenes directly.

## 5. Service Boundaries

- **MVP:** client only. The one I/O boundary is `platform.SaveStore` (localStorage, with a versioned schema and migrations).
- **Post-MVP leaderboards:** a new `services/leaderboard` client module behind a `LeaderboardPort` interface, backed by a Supabase edge function. The game only depends on the port; the adapter is plugged in by `app`. Offline play falls back to a no-op adapter.
- **Desktop/mobile wrappers:** implemented as extra `platform/` adapters (for example, Steam achievements). The simulation and presentation don't change.

## 6. Folder Structure

```
starshot/
├─ docs/adr/                  # Architecture Decision Records (0001-tech-stack.md, …)
├─ art-src/                   # Aseprite sources, audio project files (Git LFS)
├─ assets/                    # Exported runtime assets (committed)
│  ├─ atlas/  audio/  fonts/  palette/
│  └─ CREDITS.md
├─ content/                   # Game data (JSON) — designers edit here
│  ├─ enemies/ waves/ patterns/ bosses/ weapons/
│  ├─ animations/ fx/ audio/ strings/
│  └─ stages.json
├─ src/
│  ├─ app/                    # boot, scene flow, game loop, wiring
│  ├─ sim/                    # PURE: world, systems/, collision/, rng, events, replay
│  ├─ content/                # schemas/ (Zod), loader, cross-ref validation
│  ├─ presentation/           # renderer/, anim/, fx/, camera/, audio/, parallax/
│  ├─ ui/                     # scenes/ (title, pause, settings, results), hud/, widgets/
│  ├─ platform/               # input/, save/, audio-device/, visibility/, fullscreen/
│  ├─ shared/                 # math, pool, types, constants
│  └─ debug/                  # dev-only overlay (stripped from prod builds)
├─ tests/                     # sim/ content/ replay/fixtures/ assets/ e2e/
├─ tools/                     # atlas build, palette check, placeholder generator
└─ *.md                       # planning docs (this set)
```

## 7. Dependency Rules (enforced by dependency-cruiser in CI)

| Module | May import | Must NOT import |
|--------|-----------|-----------------|
| `shared` | nothing | everything else |
| `content` | `shared`, `zod` | `sim`, `presentation`, `ui`, `platform`, `app`, `phaser` |
| `sim` | `shared`, `content` (types + frozen data only) | `phaser`, DOM globals, `presentation`, `ui`, `platform`, `app` |
| `platform` | `shared` | `sim` internals, `presentation`, `ui` |
| `presentation` | `shared`, `content`, `sim` (public types/API only), `phaser` | `ui`, `app`, `sim` internals |
| `ui` | `shared`, `content` (strings), `presentation` view-model types, `phaser` | `sim` internals, `platform` directly |
| `app` | every module's public API | internal files of any module |
| `debug` | anything | must only be loaded by `app` behind `import.meta.env.DEV` |

Extra lint rules inside `sim/`: no `Math.random`, `Date`, `performance`, `setTimeout`, `window`, or `document`. Trig and other transcendental math (`sin`, `cos`, `atan2`) go through `shared` lookup tables or helpers, so results match across browsers and are safe for replay checks on a server.

## 8. Security Model

- **MVP (static client):** no secrets in the bundle; strict Content-Security-Policy (`default-src 'self'`); no `eval`; everything read from localStorage is checked against a schema (bad data → reset to defaults, never crash).
- **Dependency hygiene:** lockfile committed, `npm audit` + Dependabot in CI, and as few runtime dependencies as possible (Phaser, Zod).
- **Post-MVP leaderboards:** assume the client can't be trusted. Submissions include the seed, game version and **input replay**; an edge function re-runs the deterministic `sim` on the server and only stores the score it verifies. Supabase RLS: players insert only through the function; public reads only. Rate limiting per anonymous user and IP. No personal data except a display name, which is filtered for profanity.

## 9. Testing Strategy

| Layer | Tool | What |
|-------|------|------|
| Unit (sim) | Vitest | Systems, collision, scoring, RNG, wave and boss state machines. Coverage ≥ 80 %. Runs headless in Node |
| Determinism / replay | Vitest | Golden replay fixtures (seed + inputs → expected `sim.hash()` and score). Any change to the hash requires updating the fixture on purpose, with a written reason |
| Content | Vitest + Zod | All `content/` files pass schemas; cross-references resolve (for example, a wave refers to an existing enemy, which refers to an existing pattern) |
| Assets | Node scripts in CI | Palette check, manifest ↔ atlas keys, required animation clips, frame sizes |
| Presentation | Vitest (light) | Event → effect mapping logic (the Phaser adapter is faked); settings scaling (shake/flash) |
| E2E smoke | Playwright | Boot → title → play → pause → game over on Chromium and WebKit; no console errors |
| Visual | Playwright screenshots | Fixed-seed frames of the HUD and a sample scene, compared against baselines to catch visual regressions |
| Performance | Stress scene + manual device test | 300 bullets / 400 particles held at 60 FPS; CI logs the frame-time budget on Chromium as a warning, not a failure |
| Playtest | Human | Each milestone that touches game feel |

## 10. Scalability Considerations

- **Runtime:** object pools for every entity and effect; typed-array storage for bullets; a uniform-grid broadphase for collisions (so collision cost doesn't explode as bullet counts grow); a single atlas per stage to keep draw calls low.
- **Content:** adding stages, enemies or bosses means adding data files. New behaviors are added as new *systems* or *pattern primitives* registered in the simulation, never as special cases for one enemy.
- **Team/AI:** clear module boundaries and small public APIs let people or agents work in parallel with few merge conflicts.
- **Platforms:** new targets are new `platform/` adapters plus a build wrapper.
- **Backend:** leaderboards run serverless on Supabase and grow with its free and paid tiers. Replay checks are CPU-bound but cheap (a few seconds of simulation per run).
