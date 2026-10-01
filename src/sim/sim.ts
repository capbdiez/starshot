import type { Content } from '../content/index.ts';
import type { InputFrame } from '../shared/index.ts';
import type { SimEvent } from './events.ts';
import { fnv1a32, pushFloat } from './hash.ts';
import {
  moveMovers,
  resolveCollisions,
  updateEnemyFire,
  updateGameOver,
  updatePlayer,
  updateWave,
} from './systems.ts';
import { createWorld, type Mover, type Phase, type World } from './world.ts';

/** A moving entity in a {@link SimView}; `prev*` is its position one tick earlier (smoothing). */
export interface MoverView {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly prevX: number;
  readonly prevY: number;
}

/** Read-only snapshot of the simulation handed to presentation each frame. */
export interface SimView {
  /** Number of fixed steps simulated so far. */
  readonly tick: number;
  readonly phase: Phase;
  readonly lives: number;
  readonly wave: number;
  readonly player: {
    readonly alive: boolean;
    readonly x: number;
    readonly y: number;
    readonly prevX: number;
    readonly dir: number;
    readonly invulnerable: boolean;
  };
  readonly grunts: readonly {
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly kind: string;
    readonly telling: boolean;
  }[];
  readonly shots: readonly MoverView[];
  readonly enemyBullets: readonly MoverView[];
}

function moverViews(pool: readonly Mover[]): MoverView[] {
  return pool
    .filter((m) => m.active)
    .map((m) => Object.freeze({ id: m.id, x: m.x, y: m.y, prevX: m.prevX, prevY: m.prevY }));
}

function view(world: World): Readonly<SimView> {
  const p = world.player;
  return Object.freeze({
    tick: world.tick,
    phase: world.phase,
    lives: world.lives,
    wave: world.wave,
    player: Object.freeze({
      alive: p.alive,
      x: p.x,
      y: p.y,
      prevX: p.prevX,
      dir: p.dir,
      invulnerable: p.invulnerable > 0,
    }),
    grunts: Object.freeze(
      world.grunts
        .filter((g) => g.alive)
        .map((g) =>
          Object.freeze({ id: g.id, x: g.x, y: g.y, kind: g.kind, telling: g.tellTimer > 0 }),
        ),
    ),
    shots: Object.freeze(moverViews(world.shots)),
    enemyBullets: Object.freeze(moverViews(world.bullets)),
  });
}

function stateWords(world: World): number[] {
  const p = world.player;
  const words = [
    world.seed,
    world.tick,
    world.rng.state,
    world.nextId,
    world.phase === 'playing' ? 0 : 1,
    world.lives,
    world.wave,
    world.waveTimer,
    world.enemyFireTimer,
    world.diveTimer,
    world.gameOverTimer,
    p.alive ? 1 : 0,
    p.dir & 0xff,
    p.fireCooldown,
    p.invulnerable,
    p.respawnTimer,
  ];
  pushFloat(words, p.x);
  for (const g of world.grunts) {
    words.push(
      g.id,
      g.alive ? 1 : 0,
      g.hp,
      g.slot,
      g.tellTimer,
      g.fireTimer,
      g.diving,
      g.entryTimer,
    );
    for (let i = 0; i < g.kind.length; i += 1) words.push(g.kind.charCodeAt(i));
    pushFloat(words, g.x);
    pushFloat(words, g.y);
  }
  for (const m of [...world.shots, ...world.bullets]) {
    words.push(m.id, m.active ? 1 : 0);
    pushFloat(words, m.x);
    pushFloat(words, m.y);
    pushFloat(words, m.vx);
    pushFloat(words, m.vy);
  }
  return words;
}

/** Handle to one deterministic simulation run. */
export interface Sim {
  /** Advances the simulation by exactly one fixed tick using `input`. */
  step(input: InputFrame): void;
  /** Returns a frozen snapshot of the current state; presentation must never mutate it. */
  snapshot(): Readonly<SimView>;
  /**
   * Returns the events emitted since the previous call. The returned array is reused and only
   * valid until the next `drainEvents()` call (no per-tick allocation).
   */
  drainEvents(): readonly SimEvent[];
  /** Deterministic fingerprint of the full simulation state, used by replay tests. */
  hash(): string;
}

/**
 * Creates a simulation for `content`, seeded with `seed` (coerced to uint32).
 * Game over restarts automatically after `gameplay.gameOverTicks` (instant retry, US-08).
 */
export function createSim(content: Content, seed: number): Sim {
  const world = createWorld(content, seed);
  // Double-buffered event queue: systems push to `world.events`; drainEvents swaps buffers.
  let drained: SimEvent[] = [];

  return {
    step(input) {
      world.tick += 1;
      moveMovers(world.shots);
      moveMovers(world.bullets);
      if (updateGameOver(world)) return;
      updatePlayer(world, input >>> 0);
      updateEnemyFire(world);
      resolveCollisions(world);
      updateWave(world);
    },
    snapshot() {
      return view(world);
    },
    drainEvents() {
      drained.length = 0;
      [drained, world.events] = [world.events, drained];
      return drained;
    },
    hash() {
      return fnv1a32(stateWords(world));
    },
  };
}
