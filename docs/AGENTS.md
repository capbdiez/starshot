# AGENTS.md — Rules for AI Agents & Contributors

Read first: `GAME_SPEC.md` (scope), `ARCHITECTURE.md` (where code goes), `MILESTONES.md` (what's in scope now), `ART_DIRECTION.md` (asset rules).

## 1. Scope Control
- Work only on the **current milestone** in `MILESTONES.md`. Anything listed as out of scope gets rejected or goes into `docs/BACKLOG.md`.
- One task per PR. Aim for ≤ 400 changed lines, not counting data or assets.
- Don't add features, dependencies, or "nice-to-haves" that weren't asked for. Adding a runtime dependency needs an ADR.
- If a requirement is unclear, ask or write down the assumption in the PR. Never guess silently.

## 2. Architecture Compliance
- `src/sim/` is **pure TS**: no Phaser, no DOM, no `Math.random`, no `Date`/`performance`, no timers. Use the injected RNG.
- The simulation communicates only through `step(input)`, `snapshot()` and `drainEvents()`. Presentation never changes simulation state.
- Effects, audio and camera react to **sim events** mapped in `content/fx/`. Don't trigger effects from gameplay code.
- Gameplay numbers live in `content/*.json` with Zod schemas, not in code.
- Import other modules only through their `index.ts`. `npm run lint:deps` must pass.
- Structural changes (new module, boundary change, new dependency) need an ADR in `docs/adr/`.

## 3. Coding Standards
- TypeScript `strict`; no `any` (use `unknown` and narrow it); no non-null `!` assertions in `sim/`.
- ESLint + Prettier must be clean. Names: `camelCase` for values, `PascalCase` for types, `kebab-case` for files.
- Small pure functions; no hidden global state; dependencies are passed in through constructors or factories.
- Don't allocate objects in per-frame hot paths (use pools); prefer typed arrays for bullets and particles.
- No commented-out code, no `TODO` without an issue link, and no `console.log` outside `debug/`.

## 4. Assets
- Follow `ART_DIRECTION.md` for sizes, anchors, palette and atlas key naming.
- A placeholder must match the final asset's key, size and animation clips. Swapping in the final asset must need **zero code changes**.
- Record every new asset's license in `assets/CREDITS.md`.

## 5. Testing Requirements
- Every sim change comes with Vitest unit tests. Keep `sim/` coverage ≥ 80 %.
- Every content schema change comes with a validation test.
- If a golden replay hash changes, update the fixture **on purpose** and explain why in the PR.
- Before opening a PR, run: `npm run typecheck && npm run lint && npm run lint:deps && npm test && npm run check:assets`.
- Changes to UI or scene flow must keep the Playwright smoke test passing.

## 6. Documentation Rules
- Update the relevant `.md` file **in the same PR** as any change to behavior, architecture or scope.
- Public APIs (`index.ts` exports) get a one-line TSDoc comment.
- The PR description lists: milestone ID, what changed, tests added, and any assumptions.
- Don't create new top-level docs without a reason; prefer adding to the existing ones.
