# Known Issues — v1.0.0

No known release-blocking defects are recorded for v1.0.0.

## Platform limitations

- The current release is desktop-first. M9–M12 define the planned mobile-browser compatibility program for current iOS Safari and Android Chrome in documented portrait and landscape viewports. PWA/offline installation, configurable layouts, haptics, native desktop builds, and mobile-store builds remain separate post-MVP work (see `docs/MILESTONES.md`).
- Browser audio requires a player gesture before it can start; this is a browser security requirement, not a game error.
- The game targets the latest two versions of Chrome, Firefox, Safari, and Edge. Older browsers are not supported.

Report reproducible defects with browser/version, operating system, and the optional `?seed=N` run seed when available.