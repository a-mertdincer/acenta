import { test, expect } from '@playwright/test';

test('Giriş yapmadan admin paneline erişilemiyor', async ({ page }) => {
  await page.goto('/en/admin');

  const url = page.url();
  expect(url).not.toMatch(/\/admin\/?$/);
});
