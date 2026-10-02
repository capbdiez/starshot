# ADR 0005 — Preserve deterministic gameplay for mobile-browser controls

**Status:** Accepted (M9 planning)

## Context

Starshot's released web build uses a fixed 270×480 simulation/world and 540×960 presentation buffer. Its simulation is deterministic: keyboard and gamepad state is converted to an `InputFrame`, then stepped at fixed 60 Hz. Mobile-browser support must accommodate touch, safe areas, orientation, dynamic browser chrome, and browser audio/fullscreen policy without changing gameplay tuning, collision, replay verification, or desktop behavior.

## Decision

- Keep the 270×480 world, 540×960 presentation buffer, simulation API, replay format, and input bits unchanged. Mobile controls emit the existing left, right, fire, and bomb `InputFrame` bits.
- Keep browser Pointer Events, pointer capture, held-pointer state, viewport measurement, and lifecycle listeners in `platform/`. Clear held pointer state on release, cancellation, capture loss, blur, hidden visibility, and viewport interruption.
- Render visible controls through Phaser/UI in presentation coordinates. Fixed lower-screen controls are chosen over drag steering: they are discoverable, allow reliable simultaneous movement and fire, and map directly to the game's discrete controls.
- Preserve integer canvas scaling when possible; when a full presentation canvas cannot fit, use centered fractional fitting rather than cropping gameplay. Respect safe areas and suppress browser gestures on the game surface.
- Use mobile Chromium and WebKit device emulation for automated regression; require real iOS Safari and Android Chrome evidence before mobile release sign-off.
- Treat PWA/offline caching, configurable layouts, haptics, native wrappers, and app-store packaging as separate milestones.

## Consequences

- M9–M12 can deliver browser-mobile support incrementally without simulation changes or golden replay updates.
- `platform/`, `app/`, and Phaser/UI gain mobile-specific code and tests; `sim/` remains headless and unchanged.
- Fixed controls may not suit every player; configurable layouts and alternate steering remain backlog items pending usability evidence.
- Device/browser variation remains a manual release concern in addition to Playwright coverage.
