import { test, expect } from '@playwright/test';

test('Tur sayfaları yükleniyor', async ({ page }) => {
  await page.goto('/en/tours');
  await expect(page.getByRole('heading', { name: /All Tours/i }).first()).toBeVisible();

  const cards = page.locator('[class*="tour-card"], [class*="product-card"], article');
  await expect(cards.first()).toBeVisible();
});

test('Ürün detay sayfası açılıyor', async ({ page }) => {
  await page.goto('/en/tours');

  const firstProduct = page.locator('a[href*="/tour/"]').first();
  await firstProduct.click();
  await expect(page).toHaveURL(/\/tour\/.+/);

  await expect(page.getByRole('button', { name: /Add to cart|Book now|Sepete ekle/i }).first()).toBeVisible();
});
