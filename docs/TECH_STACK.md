# Starshot — Technology Selection (Phase 2)

## 1. Requirements Analysis

| Requirement | Implication |
|-------------|-------------|
| 2D fixed shooter, sprite heavy, particles, 60 FPS | GPU-batched 2D renderer, object pooling |
| Art-first (atlases, animations, audio sprites, effects) | Mature asset loader, animation, tween and audio support |
| Ship quickly and iterate fast | Zero-install distribution, hot reload, small toolchain |
| AI-assisted development | Popular, well-documented, **text-based** stack (no binary scene files); strong typing |
| Deterministic gameplay (tests, replays, and later leaderboard verification) | Simulation independent of the engine's physics; fixed timestep; seeded RNG |
| Single-player, offline-capable | No backend needed for the MVP |
| Future: leaderboards, desktop (Steam), mobile | Backend and wrappers can be added later without rewriting the game |

## 2. Recommended Stack (Final)

| Layer | Choice | Justification |
|-------|--------|---------------|
| **Language** | TypeScript (strict) | Types act as contracts between modules and help AI agents; one language everywhere |
| **Frontend / Engine** | **Phaser** (latest stable major, pinned at M0) | Built-in atlases, animations, tweens, particles, cameras, audio sprites, gamepad input and WebGL batching. Large ecosystem, so AI tools know it well |
| **Build** | Vite | Instant hot reload, simple static output |
| **Simulation** | Custom pure-TS core (no Phaser) | Deterministic, unit-testable, replayable; Phaser is used only for display |
| **Content validation** | Zod schemas | Catches data errors at build or test time |
| **Testing** | Vitest (unit, determinism), Playwright (smoke, screenshots) | Fast and headless; works well in CI |
| **Quality** | ESLint, Prettier, dependency-cruiser | Keeps code consistent and **enforces architecture boundaries automatically** |
| **Backend** | **None for MVP.** Post-MVP: Supabase (Postgres + Edge Functions) | Nothing to operate or pay for at launch |
| **Database** | MVP: `localStorage` (versioned schema). Post-MVP: Supabase Postgres with Row-Level Security (RLS) | Enough for high scores and settings |
| **Authentication** | MVP: none. Post-MVP: Supabase anonymous auth, with optional OAuth upgrade | Players can play without signing up; accounts only exist for leaderboards |
| **Hosting** | Cloudflare Pages (static site with a global CDN) plus itch.io | Free, fast, preview deploys for each PR; itch.io brings players |
| **Realtime** | **None** | Single-player; leaderboards use plain request/response |
| **Desktop** | Post-MVP: Electron + steamworks.js (for Steam) *or* Tauri (for a small non-Steam build) | Runs the same web build; decided in an ADR when Steam becomes a goal |
| **Mobile** | MVP+1: installable PWA with touch controls. Later: Capacitor for app stores | Same codebase; portrait 9:16 layout already fits phones |
| **CI/CD** | GitHub Actions → Cloudflare Pages | Lint, typecheck, tests, asset checks, preview deploy |
| **Art/Audio tools** | Aseprite (CLI), free-tex-packer, sfxr/ChipTone, a DAW (Reaper/LMMS) | Can be scripted, so the pipeline is reproducible |

**Reference low-end device:** a 2019-era mid-range Android phone running Chrome, or an integrated-GPU laptop, must hold 60 FPS at peak load.

## 3. Alternatives Compared

| Stack | Pros | Cons | Verdict |
|-------|------|------|---------|
| **A. Phaser + TS + Vite** *(chosen)* | Instant web distribution, text-only code, huge ecosystem, strong AI familiarity, full 2D feature set | Web audio unlocking and mobile browser quirks; Steam needs a wrapper | ✅ Best fit for fast shipping and AI-assisted development |
| B. Godot 4 (GDScript/C#) | Excellent 2D editor, native exports, built-in animation tools | Scene files are hard to edit through text-only AI workflows; web export is larger with slower startup; C# web export is limited | Strong runner-up if native/console becomes the main target |
| C. Unity | Mature, console ports, large asset store | Heavy for a 2D fixed shooter; licensing history; slow iteration; binary scenes | ❌ Overkill |
| D. PixiJS + custom engine | Fastest renderer, full control | Audio, input, scenes and animation must be rebuilt by hand, which is slower to ship | ❌ More engine work, less game work |
| E. LÖVE2D / Rust + Bevy/macroquad | Lightweight, native, fast | Weaker web story (Bevy WASM is heavy); smaller ecosystem; Rust slows iteration | ❌ Not optimized for shipping quickly |
| F. Excalibur.js / Kaplay | TS-first, simple API | Smaller community; fewer production examples at scale | Reasonable, but less proven than Phaser |

### Backend alternatives (post-MVP)

| Option | Tradeoff |
|--------|----------|
| **Supabase** *(chosen)* | Auth, database, RLS and edge functions from one vendor; SQL; generous free tier |
| Cloudflare Workers + D1 | Same vendor as hosting and very cheap; authentication is manual |
| Firebase | Easy SDK; NoSQL makes ranked queries awkward; vendor lock-in |
| Custom Node server | Full control; must be run and maintained, which isn't justified for leaderboards |

## 4. Key Tradeoffs Accepted

- **Web-first** means browser quirks (audio unlock, fullscreen, iOS Safari). We handle these once in the `platform/` layer.
- **Custom simulation instead of Phaser Arcade Physics** costs a little extra work up front. In return we get determinism, fast headless tests, replays and server-verifiable scores.
- **No backend at launch** means no shared leaderboards at release. We accept this to ship sooner.

## 5. Decision Record

Record this stack as `docs/adr/0001-tech-stack.md` in M0. Pin the Phaser version at that point; upgrading it later requires a new ADR.
