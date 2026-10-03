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

test('M11 touch controls drive mobile title, play, pause, resume, and settings flow', async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith('mobile-'),
    'mobile flow is asserted on mobile projects',
  );
  const errors = collectErrors(page);
  await page.goto('/?seed=11');
  const game = page.locator('#game');
  await expect(game).toHaveAttribute('data-state', 'ready');
  await expect(game).toHaveAttribute('data-touch-controls', 'true');

  await tapPresentation(page, 270, 430);
  await expect(game).toHaveAttribute('data-flow', 'play');

  const canvas = page.locator('#game canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await Promise.all([
      page.touchscreen.tap(box.x + box.width * 0.125, box.y + box.height * (914 / 960)),
      page.touchscreen.tap(box.x + box.width * 0.625, box.y + box.height * (914 / 960)),
    ]);
    await page.touchscreen.tap(box.x + box.width * 0.875, box.y + box.height * (914 / 960));
  }

  await tapPresentation(page, 498, 42);
  await expect(game).toHaveAttribute('data-flow', 'pause');
  await tapPresentation(page, 270, 440);
  await expect(game).toHaveAttribute('data-flow', 'play');
  await tapPresentation(page, 498, 42);
  await expect(game).toHaveAttribute('data-flow', 'pause');
  await tapPresentation(page, 270, 520);
  await expect(game).toHaveAttribute('data-flow', 'settings');
  await tapPresentation(page, 270, 780);
  await expect(game).toHaveAttribute('data-flow', 'title');

  expect(errors).toEqual([]);
});

test('M11 touch-control HUD is absent on desktop fine-pointer projects', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.startsWith('mobile-'),
    'desktop absence is asserted on desktop projects',
  );
  await page.goto('/?seed=11');
  await expect(page.locator('#game')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#game')).toHaveAttribute('data-touch-controls', 'false');
  await expect(page.getByText('TOUCH: TAP PLAY, THEN HOLD CONTROLS')).toBeHidden();
  await page.keyboard.press('KeyZ');
  await expect(page.locator('#game')).toHaveAttribute('data-flow', 'play');
});
