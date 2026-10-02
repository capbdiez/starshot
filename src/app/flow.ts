import type { SimEvent } from '../sim/index.ts';

/** Screens in the M5 application flow. */
export type FlowState = 'title' | 'play' | 'pause' | 'results' | 'settings';

/** Commands emitted by UI and platform adapters. */
export type FlowCommand = 'start' | 'pause' | 'resume' | 'results' | 'title' | 'settings' | 'back';

/** Returns the sole simulation event that may transition an active run to Results. */
export function resultsCommandFor(events: readonly SimEvent[]): 'results' | undefined {
  return events.some((event) => event.type === 'GameOver') ? 'results' : undefined;
}

/** Returns the loop to play when a boss encounter begins or ends. */
export function musicTransitionFor(events: readonly SimEvent[]): 'boss' | 'stage' | undefined {
  if (events.some((event) => event.type === 'BossDefeated')) return 'stage';
  return events.some((event) => event.type === 'BossStarted') ? 'boss' : undefined;
}

/** Resolves one scene-flow command without touching Phaser or the simulation. */
export function transitionFlow(state: FlowState, command: FlowCommand): FlowState {
  switch (command) {
    case 'start':
      return state === 'title' || state === 'results' ? 'play' : state;
    case 'pause':
      return state === 'play' ? 'pause' : state;
    case 'resume':
      return state === 'pause' ? 'play' : state;
    case 'results':
      return state === 'play' ? 'results' : state;
    case 'title':
      return 'title';
    case 'settings':
      return state === 'title' || state === 'pause' ? 'settings' : state;
    case 'back':
      return state === 'settings' ? 'title' : state;
  }
}
