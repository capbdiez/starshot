import { GAME_HEIGHT, GAME_WIDTH, hasInput, InputBit, type InputFrame } from '../shared/index.ts';
import { overlaps } from './collision.ts';
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

/**
 * Fires one enemy bullet every random interval. With `aimChance` it is aimed at the player's
 * current position (sqrt is correctly rounded in IEEE-754, so this stays deterministic);
 * otherwise it falls straight down from a random grunt.
 */
export function updateEnemyFire(world: World): void {
  if (!world.player.alive) return;
  world.enemyFireTimer -= 1;
  if (world.enemyFireTimer > 0) return;
  const fire = world.rules.enemyFire;
  world.enemyFireTimer = world.rng.int(fire.minIntervalTicks, fire.maxIntervalTicks);

  const alive = world.grunts.filter((g) => g.alive);
  if (alive.length === 0) return;
  const shooter = alive[world.rng.int(0, alive.length - 1)];
  const aimed = world.rng.nextFloat() < fire.aimChance;
  const bullet = findFree(world.bullets);
  if (!shooter || !bullet) return;
  const speed = world.rules.enemyBullet.speed;
  const x = shooter.x;
  const y = shooter.y + world.rules.grunt.hitbox.h / 2;
  let vx = 0;
  let vy = speed;
  if (aimed) {
    const dx = world.player.x - x;
    const dy = world.player.y - y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      vx = (dx / len) * speed;
      vy = (dy / len) * speed;
    }
  }
  launch(world, bullet, x, y, vx, vy);
  world.events.push({ type: 'EnemyFired', id: bullet.id, x: bullet.x, y: bullet.y });
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
  const { grunt: gruntRules, playerShot, enemyBullet, player: playerRules } = world.rules;
  for (const shot of world.shots) {
    if (!shot.active) continue;
    const shotBox = { x: shot.x, y: shot.y, ...playerShot.hitbox };
    const target = world.grunts.find(
      (g) => g.alive && overlaps(shotBox, { x: g.x, y: g.y, ...gruntRules.hitbox }),
    );
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
        kind: 'grunt',
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
  const bodyHit = world.grunts.some(
    (g) => g.alive && overlaps(playerBox, { x: g.x, y: g.y, ...gruntRules.hitbox }),
  );
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
