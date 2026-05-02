import { test, expect } from '@playwright/test';

/**
 * Gezi noktaları (attractions) sayfası testleri.
 *
 * Daha önce attraction detay sayfasında 500 hatası yaşandı (server-side onError fix gerekti),
 * bu yüzden 200 dönüşü kontrol etmek kıymetli.
 *
 * Not: tour-card-clickable yapısında <img> overlay'i <a>'nın üstüne pointer-events alıyor
 * (subtree intercepts pointer events). Bu yüzden Playwright click yapamıyor.
 * Çözüm: href attribute'ünü oku, page.goto ile direkt navigate et.
 */

test.describe('Attractions listesi', () => {
  test('Attractions liste sayfası 200 dönüyor', async ({ page }) => {
    const response = await page.goto('/en/attractions');
    expect(response?.status()).toBe(200);

    // h1 görünüyor
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('Attractions listesinde card linkleri görünüyor', async ({ page }) => {
    await page.goto('/en/attractions');

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

    // Card click yerine href'i oku ve direkt navigate et.
    // (img overlay click'i intercept ediyor — Playwright click stable olmuyor)
    const attractionLink = page.locator('a[href*="/attractions/"]').first();
    await expect(attractionLink).toBeVisible({ timeout: 10000 });

    const href = await attractionLink.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toMatch(/\/attractions\//);

    const response = await page.goto(href!);

    // 500 değil — bug bu testin yakaladığı şey
    expect(response?.status()).toBeLessThan(500);
    expect(response?.status()).toBe(200);

    // Detay sayfası yüklendi
    await expect(page).toHaveURL(/\/attractions\/.+/);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
      timeout: 10000,
    });
  });
});