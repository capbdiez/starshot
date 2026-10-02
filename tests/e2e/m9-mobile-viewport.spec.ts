import { expect, test, type Page } from '@playwright/test';

async function expectReadyWithoutErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#game')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#game')).toHaveAttribute('data-flow', 'title');
  return errors;
}

async function expectCompleteCenteredCanvas(page: Page): Promise<void> {
  const metrics = await page.locator('#game canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const viewport = window.visualViewport;
    return {
      canvas: [canvas.width, canvas.height],
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      viewport: { width: viewport?.width ?? innerWidth, height: viewport?.height ?? innerHeight },
      touchAction: getComputedStyle(canvas.parentElement ?? canvas).touchAction,
    };
  });

  expect(metrics.canvas).toEqual([540, 960]);
  expect(metrics.rect.width / metrics.rect.height).toBeCloseTo(540 / 960);
  expect(metrics.rect.left).toBeGreaterThanOrEqual(0);
  expect(metrics.rect.top).toBeGreaterThanOrEqual(0);
  expect(metrics.rect.left + metrics.rect.width).toBeLessThanOrEqual(metrics.viewport.width + 1);
  expect(metrics.rect.top + metrics.rect.height).toBeLessThanOrEqual(metrics.viewport.height + 1);
  expect(metrics.touchAction).toBe('none');
}

test('M9 mobile viewport boots and preserves a complete centered canvas through rotation', async ({
  page,
}) => {
  const errors = await expectReadyWithoutErrors(page);
  await expectCompleteCenteredCanvas(page);

  const portrait = page.viewportSize();
  expect(portrait).not.toBeNull();
  if (!portrait) return;
  await page.setViewportSize({ width: portrait.height, height: portrait.width });
  await expectCompleteCenteredCanvas(page);

  expect(errors).toEqual([]);
});
