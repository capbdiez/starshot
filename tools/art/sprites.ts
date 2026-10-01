/**
 * Final M1 sprite art, authored as palette-letter grids (see `PIXEL_KEY` in lib/pixel-art.ts).
 * `npm run assets:art` writes them to `art-src/export/` in Aseprite sheet format, so the atlas
 * pipeline treats them exactly like an Aseprite export.
 */
import { burstFrame, recolour, type Grid } from '../lib/pixel-art.ts';

const SHIP_BODY: Grid = [
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
const FLAME_A: Grid = ['......oYYo......', '.......oo.......'];
const FLAME_B: Grid = ['......YWWY......', '.......YY.......'];

const shipIdle = [
  [...SHIP_BODY, ...FLAME_A],
  [...SHIP_BODY, ...FLAME_B],
];
/** Banking darkens the side rolling away from the viewer. */
const SHADE = { C: 'b', c: 'C', b: 'B' };

const GRUNT_LEGS_A: Grid = ['..M..........M..', '...m........m...', '...mm......mm...'];
const GRUNT_LEGS_B: Grid = ['................', '..M..........M..', '...mmm....mmm...'];
const GRUNT_BODY: Grid = [
  '....mmmmmmmm....',
  '..MmmPmmmmPmmM..',
  '.MmmPWPmmPWPmmM.',
  'MmmmmPmmmmPmmmmM',
  'MmoommmmmmmmoomM',
  'Mm.oOmmmmmmOo.mM',
  'M...mmmmmmmm...M',
  '....mMmmmmMm....',
  '....m.mOOm.m....',
  '...M..mOOm..M...',
  '......MooM......',
  '.......oo.......',
  '................',
];

const burst = (size: number, count: number, tint: string): Grid[] =>
  Array.from({ length: count }, (_, i) => burstFrame(size, i, count, tint));

/** Draws a non-square cooling blast ring with deterministic debris for large enemy parts. */
const partBurst = (w: number, h: number, count: number, tint: string): Grid[] =>
  Array.from({ length: count }, (_, frame) => {
    const t = (frame + 1) / count;
    const outer = 1 + t * (Math.min(w, h) / 2 - 1);
    const inner = Math.max(0, outer - 2);
    const colour = ['W', 'Y', 'o', 'O', 'r', 'M'][Math.min(5, Math.floor(t * 6))] ?? tint;
    return Array.from({ length: h }, (_, y) =>
      Array.from({ length: w }, (_, x) => {
        const dx = (x - (w - 1) / 2) * (h / w);
        const dy = y - (h - 1) / 2;
        const distance = Math.hypot(dx, dy);
        if (distance <= outer && distance >= inner) return distance > outer - 0.8 ? tint : colour;
        return frame > 1 && (x * 17 + y * 31 + frame * 13) % 29 === 0 ? 'y' : '.';
      }).join(''),
    );
  });

/** A plated orange beetle with a bright cannon aperture. */
const tankFrame = (lit: boolean, tell = false): Grid =>
  [
    '....................',
    '.......OOOOOO.......',
    '.....ooOOOOOOoo.....',
    '....oOO......OOo....',
    '...oO..oooooo..Oo...',
    '..oO..oOOOOOOo..Oo..',
    '.oO..oOO....OOo..Oo.',
    '.oO.oOO..WW..OOo.Oo.',
    'oOOoOO..WYYW..OOoOOo',
    'oOOoOO..WYYW..OOoOOo',
    '.oO.oOO..WW..OOo.Oo.',
    '.oO..oOO....OOo..Oo.',
    '..oO..oOOOOOOo..Oo..',
    '...oO..oooooo..Oo...',
    '....oOO......OOo....',
    '.....ooOOOOOOoo.....',
    '.......O.OO.O.......',
    '......o..OO..o......',
    '.....o...oo...o.....',
    '....................',
  ].map((row) => (tell ? row.replace(/[oO]/g, 'W') : lit ? row.replace(/Y/g, 'W') : row));

/** A violet mantis silhouette with wings, claws, eyes and an animated reactor. */
const eliteFrame = (phase: number, tell = false): Grid => {
  const reactor = phase % 2 === 0 ? 'P' : 'W';
  return [
    '........................',
    '...........VV...........',
    '.........vVVVVv.........',
    '.......vvVVVVVVvv.......',
    '.....vvVVV....VVVvv.....',
    '....vVVV........VVVv....',
    '...vVV....vVVv....VVv...',
    '..vVV...vV....Vv...VVv..',
    '.vVV...vV..PP..Vv...VVv.',
    'vVV...vV..PWWP..Vv...VVv',
    'VV...vV..PWYYWP..Vv...VV',
    'V...vV...PWWP...Vv...VVV',
    'VV...vV....PP....Vv...VV',
    'vVV...vV..vVVVv..Vv...VV',
    '.vVV...vVV....VVv...VVv.',
    '..vVV...VV......VV...v..',
    '...vVV..VV..VV..VV..v...',
    '....vVV..V..VV..V..v....',
    '.....vVV....VV....v.....',
    '......vVV...VV...v......',
    '.......vV...vv...V......',
    '........VV......VV......',
    '.........vV....Vv.......',
    '........................',
  ]
    .map((row) => row.replace(/Y/g, reactor))
    .map((row) => (tell ? row.replace(/[vV]/g, 'W') : row));
};

/** The Overlord's horned core: plated violet hull, eye ports and a pulsing reactor. */
const bossCoreFrame = (lit: boolean, tell = false): Grid =>
  Array.from({ length: 28 }, (_, y) =>
    Array.from({ length: 40 }, (_, x) => {
      const dx = Math.abs(x - 19.5);
      const dy = Math.abs(y - 14);
      const hull = dx / 19 + dy / 12 < 1;
      const horn = (y < 9 && dx > 12 + y * 0.45 && dx < 18) || (y > 18 && dx > 14 && dx < 18);
      if (!hull && !horn) return '.';
      if (tell && hull && (x + y) % 3 !== 0) return 'W';
      if (dx < 4 && dy < 5) {
        if (dx < 1.5 && dy < 2.5) return lit ? 'W' : 'P';
        return 'p';
      }
      if (dy < 2 && dx > 8 && dx < 15) return lit ? 'W' : 'P';
      if (dx > 15 || dy > 9) return 'v';
      if ((x * 3 + y * 5) % 11 === 0) return 'M';
      return 'V';
    }).join(''),
  );

/** A swept, segmented wing whose bright edge alternates at idle. */
const bossWingFrame = (lit: boolean): Grid =>
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

/** A circular orange turret with a white-hot aperture and rotating shutter. */
const bossCannonFrame = (lit: boolean): Grid =>
  Array.from({ length: 18 }, (_, y) =>
    Array.from({ length: 18 }, (_, x) => {
      const dx = x - 8.5;
      const dy = y - 8.5;
      const distance = Math.hypot(dx, dy);
      if (distance > 8) return '.';
      if (distance > 6.8) return 'O';
      if (distance < 2.6) return lit ? 'W' : 'Y';
      if ((x + y + (lit ? 1 : 0)) % 5 === 0) return 'y';
      if (Math.abs(dx) < 1 || Math.abs(dy) < 1) return 'o';
      return 'O';
    }).join(''),
  );

/** Sprite key → clip → frames. Clip names and counts must match `content/animations`. */
export const SPRITE_ART: Readonly<Record<string, Readonly<Record<string, readonly Grid[]>>>> = {
  player_ship: {
    idle: shipIdle,
    bank_left: shipIdle.map((g) => recolour(g, 0, 8, SHADE)),
    bank_right: shipIdle.map((g) => recolour(g, 8, 16, SHADE)),
    death: burst(16, 8, 'C'),
  },
  enemy_grunt: {
    idle: [
      [...GRUNT_LEGS_A, ...GRUNT_BODY],
      [...GRUNT_LEGS_B, ...GRUNT_BODY],
    ],
    attack_tell: [
      recolour([...GRUNT_LEGS_A, ...GRUNT_BODY], 0, 16, { m: 'W' }),
      [...GRUNT_LEGS_A, ...GRUNT_BODY],
      recolour([...GRUNT_LEGS_B, ...GRUNT_BODY], 0, 16, { m: 'W' }),
    ],
    death: burst(16, 6, 'm'),
  },
  enemy_swooper: {
    idle: [
      [...GRUNT_LEGS_A, ...GRUNT_BODY],
      recolour([...GRUNT_LEGS_B, ...GRUNT_BODY], 0, 16, { m: 'P' }),
    ],
    attack_tell: [
      recolour([...GRUNT_LEGS_A, ...GRUNT_BODY], 0, 16, { m: 'W' }),
      [...GRUNT_LEGS_A, ...GRUNT_BODY],
      recolour([...GRUNT_LEGS_A, ...GRUNT_BODY], 0, 16, { m: 'W' }),
    ],
    death: burst(16, 6, 'P'),
  },
  enemy_tank: {
    idle: [tankFrame(false), tankFrame(true)],
    attack_tell: [tankFrame(false, true), tankFrame(false), tankFrame(true, true)],
    death: burst(20, 6, 'o'),
  },
  enemy_elite: {
    idle: [eliteFrame(0), eliteFrame(1), eliteFrame(2), eliteFrame(3)],
    attack_tell: [eliteFrame(0, true), eliteFrame(1), eliteFrame(2, true)],
    death: burst(24, 8, 'V'),
  },
  player_shot: {
    idle: [
      ['.W.', 'cWc', 'cWc', 'cCc', '.C.', '.C.', '.b.', '.b.'],
      ['.W.', 'WWW', 'cWc', 'cWc', '.C.', '.C.', '.b.', '...'],
    ],
  },
  pickup_weapon: {
    idle: [
      [
        '.....Y......',
        '....YYY.....',
        '...YYWYY....',
        '..YYWWWYY...',
        '.YYWWWWWYY..',
        'YYWWWWWWWYY.',
        '.YYWWWWWYY..',
        '..YYWWWYY...',
        '...YYWYY....',
        '....YYY.....',
        '.....Y......',
        '............',
      ],
      [
        '......Y.....',
        '.....YYY....',
        '....YYWYY...',
        '...YYWWWYY..',
        '..YYWWWWWYY.',
        '.YYWWWWWWWYY',
        '..YYWWWWWYY.',
        '...YYWWWYY..',
        '....YYWYY...',
        '.....YYY....',
        '......Y.....',
        '............',
      ],
      [
        '.....Y......',
        '....YYY.....',
        '...YYWYY....',
        '..YYWWWYY...',
        '.YYWWWWWYY..',
        'YYWWWWWWWYY.',
        '.YYWWWWWYY..',
        '..YYWWWYY...',
        '...YYWYY....',
        '....YYY.....',
        '.....Y......',
        '............',
      ],
      [
        '....Y.......',
        '...YYY......',
        '..YYWYY.....',
        '.YYWWWYY....',
        'YYWWWWWYY...',
        'YWWWWWWWYY..',
        'YYWWWWWYY...',
        '.YYWWWYY....',
        '..YYWYY.....',
        '...YYY......',
        '....Y.......',
        '............',
      ],
    ],
  },
  boss_core: {
    idle: [bossCoreFrame(false), bossCoreFrame(true)],
    attack_tell: [bossCoreFrame(true, true), bossCoreFrame(false), bossCoreFrame(true, true)],
    death: partBurst(40, 28, 8, 'V'),
  },
  boss_wing: {
    idle: [bossWingFrame(false), bossWingFrame(true)],
    death: partBurst(24, 20, 6, 'm'),
  },
  boss_cannon: {
    idle: [bossCannonFrame(false), bossCannonFrame(true)],
    death: partBurst(18, 18, 6, 'o'),
  },
  enemy_bullet: {
    idle: [
      ['.pppp.', 'ppPPpp', 'pPWWPp', 'pPWWPp', 'ppPPpp', '.pppp.'],
      ['..pp..', '.pPPp.', 'pPWWPp', 'pPWWPp', '.pPPp.', '..pp..'],
    ],
  },
};
