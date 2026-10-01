import type { Content, Gameplay } from '../content/index.ts';
import { GAME_WIDTH } from '../shared/index.ts';
import type { SimEvent } from './events.ts';
import { createRng, type Rng } from './rng.ts';

/** Capacity of the enemy bullet pool (structural limit, not a tuning value). */
export const ENEMY_BULLET_POOL = 64;

/** A pooled moving entity (shot or bullet). `prevX/prevY` are positions before this tick. */
export interface Mover {
  id: number;
  active: boolean;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  /** Velocity in px per tick. */
  vx: number;
  vy: number;
}

export interface Grunt {
  id: number;
  alive: boolean;
  hp: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  kind: string;
  slot: number;
  tellTimer: number;
  fireTimer: number;
  diving: number;
  entryTimer: number;
}

export interface Player {
  alive: boolean;
  x: number;
  y: number;
  prevX: number;
  /** -1 moving left, 0 still, 1 moving right (drives bank animations). */
  dir: number;
  fireCooldown: number;
  invulnerable: number;
  respawnTimer: number;
}

export type Phase = 'playing' | 'gameOver';

/** Private mutable simulation state. Never handed out; `snapshot()` copies from it. */
export interface World {
  readonly rules: Gameplay;
  readonly content: Content;
  readonly rng: Rng;
  readonly seed: number;
  tick: number;
  nextId: number;
  phase: Phase;
  lives: number;
  wave: number;
  waveTimer: number;
  enemyFireTimer: number;
  diveTimer: number;
  gameOverTimer: number;
  readonly player: Player;
  readonly grunts: Grunt[];
  readonly shots: Mover[];
  readonly bullets: Mover[];
  /** Events emitted this tick; drained by `sim.drainEvents()`. */
  events: SimEvent[];
}

function mover(): Mover {
  return { id: 0, active: false, x: 0, y: 0, prevX: 0, prevY: 0, vx: 0, vy: 0 };
}

/** Allocates every pool once, then resets to a fresh game. */
export function createWorld(content: Content, seed: number): World {
  const rules = content.gameplay;
  const world: World = {
    rules,
    content,
    rng: createRng(seed),
    seed: seed >>> 0,
    tick: 0,
    nextId: 1,
    phase: 'playing',
    lives: 0,
    wave: 0,
    waveTimer: 0,
    enemyFireTimer: 0,
    diveTimer: 0,
    gameOverTimer: 0,
    player: {
      alive: true,
      x: 0,
      y: rules.player.y,
      prevX: 0,
      dir: 0,
      fireCooldown: 0,
      invulnerable: 0,
      respawnTimer: 0,
    },
    grunts: Array.from(
      {
        length: Math.max(
          ...Object.values(content.waves).map((wave) =>
            wave.entries.reduce((n, entry) => n + entry.count, 0),
          ),
        ),
      },
      () => ({
        id: 0,
        alive: false,
        hp: 0,
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0,
        kind: 'grunt',
        slot: 0,
        tellTimer: 0,
        fireTimer: 0,
        diving: 0,
        entryTimer: 0,
      }),
    ),
    shots: Array.from({ length: rules.player.maxShots }, mover),
    bullets: Array.from({ length: ENEMY_BULLET_POOL }, mover),
    events: [],
  };
  resetGame(world);
  return world;
}

/** Returns a new entity id (ids are never reused within a run). */
export function newId(world: World): number {
  const id = world.nextId;
  world.nextId += 1;
  return id;
}

/** Puts the player at the centre of the band, alive, with no cooldowns. */
export function placePlayer(world: World): void {
  const p = world.player;
  p.alive = true;
  p.x = GAME_WIDTH / 2;
  p.prevX = p.x;
  p.dir = 0;
  p.fireCooldown = 0;
  p.respawnTimer = 0;
}

/** Spawns the configured stage formation and announces the wave. */
export function spawnWave(world: World): void {
  const stageSpec = world.content.stages[world.wave % world.content.stages.length];
  if (!stageSpec) return;
  const wave = world.content.waves[stageSpec.wave];
  if (!wave) return;
  const roster = wave.entries.flatMap((entry) =>
    Array.from({ length: entry.count }, () => entry.enemy),
  );
  if (roster.length > world.grunts.length) throw new Error('wave exceeds the enemy pool capacity');
  for (let i = roster.length; i < world.grunts.length; i += 1) {
    const enemy = world.grunts[i];
    if (enemy) enemy.alive = false;
  }
  const left = GAME_WIDTH / 2 - ((wave.formation.columns - 1) * wave.formation.spacingX) / 2;
  world.grunts.forEach((enemy, i) => {
    const kind = roster[i];
    const spec = kind === undefined ? undefined : world.content.enemies[kind];
    if (!spec) return;
    enemy.id = newId(world);
    enemy.alive = true;
    enemy.hp = spec.hp;
    enemy.kind = spec.key;
    enemy.slot = i;
    enemy.x = left + (i % wave.formation.columns) * wave.formation.spacingX;
    enemy.y = wave.formation.y + Math.floor(i / wave.formation.columns) * wave.formation.spacingY;
    enemy.prevX = enemy.x;
    enemy.prevY = enemy.y;
    enemy.tellTimer = 0;
    enemy.fireTimer = spec.fireIntervalTicks;
    enemy.diving = 0;
    enemy.entryTimer = 60;
  });
  world.wave += 1;
  world.waveTimer = 0;
  world.diveTimer = wave.dive.maxIntervalTicks;
  world.events.push({ type: 'WaveStarted', wave: world.wave });
}

/** Starts a fresh game (lives, wave 1, empty pools). The RNG keeps running: no reseed. */
export function resetGame(world: World): void {
  world.phase = 'playing';
  world.lives = world.rules.player.lives;
  world.wave = 0;
  world.gameOverTimer = 0;
  for (const m of world.shots) m.active = false;
  for (const m of world.bullets) m.active = false;
  placePlayer(world);
  world.player.invulnerable = 0;
  spawnWave(world);
}
