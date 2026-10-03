# Changelog

All notable changes to Starshot are documented here.

## [Unreleased]

### Changed

- P4.1 validates data-authored Overlord projectile variants, guidance settings, and final-form barrage settings; hostile bullets now carry their selected variant through the fixed pool and read-only snapshot while retaining existing movement and collision behavior.
- P3 replaces the finite campaign with endless deterministic levels, recurring tenth-level Overlord encounters, and level-based local scores.
- P3.3 scales normal-wave enemy durability, fire cadence, and dive cadence from difficulty at runtime, with readable timing floors and unchanged authored content.
- P3.4 schedules the existing Overlord on every tenth absolute level, independently of RNG consumption, and includes level and difficulty in boss progression events.
- P3.5 scales recurring Overlord weak-point and phase durability plus fire cadence from difficulty, with a 36-tick attack floor that preserves readable tells and fixed-pool projectile safety.
- P3.6 continues from each defeated Overlord into the next normal level after the usual delay, clearing hostile projectiles and restoring stage music; only game over opens Results and records a score.
- P3.7 shows absolute level, difficulty, and a clear boss indicator in the HUD; cycles normal and boss backgrounds indefinitely; and safely migrates legacy stage-based local scores to level-based scores.
- P3.8 completes endless-progression release hardening: high-difficulty timing floors and fixed-pool regressions protect readable play, while specification, architecture, store, and release documentation now describe game-over-ended endless runs.


## [1.0.0] — 2026-01-10

### Added

- Complete five-stage arcade run with four enemy types and the three-phase Overlord boss.
- Keyboard and gamepad controls, three weapon levels, bombs, lives, scoring, chains, and local top-10 scores.
- Title, pause, settings, results, and game-over flows with persisted audio and accessibility settings.
- Original pixel-art sprites, procedural effects, synthesized SFX, and title/stage/boss/victory music.
- Accessibility controls for screen shake, flash reduction, CRT scanlines, high-contrast enemy bullets, and boss subtitles.
- Cloudflare Pages and itch.io release automation, production smoke testing, and release store copy.

### Changed

- Promoted the package version from the development version to `1.0.0`.

### Fixed

- Final M7 polish removed remaining placeholder runtime assets and completed asset-credit coverage.
