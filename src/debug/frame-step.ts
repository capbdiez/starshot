/** Subset of the scene's debug hooks this view needs (structural; keeps debug decoupled). */
export interface FrameStepTarget {
  stepOnce(): void;
  setPaused(paused: boolean): void;
  readonly sim: { snapshot(): { readonly tick: number } };
}

/**
 * Dev-only frame-step view (M1 latency check, NFR-02). `P` toggles pause, `.` runs one tick.
 * While paused, hold a direction/fire key and press `.`: the ship must move on that same step,
 * i.e. input reaches the screen within one tick + one render (≤ 2 frames).
 * Also exposed as `window.__starshotDebug` for automated tests.
 */
export function attachFrameStep(win: Window, target: FrameStepTarget): void {
  let paused = false;
  const label = win.document.createElement('div');
  label.style.cssText =
    'position:fixed;left:4px;top:4px;font:12px monospace;color:#3ee0ff;pointer-events:none';
  win.document.body.append(label);
  const refresh = (): void => {
    label.textContent = paused
      ? `PAUSED tick ${String(target.sim.snapshot().tick)} — [.] step  [P] resume`
      : '';
  };
  const setPaused = (value: boolean): void => {
    paused = value;
    target.setPaused(value);
    refresh();
  };
  const step = (): void => {
    target.stepOnce();
    refresh();
  };
  win.addEventListener('keydown', (event) => {
    if (event.code === 'KeyP') setPaused(!paused);
    if (event.code === 'Period' && paused) step();
  });
  Object.assign(win, { __starshotDebug: { setPaused, step } });
}
