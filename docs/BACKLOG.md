# Backlog

Items deliberately left out of the current milestone (AGENTS §1). Each has a target.

| Item | Why deferred | Target |
|------|--------------|--------|
| Final palette sign-off by the artist | M0 palette is a role-based starting point; swaps are data-only | M1 (with final ship art) |
| `InputFrame` bit layout, keyboard/gamepad `InputSource` | Gameplay input is M1 scope | M1 |
| Seeded RNG, golden replay fixtures | No gameplay state yet to replay | M1 |
| Render smoothing using `GameLoop.alpha` | Nothing moves yet | M1 |
| Shared trig lookup tables for `sim` | Raw trig is already lint-banned in `sim`; helpers arrive when first needed | M3 (paths) |
| Visual screenshot baselines | Nothing stable to baseline in M0 | M2 |
| `debug/` overlay | FR-12, not in M0 scope | M2 |
| WebKit E2E on non-Debian dev machines | Playwright WebKit needs Debian/Ubuntu system libs; CI (ubuntu) runs it | — |
| Upgrade to TypeScript 7 | Blocked on typescript-eslint support (ADR 0001) | When available |
