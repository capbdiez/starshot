import { z } from 'zod';
import { SPRITE_KEY_PATTERN } from './sprites.ts';

const spriteKey = z.string().regex(SPRITE_KEY_PATTERN, 'must be a sprite key');
const ticks = z.int().min(1).max(36_000);
const speed = z.number().positive().max(32);
const hitbox = z.strictObject({ w: z.int().min(1).max(64), h: z.int().min(1).max(64) });

/** Schema for `content/gameplay.json`: every M1 gameplay number (GAME_SPEC §4). */
export const gameplaySchema = z
  .strictObject({
    player: z.strictObject({
      sprite: spriteKey,
      /** Y of the player band in game pixels. */
      y: z.number().min(0).max(480),
      /** Horizontal speed in px per tick. */
      speed,
      /** Closest distance in px the ship centre may get to either screen edge. */
      edgeMargin: z.int().min(0).max(64),
      hitbox,
      lives: z.int().min(1).max(9),
      /** Ticks between losing a life and reappearing. */
      respawnTicks: ticks,
      /** Invulnerability after respawning (FR-07: 2 s). */
      invulnerableTicks: ticks,
      /** Autofire period while fire is held. */
      fireIntervalTicks: ticks,
      /** Legacy level-1 cap; shot-pool capacity also covers every weapon-level cap. */
      maxShots: z.int().min(1).max(32),
      weaponLevels: z
        .array(
          z.strictObject({
            shots: z.int().min(1).max(5),
            spread: z.number().min(0).max(8),
            maxShots: z.int().min(1).max(32),
          }),
        )
        .length(3),
      bombsPerLife: z.int().min(0).max(9),
    }),
    playerShot: z.strictObject({ sprite: spriteKey, speed, hitbox }),
    grunt: z.strictObject({
      sprite: spriteKey,
      hp: z.int().min(1).max(99),
      hitbox,
      /** A static row (formations arrive in M3). */
      row: z.strictObject({
        count: z.int().min(1).max(16),
        y: z.number().min(0).max(480),
        spacing: z.number().positive().max(64),
      }),
      /** Ticks between the row being cleared and the next row appearing. */
      respawnTicks: ticks,
    }),
    enemyFire: z
      .strictObject({
        /** Random delay (inclusive range) between two enemy shots. */
        minIntervalTicks: ticks,
        maxIntervalTicks: ticks,
        /** Chance (0–1) that a shot is aimed at the player instead of falling straight down. */
        aimChance: z.number().min(0).max(1),
      })
      .refine((fire) => fire.minIntervalTicks <= fire.maxIntervalTicks, {
        message: 'minIntervalTicks must be <= maxIntervalTicks',
      }),
    enemyBullet: z.strictObject({ sprite: spriteKey, speed, hitbox }),
    pickups: z.strictObject({
      sprite: spriteKey,
      hitbox,
      speed,
      /** Deterministic pickup cadence; zero would disable M4 pickups. */
      dropEveryKills: z.int().min(1).max(100),
    }),
    scoring: z.strictObject({
      basePoints: z.record(z.string().regex(/^[a-z][a-z0-9_]*$/), z.int().min(1).max(100_000)),
      chainWindowTicks: ticks,
      maxMultiplier: z.int().min(1).max(99),
      diveBonus: z.int().min(0).max(100_000),
      extraLifeFirstScore: z.int().min(1).max(10_000_000),
      extraLifeEveryScore: z.int().min(1).max(10_000_000),
    }),
    bomb: z.strictObject({ damage: z.int().min(1).max(99), invulnerableTicks: ticks }),
    /** Ticks from game over to the automatic restart (acceptance: ≤ 2 s). */
    gameOverTicks: z.int().min(1).max(120),
  })
  .refine(
    (rules) => (rules.grunt.row.count - 1) * rules.grunt.row.spacing <= 270,
    'grunt row does not fit the 270 px play field',
  );

export type Gameplay = z.infer<typeof gameplaySchema>;
