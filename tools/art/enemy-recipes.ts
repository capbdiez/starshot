import { recolour, type Grid } from '../lib/pixel-art.ts';
import { burst } from './fx-recipes.ts';
import type { SpriteArt } from './recipe-types.ts';

const legsA: Grid = ['..M..........M..', '...m........m...', '...mm......mm...'];
const legsB: Grid = ['................', '..M..........M..', '...mmm....mmm...'];
const gruntBody: Grid = [
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
const grunt = (legs: Grid): Grid => [...legs, ...gruntBody];
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

/** Enemy recipes retain every established animation clip and frame count. */
export const ENEMY_ART: SpriteArt = {
  enemy_grunt: {
    idle: [grunt(legsA), grunt(legsB)],
    attack_tell: [
      recolour(grunt(legsA), 0, 16, { m: 'W' }),
      grunt(legsA),
      recolour(grunt(legsB), 0, 16, { m: 'W' }),
    ],
    death: burst(16, 6, 'm'),
  },
  enemy_swooper: {
    idle: [grunt(legsA), recolour(grunt(legsB), 0, 16, { m: 'P' })],
    attack_tell: [
      recolour(grunt(legsA), 0, 16, { m: 'W' }),
      grunt(legsA),
      recolour(grunt(legsA), 0, 16, { m: 'W' }),
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
};
