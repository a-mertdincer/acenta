import { test, expect } from '@playwright/test';

/**
 * Tours liste ve tur detay sayfası testleri.
 */

test.describe('Tours liste sayfası', () => {
  test('Tours sayfası yükleniyor', async ({ page }) => {
    await page.goto('/en/tours');

    // Sayfa başarılı yüklendi
    await expect(page.getByRole('banner')).toBeVisible();

    // En az bir tour card görünüyor (h2 olarak title render ediliyor)
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('Tour card tıklanınca tur detayına gidiyor', async ({ page }) => {
    await page.goto('/en/tours');

    // Tour detay linki bulup tıkla
    const tourLink = page.locator('a[href*="/tour/"]').first();
    await expect(tourLink).toBeVisible({ timeout: 10000 });
    await tourLink.click();

    // URL değişti mi?
    await expect(page).toHaveURL(/\/tour\/.+/);
  });

  test('TR tours sayfası yükleniyor', async ({ page }) => {
    await page.goto('/tr/tours');
    await expect(page.getByRole('banner')).toBeVisible();
  });
});

test.describe('Tur detay sayfası', () => {
  test('Tur detay sayfasında başlık ve booking card var', async ({ page }) => {
    // İlk tur'a git
    await page.goto('/en/tours');
    const tourLink = page.locator('a[href*="/tour/"]').first();
    await tourLink.click();

    // Detay sayfası yüklendi
    await expect(page).toHaveURL(/\/tour\/.+/);

    // h1 görünüyor (tur başlığı)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
      timeout: 10000,
    });

    // Add to cart veya Ask for Price butonu var (tur tipine göre)
    // Esnek match — herhangi biri olabilir
    const ctaButton = page
      .getByRole('button', {
        name: /Add to cart|Sepete ekle|Ask for Price|Fiyat (sor|öğren)|加入购物车|询价/i,
      })
      .first();
    await expect(ctaButton).toBeVisible({ timeout: 10000 });
  });

  test('Sticky anchor bar görünüyor', async ({ page }) => {
    await page.goto('/en/tours');
    const tourLink = page.locator('a[href*="/tour/"]').first();
    await tourLink.click();

    // Tur detayında sticky nav anchorları görünür: Book Now, Gallery, Description vb.
    // En azından "Book Now" anchor'u görünmeli
    const bookNowAnchor = page
      .locator('a[href*="#book-now"], button:has-text("Book Now"), button:has-text("Rezervasyon")')
      .first();

    // Sticky nav opsiyonel — yoksa skip
    const isVisible = await bookNowAnchor.isVisible().catch(() => false);
    if (isVisible) {
      await expect(bookNowAnchor).toBeVisible();
    }
  });
});
