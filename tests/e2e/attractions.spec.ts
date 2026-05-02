import { test, expect } from '@playwright/test';

/**
 * Gezi noktaları (attractions) sayfası testleri.
 *
 * Daha önce attraction detay sayfasında 500 hatası yaşandı (server-side onError fix gerekti),
 * bu yüzden 200 dönüşü kontrol etmek kıymetli.
 */

test.describe('Attractions listesi', () => {
  test('Attractions liste sayfası 200 dönüyor', async ({ page }) => {
    const response = await page.goto('/en/attractions');
    expect(response?.status()).toBe(200);

    // h1 görünüyor
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('Attractions listesinde cards görünüyor', async ({ page }) => {
    await page.goto('/en/attractions');

    // Attraction linklerinden en az 1 var
    const attractionLink = page.locator('a[href*="/attractions/"]').first();
    await expect(attractionLink).toBeVisible({ timeout: 10000 });
  });

  test('TR attractions sayfası', async ({ page }) => {
    const response = await page.goto('/tr/attractions');
    expect(response?.status()).toBe(200);
  });
});

test.describe('Attraction detay', () => {
  test('Detay sayfası 500 vermiyor (regression: cappadocia-cavusin bug)', async ({ page }) => {
    await page.goto('/en/attractions');

    const attractionLink = page.locator('a[href*="/attractions/"]').first();

    if (await attractionLink.isVisible().catch(() => false)) {
      const response = await Promise.all([
        page.waitForResponse((r) => r.url().includes('/attractions/') && r.status() < 400),
        attractionLink.click(),
      ]);

      // Detay sayfası yüklendi
      await expect(page).toHaveURL(/\/attractions\/.+/);

      // h1 görünüyor
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
        timeout: 10000,
      });
    }
  });
});
