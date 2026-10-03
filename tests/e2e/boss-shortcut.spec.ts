import { expect, test } from '@playwright/test';

test('F5 and F6 together jump an active run to the nearest boss level', async ({ page }) => {
  await page.goto('/?seed=1');
  const game = page.locator('#game');
  await expect(game).toHaveAttribute('data-state', 'ready');
  await page.keyboard.press('KeyZ');
  await expect(game).toHaveAttribute('data-flow', 'play');

  await page.keyboard.down('F5');
  await page.keyboard.down('F6');
  await expect(game).toHaveAttribute('data-level', '10');
  await page.keyboard.up('F6');
  await page.keyboard.up('F5');
});
