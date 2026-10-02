import { expect, test } from '@playwright/test';

test('boots to a 540×960 presentation canvas showing the atlas ship, without console errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('/');

  const game = page.locator('#game');
  await expect(game).toHaveAttribute('data-state', 'ready');
  await expect(game).toHaveAttribute('data-flow', 'title');
  await expect(game).toHaveAttribute('data-ship-frame', /^player_ship\/idle\/\d$/);

  const canvas = page.locator('#game canvas');
  const size = await canvas.evaluate((element) => {
    const c = element as HTMLCanvasElement;
    const rect = c.getBoundingClientRect();
    return {
      width: c.width,
      height: c.height,
      cssW: rect.width,
      cssH: rect.height,
      dpr: devicePixelRatio,
    };
  });
  expect([size.width, size.height]).toEqual([540, 960]);

  // Integer scale in device pixels: 1000 px tall viewport → 1× at DPR 1.
  const deviceScale = (size.cssH * size.dpr) / 960;
  expect(Number.isInteger(Math.round(deviceScale * 1000) / 1000)).toBe(true);
  expect(size.cssW / size.cssH).toBeCloseTo(540 / 960);
  expect(deviceScale).toBe(1);

  expect(errors).toEqual([]);
});
