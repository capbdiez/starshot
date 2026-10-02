import { describe, expect, it } from 'vitest';
import { musicTransitionFor, resultsCommandFor, transitionFlow } from '../../src/app/flow.ts';
import type { SimEvent } from '../../src/sim/index.ts';

describe('M5 scene flow', () => {
  it('follows title → play ⇄ pause → results → title/play', () => {
    expect(transitionFlow('title', 'start')).toBe('play');
    expect(transitionFlow('play', 'pause')).toBe('pause');
    expect(transitionFlow('pause', 'resume')).toBe('play');
    expect(transitionFlow('play', 'results')).toBe('results');
    expect(transitionFlow('results', 'title')).toBe('title');
    expect(transitionFlow('results', 'start')).toBe('play');
  });

  it('ignores commands that are invalid for the current screen', () => {
    expect(transitionFlow('title', 'pause')).toBe('title');
    expect(transitionFlow('results', 'resume')).toBe('results');
  });

  it('keeps boss defeat in play, restores stage music, and reserves results for game over', () => {
    const bossDefeated: SimEvent[] = [
      { type: 'BossDefeated', level: 10, difficulty: 4, x: 135, y: 90 },
    ];
    const gameOver: SimEvent[] = [{ type: 'GameOver', level: 11 }];

    expect(resultsCommandFor(bossDefeated)).toBeUndefined();
    expect(transitionFlow('play', resultsCommandFor(bossDefeated) ?? 'resume')).toBe('play');
    expect(musicTransitionFor(bossDefeated)).toBe('stage');
    expect(resultsCommandFor(gameOver)).toBe('results');
  });
});
