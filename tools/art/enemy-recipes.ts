import { recolour, type Grid } from '../lib/pixel-art.ts';
import { materialDebris } from './fx-recipes.ts';
import type { SpriteArt } from './recipe-types.ts';

const gruntFrame = (lit: boolean): Grid =>
  [
    '......MM........',
    '....MMmmMM......',
    '...MmmbbmmM.....',
    '..MmmCCCCmmM....',
    '.MmmCbWWbCmmM...',
    'MmmCbCccCbCmmM..',
    'MmmCCbbbbCCmmM..',
    '.MmmCbbbbCmmM...',
    '..MmmCbbCmmM....',
    '...MmmCCmmM.....',
    '....MmmMMmM.....',
    '...Mmm..mmM.....',
    '..MmM....MmM....',
    '.mM........Mm...',
    '..m..........m..',
    '................',
  ].map((row) => (lit ? row.replace(/W/g, 'Y').replace(/C/g, 'c') : row));

const swooperFrame = (lit: boolean): Grid =>
  [
    '.......M........',
    '.....MMmMM......',
    '...MMmvvmmMM....',
    '.MMmvVVVVvmMM...',
    'MmvVV..VVVvmM...',
    'mvVV..PP..VVvm..',
    'vVV..PWWP..VVv..',
    'mVVv.PWWP.vVVm..',
    '.mVVv.PP.vVVm...',
    '..mVVvvvvVVm....',
    '...mVVVVVVm.....',
    '....mVVVVm......',
    '.....mVVmm......',
    '....mM..MMm.....',
    '...mM....Mm.....',
    '................',
  ].map((row) => (lit ? row.replace(/P/g, 'W').replace(/v/g, 'V') : row));

const tankFrame = (lit: boolean, tell = false): Grid =>
  [
    '.......MM...........',
    '.....MMOOmm.........',
    '...MMOooooOMM.......',
    '..MOooOOOOooOM......',
    '.MOoOO....OOoOM.....',
    'MOoOO.MMMM.OOoM.....',
    'MoOO.MWYYWM.OOm.....',
    'MoOO.MWYYWM.OOm.....',
    'MOoOO.MMMM.OOoM.....',
    '.MOoOO....OOoOM.....',
    '..MOooOOOOooOM......',
    '...MMOooooOMM.......',
    '.....MMOOOOmm.......',
    '....M..OMMO..M......',
    '...M...OMMO...M.....',
    '..m....oooo....m....',
    '.m......OO......m...',
    '........oo..........',
    '....................',
    '....................',
  ].map((row) =>
    tell ? row.replace(/[oO]/g, 'Y').replace(/Y/g, 'W') : lit ? row.replace(/Y/g, 'W') : row,
  );

const eliteFrame = (phase: number, tell = false): Grid => {
  const reactor = phase & 1 ? 'W' : 'P';
  return [
    '...........MM...........',
    '.........MMvvMM.........',
    '.......MMvVVVVvMM.......',
    '.....MMvVV....VVvMM.....',
    '...MMvVV..MMMM..VVvMM...',
    '.MMvVV..MM....MM..VVvMM.',
    'MvVV..MM..PP..MM..VVvM.',
    'mVV..MM..PWWP..MM..VVm.',
    'VV..MM..PWYYWP..MM..VV.',
    'vV..MM..PWWP..MM..VvV.',
    'VV..MM...PPPP...MM..VV.',
    'mVV..MM..vvvv..MM..VVm.',
    'MvVV..MM........MM..VVvM',
    '.MMvVV..MM....MM..VVvMM.',
    '...MMvVV..MMMM..VVvMM...',
    '.....MMvVV....VVvMM.....',
    '.......MMvVVVVvMM.......',
    '.........MMvvvvMM.........',
    '...........MM...........',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
  ]
    .map((row) => row.padEnd(24, '.').slice(0, 24))
    .map((row) => row.replace(/Y/g, reactor))
    .map((row) => (tell ? row.replace(/[vV]/g, 'W') : row));
};

const gruntIdle: readonly [Grid, Grid] = [gruntFrame(false), gruntFrame(true)];
const swooperIdle: readonly [Grid, Grid] = [swooperFrame(false), swooperFrame(true)];
const tankIdle: readonly [Grid, Grid] = [tankFrame(false), tankFrame(true)];
const eliteIdle: readonly [Grid, Grid, Grid, Grid] = [
  eliteFrame(0),
  eliteFrame(1),
  eliteFrame(2),
  eliteFrame(3),
];

/** G5 enemy material families retain every established animation and gameplay contract. */
export const ENEMY_ART: SpriteArt = {
  enemy_grunt: {
    idle: gruntIdle,
    attack_tell: [
      recolour(gruntIdle[0], 0, 16, { W: 'Y', C: 'c' }),
      gruntIdle[0],
      recolour(gruntIdle[1], 0, 16, { W: 'Y', C: 'c' }),
    ],
    death: materialDebris(gruntIdle[0], 6, 0x101, ['B', 'b', 'C', 'Y']),
  },
  enemy_swooper: {
    idle: swooperIdle,
    attack_tell: [
      recolour(swooperIdle[0], 0, 16, { P: 'W', V: 'P' }),
      swooperIdle[0],
      recolour(swooperIdle[1], 0, 16, { P: 'W', V: 'P' }),
    ],
    death: materialDebris(swooperIdle[0], 6, 0x202, ['M', 'm', 'V', 'P']),
  },
  enemy_tank: {
    idle: tankIdle,
    attack_tell: [tankFrame(false, true), tankIdle[0], tankFrame(true, true)],
    death: materialDebris(tankIdle[0], 6, 0x303, ['O', 'o', 'M', 'Y']),
  },
  enemy_elite: {
    idle: eliteIdle,
    attack_tell: [eliteFrame(0, true), eliteIdle[1], eliteFrame(2, true)],
    death: materialDebris(eliteIdle[0], 8, 0x404, ['V', 'v', 'M', 'P']),
  },
};
