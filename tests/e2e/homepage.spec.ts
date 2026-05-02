import { test, expect } from '@playwright/test';

/**
 * Anasayfa smoke testleri.
 *
 * Strateji: pazarlama metni yerine semantic locator kullanıyoruz.
 * Header, footer, h1, navigation hep vardır — içerik metni revize'lerle değişiyor.
 */

test.describe('Anasayfa', () => {
  test('EN sayfası temel yapısı yükleniyor', async ({ page }) => {
    await page.goto('/en');

    // Title
    await expect(page).toHaveTitle(/Kısmet|Kismet/);

    // Header (banner role) görünüyor
    await expect(page.getByRole('banner')).toBeVisible();

    // En az bir h1 var (HomeHero'da render ediliyor)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    // Footer (contentinfo role) görünüyor
    await expect(page.getByRole('contentinfo')).toBeVisible();

    // Navigation görünüyor
    await expect(page.getByRole('banner').getByRole('navigation').first()).toBeVisible();
  });

  test('TR sayfası yükleniyor', async ({ page }) => {
    await page.goto('/tr');
    await expect(page).toHaveTitle(/Kısmet|Kismet/);
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('ZH sayfası yükleniyor', async ({ page }) => {
    await page.goto('/zh');
    await expect(page).toHaveTitle(/Kısmet|Kismet/);
    await expect(page.getByRole('banner')).toBeVisible();
  });

  test('Header navigation linkleri tıklanabilir', async ({ page }) => {
    await page.goto('/en');

    const header = page.getByRole('banner');

    // Tours linki var
    const toursLink = header.getByRole('link', { name: /^Tours$/i }).first();
    await expect(toursLink).toBeVisible();

    // Click -> /en/tours
    await toursLink.click();
    await expect(page).toHaveURL(/\/en\/tours/);
  });
});

test.describe('Dil değişimi', () => {
  test('EN navigation "Home" linki gösteriyor', async ({ page }) => {
    await page.goto('/en');
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Home' }).first()
    ).toBeVisible();
  });

  test('TR navigation "Ana Sayfa" linki gösteriyor', async ({ page }) => {
    await page.goto('/tr');
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Ana Sayfa' }).first()
    ).toBeVisible();
  });
});
