import { expect, test } from '@playwright/test';

test('M10 mobile touch input accepts a captured lower-screen touch without browser errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/?seed=1');
  const game = page.locator('#game');
  await expect(game).toHaveAttribute('data-state', 'ready');
  await page.keyboard.press('KeyZ');
  await expect(game).toHaveAttribute('data-flow', 'play');

  const box = await game.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await page.touchscreen.tap(box.x + box.width * 0.125, box.y + box.height * 0.8);
  await page.waitForTimeout(50);

  expect(errors).toEqual([]);
});
