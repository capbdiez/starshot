import { integerScale } from '../shared/index.ts';

/** Viewport data needed to choose a zoom (matches `platform` ViewportSize). */
export interface ZoomViewport {
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
}

/**
 * CSS zoom for a `gameWidth`×`gameHeight` canvas. When at least 1× fits, each presentation
 * pixel covers a whole number of device pixels for crisp nearest-neighbour scaling. Smaller
 * viewports use the largest centered fractional fallback that shows the complete canvas.
 */
export function displayZoom(viewport: ZoomViewport, gameWidth: number, gameHeight: number): number {
  const ratio = viewport.pixelRatio > 0 ? viewport.pixelRatio : 1;
  const availableWidth = viewport.width * ratio;
  const availableHeight = viewport.height * ratio;
  const fit = Math.min(availableWidth / gameWidth, availableHeight / gameHeight);
  if (!(fit > 0)) return 1;
  const deviceScale =
    fit >= 1 ? integerScale(availableWidth, availableHeight, gameWidth, gameHeight) : fit;
  return deviceScale / ratio;
}
