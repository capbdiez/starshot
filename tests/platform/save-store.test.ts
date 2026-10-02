import { describe, expect, it } from 'vitest';
import { createSaveStore, type StoragePort } from '../../src/platform/index.ts';

function memory(initial?: string): StoragePort & { value: string | null } {
  return {
    value: initial ?? null,
    getItem() {
      return this.value;
    },
    setItem(_key, value) {
      this.value = value;
    },
  };
}

describe('SaveStore', () => {
  it('resets corrupt save data safely', () => {
    const store = createSaveStore(memory('{not json'));
    expect(store.settings().music).toBe(0.7);
    expect(store.scores()).toEqual([]);
  });

  it('migrates v0 data and persists settings', () => {
    const storage = memory(JSON.stringify({ version: 0, settings: { music: 0.2 }, scores: [] }));
    const store = createSaveStore(storage);
    expect(store.settings()).toMatchObject({ music: 0.2, sfx: 0.8 });
    store.updateSettings({ shake: 0.3, crt: true });
    expect(JSON.parse(storage.value ?? '{}')).toMatchObject({
      version: 4,
      settings: { shake: 0.3, crt: true },
    });
  });

  it('migrates v1 settings with M7 accessibility defaults', () => {
    const storage = memory(
      JSON.stringify({
        version: 1,
        settings: { music: 0.3, sfx: 0.4, ui: 0.5, shake: 0.6, flashReduction: true, crt: true },
        scores: [],
      }),
    );
    const store = createSaveStore(storage);
    expect(store.settings()).toMatchObject({
      music: 0.3,
      crt: true,
      highContrastBullets: false,
      subtitles: true,
      visualQuality: 'high',
      backgroundMotion: true,
      effectsIntensity: 1,
    });
    store.updateSettings({ highContrastBullets: true, subtitles: false, visualQuality: 'low' });
    expect(JSON.parse(storage.value ?? '{}')).toMatchObject({
      version: 4,
      settings: { highContrastBullets: true, subtitles: false, visualQuality: 'low' },
    });
  });

  it('migrates legacy stage scores and sorts new scores by score then level', () => {
    const store = createSaveStore(
      memory(JSON.stringify({ version: 3, settings: {}, scores: [{ score: 50, stage: 7 }] })),
    );
    expect(store.scores()).toEqual([{ score: 50, level: 7 }]);
    store.recordScore({ score: 50, level: 9 });
    expect(store.scores()[0]).toEqual({ score: 50, level: 9 });
  });

  it('keeps only the highest ten local scores', () => {
    const store = createSaveStore(memory());
    for (let score = 0; score < 12; score += 1) store.recordScore({ score, level: 1 });
    expect(store.scores()).toHaveLength(10);
    expect(store.scores()[0]?.score).toBe(11);
    expect(store.scores()[9]?.score).toBe(2);
  });
});
