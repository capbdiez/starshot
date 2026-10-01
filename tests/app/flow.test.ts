import { describe, expect, it } from 'vitest';
import { transitionFlow } from '../../src/app/flow.ts';

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
});
