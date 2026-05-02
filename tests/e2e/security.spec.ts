import { test, expect } from '@playwright/test';

/**
 * Güvenlik testleri: yetkisiz erişim engelleniyor mu?
 */

test.describe('Admin route koruması', () => {
  test('Giriş yapmadan /en/admin erişimi engelleniyor', async ({ page }) => {
    await page.goto('/en/admin');

    // /admin'de kalmamalı — login'e veya başka yere yönlendirilmeli
    const url = page.url();
    expect(url).not.toMatch(/\/admin\/?$/);
  });

  test('Giriş yapmadan /en/admin/tours erişimi engelleniyor', async ({ page }) => {
    await page.goto('/en/admin/tours');

    const url = page.url();
    expect(url).not.toMatch(/\/admin\/tours/);
  });

  test('Giriş yapmadan /en/admin/cari erişimi engelleniyor', async ({ page }) => {
    await page.goto('/en/admin/cari');

    const url = page.url();
    expect(url).not.toMatch(/\/admin\/cari/);
  });

  test('Giriş yapmadan /en/account erişimi engelleniyor', async ({ page }) => {
    await page.goto('/en/account');

    // Account sayfasında kalmamalı
    const url = page.url();
    expect(url).not.toMatch(/\/account\/?$/);
  });
});

test.describe('Hassas dosya erişimi', () => {
  test('.env dosyasına HTTP ile erişilemiyor', async ({ page }) => {
    const response = await page.goto('/.env').catch(() => null);
    if (response) {
      // 200 dönmemeli — 404 veya başka error
      expect(response.status()).not.toBe(200);
    }
  });

  test('package.json HTTP ile erişilemiyor', async ({ page }) => {
    const response = await page.goto('/package.json').catch(() => null);
    if (response) {
      expect(response.status()).not.toBe(200);
    }
  });
});
