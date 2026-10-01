import { describe, expect, it } from 'vitest';
import type { StageEnvironment } from '../../src/content/index.ts';
import { createBackgroundLayout } from '../../src/presentation/background/layout.ts';

const environment: StageEnvironment = {
  stage: 1,
  theme: 'indigo-reach',
  seed: 103211,
  paletteRole: 'indigo',
  layers: { nebulae: 2, distantStars: 96, largeObjects: 1, foreground: 8 },
  motion: { distantStars: 4, largeObjects: 7, foreground: 12 },
};

describe('G6 stage background layout', () => {
  it('is identical for the same stage and run seed', () => {
    expect(createBackgroundLayout(environment, 42)).toEqual(
      createBackgroundLayout(environment, 42),
    );
  });

  it('changes the layout when the run seed changes while retaining bounded layer counts', () => {
    const layout = createBackgroundLayout(environment, 42);
    expect(layout).not.toEqual(createBackgroundLayout(environment, 43));
    expect(layout.nebulae).toHaveLength(environment.layers.nebulae);
    expect(layout.distantStars).toHaveLength(environment.layers.distantStars);
    expect(layout.largeObjects).toHaveLength(environment.layers.largeObjects);
    expect(layout.foreground).toHaveLength(environment.layers.foreground);
  });
});
