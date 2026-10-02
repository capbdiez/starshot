# Starshot — Game Specification (Phase 3)

## 1. Vision

**Starshot** is a fast, readable, neo-arcade **fixed shooter**. The player's ship moves only along the bottom
of a single fixed screen, and waves of enemies fly in, form up, and dive to attack. It combines Galaga's swooping
formations with modern game feel: tight controls, satisfying feedback, and short runs that make you want one more try.

- **Genre:** Fixed shooter (shoot 'em up subgenre); the screen doesn't scroll and the player moves horizontally.
- **Platform:** Web browser: desktop keyboard/gamepad at release; M9–M12 add current mobile-browser portrait and landscape play with touch controls.
- **Session length:** 3–5 minutes for the MVP run (5 stages + boss), 10–15 minutes for the full game.
- **Audience:** Retro arcade fans, casual players looking for quick sessions, and score chasers.
- **Pillars:** *Readable chaos* · *Instant restart* · *Every hit feels good*.

## 2. Core Loop

```
Wave enters (formation paths) → Enemies form up → Enemies dive/attack
  → Player dodges + shoots → Chain kills for multiplier → Wave cleared
  → Next wave / Boss → Stage results → Continue or Game Over → Retry (≤ 2 s)
```

## 3. User Stories

**Player**
- US-01: As a player, I start playing within 2 clicks/keys of the page loading.
- US-02: As a player, I move left/right and fire with keyboard or gamepad, and the controls respond immediately.
- US-03: As a player, I can always tell what can hurt me.
- US-04: As a player, I see my score, multiplier, lives and bombs without them covering the play area.
- US-05: As a player, I can use a bomb to clear bullets when I'm overwhelmed.
- US-06: As a player, I collect power-ups that visibly change my weapon.
- US-07: As a player, I fight a boss at the end of the run with distinct attack phases.
- US-08: As a player, I restart instantly after a game over.
- US-09: As a player, my high score and settings are saved between sessions.
- US-10: As a player, I can pause at any time, and the game pauses automatically when the tab loses focus.
- US-11: As a player sensitive to motion or flashing, I can reduce screen shake and flashes.
- US-12: As a player, I can adjust music and SFX volume separately.
- US-13: As a mobile player, I can start, move, fire, use bombs, pause, and navigate menus with touch controls.
- US-14: As a mobile player, I can play without browser scrolling, pinch zoom, browser-UI overlap, or stuck touch input.
- US-15: As a mobile player, I can rotate my device or background the browser without corrupting a run or held controls.

**Developer / Designer**
- US-20: As a designer, I add or tune enemies, waves and bosses by editing data files, without changing code.
- US-21: As an artist, I replace placeholder art and audio without touching code.
- US-22: As a developer, I can re-run a recorded input sequence and get an identical result.

## 4. Game Rules (Design Baseline)

| System | Rule |
|--------|------|
| Play field | 270×480 logical px; the player moves along a horizontal band at y≈440 |
| Player | Horizontal movement only (the MVP has no vertical movement); tiny 3×3 hitbox; 3 lives; 2 bombs per life |
| Fire | Hold to autofire; up to N player shots on screen (depends on the weapon level) |
| Weapons | Level 1: single shot → Level 2: double → Level 3: triple spread; losing a life drops one level |
| Enemies (MVP) | Grunt (dives), Swooper (curved dive plus aimed shot), Tank (2 HP, spread shot), Elite (3 HP, fires bullet patterns) |
| Waves | Enemies enter along paths, form into a grid, then launch dives; the dive rate rises as fewer enemies remain |
| Boss (MVP) | 1 boss, 3 phases, parts that can be destroyed |
| Scoring | Base points × chain multiplier (goes up with consecutive kills and resets when a kill window expires or you get hit); bonus for killing enemies mid-dive |
| Extra life | At 20k, and every 60k after that |
| Game over | No lives left → results screen → retry |

All numbers here are **starting values**. The source of truth is `content/*.json`.

## 5. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | Title, Play, Pause, Settings, Results and Game Over screens |
| FR-02 | Keyboard (arrows/A-D, Z/Space fire, X bomb, Esc pause) and gamepad input; keys can be rebound (post-MVP) |
| FR-03 | Deterministic simulation at a fixed 60 Hz timestep with seeded RNG |
| FR-04 | Waves, enemies, bullet patterns, bosses, weapons and scoring are data-driven and checked against schemas |
| FR-05 | Collision detection between player ↔ enemy bullets, player shots ↔ enemies, player ↔ enemies, and player ↔ pickups |
| FR-06 | Bomb clears enemy bullets and damages every enemy on screen, then gives a short invulnerability window |
| FR-07 | 2 s of invulnerability after respawning, shown by blinking |
| FR-08 | Full effects, audio, camera and animation reactions to simulation events (see ART_DIRECTION §6) |
| FR-09 | Local high-score table (top 10) and persisted settings |
| FR-10 | Settings: volume per bus, screen shake, flash reduction, CRT filter, fullscreen |
| FR-11 | Auto-pause when the tab is hidden or focus is lost |
| FR-12 | Debug overlay (dev builds only): FPS, entity counts, hitboxes, stage select, invincibility |
| FR-13 | Touch input maps simultaneous left, right, fire, and bomb gestures into the existing deterministic `InputFrame` controls |
| FR-14 | Supported touch contexts expose usable on-screen gameplay controls and touch-operable menu actions without affecting desktop controls |
| FR-15 | Pointer cancellation, capture loss, blur, visibility changes, orientation changes, and dynamic viewport changes clear held touch state safely |

## 6. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | 60 FPS with 300 bullets + 400 particles on the reference device; no GC-induced frame drops (all spawned entities are pooled) |
| NFR-02 | Latency | Input-to-screen delay ≤ 2 frames |
| NFR-03 | Load | First playable in ≤ 3 s on a typical broadband connection; initial download ≤ 5 MB gzipped |
| NFR-04 | Determinism | The same seed and inputs give the same final state and score (checked by a hash in tests) |
| NFR-05 | Compatibility | Latest 2 versions of Chrome, Firefox, Safari and Edge |
| NFR-06 | Accessibility | Can be played with a colour-blind simulation filter; flash-reduction mode respects the 3 Hz limit |
| NFR-07 | Maintainability | Architecture rules enforced by tooling; the simulation core has ≥ 80 % line coverage |
| NFR-08 | Art quality | Passes all ART_DIRECTION §9 gates at every milestone |
| NFR-09 | Mobile compatibility | Latest two iOS Safari and Android Chrome versions support documented portrait and landscape viewports; desktop browser support remains unchanged |
| NFR-10 | Mobile usability | Touch supports simultaneous movement and fire, respects safe areas, prevents browser-gesture interference, and meets the ≤2-frame input-latency target |
| NFR-11 | Mobile resilience | Rotation, dynamic browser chrome, backgrounding, pointer cancellation, and capture loss cannot crash the app or leave gameplay input held |

### Mobile support and performance policy (M12)

- **Supported browsers:** the latest two iOS Safari and Android Chrome releases, in portrait and landscape, while desktop support in NFR-05 remains unchanged. Automated coverage uses iPhone 13 WebKit and Pixel 5 Chromium emulation; emulation does not replace physical-device sign-off.
- **Reference physical QA devices:** one current iPhone-class device running iOS Safari and one Pixel 5-class-or-better Android device running Chrome. Record exact models, OS/browser versions, visible viewport dimensions, build URL, and date in `docs/mobile-qa.md` for every release candidate.
- **Performance target:** the selected `HIGH` or visible `LOW` quality setting must sustain 60 FPS at the 300-bullet/400-particle peak-load scenario. `HIGH` is the default; select and record `LOW` only when a reference device cannot hold the target at high quality. Quality tiers may remove cosmetic work only, never gameplay cues.
- **Manual release checks:** on both reference devices, verify safe areas, browser-toolbar resize, portrait/landscape rotation, permitted-gesture audio unlock, background/foreground recovery, fullscreen fallback, simultaneous touch movement/fire, bomb, pause/resume, and retry. Record the outcome rather than inferring it from emulation.

## 7. Constraints

- A small team (1–2 developers + 1 artist/contractor), heavily AI-assisted.
- Web-first; no native features required for the MVP.
- No backend, accounts or personal data in the MVP (so no GDPR scope).
- All assets must be original or licensed CC0/commercially; license info goes in `assets/CREDITS.md`.
- A fixed internal resolution of 270×480.

## 8. MVP Definition

The MVP is a **complete, polished, short arcade run** that could be released on itch.io:

- 5 stages (4 wave stages and 1 boss stage), 4 enemy types, 1 boss.
- 3 weapon levels, bombs, lives, a chain multiplier, and extra lives.
- **Final** art, animation, effects, music (3 tracks) and SFX. No placeholders ship.
- Title, pause, settings, results and game over screens, plus a local high-score table.
- Keyboard and gamepad controls.
- Hosted on Cloudflare Pages and itch.io.

## 9. Deferred Features (Post-MVP)

| Feature | Target |
|---------|--------|
| PWA install and offline cache | After M12; separate from mobile-browser compatibility |
| Online leaderboards (Supabase, replay-verified) | MVP+1 |
| Key rebinding, localization | MVP+1 |
| More stages, enemies and bosses; "loop 2" harder difficulty | MVP+2 |
| Daily challenge seed | MVP+2 |
| Capturing enemies (Galaga-style tractor beam) | MVP+2 |
| Steam desktop build (Electron + steamworks.js), achievements | MVP+3 |
| Mobile store builds (Capacitor) | MVP+3 |
| Local 2-player co-op | Unscheduled |
| Online multiplayer | **Out of scope** |

## 10. Success Criteria

- **Ship:** MVP released publicly within about 10–12 weeks of M0.
- **Quality:** Every NFR met; zero known crash bugs; art gates passed.
- **Engagement (no analytics in the MVP):** In playtests (n ≥ 10), ≥ 40 % of players who finish a run immediately start another, with an average of ≥ 3 runs per session. After launch, itch.io play counts and ratings serve as rough proxies.
- **Feel:** In playtests (n ≥ 10), ≥ 80 % rate the controls as "responsive" and bullets as "easy to see" (4/5 or higher).
- **Rating:** ≥ 4.0/5 average rating on itch.io in the first month.
