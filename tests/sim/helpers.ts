import { loadContent, type Content } from '../../src/content/index.ts';
import { InputBit } from '../../src/shared/index.ts';
import type { Sim, SimEvent } from '../../src/sim/index.ts';
import { readContentFiles } from '../../tools/lib/repo.ts';

export const L = InputBit.left;
export const R = InputBit.right;
export const F = InputBit.fire;

const files = readContentFiles();

/** Real content, optionally with `gameplay.json` deep-patched (values re-validated). */
export function contentWith(patch: (g: Record<string, Record<string, unknown>>) => void): Content {
  const gameplay = structuredClone(files['gameplay.json']) as Record<
    string,
    Record<string, unknown>
  >;
  patch(gameplay);
  return loadContent({ ...files, 'gameplay.json': gameplay });
}

export const realContent = loadContent(files);

/** Content where enemies never shoot within a test (huge fire interval). */
export const peaceful = contentWith((g) => {
  g['enemyFire'] = { minIntervalTicks: 36_000, maxIntervalTicks: 36_000, aimChance: 0 };
});

/** Steps `n` times with `input`, collecting every event. */
export function run(sim: Sim, n: number, input = 0): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < n; i += 1) {
    sim.step(input);
    events.push(...sim.drainEvents());
  }
  return events;
}

export function ofType<T extends SimEvent['type']>(events: readonly SimEvent[], type: T) {
  return events.filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);
}
