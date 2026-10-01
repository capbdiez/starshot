# ADR 0001 — Tech Stack

- **Status:** Accepted (M0, 2026-09-30)
- **Context:** TECH_STACK.md §1–§4.

## Decision

Adopt the stack recommended in TECH_STACK.md §2, pinned at these exact versions (`save-exact`):

| Concern | Package | Pinned |
|---------|---------|--------|
| Engine (runtime) | `phaser` | **4.2.1** |
| Content validation (runtime) | `zod` | 4.6.5 |
| Language | `typescript` | 6.0.3 |
| Build / dev server | `vite` | 8.3.1 |
| Unit tests + coverage | `vitest`, `@vitest/coverage-v8` | 5.0.3 |
| E2E | `@playwright/test` | 1.63.0 |
| Lint / format | `eslint` 10.11.0, `typescript-eslint` 8.71.0, `prettier` 3.9.9 | |
| Architecture rules | `dependency-cruiser` | 18.5.0 |
| PNG I/O in asset tools | `pngjs` | 7.0.0 |
| Node | 26 (`.nvmrc`), ≥ 24 required | |

Hosting: Cloudflare Pages (preview per PR, production from `main`) via GitHub Actions.

## Notes and consequences

- **Phaser 4, not 3.** Phaser 4 is the latest stable major; TECH_STACK asks for the latest stable
  major pinned at M0. Any Phaser upgrade (even minor) needs a new ADR; Dependabot ignores it.
- **TypeScript 6, not 7.** `typescript@latest` is 7.0.2, but `typescript-eslint` 8.71 supports
  only `<6.1`. We pin 6.0.3 and revisit when typescript-eslint supports 7.
- **No `tsx`/`ts-node`.** Node ≥ 24 runs `.ts` directly (type stripping), so `tools/` are plain
  TypeScript run with `node`. This means `tools/` and any `src/` modules they import must use
  erasable syntax only (enforced by `erasableSyntaxOnly`) and `.ts` import extensions.
- **Only two runtime dependencies** (Phaser, Zod), as required by ARCHITECTURE §8.
- **Aseprite is not an npm dependency.** It is a licensed desktop tool, only needed by artists;
  CI builds atlases from committed exports and generated placeholders (see ADR 0002 / pipeline).
