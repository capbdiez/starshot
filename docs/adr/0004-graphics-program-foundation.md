# ADR 0004 — Retain Phaser and extend the deterministic asset pipeline

**Status:** Accepted (G1)

## Context

The post-MVP graphics program needs a premium neo-arcade presentation while preserving the released game's deterministic simulation, small web bundle, and reviewable in-repository workflow. Replacing Phaser or importing external image/generation tooling would create a broad, risky migration before any visual improvement is delivered.

## Decision

- Retain Phaser 4 as the presentation runtime. The existing `sim/` to presentation boundary remains unchanged: simulation owns world coordinates and events; presentation only reads snapshots and reacts to events.
- Retain the 270×480 simulation/world coordinate system. G2 may add a 540×960 presentation buffer, but conversion will be centralized in presentation code; simulation, hitboxes, replay data, and gameplay content will not multiply coordinates.
- Extend the code-authored pipeline from ADR 0003. Raster art, backgrounds, UI, masks, and FX recipes remain version-controlled TypeScript or data under `tools/` and presentation-only content, with generated outputs committed and checked in CI.
- Do not add a runtime dependency or an external art-generation/import workflow for this program without a separate ADR.
- Preserve existing sprite keys, anchors, and required animation clips until a later milestone explicitly changes their content contract.

## Consequences

- G1 establishes baselines and contracts only; it does not replace art, alter the palette, add shaders, change simulation, or implement the presentation-resolution migration.
- Future graphics milestones can improve visuals incrementally while preserving deterministic replays and existing asset gates.
- Generated visual outputs must remain reproducible from the repository and satisfy the palette, manifest, and frame-size checks.
