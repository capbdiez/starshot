# Known Issues — v1.0.0

No known release-blocking defects are recorded for v1.0.0.

## M9 mobile-browser compatibility baseline

- **Supported matrix:** the latest two Android Chrome and iOS Safari versions, plus desktop Chrome, Firefox, Safari, and Edge. Automated baseline coverage uses Pixel 5 Chromium and iPhone 13 WebKit emulation in both portrait and landscape; real-device evidence remains required before M12 sign-off.
- **Viewport policy:** the 270×480 world and 540×960 presentation buffer never change. The game uses the visible `VisualViewport` when present (with layout-viewport fallback), prefers a whole-device-pixel scale, and uses a centered fractional fit only when 1× cannot show the complete presentation canvas. Gameplay is never cropped.
- **Minimum supported viewport:** 270×480 CSS pixels of visible viewport area. Smaller areas may use the same complete-canvas fractional fit, but are not part of the M9 support baseline.
- **Real-device QA record:** `docs/mobile-qa.md` is required release evidence. Record date; device model; OS and browser versions; portrait and landscape visible viewport sizes; URL/build; selected high/low quality and peak-load FPS/frame-time result; safe-area, browser-toolbar, resize/rotation, audio unlock, background recovery, fullscreen fallback, touch/retry, and no-console-error result; plus a screenshot or recording reference. Playwright device emulation is regression coverage, not physical-device evidence.

## Platform limitations

- M10 maps captured Pointer Events from the lower 40% of the game surface into left, right, held-fire, and bomb zones. M11 makes those zones discoverable with fixed lower-screen `LEFT`, `RIGHT`, `FIRE`, and `BOMB` controls plus a top-right `PAUSE` control, shown only when the browser reports a coarse primary pointer with touch capability. Their world positions use the fixed camera transform into the safe-area-fitted presentation canvas, and they are hidden outside gameplay so title, pause, settings, results, retry, and title actions retain their Phaser pointer targets. Fullscreen is requested only where supported; iOS Safari can continue playing normally when it declines or lacks the API. PWA/offline installation, configurable layouts, haptics, native desktop builds, and mobile-store builds remain separate post-MVP work (see `docs/MILESTONES.md`).
- Browser audio requires a player gesture before it can start; this is a browser security requirement, not a game error.
- Older browser versions are not supported.

## Support and defect reporting

Report reproducible defects with the browser and version, operating system and device model, portrait/landscape visible viewport size, selected quality mode, deployment URL/build identifier, and the optional `?seed=N` run seed. For touch issues, include the control sequence and whether the browser was backgrounded, rotated, or its toolbar changed. Attach a screenshot or short recording when possible; do not include personal account information because the game has no accounts or analytics.
