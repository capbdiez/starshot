import type { z } from 'zod';
import { deepFreeze, type DeepReadonly } from '../shared/index.ts';
import { fxFileSchema, type FxEntry } from './schemas/fx.ts';
import {
  enemyFileSchema,
  patternFileSchema,
  type BulletPattern,
  type EnemySpec,
} from './schemas/enemies.ts';
import { gameplaySchema, type Gameplay } from './schemas/gameplay.ts';
import { spriteFileSchema, type SpriteSpec } from './schemas/sprites.ts';
import { stagesSchema, waveFileSchema, type StageSpec, type WaveSpec } from './schemas/waves.ts';

/** Parsed JSON files keyed by their path relative to `content/` (e.g. `animations/player.json`). */
export type RawContentFiles = Readonly<Record<string, unknown>>;

/** Fully validated, frozen game data. */
export type Content = DeepReadonly<{
  sprites: Record<string, SpriteSpec>;
  gameplay: Gameplay;
  enemies: Record<string, EnemySpec>;
  patterns: Record<string, BulletPattern>;
  waves: Record<string, WaveSpec>;
  stages: readonly StageSpec[];
  /** Sim event type → presentation reaction (merged from `fx/*.json`). */
  fx: Record<string, FxEntry>;
}>;

const GAMEPLAY_FILE = 'gameplay.json';

/** One problem found while validating content. */
export interface ContentIssue {
  readonly file: string;
  readonly message: string;
}

/** Result of {@link validateContent}. */
export type ContentValidationResult =
  | { readonly ok: true; readonly content: Content }
  | { readonly ok: false; readonly issues: readonly ContentIssue[] };

/** Thrown by {@link loadContent} when any content file is invalid. */
export class ContentError extends Error {
  readonly issues: readonly ContentIssue[];

  constructor(issues: readonly ContentIssue[]) {
    super(
      `Invalid content (${String(issues.length)} issue(s)):\n` +
        issues.map((issue) => `  ${issue.file}: ${issue.message}`).join('\n'),
    );
    this.name = 'ContentError';
    this.issues = issues;
  }
}

interface MutableContent {
  sprites: Record<string, SpriteSpec>;
  fx: Record<string, FxEntry>;
  gameplay?: Gameplay;
  enemies: Record<string, EnemySpec>;
  patterns: Record<string, BulletPattern>;
  waves: Record<string, WaveSpec>;
  stages?: readonly StageSpec[];
}

interface ContentKind {
  readonly pattern: RegExp;
  readonly apply: (data: unknown, file: string, into: MutableContent) => ContentIssue[];
}

function schemaIssues(file: string, error: z.ZodError): ContentIssue[] {
  return error.issues.map((issue) => ({
    file,
    message: `${issue.path.length > 0 ? issue.path.join('.') : '(root)'}: ${issue.message}`,
  }));
}

/** Every content file must match exactly one registered kind; unknown files are errors. */
const CONTENT_KINDS: readonly ContentKind[] = [
  {
    pattern: /^animations\/[a-z0-9-]+\.json$/,
    apply: (data, file, into) => {
      const parsed = spriteFileSchema.safeParse(data);
      if (!parsed.success) {
        return schemaIssues(file, parsed.error);
      }
      const issues: ContentIssue[] = [];
      for (const sprite of parsed.data.sprites) {
        if (sprite.key in into.sprites) {
          issues.push({ file, message: `duplicate sprite key "${sprite.key}"` });
        } else {
          into.sprites[sprite.key] = sprite;
        }
      }
      return issues;
    },
  },
  {
    pattern: /^gameplay\.json$/,
    apply: (data, file, into) => {
      const parsed = gameplaySchema.safeParse(data);
      if (!parsed.success) {
        return schemaIssues(file, parsed.error);
      }
      into.gameplay = parsed.data;
      return [];
    },
  },
  {
    pattern: /^enemies\.json$/,
    apply: (data, file, into) => {
      const parsed = enemyFileSchema.safeParse(data);
      if (!parsed.success) return schemaIssues(file, parsed.error);
      for (const enemy of parsed.data.enemies) into.enemies[enemy.key] = enemy;
      return [];
    },
  },
  {
    pattern: /^patterns\.json$/,
    apply: (data, file, into) => {
      const parsed = patternFileSchema.safeParse(data);
      if (!parsed.success) return schemaIssues(file, parsed.error);
      Object.assign(into.patterns, parsed.data.patterns);
      return [];
    },
  },
  {
    pattern: /^waves\/[a-z0-9-]+\.json$/,
    apply: (data, file, into) => {
      const parsed = waveFileSchema.safeParse(data);
      if (!parsed.success) return schemaIssues(file, parsed.error);
      for (const wave of parsed.data.waves) into.waves[wave.key] = wave;
      return [];
    },
  },
  {
    pattern: /^stages\.json$/,
    apply: (data, file, into) => {
      const parsed = stagesSchema.safeParse(data);
      if (!parsed.success) return schemaIssues(file, parsed.error);
      into.stages = parsed.data.stages;
      return [];
    },
  },
  {
    pattern: /^fx\/[a-z0-9-]+\.json$/,
    apply: (data, file, into) => {
      const parsed = fxFileSchema.safeParse(data);
      if (!parsed.success) {
        return schemaIssues(file, parsed.error);
      }
      const issues: ContentIssue[] = [];
      for (const [event, entry] of Object.entries(parsed.data.events)) {
        if (event in into.fx) {
          issues.push({ file, message: `duplicate fx entry for event "${event}"` });
        } else {
          into.fx[event] = entry;
        }
      }
      return issues;
    },
  },
];

/** Cross-file rule: every sprite referenced by gameplay rules is defined in `animations/`. */
function gameplaySpriteIssues(gameplay: Gameplay, sprites: Record<string, SpriteSpec>) {
  const refs = {
    'player.sprite': gameplay.player.sprite,
    'playerShot.sprite': gameplay.playerShot.sprite,
    'grunt.sprite': gameplay.grunt.sprite,
    'enemyBullet.sprite': gameplay.enemyBullet.sprite,
    'pickups.sprite': gameplay.pickups.sprite,
  };
  return Object.entries(refs)
    .filter(([, key]) => !(key in sprites))
    .map(([path, key]) => ({
      file: GAMEPLAY_FILE,
      message: `${path}: sprite "${key}" is not defined in content/animations`,
    }));
}

/** Validates raw content files against their schemas and cross-file rules without throwing. */
export function validateContent(files: RawContentFiles): ContentValidationResult {
  const into: MutableContent = { sprites: {}, fx: {}, enemies: {}, patterns: {}, waves: {} };
  const issues: ContentIssue[] = [];

  for (const file of Object.keys(files).sort()) {
    const kind = CONTENT_KINDS.find((candidate) => candidate.pattern.test(file));
    if (!kind) {
      issues.push({ file, message: 'no schema is registered for this content path' });
      continue;
    }
    issues.push(...kind.apply(files[file], file, into));
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  const { gameplay, sprites, fx, enemies, patterns, waves, stages } = into;
  if (
    !gameplay ||
    !stages ||
    Object.keys(enemies).length === 0 ||
    Object.keys(patterns).length === 0
  ) {
    const missing = !gameplay
      ? GAMEPLAY_FILE
      : !stages
        ? 'stages.json'
        : Object.keys(enemies).length === 0
          ? 'enemies.json'
          : 'patterns.json';
    return { ok: false, issues: [{ file: missing, message: 'required file is missing' }] };
  }
  const refIssues = gameplaySpriteIssues(gameplay, sprites);
  for (const enemy of Object.values(enemies)) {
    if (!(enemy.sprite in sprites))
      refIssues.push({
        file: 'enemies.json',
        message: `${enemy.key}.sprite: sprite "${enemy.sprite}" is not defined in content/animations`,
      });
    if (!(enemy.pattern in patterns))
      refIssues.push({
        file: 'enemies.json',
        message: `${enemy.key}.pattern: pattern "${enemy.pattern}" is not defined`,
      });
  }
  for (const stage of stages) {
    if (!(stage.wave in waves))
      refIssues.push({
        file: 'stages.json',
        message: `${stage.key}.wave: wave "${stage.wave}" is not defined`,
      });
  }
  for (const wave of Object.values(waves))
    for (const entry of wave.entries) {
      if (!(entry.enemy in enemies))
        refIssues.push({
          file: `waves/${wave.key}.json`,
          message: `entries.enemy: enemy "${entry.enemy}" is not defined`,
        });
    }
  if (refIssues.length > 0) return { ok: false, issues: refIssues };
  return {
    ok: true,
    content: deepFreeze({ sprites, gameplay, enemies, patterns, waves, stages, fx }),
  };
}

/** Validates and returns frozen, typed content; throws {@link ContentError} listing every issue. */
export function loadContent(files: RawContentFiles): Content {
  const result = validateContent(files);
  if (!result.ok) {
    throw new ContentError(result.issues);
  }
  return result.content;
}
