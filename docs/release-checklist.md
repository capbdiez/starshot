# M7 Release Checklist

Evidence recorded for M7 acceptance criterion: every GAME_SPEC §6 non-functional requirement has an automated check or a defined release sign-off.

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

## M7 asset and accessibility sign-off

- [x] Final manifest has no placeholder sprites (`tests/assets/atlas-gates.test.ts`, `npm run check:assets`).
- [x] `assets/CREDITS.md` lists every runtime visual and audio asset source and license.
- [x] Optional CRT scanlines, high-contrast enemy bullets, reduced flashes and boss subtitles are persisted settings.
- [ ] Final audio loudness/mix pass recorded after listening on reference headphones and speakers.
- [ ] Peak-performance, cold-load, cross-browser, visual colour-blind, and n ≥ 10 feel-playtest results recorded before M8 release.
