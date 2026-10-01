/** Screens in the M5 application flow. */
export type FlowState = 'title' | 'play' | 'pause' | 'results' | 'settings';

/** Commands emitted by UI and platform adapters. */
export type FlowCommand = 'start' | 'pause' | 'resume' | 'results' | 'title' | 'settings' | 'back';

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
