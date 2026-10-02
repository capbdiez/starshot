/** Visible browser area in CSS pixels plus the device pixel ratio. */
export interface ViewportSize {
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
}

/** Browser visual-viewport surface used by the mobile viewport adapter. */
export interface VisualViewportPort {
  readonly width: number;
  readonly height: number;
  addEventListener(type: 'resize' | 'scroll', listener: () => void): void;
  removeEventListener(type: 'resize' | 'scroll', listener: () => void): void;
}

/** Media-query listener used to observe device-pixel-ratio changes. */
export interface MediaQueryPort {
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

/** Minimal browser window surface required for viewport measurement and observation. */
export interface ViewportWindow {
  readonly innerWidth: number;
  readonly innerHeight: number;
  readonly devicePixelRatio: number;
  readonly visualViewport?: VisualViewportPort | null;
  addEventListener(type: 'resize' | 'orientationchange', listener: () => void): void;
  removeEventListener(type: 'resize' | 'orientationchange', listener: () => void): void;
  matchMedia(query: string): MediaQueryPort;
}

function validSize(width: number, height: number): boolean {
  return width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height);
}

function pixelRatio(win: ViewportWindow): number {
  return win.devicePixelRatio > 0 && Number.isFinite(win.devicePixelRatio)
    ? win.devicePixelRatio
    : 1;
}

/** Reads the visible visual viewport when available, otherwise the layout viewport. */
export function readViewport(win: ViewportWindow): ViewportSize {
  const visual = win.visualViewport;
  const useVisual =
    visual !== undefined && visual !== null && validSize(visual.width, visual.height);
  return {
    width: useVisual ? visual.width : win.innerWidth,
    height: useVisual ? visual.height : win.innerHeight,
    pixelRatio: pixelRatio(win),
  };
}

/**
 * Calls `onChange` now and when visual/layout viewport size, orientation, browser chrome, or device
 * pixel ratio changes. Returns a function that removes every listener.
 */
export function watchViewport(
  win: ViewportWindow,
  onChange: (size: ViewportSize) => void,
): () => void {
  const visual = win.visualViewport;
  let media: MediaQueryPort | undefined;

  const rebindPixelRatio = (): void => {
    if (media) media.removeEventListener('change', notify);
    media = win.matchMedia(`(resolution: ${String(pixelRatio(win))}dppx)`);
    media.addEventListener('change', notify);
  };
  function notify(): void {
    rebindPixelRatio();
    onChange(readViewport(win));
  }

  win.addEventListener('resize', notify);
  win.addEventListener('orientationchange', notify);
  visual?.addEventListener('resize', notify);
  visual?.addEventListener('scroll', notify);
  notify();

  return () => {
    win.removeEventListener('resize', notify);
    win.removeEventListener('orientationchange', notify);
    visual?.removeEventListener('resize', notify);
    visual?.removeEventListener('scroll', notify);
    media?.removeEventListener('change', notify);
  };
}
