import { test, expect } from '@playwright/test';

test('Ana sayfa yükleniyor', async ({ page }) => {
  await page.goto('/en');
  await expect(page).toHaveTitle(/Kısmet|Kismet/);
  await expect(page.locator('text=Book a Balloon')).toBeVisible();
  await expect(page.locator('text=Explore Tours')).toBeVisible();
});

test('Dil değişimi çalışıyor', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByRole('banner').getByRole('link', { name: 'Home' }).first()).toBeVisible();

  await page.goto('/tr');
  await expect(page.getByRole('banner').getByRole('link', { name: 'Ana Sayfa' }).first()).toBeVisible();
});
