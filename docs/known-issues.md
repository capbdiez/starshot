# Known Issues — v1.0.0

No known release-blocking defects are recorded for v1.0.0.

## M9 mobile-browser compatibility baseline

- **Supported matrix:** the latest two Android Chrome and iOS Safari versions, plus desktop Chrome, Firefox, Safari, and Edge. Automated baseline coverage uses Pixel 5 Chromium and iPhone 13 WebKit emulation in both portrait and landscape; real-device evidence remains required before M12 sign-off.
- **Viewport policy:** the 270×480 world and 540×960 presentation buffer never change. The game uses the visible `VisualViewport` when present (with layout-viewport fallback), prefers a whole-device-pixel scale, and uses a centered fractional fit only when 1× cannot show the complete presentation canvas. Gameplay is never cropped.
- **Minimum supported viewport:** 270×480 CSS pixels of visible viewport area. Smaller areas may use the same complete-canvas fractional fit, but are not part of the M9 support baseline.
- **Real-device QA record:** record date; device model; OS and browser versions; portrait and landscape visible viewport sizes; URL/build; safe-area, browser-toolbar, resize/rotation, and no-console-error result; plus a screenshot or recording reference.

## Platform limitations

- M9 provides viewport compatibility only. Gameplay touch input and visible touch controls arrive in M10 and M11 respectively. PWA/offline installation, configurable layouts, haptics, native desktop builds, and mobile-store builds remain separate post-MVP work (see `docs/MILESTONES.md`).
- Browser audio requires a player gesture before it can start; this is a browser security requirement, not a game error.
- Older browser versions are not supported.

Report reproducible defects with browser/version, operating system, visible viewport size/orientation, and the optional `?seed=N` run seed when available.