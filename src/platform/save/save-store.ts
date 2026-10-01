import { z } from 'zod';

/** Persisted audio and accessibility preferences. */
export const settingsSchema = z.object({
  music: z.number().min(0).max(1),
  sfx: z.number().min(0).max(1),
  ui: z.number().min(0).max(1),
  shake: z.number().min(0).max(1),
  flashReduction: z.boolean(),
  crt: z.boolean(),
});

export type Settings = z.infer<typeof settingsSchema>;

/** One local high-score entry. */
export const highScoreSchema = z.object({
  score: z.int().nonnegative(),
  stage: z.int().positive(),
});
export type HighScore = z.infer<typeof highScoreSchema>;

const saveSchema = z.object({
  version: z.literal(1),
  settings: settingsSchema,
  scores: z.array(highScoreSchema),
});
type Save = z.infer<typeof saveSchema>;

const legacySaveSchema = z.object({
  version: z.literal(0),
  settings: settingsSchema.partial().optional(),
  scores: z.array(highScoreSchema).optional(),
});

const DEFAULT_SETTINGS: Settings = {
  music: 0.7,
  sfx: 0.8,
  ui: 0.8,
  shake: 1,
  flashReduction: false,
  crt: false,
};

/** Browser storage surface, kept small so save behavior is testable without a DOM. */
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Versioned local save data. Invalid or inaccessible data safely becomes defaults. */
export interface SaveStore {
  load(): Readonly<Save>;
  settings(): Readonly<Settings>;
  updateSettings(settings: Partial<Settings>): Readonly<Settings>;
  scores(): readonly HighScore[];
  recordScore(score: HighScore): readonly HighScore[];
}

function defaults(): Save {
  return { version: 1, settings: { ...DEFAULT_SETTINGS }, scores: [] };
}

function migrate(value: unknown): Save | undefined {
  const current = saveSchema.safeParse(value);
  if (current.success) return { ...current.data, scores: current.data.scores.slice(0, 10) };
  const legacy = legacySaveSchema.safeParse(value);
  if (!legacy.success) return undefined;
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS, ...legacy.data.settings },
    scores: (legacy.data.scores ?? []).slice(0, 10),
  };
}

/** Creates a schema-validated save store under `starshot.save`; malformed JSON never throws. */
export function createSaveStore(storage: StoragePort, key = 'starshot.save'): SaveStore {
  let state = defaults();
  try {
    const raw = storage.getItem(key);
    if (raw !== null) state = migrate(JSON.parse(raw)) ?? defaults();
  } catch {
    state = defaults();
  }

  const persist = (): void => {
    try {
      storage.setItem(key, JSON.stringify(state));
    } catch {
      // Storage may be unavailable (private browsing or quota); the in-memory save remains usable.
    }
  };

  return {
    load: () => state,
    settings: () => state.settings,
    updateSettings: (settings) => {
      state = { ...state, settings: settingsSchema.parse({ ...state.settings, ...settings }) };
      persist();
      return state.settings;
    },
    scores: () => state.scores,
    recordScore: (score) => {
      const parsed = highScoreSchema.parse(score);
      state = {
        ...state,
        scores: [...state.scores, parsed]
          .sort((a, b) => b.score - a.score || b.stage - a.stage)
          .slice(0, 10),
      };
      persist();
      return state.scores;
    },
  };
}
