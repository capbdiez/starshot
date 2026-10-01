/** Something to place in the atlas. */
export interface PackInput {
  readonly id: string;
  readonly w: number;
  readonly h: number;
}

/** Where a {@link PackInput} was placed. */
export interface Placement {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Result of {@link packShelves}; `width`/`height` are powers of two. */
export interface PackResult {
  readonly width: number;
  readonly height: number;
  readonly placements: readonly Placement[];
}

function nextPowerOfTwo(value: number): number {
  let result = 1;
  while (result < value) {
    result *= 2;
  }
  return result;
}

/**
 * Deterministic shelf packer: sorts by height (then id), fills rows left to right and leaves
 * `padding` transparent pixels between rects so neighbouring frames never bleed.
 */
export function packShelves(
  inputs: readonly PackInput[],
  maxWidth: number,
  padding: number,
): PackResult {
  const sorted = [...inputs].sort((a, b) => b.h - a.h || b.w - a.w || a.id.localeCompare(b.id));
  const placements: Placement[] = [];
  let x = padding;
  let y = padding;
  let shelfHeight = 0;
  let usedWidth = 0;

  for (const input of sorted) {
    if (input.w + padding * 2 > maxWidth) {
      throw new Error(`"${input.id}" (${String(input.w)} px) is wider than the atlas`);
    }
    if (x + input.w + padding > maxWidth) {
      x = padding;
      y += shelfHeight + padding;
      shelfHeight = 0;
    }
    placements.push({ id: input.id, x, y, w: input.w, h: input.h });
    x += input.w + padding;
    shelfHeight = Math.max(shelfHeight, input.h);
    usedWidth = Math.max(usedWidth, x);
  }

  return {
    width: nextPowerOfTwo(Math.max(usedWidth, 1)),
    height: nextPowerOfTwo(Math.max(y + shelfHeight + padding, 1)),
    placements,
  };
}
