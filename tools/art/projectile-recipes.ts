import type { SpriteArt } from './recipe-types.ts';

/** Projectile and pickup recipes retain their small gameplay-relative frame sizes. */
export const PROJECTILE_ART: SpriteArt = {
  player_shot: {
    idle: [
      ['.c.', 'cWc', 'cWc', '.C.', '.C.', '.b.', '.b.', '...'],
      ['.W.', 'cWc', 'cWc', 'cCc', '.C.', '.b.', '...', '...'],
    ],
  },
  pickup_weapon: {
    // The outer diamond is stable in every frame. Only its internal energy changes, so a centered
    // pickup pulses rather than appearing to slide or lose half of its silhouette.
    idle: [
      [
        '.....BB.....',
        '....BYYB....',
        '...BYWWYB...',
        '..BYWWWWYB..',
        '.BYWWWWWWYB.',
        'BYWWWWWWWWYB',
        '.BYWWWWWWYB.',
        '..BYWWWWYB..',
        '...BYWWYB...',
        '....BYYB....',
        '.....BB.....',
        '............',
      ],
      [
        '.....BB.....',
        '....BYYB....',
        '...BYWYWB...',
        '..BYWYYWYB..',
        '.BYWYWWYWYB.',
        'BYWYYWWYYWYB',
        '.BYWYWWYWYB.',
        '..BYWYYWYB..',
        '...BYWYWB...',
        '....BYYB....',
        '.....BB.....',
        '............',
      ],
      [
        '.....BB.....',
        '....BYYB....',
        '...BYWWYB...',
        '..BYWYYWYB..',
        '.BYWYWWYWYB.',
        'BYWYYWWYYWYB',
        '.BYWYWWYWYB.',
        '..BYWYYWYB..',
        '...BYWWYB...',
        '....BYYB....',
        '.....BB.....',
        '............',
      ],
      [
        '.....BB.....',
        '....BYYB....',
        '...BYWWYB...',
        '..BYWWWWYB..',
        '.BYWWYYWWYB.',
        'BYWWYWWYWWYB',
        '.BYWWYYWWYB.',
        '..BYWWWWYB..',
        '...BYWWYB...',
        '....BYYB....',
        '.....BB.....',
        '............',
      ],
    ],
  },
  enemy_bullet: {
    idle: [
      ['..pp..', '.pPPp.', 'pPWWPp', 'pPWWPp', '.pPPp.', '..pp..'],
      ['.pppp.', 'pPWWPp', 'pPWWPp', 'pPWWPp', 'pPWWPp', '.pppp.'],
    ],
  },
};
