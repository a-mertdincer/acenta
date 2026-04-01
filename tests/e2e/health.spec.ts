import { test, expect } from '@playwright/test';

test('Konsol hatası yok', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/en');
  await page.waitForLoadState('networkidle');

  const criticalErrors = errors.filter(
    (e) => !e.includes('favicon') && !e.includes('third-party') && !e.includes('analytics')
  );
  expect(criticalErrors).toHaveLength(0);
});
