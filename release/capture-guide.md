# v1.0.0 Store Asset Capture Guide

This repository intentionally does not commit generated marketing binaries. Capture these assets from the production
bundle after the final production smoke test and upload them to the configured Cloudflare Pages/itch.io release.

| Asset | Minimum output | Capture direction |
| --- | --- | --- |
| Cover / store page art | 630×500 PNG | The player ship facing a readable formation; use the master palette and no text smaller than 8 px at native scale. |
| Screenshot 1 | 1280×720 PNG | Peak readable combat: player, high-contrast enemy bullets, HUD, and a weapon pickup. |
| Screenshot 2 | 1280×720 PNG | A boss phase with the Overlord's wings/cannon and subtitle tell visible. |
| Screenshot 3 | 1280×720 PNG | Results screen showing score and stage reached. |
| Trailer GIF | 1280×720 GIF, 10–20 s | Title → combat → bomb → boss phase → victory/result. Keep captions readable and avoid flashes above 3 Hz. |

## Reproducible capture conditions

1. Run `npm run build` and serve `dist/` (or use the Cloudflare production URL).
2. Use `?seed=1` for combat captures so the run is repeatable.
3. Use a 1280×1000 browser viewport: the game is integer-scaled 2× and centered.
4. Record browser/version, OS, URL, seed, and capture date in `docs/release-checklist.md`.
5. Verify that all art obeys `docs/ART_DIRECTION.md` §§3 and 9, then attach the final files to the itch.io page.
