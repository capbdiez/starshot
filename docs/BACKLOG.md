# Backlog

Items deliberately left out of the current milestone (AGENTS §1). Each has a target.

| Item | Why deferred | Target |
|------|--------------|--------|
| Final palette sign-off by the artist | M0 palette is a role-based starting point; swaps are data-only | M1 (with final ship art) |
| Scoring, score in `EnemyKilled` events, HUD (lives display) | Scoring UI is out of M1 scope | M4 |
| Grunt `dive` clip and dive behaviour; formations | Out of M1 scope | M3 |
| Bombs, weapon levels, extra lives | Out of M1 scope | M4 |
| Code-authored final-art pass for the remaining roster, boss, pickups, FX, UI/font and background details | Replace simple interim code-art (for example Tank/Elite blocks) with palette-grid/procedural final graphics through `tools/art/`; no external sprite-production workflow is required | M7 |
| Pause on tab hidden / focus loss (FR-11) | Scene flow + platform visibility arrive with menus | M5 |
| Shared trig lookup tables for `sim` | Raw trig is already lint-banned in `sim`; helpers arrive when first needed | M3 (paths) |
| Visual screenshot baselines | Nothing stable to baseline in M0 | M2 |
| `debug/` overlay | FR-12, not in M0 scope | M2 |
| WebKit E2E on non-Debian dev machines | Playwright WebKit needs Debian/Ubuntu system libs; CI (ubuntu) runs it | — |
| Upgrade to TypeScript 7 | Blocked on typescript-eslint support (ADR 0001) | When available |
