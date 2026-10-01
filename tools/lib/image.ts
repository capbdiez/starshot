import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

/** Straight (non-premultiplied) RGBA8 image. */
export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

/** Axis-aligned pixel rectangle. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Creates a fully transparent image. */
export function createImage(width: number, height: number): RgbaImage {
  return { width, height, data: new Uint8Array(width * height * 4) };
}

/** Sets one opaque pixel to `rgb` (0xRRGGBB); out-of-bounds writes are ignored. */
export function setPixel(image: RgbaImage, x: number, y: number, rgb: number): void {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
    return;
  }
  const i = (y * image.width + x) * 4;
  image.data[i] = (rgb >> 16) & 0xff;
  image.data[i + 1] = (rgb >> 8) & 0xff;
  image.data[i + 2] = rgb & 0xff;
  image.data[i + 3] = 0xff;
}

/** Copies `rect` of `src` into `dst` at (`dx`, `dy`). */
export function blit(src: RgbaImage, rect: Rect, dst: RgbaImage, dx: number, dy: number): void {
  for (let row = 0; row < rect.h; row += 1) {
    const from = ((rect.y + row) * src.width + rect.x) * 4;
    const to = ((dy + row) * dst.width + dx) * 4;
    dst.data.set(src.data.subarray(from, from + rect.w * 4), to);
  }
}

/** Reads a PNG file as RGBA8. */
export function readPng(path: string): RgbaImage {
  const png = PNG.sync.read(readFileSync(path));
  return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
}

/** Writes an RGBA8 image as a PNG file (deterministic output for the same pixels). */
export function writePng(path: string, image: RgbaImage): void {
  const png = new PNG({ width: image.width, height: image.height });
  png.data = Buffer.from(image.data);
  writeFileSync(path, PNG.sync.write(png, { colorType: 6 }));
}
