# G9 Graphics Release-Candidate Checklist — v1.0.0

Evidence for the post-MVP graphics release candidate. Mark a manual/deployment item only after its linked evidence is recorded; this document must not be signed off solely from local checks. The G9 automated gate is `npm run release:check`: it builds the production bundle, verifies required release documentation and a final (non-placeholder) manifest, then enforces the 5 MiB gzip budget.

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
| NFR-09 | Mobile-browser compatibility | **Automated after M9:** mobile Chromium/WebKit Playwright projects boot in portrait and landscape without errors. **Manual after M12:** record current iOS Safari and Android Chrome version, viewport/orientation, production URL, and result. |
| NFR-10 | Mobile usability | **Automated after M10/M11:** touch E2E covers simultaneous move/fire, bomb, menus, pause/resume, and desktop control absence. **Manual after M12:** verify safe-area fit, tap targets, input latency, and browser-gesture suppression. |
| NFR-11 | Mobile resilience | **Automated after M9/M10:** resize/orientation and pointer cancellation clear held input. **Manual after M12:** background/foreground, browser-toolbar, audio-unlock, and fullscreen-fallback checks. |

## G9 Automated Release-Candidate Record

The following local evidence was reproduced on 2026-01-10 with Node 26.10.0. It establishes deterministic build and visual-regression gates; it is not a substitute for the human/device evidence below.

| Measure | Result | Reproduction |
| --- | --- | --- |
| Simulation/world contract | 270×480 logical/world px; replay regression remains covered | `npm test`; `src/shared/constants.ts` |
| Presentation buffer | 540×960 px with the centralized 2× main-camera transform | `npm run test:e2e -- --project=chromium tests/e2e/smoke.spec.ts` |
| Final generated assets | No manifest placeholder entries; palette, clip, frame-size, and content-reference gates pass | `npm run check:assets` |
| Generated-output reproducibility | Art, atlas, SFX, and music are regenerated and must leave `assets/` unchanged in CI | CI “Committed atlas is up to date” step |
| Fresh production gzip stream | 1,155,473 bytes (≈1.10 MiB), below the 5,242,880-byte (5 MiB) budget | `npm run release:check` |
| Largest production payload | JavaScript bundle: 1,538,738 bytes raw | `npm run build` output |
| Approved visual baselines | Chromium fixed seed `20260110`: title, gameplay, settings, pause, high-score title, reduced-flash + high-contrast gameplay | `npm run test:e2e -- --project=chromium tests/e2e/graphics-baselines.spec.ts` |
| Automated compatibility smoke | Chromium and WebKit boot/flow suite | `npm run test:e2e` |

## G9 Required Human / Hosted Evidence

| Review | Required record |
| --- | --- |
| Reference-device peak visual load | Device model, OS, browser/version, date, 300-bullet/400-particle scene, sustained FPS/frame-time evidence at high and low quality; confirm stable 60 FPS. |
| Target-browser pass | Latest two Chrome, Firefox, Safari, and Edge versions, OS, date, production URL, and no-console-error result. CI Chromium/WebKit coverage does not replace this pass. |
| Accessibility visual review | Greyscale and colour-blind screenshots showing player, hostile bullets, tells, and pickups remain distinguishable; attach URLs/files and reviewer/date. |
| Settings/fallback review | On the reference device and a browser fallback path, record flash-reduction (≤3 Hz), high-contrast bullets, low/high quality, background motion, FX intensity, and fullscreen results. |
| Cold-load review | Typical broadband method, device/browser, cache state, measured first-playable time (≤3 s), URL, and date. |
| Hosted production smoke | Production URL, deployment timestamp, `STARSHOT_PRODUCTION_URL=<url> npm run test:e2e:production` result, and no-console-error evidence. |
| Mobile-browser pass (after M12) | Complete `docs/mobile-qa.md` for at least one current iPhone/iOS Safari and Android/Chrome device: model, OS/browser version, portrait/landscape viewport, production URL, selected quality, touch flow, safe-area, rotation, browser-toolbar, background recovery, audio, fullscreen fallback, and peak-load result. |

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
- [ ] After M12, complete and link the two physical-device rows in `docs/mobile-qa.md`; they must record iOS Safari and Android Chrome evidence for touch, portrait/landscape, safe areas, interruption, audio, fullscreen fallback, selected quality, and peak load.

## Sign-off

| Role | Name | Date | Evidence / URL |
| --- | --- | --- | --- |
| Release owner |  |  |  |
| QA / browser pass |  |  |  |
| Audio / accessibility pass |  |  |  |
