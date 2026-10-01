/**
 * Discriminated union of everything the simulation reports to presentation
 * (ARCHITECTURE §4 event catalogue). Positions are in game pixels; ids are entity ids.
 */
export type SimEvent =
  | { readonly type: 'PlayerFired'; readonly id: number; readonly x: number; readonly y: number }
  | { readonly type: 'EnemyFired'; readonly id: number; readonly x: number; readonly y: number }
  | {
      readonly type: 'EnemyAttackTold';
      readonly id: number;
      readonly x: number;
      readonly y: number;
    }
  | { readonly type: 'EnemyHit'; readonly id: number; readonly x: number; readonly y: number }
  | {
      readonly type: 'EnemyKilled';
      readonly id: number;
      readonly kind: string;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly type: 'PlayerHit';
      readonly x: number;
      readonly y: number;
      readonly livesLeft: number;
    }
  | { readonly type: 'PlayerRespawned'; readonly x: number; readonly y: number }
  | { readonly type: 'WaveStarted'; readonly wave: number }
  | { readonly type: 'GameOver'; readonly wave: number }
  | { readonly type: 'GameRestarted' };

/** Every event kind, e.g. for exhaustive event → effect maps. */
export type SimEventType = SimEvent['type'];
