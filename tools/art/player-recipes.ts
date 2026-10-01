import { recolour, type Grid } from '../lib/pixel-art.ts';
import { burst } from './fx-recipes.ts';
import type { SpriteArt } from './recipe-types.ts';

const body: Grid = [
  '.......WW.......',
  '.......cc.......',
  '......cCCc......',
  '......cCCc......',
  '.....cCbbCc.....',
  '.....CCWWCC.....',
  '....cCbWWbCc....',
  '...ccCbbbbCcc...',
  '..cCCCCbbCCCCc..',
  '.cCCbCCCCCCbCCc.',
  'cCCbbCCCCCCbbCCc',
  'cCbBBbCCCCbBBbCc',
  'CbB..BbCCbB..BbC',
  'bB....bBBb....Bb',
];
const flameA: Grid = ['......oYYo......', '.......oo.......'];
const flameB: Grid = ['......YWWY......', '.......YY.......'];
const idle = [
  [...body, ...flameA],
  [...body, ...flameB],
];
const shade = { C: 'b', c: 'C', b: 'B' };

/** Player recipe preserves the existing key, clips, dimensions, and anchor contract. */
export const PLAYER_ART: SpriteArt = {
  player_ship: {
    idle,
    bank_left: idle.map((grid) => recolour(grid, 0, 8, shade)),
    bank_right: idle.map((grid) => recolour(grid, 8, 16, shade)),
    death: burst(16, 8, 'C'),
  },
};
