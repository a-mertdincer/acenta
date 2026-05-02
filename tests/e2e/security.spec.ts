import { test, expect } from '@playwright/test';

/**
 * Güvenlik testleri: yetkisiz erişim engelleniyor mu?
 *
 * Önemli Not: Vercel/Next.js, eşleşmeyen path'leri anasayfaya yönlendirir (200 dönüş).
 * Bu yüzden hassas dosya kontrolü için status code yerine *içerik* kontrol ediyoruz.
 * 200 dönmesi sorun değil — dönen içerik HTML olmalı, dosyanın gerçek içeriği değil.
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
    const url = page.url();
    expect(url).not.toMatch(/\/account\/?$/);
  });
});

test.describe('Hassas dosya erişimi', () => {
  // Vercel anasayfaya rewrite yapabilir (200 döner) — content kontrolü yapıyoruz

  test('.env içeriği serve edilmiyor', async ({ page }) => {
    const response = await page.goto('/.env').catch(() => null);

    if (!response) {
      // Network error veya 404 — güvenli
      return;
    }

    const text = await response.text();

    // .env içeriği döndü mü? KEY=VALUE patern'i arıyoruz.
    // (Bunlar .env dosyasının imzası — anasayfa HTML'inde olmaz)
    expect(text).not.toMatch(/DATABASE_URL\s*=/i);
    expect(text).not.toMatch(/NEXTAUTH_SECRET\s*=/i);
    expect(text).not.toMatch(/CLOUDINARY_API/i);
    expect(text).not.toMatch(/DEEPL_API_KEY/i);

    // Eğer içerik HTML ise zaten güvenli (rewrite happened)
    // Eğer içerik raw .env ise yukarıdaki regex'lerden biri match olur ve test fail
  });

  test('package.json içeriği serve edilmiyor', async ({ page }) => {
    const response = await page.goto('/package.json').catch(() => null);

    if (!response) return;

    const text = await response.text();

    // package.json'ın imzası: parse edilebilir JSON + dependencies/scripts içerir
    let isPackageJson = false;
    try {
      const parsed = JSON.parse(text);
      isPackageJson = !!(parsed.dependencies || parsed.devDependencies || parsed.scripts);
    } catch {
      isPackageJson = false;
    }

    expect(isPackageJson).toBe(false);
  });

  test('.git/config dosyasına erişim yok', async ({ page }) => {
    const response = await page.goto('/.git/config').catch(() => null);

    if (!response) return;

    const text = await response.text();

    // git config formatı: [core] section + repositoryformatversion satırı
    expect(text).not.toMatch(/\[core\][\s\S]*?repositoryformatversion/);
  });
});