import { expect, test, type Page } from '@playwright/test';

const VIEWPORT = { width: 540, height: 960 };
const FIXED_SEED = 20_260_110;
/**
 * Phaser's live canvas advances stars, bullets, and sprites independently of CSS animation suppression.
 * The 3% ceiling accommodates current-MVP frame variance while still rejecting a material UI or scene regression.
 */
const LIVE_CANVAS_TOLERANCE = { maxDiffPixelRatio: 0.03 };

async function expectCanvasBaseline(page: Page, name: string): Promise<void> {
  // Let the G8 180 ms palette shutter finish before sampling the live canvas.
  await page.waitForTimeout(250);
  // Locator screenshot avoids toHaveScreenshot's two-identical-frames requirement: Phaser's canvas
  // advances independently of CSS animation suppression. The image matcher still rejects visual diffs.
  const frame = await page.locator('#game').screenshot({ animations: 'disabled' });
  expect(frame).toMatchSnapshot(name, LIVE_CANVAS_TOLERANCE);
}

const SEEDED_SCORES = Array.from({ length: 10 }, (_, index) => ({
  score: (10 - index) * 10_000,
  stage: 10 - index,
}));

async function open(
  page: Page,
  settings: Record<string, boolean> = {},
  scores: readonly { readonly score: number; readonly stage: number }[] = [],
) {
  await page.setViewportSize(VIEWPORT);
  await page.addInitScript(
    ({ savedSettings, savedScores }) => {
      localStorage.setItem(
        'starshot.save',
        JSON.stringify({
          version: 2,
          settings: {
            music: 0,
            sfx: 0,
            ui: 0,
            shake: 0,
            flashReduction: false,
            crt: false,
            highContrastBullets: false,
            subtitles: true,
            ...savedSettings,
          },
          scores: savedScores,
        }),
      );
    },
    { savedSettings: settings, savedScores: scores },
  );
  await page.goto(`/?seed=${String(FIXED_SEED)}`);
  await expect(page.locator('#game')).toHaveAttribute('data-state', 'ready');
}

test.describe('G8 HUD, menu, and transition visual baselines', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Baselines are approved for Chromium only.',
  );

  test('captures fixed-seed title and representative gameplay', async ({ page }) => {
    await open(page);
    await expectCanvasBaseline(page, 'g8-title.png');

    await page.keyboard.press('KeyZ');
    await expect(page.locator('#game')).toHaveAttribute('data-flow', 'play');
    await expectCanvasBaseline(page, 'g8-gameplay.png');
  });

  test('keeps every settings action inside its panel', async ({ page }) => {
    await open(page);
    // The title Settings action is centered at world y=15 (presentation y=510).
    await page.mouse.click(270, 510);
    await expect(page.locator('#game')).toHaveAttribute('data-flow', 'settings');
    await expectCanvasBaseline(page, 'g8-settings.png');
  });

  test('captures the pause panel over the compact gameplay HUD', async ({ page }) => {
    await open(page);
    await page.keyboard.press('KeyZ');
    await expect(page.locator('#game')).toHaveAttribute('data-flow', 'play');
    await page.keyboard.press('Escape');
    await expect(page.locator('#game')).toHaveAttribute('data-flow', 'pause');
    await expectCanvasBaseline(page, 'g8-pause.png');
  });

  test('captures full high-score title layout', async ({ page }) => {
    await open(page, {}, SEEDED_SCORES);
    await expectCanvasBaseline(page, 'g8-title-high-scores.png');
  });

  test('captures reduced-flash and high-contrast accessibility baselines', async ({ page }) => {
    await open(page, { flashReduction: true, highContrastBullets: true });
    await page.keyboard.press('KeyZ');
    await expect(page.locator('#game')).toHaveAttribute('data-flow', 'play');
    await expectCanvasBaseline(page, 'g8-flash-reduction-high-contrast.png');
  });
});
