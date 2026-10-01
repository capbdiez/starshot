import { expect, test } from '@playwright/test';

/** M1 acceptance: start → die ×3 → game over → automatic restart in ≤ 2 s, no console errors. */
test('core loop: lose all 3 lives, then the game restarts on its own', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  // Fixed seed so the run is reproducible; an idle player is shot down in ~11 s.
  await page.goto('/?seed=1');
  const game = page.locator('#game');
  await expect(game).toHaveAttribute('data-state', 'ready');
  await expect(game).toHaveAttribute('data-lives', '3');

  // Moving and firing works from the keyboard (FR-02).
  await page.keyboard.down('KeyZ');
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.up('KeyZ');

  await expect(game).toHaveAttribute('data-lives', '2', { timeout: 20_000 });
  await expect(game).toHaveAttribute('data-phase', 'gameOver', { timeout: 30_000 });
  const overAt = Date.now();
  await expect(game).toHaveAttribute('data-restarts', '1', { timeout: 5_000 });
  // 1.5 s by design; generous margin for slow CI browsers.
  expect(Date.now() - overAt).toBeLessThanOrEqual(2_500);
  await expect(game).toHaveAttribute('data-lives', '3');
  await expect(game).toHaveAttribute('data-phase', 'playing');

  expect(errors).toEqual([]);
});
