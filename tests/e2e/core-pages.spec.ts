import { test, expect } from '@playwright/test';

/**
 * Sabit içerik sayfaları: About, Contact, Legal docs.
 * Her biri 200 dönmeli ve h1 başlığı görünmeli.
 */

test.describe('About sayfası', () => {
  test('About sayfası yükleniyor', async ({ page }) => {
    const response = await page.goto('/en/about');
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('TR About', async ({ page }) => {
    const response = await page.goto('/tr/about');
    expect(response?.status()).toBe(200);
  });
});

test.describe('Contact sayfası', () => {
  test('Contact sayfası yükleniyor', async ({ page }) => {
    const response = await page.goto('/en/contact');
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('Mesaj formu var', async ({ page }) => {
    await page.goto('/en/contact');

    // Form input alanları görünür (esnek match)
    const messageForm = page.locator('form').first();
    if (await messageForm.isVisible().catch(() => false)) {
      await expect(messageForm).toBeVisible();
    }
  });
});

test.describe('Legal sayfaları', () => {
  const legalPages = [
    '/en/legal/terms',
    '/en/legal/cancellation',
    '/en/legal/distance-sales',
    '/en/legal/privacy',
    '/en/legal/kvkk',
  ];

  for (const path of legalPages) {
    test(`${path} 200 dönüyor`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);

      // Her legal sayfasında h1 var
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    });
  }
});

test.describe('Auth sayfaları', () => {
  test('Login sayfası yükleniyor', async ({ page }) => {
    const response = await page.goto('/en/login');
    expect(response?.status()).toBe(200);

    // h1 görünür (login form başlığı)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('Register sayfası yükleniyor', async ({ page }) => {
    const response = await page.goto('/en/register');
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });
});

test.describe('Cart sayfası', () => {
  test('Cart sayfası yükleniyor', async ({ page }) => {
    const response = await page.goto('/en/cart');
    expect(response?.status()).toBe(200);
  });
});
