# Backlog

Items deliberately left out of the current milestone (AGENTS §1). Each has a target.

| Item | Why deferred | Target |
|------|--------------|--------|
| Final palette sign-off by the artist | M0 palette is a role-based starting point; swaps are data-only | M1 (with final ship art) |
| Scoring, score in `EnemyKilled` events, HUD (lives display) | Scoring UI is out of M1 scope | M4 |
| Grunt `dive` clip and dive behaviour; formations | Out of M1 scope | M3 |
| Bombs, weapon levels, extra lives | Out of M1 scope | M4 |
| Pause on tab hidden / focus loss (FR-11) | Scene flow + platform visibility arrive with menus | M5 |
| Shared trig lookup tables for `sim` | Raw trig is already lint-banned in `sim`; helpers arrive when first needed | M3 (paths) |
| Visual screenshot baselines | Nothing stable to baseline in M0 | M2 |
| `debug/` overlay | FR-12, not in M0 scope | M2 |
| WebKit E2E on non-Debian dev machines | Playwright WebKit needs Debian/Ubuntu system libs; CI (ubuntu) runs it | — |
| Upgrade to TypeScript 7 | Blocked on typescript-eslint support (ADR 0001) | When available |
| PWA manifest, service worker, offline cache, and install UX | Separate lifecycle/cache/update risks from M9–M12 mobile-browser compatibility | P1 after M12 |
| Configurable touch-control layout, alternate drag steering, and haptics | Ship and validate fixed visible controls first; alternatives require usability evidence | Unscheduled post-M12 |
| Capacitor/mobile-store wrappers | Browser compatibility does not imply native packaging, store compliance, or native API support | P4 |
| Mobile devices below the documented 270×480 visible-viewport baseline | The centered fractional fit still avoids gameplay cropping, but control readability and performance are not release-supported at smaller sizes | Reassess with device evidence after M12 |
| Automated physical-device browser and FPS telemetry | Playwright emulation cannot validate Safari/Chrome hardware compositor, browser chrome, thermal throttling, or measured frame pacing | Keep the M12 manual QA record; reassess for a device-farm/telemetry follow-up |
| Endless high-level balance and accessibility sign-off | Automated regression confirms timing floors and fixed-pool safety, but cannot establish sustained-play readability, fatigue, or colour/flash perception | Before the next release candidate, record desktop and physical iOS Safari/Android Chrome runs at high levels in `docs/release-checklist.md` and `docs/mobile-qa.md` |
