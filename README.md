# Starshot

A neo-arcade **fixed shooter** (Galaga / Space Invaders lineage) for the web, built art-first.

> Status: **M5 — Game flow, UI & persistence** complete. Start from the title with Z/Space, pause with Esc,
> then retry from Results after a game over. Settings persist locally (music/SFX/UI buses, shake, flash reduction,
> CRT preference and fullscreen); local high scores retain the best 10 runs. Four data-defined stages field Grunts,
> Swoopers, Tanks and Elites with formation sway, dives and visible attack tells. `?seed=N` fixes the run seed.
> Dev builds: `P` pauses, `.` steps one tick (frame-step latency check).

## Development

Requires Node 26 (`.nvmrc`; ≥ 24 works). Tools are TypeScript run natively by Node.

```sh
npm ci
npm run dev            # http://localhost:5173 — 270×480 integer-scaled canvas + placeholder ship
npm run typecheck && npm run lint && npm run lint:deps && npm test && npm run check:assets
npm run test:e2e       # Playwright smoke (Chromium + WebKit); first run: npx playwright install
npm run assets:build   # Aseprite + code-art export → atlas → generated audio/music (ffmpeg) → asset gates
```

CI (`.github/workflows/`) runs every check above plus E2E, and deploys each PR to a Cloudflare
Pages preview URL (commented on the PR). Setup: secrets `CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`; variable `CLOUDFLARE_PAGES_PROJECT`.

## Document Index

| Doc | Purpose | Phase |
|-----|---------|-------|
| [ART_DIRECTION.md](./docs/ART_DIRECTION.md) | Visual & audio direction, asset pipeline, quality gates | 1 |
| [TECH_STACK.md](./docs/TECH_STACK.md) | Requirements analysis, stack comparison, final recommendation | 2 |
| [GAME_SPEC.md](./docs/GAME_SPEC.md) | Vision, user stories, requirements, MVP, deferred features | 3 |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Subsystems, boundaries, data flow, folder layout, testing | 4 |
| [MILESTONES.md](./docs/MILESTONES.md) | Incremental roadmap with acceptance criteria and DoD | 5 |
| [AGENTS.md](./docs/AGENTS.md) | Rules for AI coding agents and contributors | 6 |

## Reading Order

1. `GAME_SPEC.md` (what we are building)
2. `ART_DIRECTION.md` (how it must look and sound)
3. `TECH_STACK.md` → `ARCHITECTURE.md` (how it is built)
4. `MILESTONES.md` (in what order)
5. `AGENTS.md` (how to contribute)

## Optimization Principles (Phase 7)

| Goal | How this plan delivers it |
|------|---------------------------|
| **Ship quickly** | Web-only MVP, no backend, off-the-shelf engine (Phaser), about 10–12 weeks across 9 small milestones; leaderboards, mobile and desktop deferred |
| **Maintainability** | Pure deterministic `sim` split from Phaser presentation; boundaries checked by dependency-cruiser; tuning lives in data |
| **AI-assisted development** | Text-only TypeScript + JSON (no binary scenes); small public APIs per module; Zod schemas as contracts; golden replays catch changes in behavior; concise `AGENTS.md` |
| **Small iterations** | Every milestone ends playable on a preview URL; one task per PR with ≤ 400 lines; art/audio tracks run alongside code in every milestone |
| **Professional art without rewrites** | Placeholders match final asset specs, effects are driven by events and data, and CI checks palette and manifest, so the final art is an asset swap |

## Source-of-Truth Rules

- Scope questions → `GAME_SPEC.md`
- "Where does this code go?" → `ARCHITECTURE.md`
- "Is this in the current milestone?" → `MILESTONES.md`
- "Does this look/sound right?" → `ART_DIRECTION.md`
- Decisions that change any of the above are recorded as ADRs in `docs/adr/`.
