# M8 Release Checklist — v1.0.0

Evidence for the MVP release. Mark a manual/deployment item only after its linked evidence is recorded; this document must not be signed off solely from local checks.

| NFR | Requirement | Evidence / sign-off |
| --- | --- | --- |
| NFR-01 | 60 FPS with 300 bullets and 400 particles; pooled spawns | **Manual:** run the peak-density scene on the reference device and record a sustained 60 FPS result. Code audit: `SpriteLayer` and `VisualFx` pool sprites/400 particles. |
| NFR-02 | Input-to-screen delay ≤ 2 frames | **Manual:** use the dev frame-step (`P`, `.`) latency check on the reference device. The fixed 60 Hz `GameLoop` remains covered by `tests/app/game-loop.test.ts`. |
| NFR-03 | First playable ≤ 3 s; initial download ≤ 5 MB gzipped | **Automated:** `npm run build`, then measure gzip total of `dist/` in release CI. **Manual:** cold-load on typical broadband and record time to Play. |
| NFR-04 | Deterministic seed + inputs | **Automated:** `npm test` runs the golden replay suite (`tests/replay/replay.test.ts`). |
| NFR-05 | Latest two Chrome, Firefox, Safari, Edge versions | **Manual:** cross-browser smoke pass; CI covers Chromium and WebKit via `npm run test:e2e`. |
| NFR-06 | Colour-blind playable; flash reduction ≤ 3 Hz | **Automated:** `Presenter` rate-limits reduced flashes to 333.33 ms; high-contrast bullet and subtitle settings persist through `SaveStore`. **Manual:** capture colour-blind simulation screenshots. |
| NFR-07 | Architecture enforced; sim coverage ≥ 80% | **Automated:** `npm run lint:deps && npm test` (Vitest coverage threshold/report). |
| NFR-08 | ART_DIRECTION §9 asset gates | **Automated:** `npm run check:assets`; it validates content references, atlas frames/sizes, palette and rejects every `placeholder: true` manifest entry. |

## G1 Graphics Baseline Record (before G2's 540×960 migration)

Captured from the current MVP production build on 2026-01-10. These values are a regression reference, not a final release sign-off.

| Measure | Baseline | Reproduction |
| --- | --- | --- |
| Simulation/world baseline | 270×480 logical/world px | `src/shared/constants.ts`; replay and simulation tests |
| G2 presentation buffer | 540×960 presentation px, with a main-camera 2× world compatibility transform | `src/shared/constants.ts`, `src/presentation/presenter.ts`, and current Phaser canvas test |
| Main atlas | 1024×128 px; 36,820 bytes | `identify -format '%w x %h %b\\n' assets/atlas/main.png` |
| Fresh production `dist/` gzip stream | 1,135,033 bytes (≈1.08 MiB) | `npm run build && find dist -type f -print0 | xargs -0 gzip -c | wc -c` |
| Largest production payload | JavaScript bundle: 1,527,187 bytes raw; 401.45 kB gzip | `npm run build` output |
| Automated visual captures | Chromium fixed seed `20260110`: title, representative gameplay, reduced-flash + high-contrast bullets | `npm run test:e2e -- --project=chromium tests/e2e/graphics-baselines.spec.ts` |
| Peak bullet density and boss play captures | Pending manual fixed-seed capture: the current public flow exposes no stable non-gameplay jump to those states, and G1 forbids simulation/debug-harness changes | Record approved captures and reference-device evidence before G2 visual implementation |
| Stress-scene performance | Pending reference-device measurement | Run the 300-bullet/400-particle scene, record device/browser/OS, sustained FPS, and frame-time evidence here; do not infer device performance from CI. |

## Automated release gates

- [x] Final manifest has no placeholder sprites (`tests/assets/atlas-gates.test.ts`, `npm run check:assets`).
- [x] `assets/CREDITS.md` lists every runtime visual and audio asset source and license.
- [x] Optional CRT scanlines, high-contrast enemy bullets, reduced flashes and boss subtitles are persisted settings.
- [x] `v1.0.0` package metadata, `CHANGELOG.md`, `docs/known-issues.md`, store-page copy, and capture directions are committed.
- [x] Tag-triggered release workflow builds, checks the ≤ 5 MB gzipped budget, deploys Cloudflare Pages, runs production smoke E2E, packages itch.io HTML5 output, and uploads to itch.io when its credentials are configured.

## Required human and hosted-release sign-off

- [ ] Final audio loudness/mix pass recorded after listening on reference headphones and speakers.
- [ ] Cloudflare Pages production URL deployed from the `v1.0.0` tag; record URL and deployment timestamp here.
- [ ] itch.io HTML5 archive uploaded from `starshot-v1.0.0-itchio.zip`; record public page URL and upload timestamp here.
- [ ] Production smoke E2E passes against the public Cloudflare URL with no console errors.
- [ ] Latest two Chrome, Firefox, Safari, and Edge versions manually pass; record browser versions, OS, and date.
- [ ] Reference-device final pass records sustained performance, input latency, and cold-load time.
- [ ] Colour-blind screenshots, required store screenshots, cover art, and trailer GIF are captured and uploaded; see `release/capture-guide.md`.
- [ ] n ≥ 10 feel-playtest result is recorded against the GAME_SPEC §10 success criteria.
- [ ] `v1.0.0` git tag is created from the signed-off release commit.

## Sign-off

| Role | Name | Date | Evidence / URL |
| --- | --- | --- | --- |
| Release owner |  |  |  |
| QA / browser pass |  |  |  |
| Audio / accessibility pass |  |  |  |
