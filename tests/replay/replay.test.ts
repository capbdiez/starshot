import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createSim } from '../../src/sim/index.ts';
import { realContent } from '../sim/helpers.ts';

interface Fixture {
  readonly seed: number;
  /** Run-length encoded input: [inputFrame, ticks] pairs. */
  readonly inputs: readonly (readonly [number, number])[];
  readonly expected: {
    readonly hash: string;
    readonly tick: number;
    readonly lives: number;
    readonly level: number;
    readonly kills: number;
    readonly gameOvers: number;
  };
  /** Why the expected values last changed (AGENTS §5). */
  readonly reason: string;
}

const fixture = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures', 'm1-core-loop.json'), 'utf8'),
) as Fixture;

function play() {
  const sim = createSim(realContent, fixture.seed);
  let kills = 0;
  let gameOvers = 0;
  for (const [input, ticks] of fixture.inputs) {
    for (let i = 0; i < ticks; i += 1) {
      sim.step(input);
      for (const event of sim.drainEvents()) {
        if (event.type === 'EnemyKilled') kills += 1;
        if (event.type === 'GameOver') gameOvers += 1;
      }
    }
  }
  const view = sim.snapshot();
  return {
    hash: sim.hash(),
    tick: view.tick,
    lives: view.lives,
    level: view.level,
    kills,
    gameOvers,
  };
}

describe('golden replay (M1 core loop)', () => {
  it('matches the recorded fixture', () => {
    expect(play()).toEqual(fixture.expected);
  });

  it('gives the same hash when run twice', () => {
    expect(play().hash).toBe(play().hash);
  });
});
