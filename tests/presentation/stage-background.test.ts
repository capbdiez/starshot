import { describe, expect, it } from 'vitest';
import type { StageEnvironment } from '../../src/content/index.ts';
import { environmentForLevel } from '../../src/presentation/background/stage-background.ts';
import { createBackgroundLayout } from '../../src/presentation/background/layout.ts';
import { hudProgressText } from '../../src/presentation/presenter.ts';

const environments: readonly StageEnvironment[] = [
  ...(['indigo', 'violet', 'teal', 'amber', 'crimson'] as const).map((paletteRole, index) => ({
    stage: index + 1,
    theme: `${paletteRole}-test`,
    seed: index + 1,
    paletteRole,
    layers: { nebulae: 0, distantStars: 0, largeObjects: 0, foreground: 0 },
    motion: { distantStars: 0, largeObjects: 0, foreground: 0 },
  })),
];

const environment: StageEnvironment = {
  stage: 1,
  theme: 'indigo-reach',
  seed: 103211,
  paletteRole: 'indigo',
  layers: { nebulae: 2, distantStars: 96, largeObjects: 1, foreground: 8 },
  motion: { distantStars: 4, largeObjects: 7, foreground: 12 },
};

describe('P3.7 endless presentation', () => {
  it('formats absolute level and difficulty with a clear boss indicator', () => {
    expect(hudProgressText(123, 47, false)).toBe('LV 123 D47');
    expect(hudProgressText(130, 52, true)).toBe('BOSS LV 130 D52');
  });

  it('cycles normal environments indefinitely and uses the boss environment every tenth level', () => {
    expect(
      [1, 2, 3, 4, 5, 6, 9, 10, 11, 19, 20, 21].map(
        (level) => environmentForLevel(environments, level)?.stage,
      ),
    ).toEqual([1, 2, 3, 4, 1, 2, 1, 5, 2, 2, 5, 3]);
  });

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
