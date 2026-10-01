# ADR 0002 — Simulation / Presentation Split

- **Status:** Accepted (M0, 2026-09-30)
- **Context:** ARCHITECTURE.md §1–§4, §7; GAME_SPEC NFR-04 (determinism).

## Decision

1. Gameplay lives in `src/sim/`, a **pure TypeScript** module with no Phaser, DOM, clocks, timers
   or `Math.random`. Its entire public API is:
   `createSim(content, seed)`, `sim.step(input)`, `sim.snapshot()`, `sim.drainEvents()`, `sim.hash()`.
2. `src/app/game-loop.ts` drives the sim with a **fixed 60 Hz accumulator**. Frame time is clamped
   (250 ms) to avoid a spiral of death; the leftover fraction (`alpha`) is used for smoothing.
3. Presentation (Phaser) only reads `snapshot()` and reacts to `drainEvents()`. It never mutates
   sim state. Hit-stop / slow motion are loop commands, not sim changes.
4. Game data lives in `content/*.json`, validated by Zod schemas in `src/content/`, and is passed
   to the sim **frozen**.

## Enforcement

| Rule | Tool |
|------|------|
| `sim` must not import Phaser, `presentation`, `ui`, `platform`, `app` | dependency-cruiser (`sim-layer`, `sim-no-phaser`) + ESLint `no-restricted-imports` |
| No `window`, `document`, `Date`, `performance`, timers, `Math.random`, raw trig in `sim` | ESLint `no-restricted-globals` / `no-restricted-properties` |
| Modules only import each other via `index.ts` | dependency-cruiser `public-api-only-*` |
| Determinism | `sim.hash()` tests now; golden replays from M1 |

## Consequences

- Sim is testable headless in Node (fast, ≥ 80 % coverage gate) and can later be re-run on a
  server to verify leaderboard replays.
- Slightly more plumbing (events, snapshots) than using Phaser Arcade Physics directly.
- `drainEvents()` returns a reused buffer (valid until the next call) to avoid per-tick allocation.
