import {
  GAME_HEIGHT,
  GAME_WIDTH,
  hasInput,
  InputBit,
  trigSin,
  type InputFrame,
} from '../shared/index.ts';
import { overlaps } from './collision.ts';
import { diveInterval } from './dive-scheduler.ts';
import { easeInOut, sampleCubic } from './path.ts';
import { patternVelocities } from './patterns.ts';
import { newId, placePlayer, resetGame, spawnWave, type Mover, type World } from './world.ts';

/** Off-screen margin after which shots and bullets are recycled. */
const CULL_MARGIN = 16;

function findFree(pool: readonly Mover[]): Mover | undefined {
  return pool.find((m) => !m.active);
}

function launch(world: World, m: Mover, x: number, y: number, vx: number, vy: number): void {
  m.id = newId(world);
  m.active = true;
  m.x = x;
  m.y = y;
  m.prevX = x;
  m.prevY = y;
  m.vx = vx;
  m.vy = vy;
}

/** Horizontal movement, edge clamping and autofire. */
export function updatePlayer(world: World, input: InputFrame): void {
  const p = world.player;
  const rules = world.rules.player;
  p.prevX = p.x;
  if (!p.alive) {
    p.respawnTimer -= 1;
    if (p.respawnTimer <= 0) {
      placePlayer(world);
      p.invulnerable = rules.invulnerableTicks;
      world.events.push({ type: 'PlayerRespawned', x: p.x, y: p.y });
    }
    return;
  }
  if (p.invulnerable > 0) p.invulnerable -= 1;

  const left = hasInput(input, InputBit.left);
  const right = hasInput(input, InputBit.right);
  p.dir = left === right ? 0 : left ? -1 : 1;
  const min = rules.edgeMargin;
  const max = GAME_WIDTH - rules.edgeMargin;
  p.x = Math.min(max, Math.max(min, p.x + p.dir * rules.speed));

  if (p.fireCooldown > 0) p.fireCooldown -= 1;
  if (hasInput(input, InputBit.fire) && p.fireCooldown === 0) {
    const shot = findFree(world.shots);
    if (shot) {
      launch(world, shot, p.x, p.y - rules.hitbox.h, 0, -world.rules.playerShot.speed);
      p.fireCooldown = rules.fireIntervalTicks;
      world.events.push({ type: 'PlayerFired', id: shot.id, x: shot.x, y: shot.y });
    }
  }
}

/** Moves every active mover in `pool` by its velocity and recycles off-screen ones. */
export function moveMovers(pool: readonly Mover[]): void {
  for (const m of pool) {
    if (!m.active) continue;
    m.prevX = m.x;
    m.prevY = m.y;
    m.x += m.vx;
    m.y += m.vy;
    const offY = m.y < -CULL_MARGIN || m.y > GAME_HEIGHT + CULL_MARGIN;
    const offX = m.x < -CULL_MARGIN || m.x > GAME_WIDTH + CULL_MARGIN;
    if (offX || offY) m.active = false;
  }
}

/** Advances attack tells, data-defined patterns, formation sway and the thinning-aware dive scheduler. */
export function updateEnemyFire(world: World): void {
  if (!world.player.alive) return;
  const stage = world.content.stages[(world.wave - 1) % world.content.stages.length];
  const wave = stage === undefined ? undefined : world.content.waves[stage.wave];
  if (!wave) return;
  for (const enemy of world.grunts) {
    if (!enemy.alive) continue;
    const spec = world.content.enemies[enemy.kind];
    if (!spec) continue;
    enemy.prevX = enemy.x;
    enemy.prevY = enemy.y;
    const entry = wave.entries.find((candidate) => candidate.enemy === enemy.kind);
    if (enemy.entryTimer > 0 && entry) {
      enemy.entryTimer -= 1;
      const [start, controlA, controlB, end] = entry.path;
      if (!start || !controlA || !controlB || !end) continue;
      const targetX =
        GAME_WIDTH / 2 -
        ((wave.formation.columns - 1) * wave.formation.spacingX) / 2 +
        (enemy.slot % wave.formation.columns) * wave.formation.spacingX;
      const targetY =
        wave.formation.y +
        Math.floor(enemy.slot / wave.formation.columns) * wave.formation.spacingY;
      const point = sampleCubic(
        [start, controlA, controlB, end],
        easeInOut(1 - enemy.entryTimer / 60),
      );
      enemy.x = point.x + targetX - end.x;
      enemy.y = point.y + targetY - end.y;
      continue;
    }
    if (enemy.tellTimer > 0) {
      enemy.tellTimer -= 1;
      if (enemy.tellTimer === 0) {
        const pattern = world.content.patterns[spec.pattern];
        if (!pattern) continue;
        for (const velocity of patternVelocities(
          pattern,
          enemy.x,
          enemy.y,
          world.player.x,
          world.player.y,
        )) {
          const bullet = findFree(world.bullets);
          if (!bullet) break;
          launch(world, bullet, enemy.x, enemy.y, velocity.vx, velocity.vy);
          world.events.push({ type: 'EnemyFired', id: bullet.id, x: bullet.x, y: bullet.y });
        }
        enemy.fireTimer = spec.fireIntervalTicks;
      }
      continue;
    }
    enemy.fireTimer -= 1;
    if (enemy.fireTimer <= 0) {
      enemy.tellTimer = spec.tellTicks;
      world.events.push({ type: 'EnemyAttackTold', id: enemy.id, x: enemy.x, y: enemy.y });
    }
    if (enemy.diving > 0) {
      enemy.diving -= 1;
      enemy.y += 2;
    } else
      enemy.x +=
        (trigSin(((world.tick + enemy.slot * 11) * Math.PI * 2) / wave.formation.swayTicks) *
          wave.formation.sway) /
        wave.formation.swayTicks;
  }
  world.diveTimer -= 1;
  if (world.diveTimer <= 0) {
    const alive = world.grunts.filter((enemy) => enemy.alive && enemy.diving === 0);
    const diver = alive[world.rng.int(0, alive.length - 1)];
    if (diver) diver.diving = wave.dive.durationTicks / 2;
    world.diveTimer = diveInterval(
      wave.dive.minIntervalTicks,
      wave.dive.maxIntervalTicks,
      alive.length,
      world.grunts.length,
    );
  }
}

function killPlayer(world: World): void {
  const p = world.player;
  p.alive = false;
  p.dir = 0;
  world.lives -= 1;
  for (const b of world.bullets) b.active = false;
  world.events.push({ type: 'PlayerHit', x: p.x, y: p.y, livesLeft: world.lives });
  if (world.lives <= 0) {
    world.phase = 'gameOver';
    world.gameOverTimer = world.rules.gameOverTicks;
    world.events.push({ type: 'GameOver', wave: world.wave });
  } else {
    p.respawnTimer = world.rules.player.respawnTicks;
  }
}

/** FR-05 pairs for M1: player shots ↔ grunts, enemy bullets ↔ player, grunts ↔ player. */
export function resolveCollisions(world: World): void {
  const { playerShot, enemyBullet, player: playerRules } = world.rules;
  for (const shot of world.shots) {
    if (!shot.active) continue;
    const shotBox = { x: shot.x, y: shot.y, ...playerShot.hitbox };
    const target = world.grunts.find((g) => {
      const spec = world.content.enemies[g.kind];
      return g.alive && spec !== undefined && overlaps(shotBox, { x: g.x, y: g.y, ...spec.hitbox });
    });
    if (!target) continue;
    shot.active = false;
    target.hp -= 1;
    if (target.hp > 0) {
      world.events.push({ type: 'EnemyHit', id: target.id, x: target.x, y: target.y });
    } else {
      target.alive = false;
      world.events.push({
        type: 'EnemyKilled',
        id: target.id,
        kind: target.kind,
        x: target.x,
        y: target.y,
      });
    }
  }

  const p = world.player;
  if (!p.alive || p.invulnerable > 0) return;
  const playerBox = { x: p.x, y: p.y, ...playerRules.hitbox };
  const bulletHit = world.bullets.some(
    (b) => b.active && overlaps(playerBox, { x: b.x, y: b.y, ...enemyBullet.hitbox }),
  );
  const bodyHit = world.grunts.some((g) => {
    const spec = world.content.enemies[g.kind];
    return g.alive && spec !== undefined && overlaps(playerBox, { x: g.x, y: g.y, ...spec.hitbox });
  });
  if (bulletHit || bodyHit) killPlayer(world);
}

/** Respawns the grunt row a fixed delay after it is cleared. */
export function updateWave(world: World): void {
  if (world.grunts.some((g) => g.alive)) return;
  world.waveTimer += 1;
  if (world.waveTimer >= world.rules.grunt.respawnTicks) spawnWave(world);
}

/** Counts down from game over to an automatic restart. Returns true while game over. */
export function updateGameOver(world: World): boolean {
  if (world.phase !== 'gameOver') return false;
  world.gameOverTimer -= 1;
  if (world.gameOverTimer <= 0) {
    world.events.push({ type: 'GameRestarted' });
    resetGame(world);
  }
  return true;
}
