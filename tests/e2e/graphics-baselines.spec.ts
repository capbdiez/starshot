import { expect, test, type Page } from '@playwright/test';

const VIEWPORT = { width: 540, height: 960 };
const FIXED_SEED = 20_260_110;
/**
 * Phaser's live canvas advances stars, bullets, and sprites independently of CSS animation suppression.
 * The 1% ceiling accommodates that current-MVP frame variance while still rejecting meaningful visual changes.
 */
const LIVE_CANVAS_TOLERANCE = { maxDiffPixelRatio: 0.01 };

async function expectCanvasBaseline(page: Page, name: string): Promise<void> {
  // Locator screenshot avoids toHaveScreenshot's two-identical-frames requirement: Phaser's canvas
  // advances independently of CSS animation suppression. The image matcher still rejects visual diffs.
  const frame = await page.locator('#game').screenshot({ animations: 'disabled' });
  expect(frame).toMatchSnapshot(name, LIVE_CANVAS_TOLERANCE);
}

async function open(page: Page, settings: Record<string, boolean> = {}) {
  await page.setViewportSize(VIEWPORT);
  await page.addInitScript((savedSettings) => {
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
        scores: [],
      }),
    );
  }, settings);
  await page.goto(`/?seed=${String(FIXED_SEED)}`);
  await expect(page.locator('#game')).toHaveAttribute('data-state', 'ready');
}

test.describe('G1 current-MVP visual baselines', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Baselines are approved for Chromium only.',
  );

  test('captures fixed-seed title and representative gameplay', async ({ page }) => {
    await open(page);
    await expectCanvasBaseline(page, 'g1-title.png');

    await page.keyboard.press('KeyZ');
    await expect(page.locator('#game')).toHaveAttribute('data-flow', 'play');
    await expectCanvasBaseline(page, 'g1-gameplay.png');
  });

  test('captures reduced-flash and high-contrast accessibility baselines', async ({ page }) => {
    await open(page, { flashReduction: true, highContrastBullets: true });
    await page.keyboard.press('KeyZ');
    await expect(page.locator('#game')).toHaveAttribute('data-flow', 'play');
    await expectCanvasBaseline(page, 'g1-flash-reduction-high-contrast.png');
  });
});
