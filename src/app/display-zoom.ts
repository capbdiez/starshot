import { integerScale } from '../shared/index.ts';

/** Viewport data needed to choose a zoom (matches `platform` ViewportSize). */
export interface ZoomViewport {
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
}

/**
 * CSS zoom for a `gameWidth`×`gameHeight` canvas so that each game pixel covers a whole number
 * of *device* pixels (crisp nearest-neighbour scaling even at fractional devicePixelRatio).
 * The remaining space is letterboxed by the page layout.
 */
export function displayZoom(viewport: ZoomViewport, gameWidth: number, gameHeight: number): number {
  const ratio = viewport.pixelRatio > 0 ? viewport.pixelRatio : 1;
  const deviceScale = integerScale(
    viewport.width * ratio,
    viewport.height * ratio,
    gameWidth,
    gameHeight,
  );
  return deviceScale / ratio;
}
