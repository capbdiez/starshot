import type { SpriteArt } from './recipe-types.ts';

/** Projectile and pickup recipes retain their small gameplay-relative frame sizes. */
export const PROJECTILE_ART: SpriteArt = {
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
