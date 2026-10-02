import { describe, expect, it } from 'vitest';
import {
  ContentError,
  loadContent,
  validateContent,
  type RawContentFiles,
} from '../../src/content/index.ts';
import { readContentFiles } from '../../tools/lib/repo.ts';

function sprite(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    key: 'enemy_test',
    role: 'enemy',
    size: { w: 16, h: 16 },
    anchor: { x: 0.5, y: 0.5 },
    clips: {
      idle: { frames: 2, fps: 8, repeat: -1 },
      death: { frames: 6, fps: 12, repeat: 0 },
    },
    ...overrides,
  };
}

const real = readContentFiles();

/** Real content plus one extra test animations file. */
function files(...sprites: Record<string, unknown>[]): RawContentFiles {
  return { ...real, 'animations/test.json': { sprites } };
}

function issuesOf(input: RawContentFiles): string[] {
  const result = validateContent(input);
  return result.ok ? [] : result.issues.map((issue) => `${issue.file}: ${issue.message}`);
}

describe('content loader', () => {
  it('validates the real content/ directory', () => {
    const content = loadContent(readContentFiles());
    expect(content.sprites['player_ship']?.size).toEqual({ w: 16, h: 16 });
  });

  it('returns deeply frozen content', () => {
    const content = loadContent(files(sprite()));
    const grunt = content.sprites['enemy_test'];
    expect(Object.isFrozen(content)).toBe(true);
    expect(Object.isFrozen(grunt?.clips['idle'])).toBe(true);
  });

  it('rejects a file that breaks its schema, naming file and path', () => {
    const issues = issuesOf(files(sprite({ size: { w: 0, h: 16 } })));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/^animations\/test\.json: sprites\.0\.size\.w:/);
  });

  it('rejects unknown properties (catches typos in data)', () => {
    expect(issuesOf(files(sprite({ anchr: { x: 0, y: 0 } })))).not.toHaveLength(0);
  });

  it('enforces the <category>_<name> key convention', () => {
    expect(issuesOf(files(sprite({ key: 'PlayerShip' })))).not.toHaveLength(0);
    expect(issuesOf(files(sprite({ key: 'ship' })))).not.toHaveLength(0);
  });

  it('requires idle and death clips on entities but not on fx', () => {
    const noDeath = sprite({ clips: { idle: { frames: 2, fps: 8, repeat: -1 } } });
    expect(issuesOf(files(noDeath)).join()).toMatch(/requires a "death" clip/);
    const fx = sprite({
      key: 'fx_spark',
      role: 'fx',
      clips: { play: { frames: 3, fps: 12, repeat: 0 } },
    });
    expect(issuesOf(files(fx))).toEqual([]);
  });

  it('rejects duplicate sprite keys across files', () => {
    const input = {
      ...real,
      'animations/a.json': { sprites: [sprite({ key: 'enemy_dup' })] },
      'animations/b.json': { sprites: [sprite({ key: 'enemy_dup' })] },
    };
    expect(issuesOf(input).join()).toMatch(/duplicate sprite key "enemy_dup"/);
  });

  it('rejects a wave that refers to a missing enemy', () => {
    const bad = structuredClone(real) as Record<string, unknown>;
    bad['waves/stage-1.json'] = {
      waves: [
        {
          key: 'opening',
          formation: { columns: 1, spacingX: 20, spacingY: 20, y: 80, sway: 0, swayTicks: 60 },
          entries: [
            {
              enemy: 'ghost',
              count: 1,
              path: [
                { x: 0, y: 0 },
                { x: 0, y: 0 },
                { x: 0, y: 0 },
                { x: 0, y: 0 },
              ],
              delayTicks: 0,
            },
          ],
          dive: { minIntervalTicks: 60, maxIntervalTicks: 120, durationTicks: 60 },
        },
      ],
    };
    expect(issuesOf(bad)).toContain(
      'waves/opening.json: entries.enemy: enemy "ghost" is not defined',
    );
  });

  it('rejects invalid presentation environment data', () => {
    const bad = structuredClone(real) as Record<string, unknown>;
    const environments = bad['environments/stages.json'] as {
      environments: Record<string, unknown>[];
    };
    environments.environments[0] = {
      ...environments.environments[0],
      layers: { distantStars: 999 },
    };
    expect(issuesOf(bad).join()).toMatch(/environments\/stages\.json: environments\.0\.layers/);
  });

  it('rejects files with no registered schema', () => {
    expect(issuesOf({ 'mystery/thing.json': {} }).join()).toMatch(/no schema is registered/);
  });

  it('loadContent throws a ContentError listing every issue', () => {
    const bad = files(sprite({ key: 'x' }), sprite({ fps: 'fast' }));
    expect(() => loadContent(bad)).toThrow(ContentError);
    try {
      loadContent(bad);
    } catch (error) {
      expect((error as ContentError).issues.length).toBeGreaterThanOrEqual(2);
    }
  });
});
