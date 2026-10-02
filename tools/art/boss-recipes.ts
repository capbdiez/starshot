import type { Grid } from '../lib/pixel-art.ts';
import { materialDebris } from './fx-recipes.ts';
import type { SpriteArt } from './recipe-types.ts';

const coreFrame = (lit: boolean, tell = false): Grid =>
  Array.from({ length: 28 }, (_, y) =>
    Array.from({ length: 40 }, (_, x) => {
      const dx = Math.abs(x - 19.5);
      const dy = Math.abs(y - 14);
      const hull = dx / 19 + dy / 12 < 1;
      const horn = (y < 9 && dx > 12 + y * 0.45 && dx < 18) || (y > 18 && dx > 14 && dx < 18);
      if (!hull && !horn) return '.';
      if (tell && hull && (x + y) % 3 !== 0) return 'W';
      if (dx < 4 && dy < 5) return dx < 1.5 && dy < 2.5 ? (lit ? 'W' : 'P') : 'p';
      if (dy < 2 && dx > 8 && dx < 15) return lit ? 'W' : 'P';
      if (dx > 15 || dy > 9) return 'v';
      return (x * 3 + y * 5) % 11 === 0 ? 'M' : 'V';
    }).join(''),
  );
const wingFrame = (lit: boolean): Grid =>
  Array.from({ length: 20 }, (_, y) =>
    Array.from({ length: 24 }, (_, x) => {
      const leading = 2 + Math.floor(Math.abs(y - 9.5) * 0.55);
      const trailing = 22 - Math.floor(Math.abs(y - 9.5) * 0.2);
      if (x < leading || x > trailing || y < 2 || y > 17) return '.';
      if (x === leading || x === trailing || y === 2 || y === 17) return 'M';
      if ((x + y) % 6 === 0) return lit ? 'P' : 'V';
      if (x > 15 && (y === 6 || y === 13)) return 'W';
      return y % 4 === 0 ? 'm' : 'v';
    }).join(''),
  );
const cannonFrame = (lit: boolean): Grid =>
  Array.from({ length: 18 }, (_, y) =>
    Array.from({ length: 18 }, (_, x) => {
      const dx = x - 8.5;
      const dy = y - 8.5;
      const distance = Math.hypot(dx, dy);
      if (distance > 8) return '.';
      if (distance > 6.8) return 'O';
      if (distance < 2.6) return lit ? 'W' : 'Y';
      if ((x + y + (lit ? 1 : 0)) % 5 === 0) return 'y';
      return Math.abs(dx) < 1 || Math.abs(dy) < 1 ? 'o' : 'O';
    }).join(''),
  );

const coreIdle: readonly [Grid, Grid] = [coreFrame(false), coreFrame(true)];
const wingIdle: readonly [Grid, Grid] = [wingFrame(false), wingFrame(true)];
const cannonIdle: readonly [Grid, Grid] = [cannonFrame(false), cannonFrame(true)];

/** G5 modular-machine art keeps the core, wings, cannon, and every animation contract intact. */
export const BOSS_ART: SpriteArt = {
  boss_core: {
    idle: coreIdle,
    attack_tell: [coreFrame(true, true), coreIdle[0], coreFrame(true, true)],
    death: materialDebris(coreIdle[0], 8, 0xb055, ['V', 'v', 'M', 'P', 'Y']),
  },
  boss_wing: {
    idle: wingIdle,
    death: materialDebris(wingIdle[0], 6, 0xb056, ['V', 'v', 'm', 'M', 'P']),
  },
  boss_cannon: {
    idle: cannonIdle,
    death: materialDebris(cannonIdle[0], 6, 0xb057, ['O', 'o', 'y', 'Y', 'M']),
  },
};
