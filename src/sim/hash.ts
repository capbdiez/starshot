const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

const floatView = new Float64Array(1);
const wordView = new Uint32Array(floatView.buffer);

/** Appends the exact IEEE-754 bits of `value` to `words` as two uint32 words. */
export function pushFloat(words: number[], value: number): void {
  floatView[0] = value;
  words.push(wordView[0] ?? 0, wordView[1] ?? 0);
}

/** FNV-1a (32-bit) over a sequence of uint32 words, byte by byte. Returns 8 lowercase hex digits. */
export function fnv1a32(words: readonly number[]): string {
  let hash = FNV_OFFSET;
  for (const word of words) {
    const value = word >>> 0;
    for (let shift = 0; shift < 32; shift += 8) {
      hash ^= (value >>> shift) & 0xff;
      hash = Math.imul(hash, FNV_PRIME);
    }
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
