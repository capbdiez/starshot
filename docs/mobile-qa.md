# M12 Mobile Browser QA Record

This is the required physical-device release evidence for M12. It complements, and is not replaced by, the Pixel 5 Chromium and iPhone 13 WebKit Playwright projects. Complete one row for a current iPhone/iOS Safari and one for a current Android/Chrome device for each release candidate. Do not mark a check passed unless it was observed on the listed physical device and build.

## Test setup

- **Production URL/build:** 
- **Git commit/tag:** 
- **Tester:** 
- **Date (ISO 8601):** 
- **Peak-load method:** Start a fixed-seed run, select the recorded quality mode, and exercise the 300-bullet/400-particle stress scenario. Record sustained FPS or frame-time evidence and the duration observed.
- **Pass rule:** 60 FPS at peak load using `HIGH`; if `HIGH` misses the target, select visible `LOW`, repeat the scenario, and record the fallback and its result. Cosmetic reductions must not hide bullets, tells, pickups, silhouettes, outlines, or accessibility cues.

## Required device/browser matrix

| Device / model | OS version | Browser / version | Quality (`HIGH`/`LOW`) | Portrait viewport | Landscape viewport | Peak-load FPS / frame time and duration | Result | Evidence link |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| iPhone-class physical device |  | iOS Safari |  |  |  |  | Pending |  |
| Android physical device (Pixel 5-class or better) |  | Chrome |  |  |  |  | Pending |  |

## Per-device functional checklist

Complete for each matrix row in **both portrait and landscape**. Record a failure as `Fail` with a concise observation and link it to a defect report; use `N/A` only where browser support is documented as unavailable.

| Check | iPhone/iOS Safari result + observation | Android/Chrome result + observation |
| --- | --- | --- |
| Cold boot reaches title with no console/page errors |  |  |
| Touch starts a run; simultaneous move + fire and bomb work |  |  |
| Pause, resume, game-over/results retry, and return to title work |  |  |
| Safe-area fit leaves the complete canvas and critical HUD readable |  |  |
| Rotation and browser-toolbar resize preserve a complete centered canvas |  |  |
| Background/foreground recovery pauses safely and leaves no held touch input |  |  |
| Audio starts only after a permitted gesture and remains non-blocking if unavailable |  |  |
| Fullscreen request succeeds or documented browser fallback continues play |  |  |
| `HIGH` peak-load result; if needed, visible `LOW` fallback result |  |  |
| No browser scrolling, pinch zoom, stuck controls, crash, or console/page errors |  |  |

## Hosted-production automated smoke

Record the deployed release smoke alongside physical QA:

```sh
STARSHOT_PRODUCTION_URL=https://your-release.example npm run test:e2e:production
```

- **URL tested:** 
- **Deployment timestamp:** 
- **Command result/date:** 
- **Playwright report or CI URL:** 

## Sign-off

| Role | Name | Date | Evidence / URL |
| --- | --- | --- | --- |
| iOS Safari QA owner |  |  |  |
| Android Chrome QA owner |  |  |  |
| Release owner |  |  |  |

## Scope retained for post-M12

PWA/offline installation, app-store packaging, native APIs, configurable control layouts, haptics, analytics, accounts, and leaderboards are not M12 deliverables. See `docs/BACKLOG.md` and the post-MVP roadmap in `docs/MILESTONES.md`.
