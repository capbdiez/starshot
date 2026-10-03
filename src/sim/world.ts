import type { Content, ProjectileVariant } from '../content/index.ts';
import { WORLD_WIDTH } from '../shared/index.ts';
import type { SimEvent } from './events.ts';
import {
  scaledBossFireInterval,
  scaledBossPartHp,
  scaledBossPhaseHp,
  scaledNormalEnemyHp,
  scaledNormalWaveInterval,
} from './difficulty.ts';
import { createRng, type Rng } from './rng.ts';

/** Capacity of the enemy bullet pool (structural limit, not a tuning value). */
export const ENEMY_BULLET_POOL = 64;
/** Capacity of the pickup pool; drops are throttled by content. */
export const PICKUP_POOL = 8;

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
  /** Read-only presentation variant; normal enemies always use `enemy_bullet`. */
  variant: ProjectileVariant | 'enemy_bullet';
  /** Maximum guidance turn in degrees per tick; zero preserves the launch velocity. */
  turnRateDegrees: number;
  /** Remaining active ticks; zero means the mover has no lifetime limit. */
  remainingLifetimeTicks: number;
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
  weaponLevel: number;
  bombs: number;
  bombHeld: boolean;
}

export type Phase = 'playing' | 'gameOver';

/** Mutable boss part, owned by the pure simulation. */
export interface BossPart {
  id: number;
  alive: boolean;
  hp: number;
  x: number;
  y: number;
  key: string;
  sprite: string;
}

/** One active boss and its deterministic three-phase attack state. */
export interface Boss {
  active: boolean;
  id: number;
  key: string;
  sprite: string;
  x: number;
  y: number;
  hp: number;
  phase: number;
  tellTimer: number;
  fireTimer: number;
  /** Whether the final-form low-health barrage has already been attempted this phase. */
  barrageFired: boolean;
  readonly parts: BossPart[];
}

/** Private mutable simulation state. Never handed out; `snapshot()` copies from it. */
export interface World {
  readonly rules: Content['gameplay'];
  readonly content: Content;
  readonly rng: Rng;
  readonly seed: number;
  tick: number;
  nextId: number;
  phase: Phase;
  lives: number;
  /** Absolute encounter number, starting at one and never capped. */
  level: number;
  /** Positive difficulty that may increase by at most one between levels. */
  difficulty: number;
  /** Legacy alias for the current absolute level; retained for replay compatibility. */
  wave: number;
  /** Key of the currently active cyclic normal-wave template. */
  waveKey: string;
  waveTimer: number;
  enemyFireTimer: number;
  diveTimer: number;
  gameOverTimer: number;
  score: number;
  chain: number;
  chainTimer: number;
  kills: number;
  nextExtraLifeScore: number;
  readonly player: Player;
  readonly boss: Boss;
  readonly grunts: Grunt[];
  readonly shots: Mover[];
  readonly bullets: Mover[];
  readonly pickups: Mover[];
  /** Events emitted this tick; drained by `sim.drainEvents()`. */
  events: SimEvent[];
}

function mover(): Mover {
  return {
    id: 0,
    active: false,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    vx: 0,
    vy: 0,
    variant: 'enemy_bullet',
    turnRateDegrees: 0,
    remainingLifetimeTicks: 0,
  };
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
    level: 1,
    difficulty: 1,
    wave: 1,
    waveKey: '',
    waveTimer: 0,
    enemyFireTimer: 0,
    diveTimer: 0,
    gameOverTimer: 0,
    score: 0,
    chain: 0,
    chainTimer: 0,
    kills: 0,
    nextExtraLifeScore: rules.scoring.extraLifeFirstScore,
    player: {
      alive: true,
      x: 0,
      y: rules.player.y,
      prevX: 0,
      dir: 0,
      fireCooldown: 0,
      invulnerable: 0,
      respawnTimer: 0,
      weaponLevel: 1,
      bombs: rules.player.bombsPerLife,
      bombHeld: false,
    },
    boss: {
      active: false,
      id: 0,
      key: '',
      sprite: '',
      x: 0,
      y: 0,
      hp: 0,
      phase: 0,
      tellTimer: 0,
      fireTimer: 0,
      barrageFired: false,
      parts: [],
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
    shots: Array.from(
      {
        length: Math.max(
          rules.player.maxShots,
          ...rules.player.weaponLevels.map((level) => level.maxShots),
        ),
      },
      mover,
    ),
    bullets: Array.from({ length: ENEMY_BULLET_POOL }, mover),
    pickups: Array.from({ length: PICKUP_POOL }, mover),
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
  p.x = WORLD_WIDTH / 2;
  p.prevX = p.x;
  p.dir = 0;
  p.fireCooldown = 0;
  p.respawnTimer = 0;
  p.bombs = world.rules.player.bombsPerLife;
  p.bombHeld = false;
}

/** Returns whether an absolute level schedules the recurring boss encounter. */
export function isBossLevel(level: number): boolean {
  return level > 0 && level % 10 === 0;
}

/** Returns the level's cyclic normal-wave template, excluding recurring boss encounters. */
export function waveForLevel(world: World) {
  if (isBossLevel(world.level)) return undefined;
  const templates = world.content.stages.filter((stage) => stage.type === 'wave');
  if (templates.length === 0)
    throw new Error('endless progression requires one normal wave template');
  const normalIndex = world.level - Math.floor(world.level / 10) - 1;
  const stage = templates[normalIndex % templates.length];
  return stage?.type === 'wave' ? world.content.waves[stage.wave] : undefined;
}

/** Spawns the current level's cyclic normal formation and announces the encounter. */
export function spawnWave(world: World): void {
  const wave = waveForLevel(world);
  if (!wave) throw new Error(`missing wave template for level ${String(world.level)}`);
  const roster = wave.entries.flatMap((entry) =>
    Array.from({ length: entry.count }, () => entry.enemy),
  );
  if (roster.length > world.grunts.length) throw new Error('wave exceeds the enemy pool capacity');
  world.waveKey = wave.key;
  for (let i = roster.length; i < world.grunts.length; i += 1) {
    const enemy = world.grunts[i];
    if (enemy) enemy.alive = false;
  }
  const left = WORLD_WIDTH / 2 - ((wave.formation.columns - 1) * wave.formation.spacingX) / 2;
  world.grunts.forEach((enemy, i) => {
    const kind = roster[i];
    const spec = kind === undefined ? undefined : world.content.enemies[kind];
    if (!spec) return;
    enemy.id = newId(world);
    enemy.alive = true;
    enemy.hp = scaledNormalEnemyHp(spec.hp, world.difficulty);
    enemy.kind = spec.key;
    enemy.slot = i;
    enemy.x = left + (i % wave.formation.columns) * wave.formation.spacingX;
    enemy.y = wave.formation.y + Math.floor(i / wave.formation.columns) * wave.formation.spacingY;
    enemy.prevX = enemy.x;
    enemy.prevY = enemy.y;
    enemy.tellTimer = 0;
    enemy.fireTimer = scaledNormalWaveInterval(spec.fireIntervalTicks, world.difficulty);
    enemy.diving = 0;
    enemy.entryTimer = 60;
  });
  world.wave = world.level;
  world.waveTimer = 0;
  world.diveTimer = scaledNormalWaveInterval(wave.dive.maxIntervalTicks, world.difficulty);
  world.events.push({ type: 'WaveStarted', level: world.level, difficulty: world.difficulty });
}

/** Spawns the existing Overlord for every tenth level. */
export function spawnBoss(world: World): void {
  const spec = Object.values(world.content.bosses)[0];
  if (!spec) throw new Error('endless progression requires one boss');
  const boss = world.boss;
  world.waveKey = '';
  boss.active = true;
  boss.id = newId(world);
  boss.key = spec.key;
  boss.sprite = spec.sprite;
  boss.x = spec.x;
  boss.y = spec.y;
  boss.phase = 0;
  boss.hp = scaledBossPhaseHp(spec.phases[0]?.hp ?? 0, world.difficulty);
  boss.tellTimer = 0;
  boss.fireTimer = scaledBossFireInterval(spec.phases[0]?.fireIntervalTicks ?? 0, world.difficulty);
  boss.barrageFired = false;
  boss.parts.length = 0;
  for (const part of spec.parts) {
    boss.parts.push({
      id: newId(world),
      alive: true,
      hp: scaledBossPartHp(part.hp, world.difficulty),
      x: boss.x + part.offset.x,
      y: boss.y + part.offset.y,
      key: part.key,
      sprite: part.sprite,
    });
  }
  world.wave = world.level;
  world.waveTimer = 0;
  world.events.push({
    type: 'BossStarted',
    boss: spec.key,
    level: world.level,
    difficulty: world.difficulty,
  });
}

/** Advances one level and consumes the sole deterministic 50/50 difficulty roll for that transition. */
export function advanceLevel(world: World): void {
  world.level += 1;
  world.wave = world.level;
  if ((world.rng.nextU32() & 1) === 1) world.difficulty += 1;
}

/** Starts a fresh endless run. The RNG keeps running: no reseed. */
export function resetGame(world: World): void {
  world.phase = 'playing';
  world.lives = world.rules.player.lives;
  world.level = 1;
  world.difficulty = 1;
  world.wave = 1;
  world.waveKey = '';
  world.waveTimer = 0;
  world.gameOverTimer = 0;
  world.score = 0;
  world.chain = 0;
  world.chainTimer = 0;
  world.kills = 0;
  world.boss.active = false;
  world.boss.parts.length = 0;
  world.nextExtraLifeScore = world.rules.scoring.extraLifeFirstScore;
  for (const m of world.shots) m.active = false;
  for (const m of world.bullets) m.active = false;
  for (const m of world.pickups) m.active = false;
  placePlayer(world);
  world.player.invulnerable = 0;
  spawnWave(world);
}
