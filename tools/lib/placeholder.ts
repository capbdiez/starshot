import type { SpriteRole } from '../../src/content/index.ts';
import { createImage, setPixel, type RgbaImage } from './image.ts';

/** Fill / detail colours per role. Every value must be in `assets/palette/starshot.hex`. */
export const ROLE_COLOURS: Readonly<Record<SpriteRole, { fill: number; detail: number }>> = {
  player: { fill: 0x3ee0ff, detail: 0x0b0b1a },
  player_shot: { fill: 0xa6f6ff, detail: 0x0b0b1a },
  enemy: { fill: 0xb8237a, detail: 0xffffff },
  enemy_bullet: { fill: 0xff3fa4, detail: 0xffffff },
  pickup: { fill: 0x6fcf2e, detail: 0x0b0b1a },
  fx: { fill: 0xff9433, detail: 0x0b0b1a },
  ui: { fill: 0xffffff, detail: 0x0b0b1a },
};

/** 3×5 bitmap digits, one row per string, `#` = pixel. */
const DIGITS: readonly (readonly string[])[] = [
  ['###', '#.#', '#.#', '#.#', '###'],
  ['.#.', '##.', '.#.', '.#.', '###'],
  ['###', '..#', '###', '#..', '###'],
  ['###', '..#', '.##', '..#', '###'],
  ['#.#', '#.#', '###', '..#', '..#'],
  ['###', '#..', '###', '..#', '###'],
  ['###', '#..', '###', '#.#', '###'],
  ['###', '..#', '.#.', '.#.', '.#.'],
  ['###', '#.#', '###', '#.#', '###'],
  ['###', '#.#', '###', '..#', '###'],
];

/**
 * Whether (x, y) lies inside the role's silhouette on a w×h canvas. The silhouette follows the
 * ART_DIRECTION §3 shape language: ship points up, enemies point down, bullets are round.
 */
function insideShape(role: SpriteRole, x: number, y: number, w: number, h: number): boolean {
  const u = (x + 0.5) / w;
  const v = (y + 0.5) / h;
  switch (role) {
    case 'player':
      return Math.abs(u - 0.5) <= v / 2;
    case 'enemy':
      return Math.abs(u - 0.5) <= (1 - v) / 2;
    case 'enemy_bullet':
    case 'fx':
      return (u - 0.5) ** 2 + (v - 0.5) ** 2 <= 0.25;
    case 'pickup':
      return Math.abs(u - 0.5) + Math.abs(v - 0.5) <= 0.5;
    case 'player_shot':
    case 'ui':
      return true;
  }
}

function drawNumber(image: RgbaImage, value: number, colour: number): void {
  const text = String(value);
  const textWidth = text.length * 4 - 1;
  if (textWidth > image.width || 5 > image.height) {
    return;
  }
  const left = Math.floor((image.width - textWidth) / 2);
  const top = Math.floor((image.height - 5) / 2);
  for (let index = 0; index < text.length; index += 1) {
    const glyph = DIGITS[Number(text.charAt(index))] ?? [];
    glyph.forEach((row, gy) => {
      for (let gx = 0; gx < row.length; gx += 1) {
        if (row.charAt(gx) === '#') {
          setPixel(image, left + index * 4 + gx, top + gy, colour);
        }
      }
    });
  }
}

/**
 * Generates one greybox frame: the role silhouette in its role colour, with the frame index
 * drawn on top so animation playback is visible (ART_DIRECTION §9 placeholder policy).
 */
export function placeholderFrame(
  role: SpriteRole,
  w: number,
  h: number,
  frameIndex: number,
): RgbaImage {
  const image = createImage(w, h);
  const colours = ROLE_COLOURS[role];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (insideShape(role, x, y, w, h)) {
        setPixel(image, x, y, colours.fill);
      }
    }
  }
  drawNumber(image, frameIndex, colours.detail);
  return image;
}
