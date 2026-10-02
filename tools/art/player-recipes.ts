import type { Grid } from '../lib/pixel-art.ts';
import { seededNoise } from './toolkit.ts';
import type { SpriteArt } from './recipe-types.ts';

const hull: Grid = [
  '.......WW.......',
  '......cWWc......',
  '......cCCc......',
  '.....cCWWCc.....',
  '.....CCbbCC.....',
  '....cCbWWbCc....',
  '....CCbCCbCC....',
  '...cCbbbbbbCc...',
  '..cCCbCCCCbCCc..',
  '.cCCbCCWWCCbCCc.',
  'cCCbbCCCCCCbbCCc',
  'cCbBBbCbbCbBBbCc',
  'CbB..BbCCbB..BbC',
  'bB....bBBb....Bb',
];

const flames: readonly Grid[] = [
  ['......oYYo......', '.......oo.......'],
  ['......YWWY......', '.......YY.......'],
];

const idle = flames.map((flame) => [...hull, ...flame]);

function shift(row: string, amount: number): string {
  return amount < 0
    ? `${row.slice(-amount)}${'.'.repeat(-amount)}`
    : `${'.'.repeat(amount)}${row.slice(0, row.length - amount)}`;
}

/** Purpose-built bank poses tilt the hull and move panel highlights, rather than recolouring idle art. */
function bank(direction: -1 | 1, flame: Grid): Grid {
  return [
    ...hull.map((row, y) => {
      const lean = y < 5 ? direction : y < 10 ? 0 : -direction;
      const shifted = shift(row, lean);
      const panel = direction < 0 ? shifted.lastIndexOf('C') : shifted.indexOf('C', 5);
      return panel < 0
        ? shifted
        : `${shifted.slice(0, panel)}${direction < 0 ? 'b' : 'c'}${shifted.slice(panel + 1)}`;
    }),
    ...flame.map((row) => shift(row, -direction)),
  ];
}

/** Damaged hull frames break into deterministic debris while preserving the 16×16 clip contract. */
function destructionFrame(frame: number): Grid {
  const source = idle[frame & 1];
  if (!source) throw new Error(`Missing player idle frame ${String(frame & 1)}`);
  return source.map((row, y) =>
    Array.from(row, (pixel, x) => {
      if (pixel === '.')
        return frame > 2 && seededNoise(0x504, x, y + frame) % 11 === 0 ? 'o' : '.';
      const breakup = seededNoise(0x504, x, y + frame * 17) % 8;
      if (breakup < frame) return frame < 4 ? (breakup & 1 ? 'o' : 'Y') : '.';
      if (frame > 2 && pixel === 'C') return 'o';
      if (frame > 4 && pixel === 'b') return 'O';
      return pixel;
    }).join(''),
  );
}

/** Player recipe preserves the existing key, clips, dimensions, and anchor contract. */
export const PLAYER_ART: SpriteArt = {
  player_ship: {
    idle,
    bank_left: flames.map((flame) => bank(-1, flame)),
    bank_right: flames.map((flame) => bank(1, flame)),
    death: Array.from({ length: 8 }, (_, frame) => destructionFrame(frame)),
  },
};
