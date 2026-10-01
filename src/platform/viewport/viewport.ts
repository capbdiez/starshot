/** Visible browser area in CSS pixels plus the device pixel ratio. */
export interface ViewportSize {
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
}

/** Reads the current viewport of `win`. */
export function readViewport(win: Window): ViewportSize {
  return {
    width: win.innerWidth,
    height: win.innerHeight,
    pixelRatio: win.devicePixelRatio > 0 ? win.devicePixelRatio : 1,
  };
}

/**
 * Calls `onChange` now and whenever the viewport size (or zoom / pixel ratio) changes.
 * Returns a function that removes the listener.
 */
export function watchViewport(win: Window, onChange: (size: ViewportSize) => void): () => void {
  const notify = (): void => {
    onChange(readViewport(win));
  };
  win.addEventListener('resize', notify);
  notify();
  return () => {
    win.removeEventListener('resize', notify);
  };
}
