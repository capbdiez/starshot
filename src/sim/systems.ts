import {
  WORLD_HEIGHT,
  WORLD_WIDTH,
  hasInput,
  InputBit,
  trigSin,
  type InputFrame,
} from '../shared/index.ts';
import { overlaps } from './collision.ts';
import { diveInterval } from './dive-scheduler.ts';
import { easeInOut, sampleCubic } from './path.ts';
import { patternVelocities } from './patterns.ts';
import {
  newId,
  placePlayer,
  resetGame,
  spawnBoss,
  spawnWave,
  type Mover,
  type World,
} from './world.ts';

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

/** Horizontal movement, weapon-level autofire and bomb activation. */
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
  if (world.chainTimer > 0) world.chainTimer -= 1;
  else world.chain = 0;

  const left = hasInput(input, InputBit.left);
  const right = hasInput(input, InputBit.right);
  p.dir = left === right ? 0 : left ? -1 : 1;
  p.x = Math.min(
    WORLD_WIDTH - rules.edgeMargin,
    Math.max(rules.edgeMargin, p.x + p.dir * rules.speed),
  );

  const bombPressed = hasInput(input, InputBit.bomb);
  if (bombPressed && !p.bombHeld && p.bombs > 0) useBomb(world);
  p.bombHeld = bombPressed;
  if (p.fireCooldown > 0) p.fireCooldown -= 1;
  if (!hasInput(input, InputBit.fire) || p.fireCooldown !== 0) return;
  const level = rules.weaponLevels[p.weaponLevel - 1];
  if (!level || world.shots.filter((shot) => shot.active).length + level.shots > level.maxShots)
    return;
  for (let i = 0; i < level.shots; i += 1) {
    const shot = findFree(world.shots);
    if (!shot) break;
    const offset = (i - (level.shots - 1) / 2) * level.spread;
    launch(world, shot, p.x, p.y - rules.hitbox.h, offset, -world.rules.playerShot.speed);
    world.events.push({ type: 'PlayerFired', id: shot.id, x: shot.x, y: shot.y });
  }
  p.fireCooldown = rules.fireIntervalTicks;
}

function useBomb(world: World): void {
  const p = world.player;
  p.bombs -= 1;
  p.invulnerable = Math.max(p.invulnerable, world.rules.bomb.invulnerableTicks);
  for (const bullet of world.bullets) bullet.active = false;
  let enemiesHit = 0;
  for (const enemy of world.grunts) {
    if (!enemy.alive) continue;
    enemiesHit += 1;
    enemy.hp -= world.rules.bomb.damage;
    if (enemy.hp <= 0) killEnemy(world, enemy);
    else world.events.push({ type: 'EnemyHit', id: enemy.id, x: enemy.x, y: enemy.y });
  }
  if (world.boss.active) {
    enemiesHit += 1;
    damageBoss(world, world.rules.bomb.damage);
    for (const part of world.boss.parts)
      if (part.alive) damageBossPart(world, part, world.rules.bomb.damage);
  }
  world.events.push({ type: 'BombUsed', x: p.x, y: p.y, enemiesHit });
}

function killEnemy(world: World, enemy: World['grunts'][number]): void {
  enemy.alive = false;
  const scoring = world.rules.scoring;
  world.chain = Math.min(scoring.maxMultiplier, world.chain + 1);
  world.chainTimer = scoring.chainWindowTicks;
  const points =
    ((scoring.basePoints[enemy.kind] ?? 0) + (enemy.diving > 0 ? scoring.diveBonus : 0)) *
    world.chain;
  world.score += points;
  world.kills += 1;
  world.events.push({
    type: 'EnemyKilled',
    id: enemy.id,
    kind: enemy.kind,
    x: enemy.x,
    y: enemy.y,
  });
  world.events.push({ type: 'ScoreAwarded', points, score: world.score, multiplier: world.chain });
  while (world.score >= world.nextExtraLifeScore) {
    world.lives += 1;
    world.events.push({ type: 'ExtraLifeAwarded', lives: world.lives, score: world.score });
    world.nextExtraLifeScore += scoring.extraLifeEveryScore;
  }
  if (world.kills % world.rules.pickups.dropEveryKills === 0) {
    const pickup = findFree(world.pickups);
    if (pickup) {
      launch(world, pickup, enemy.x, enemy.y, 0, world.rules.pickups.speed);
      world.events.push({ type: 'PickupSpawned', id: pickup.id, x: pickup.x, y: pickup.y });
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
    const offY = m.y < -CULL_MARGIN || m.y > WORLD_HEIGHT + CULL_MARGIN;
    const offX = m.x < -CULL_MARGIN || m.x > WORLD_WIDTH + CULL_MARGIN;
    if (offX || offY) m.active = false;
  }
}

/** Advances attack tells, data-defined patterns, formation sway and the thinning-aware dive scheduler. */
export function updateEnemyFire(world: World): void {
  if (!world.player.alive) return;
  if (world.boss.active) {
    updateBoss(world);
    return;
  }
  const stage = world.content.stages[world.wave - 1];
  const wave = stage?.type === 'wave' ? world.content.waves[stage.wave] : undefined;
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
        WORLD_WIDTH / 2 -
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
    // Escaped divers are no longer active wave members. Without this cull they remain alive below
    // the play field and prevent updateWave() from ever advancing to the next formation.
    if (enemy.y > WORLD_HEIGHT) enemy.alive = false;
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

function damageBossPart(world: World, part: World['boss']['parts'][number], amount: number): void {
  part.hp -= amount;
  if (part.hp > 0) return;
  part.alive = false;
  world.events.push({ type: 'BossPartDestroyed', id: part.id, x: part.x, y: part.y });
}

function damageBoss(world: World, amount: number): void {
  const boss = world.boss;
  if (!boss.active || boss.parts.some((part) => part.alive)) return;
  boss.hp -= amount;
  if (boss.hp > 0) return;
  const spec = world.content.bosses[boss.key];
  if (!spec) return;
  if (boss.phase < spec.phases.length - 1) {
    boss.phase += 1;
    boss.hp = spec.phases[boss.phase]?.hp ?? 0;
    boss.tellTimer = 0;
    boss.fireTimer = spec.phases[boss.phase]?.fireIntervalTicks ?? 0;
    world.events.push({ type: 'BossPhaseChanged', phase: boss.phase + 1, x: boss.x, y: boss.y });
    return;
  }
  boss.active = false;
  for (const bullet of world.bullets) bullet.active = false;
  world.phase = 'completed';
  world.events.push({ type: 'BossDefeated', x: boss.x, y: boss.y });
  world.events.push({ type: 'RunCompleted', score: world.score, stage: world.wave });
}

/** Fires the active boss's current data-defined phase after a readable tell. */
export function updateBoss(world: World): void {
  const boss = world.boss;
  const spec = world.content.bosses[boss.key];
  const phase = spec?.phases[boss.phase];
  if (!phase) return;
  if (boss.tellTimer > 0) {
    boss.tellTimer -= 1;
    if (boss.tellTimer !== 0) return;
    for (const velocity of patternVelocities(
      phase.pattern,
      boss.x,
      boss.y,
      world.player.x,
      world.player.y,
    )) {
      const bullet = findFree(world.bullets);
      if (!bullet) break;
      launch(world, bullet, boss.x, boss.y, velocity.vx, velocity.vy);
      world.events.push({ type: 'EnemyFired', id: bullet.id, x: bullet.x, y: bullet.y });
    }
    boss.fireTimer = phase.fireIntervalTicks;
    return;
  }
  boss.fireTimer -= 1;
  if (boss.fireTimer <= 0) {
    boss.tellTimer = phase.tellTicks;
    world.events.push({ type: 'BossAttackTold', id: boss.id, x: boss.x, y: boss.y });
  }
}

function killPlayer(world: World): void {
  const p = world.player;
  p.alive = false;
  p.dir = 0;
  world.lives -= 1;
  p.weaponLevel = Math.max(1, p.weaponLevel - 1);
  world.chain = 0;
  world.chainTimer = 0;
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
    if (target) {
      shot.active = false;
      target.hp -= 1;
      if (target.hp > 0)
        world.events.push({ type: 'EnemyHit', id: target.id, x: target.x, y: target.y });
      else killEnemy(world, target);
      continue;
    }
    const boss = world.boss;
    const spec = world.content.bosses[boss.key];
    const part = boss.parts.find((candidate, index) => {
      const partSpec = spec?.parts[index];
      return (
        candidate.alive &&
        partSpec !== undefined &&
        overlaps(shotBox, { x: candidate.x, y: candidate.y, ...partSpec.hitbox })
      );
    });
    if (part) {
      shot.active = false;
      damageBossPart(world, part, 1);
      continue;
    }
    if (
      boss.active &&
      spec !== undefined &&
      overlaps(shotBox, { x: boss.x, y: boss.y, ...spec.hitbox })
    ) {
      shot.active = false;
      damageBoss(world, 1);
    }
  }

  const p = world.player;
  if (p.alive) {
    const playerBox = { x: p.x, y: p.y, ...playerRules.hitbox };
    for (const pickup of world.pickups) {
      if (
        !pickup.active ||
        !overlaps(playerBox, { x: pickup.x, y: pickup.y, ...world.rules.pickups.hitbox })
      )
        continue;
      pickup.active = false;
      p.weaponLevel = Math.min(world.rules.player.weaponLevels.length, p.weaponLevel + 1);
      world.events.push({
        type: 'PickupCollected',
        id: pickup.id,
        x: pickup.x,
        y: pickup.y,
        weaponLevel: p.weaponLevel,
      });
    }
  }
  if (!p.alive || p.invulnerable > 0) return;
  const playerBox = { x: p.x, y: p.y, ...playerRules.hitbox };
  const bulletHit = world.bullets.some(
    (b) => b.active && overlaps(playerBox, { x: b.x, y: b.y, ...enemyBullet.hitbox }),
  );
  const bodyHit =
    world.grunts.some((g) => {
      const spec = world.content.enemies[g.kind];
      return (
        g.alive && spec !== undefined && overlaps(playerBox, { x: g.x, y: g.y, ...spec.hitbox })
      );
    }) ||
    (() => {
      const boss = world.boss;
      const spec = world.content.bosses[boss.key];
      return (
        boss.active &&
        spec !== undefined &&
        overlaps(playerBox, { x: boss.x, y: boss.y, ...spec.hitbox })
      );
    })();
  if (bulletHit || bodyHit) killPlayer(world);
}

/** Respawns the grunt row a fixed delay after it is cleared. */
export function updateWave(world: World): void {
  if (world.boss.active || world.grunts.some((g) => g.alive)) return;
  const next = world.content.stages[world.wave];
  if (!next) return;
  world.waveTimer += 1;
  if (world.waveTimer < world.rules.grunt.respawnTicks) return;
  if (next.type === 'boss') spawnBoss(world);
  else spawnWave(world);
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
