import { test, expect } from '@playwright/test';

/**
 * Sağlık kontrol testleri: kritik sayfalarda console hatası yok mu?
 *
 * Sahte pozitif vermesin diye:
 * - Third-party (analytics, ads) hataları filtreleniyor
 * - Network failed errors filtreleniyor (CDN tutarsızlıkları)
 * - Sadece runtime JS error'lar değerlendiriliyor
 */

const ALLOWED_ERROR_PATTERNS = [
  /favicon/i,
  /third-party/i,
  /analytics/i,
  /Failed to load resource.*404/i, // CDN'den 404 gelen kaynaklar
  /net::ERR_/i, // network error
  /Image with src/i, // Next.js image optimization warnings
  /hydrat/i, // hydration warning'leri (gerçek hatalar TypeError olarak gelir)
];

function isCriticalError(text: string): boolean {
  return !ALLOWED_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

test.describe('Console hata kontrolü', () => {
  test('Anasayfa console hatası vermiyor', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const critical = errors.filter(isCriticalError);
    if (critical.length > 0) {
      console.log('Critical errors:', critical);
    }
    expect(critical).toHaveLength(0);
  });

  test('Tours sayfası console hatası vermiyor', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await page.goto('/en/tours');
    await page.waitForLoadState('networkidle');

    const critical = errors.filter(isCriticalError);
    expect(critical).toHaveLength(0);
  });

  test('Tur detay sayfası console hatası vermiyor', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await page.goto('/en/tours');
    const tourLink = page.locator('a[href*="/tour/"]').first();
    if (await tourLink.isVisible().catch(() => false)) {
      await tourLink.click();
      await page.waitForLoadState('networkidle');

      const critical = errors.filter(isCriticalError);
      expect(critical).toHaveLength(0);
    }
  });
});

test.describe('Yanıt süresi (smoke)', () => {
  test('Anasayfa 10 saniye içinde yükleniyor', async ({ page }) => {
    const start = Date.now();
    const response = await page.goto('/en', { waitUntil: 'load' });
    const duration = Date.now() - start;

    expect(response?.status()).toBe(200);
    expect(duration).toBeLessThan(10000);
  });
});
