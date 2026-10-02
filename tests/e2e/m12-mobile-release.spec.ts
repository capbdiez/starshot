import { expect, test, type Page } from '@playwright/test';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function tapPresentation(page: Page, x: number, y: number): Promise<void> {
  const canvas = page.locator('#game canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await page.touchscreen.tap(box.x + (x / 540) * box.width, box.y + (y / 960) * box.height);
}

async function expectCompleteCanvas(page: Page): Promise<void> {
  const metrics = await page.locator('#game canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const viewport = window.visualViewport;
    return {
      width: canvas.width,
      height: canvas.height,
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      viewportWidth: viewport?.width ?? innerWidth,
      viewportHeight: viewport?.height ?? innerHeight,
    };
  });
  expect([metrics.width, metrics.height]).toEqual([540, 960]);
  expect(metrics.left).toBeGreaterThanOrEqual(0);
  expect(metrics.top).toBeGreaterThanOrEqual(0);
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.bottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
}

async function pauseForInterruption(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
}

test('M12 release smoke: boot, play, interruption recovery, rotation, and retry stay error-free', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const mobile = testInfo.project.name.startsWith('mobile-');
  const errors = collectErrors(page);
  await page.goto('/?seed=1');
  const game = page.locator('#game');
  await expect(game).toHaveAttribute('data-state', 'ready');
  await expect(game).toHaveAttribute('data-flow', 'title');

  if (mobile) {
    await expect(game).toHaveAttribute('data-touch-controls', 'true');
    await expectCompleteCanvas(page);
    const portrait = page.viewportSize();
    expect(portrait).not.toBeNull();
    if (portrait) {
      await page.setViewportSize({ width: portrait.height, height: portrait.width });
      await expectCompleteCanvas(page);
      await page.setViewportSize(portrait);
      await expectCompleteCanvas(page);
    }
    await tapPresentation(page, 270, 430);
  } else {
    await page.keyboard.press('KeyZ');
  }
  await expect(game).toHaveAttribute('data-flow', 'play');

  await pauseForInterruption(page);
  await expect(game).toHaveAttribute('data-flow', 'pause');
  if (mobile) await tapPresentation(page, 270, 440);
  else await page.keyboard.press('Escape');
  await expect(game).toHaveAttribute('data-flow', 'play');

  await expect(game).toHaveAttribute('data-flow', 'results', { timeout: 35_000 });
  if (mobile) await tapPresentation(page, 270, 680);
  else await page.keyboard.press('KeyZ');
  await expect(game).toHaveAttribute('data-flow', 'play');
  await expect(game).toHaveAttribute('data-lives', '3');
  expect(errors).toEqual([]);
});
