import type { z } from 'zod';
import { deepFreeze, type DeepReadonly } from '../shared/index.ts';
import { spriteFileSchema, type SpriteSpec } from './schemas/sprites.ts';

/** Parsed JSON files keyed by their path relative to `content/` (e.g. `animations/player.json`). */
export type RawContentFiles = Readonly<Record<string, unknown>>;

/** Fully validated, frozen game data. */
export type Content = DeepReadonly<{
  sprites: Record<string, SpriteSpec>;
}>;

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
];

/** Validates raw content files against their schemas and cross-file rules without throwing. */
export function validateContent(files: RawContentFiles): ContentValidationResult {
  const into: MutableContent = { sprites: {} };
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
  return { ok: true, content: deepFreeze(into) };
}

/** Validates and returns frozen, typed content; throws {@link ContentError} listing every issue. */
export function loadContent(files: RawContentFiles): Content {
  const result = validateContent(files);
  if (!result.ok) {
    throw new ContentError(result.issues);
  }
  return result.content;
}
