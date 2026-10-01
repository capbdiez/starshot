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
    idle: [
      Array.from({ length: 20 }, () => '...oooooooooooooo...'),
      Array.from({ length: 20 }, () => '...oOOOOOOOOOOOOo...'),
    ],
    attack_tell: [
      Array.from({ length: 20 }, () => '...oWWWWWWWWWWWWo...'),
      Array.from({ length: 20 }, () => '...oooooooooooooo...'),
      Array.from({ length: 20 }, () => '...oWWWWWWWWWWWWo...'),
    ],
    death: burst(20, 6, 'o'),
  },
  enemy_elite: {
    idle: Array.from({ length: 4 }, (_, i) =>
      Array.from({ length: 24 }, () =>
        i % 2 === 0 ? 'VVVVVVVVVVVVVVVVVVVVVVVV' : 'VvVvVvVvVvVvVvVvVvVvVvVv',
      ),
    ),
    attack_tell: [
      Array.from({ length: 24 }, () => 'WWWWWWWWWWWWWWWWWWWWWWWW'),
      Array.from({ length: 24 }, () => 'VVVVVVVVVVVVVVVVVVVVVVVV'),
      Array.from({ length: 24 }, () => 'WWWWWWWWWWWWWWWWWWWWWWWW'),
    ],
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
  enemy_bullet: {
    idle: [
      ['.pppp.', 'ppPPpp', 'pPWWPp', 'pPWWPp', 'ppPPpp', '.pppp.'],
      ['..pp..', '.pPPp.', 'pPWWPp', 'pPWWPp', '.pPPp.', '..pp..'],
    ],
  },
};
