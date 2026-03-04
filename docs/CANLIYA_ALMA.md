# Acenta – Canlıya Alma (Arkadaşına Sunmak İçin)

Projeyi internette yayınlamak için en pratik iki yol aşağıda. **Vercel + Neon** ücretsiz ve birkaç dakikada biter; arkadaşına link atıp göstermek için idealdir.

---

## Yol 1: Vercel + Neon (Önerilen – ücretsiz, hızlı)

### Adım 1: Proje zaten GitHub’da

Repo: `https://github.com/a-mertdincer/acenta` — bunu kullanacağız.

### Adım 2: Ücretsiz PostgreSQL – Neon

1. [neon.tech](https://neon.tech) → Sign up (GitHub ile giriş yapabilirsin).
2. **New Project** → proje adı ver (örn. `acenta`).
3. **Connection string**’i kopyala. Örnek:
   `postgresql://kullanici:sifre@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

### Adım 3: Vercel’e deploy

1. [vercel.com](https://vercel.com) → Sign up (GitHub ile).
2. **Add New** → **Project** → GitHub’daki `acenta` reposunu seç (`a-mertdincer/acenta`).
3. **Environment Variables** kısmına ekle:
   - **Name:** `DATABASE_URL`
   - **Value:** Neon’dan kopyaladığın connection string (tek satır, tırnaksız).
4. **Deploy**’a tıkla. Build bitince sana bir link verir (örn. `acenta.vercel.app`).

### Adım 4: Veritabanını hazırla

Vercel deploy bittikten sonra, **kendi bilgisayarında** (proje klasöründe) canlı veritabanına bağlanıp migration ve seed çalıştır:

1. Yerelde `.env` dosyasını aç; **sadece bu işlem için** `DATABASE_URL` satırını Neon connection string ile değiştir (Vercel’e yazdığın aynı değer).
2. Terminalde:

```bash
npx prisma migrate deploy
npm run seed
```

3. İşin bitince `.env` içindeki `DATABASE_URL`’i tekrar yerel Docker değerine çevirebilirsin:
   `postgresql://acenta:acenta@localhost:5432/acenta`

### Adım 5: Admin kullanıcı

Seed çalıştırdıysan canlı sitede:

- **Giriş:** `https://SITE_ADIN.vercel.app/tr/login`
- **E-posta:** `admin@acenta.local`
- **Şifre:** `Admin123!`
- **Admin panel:** `https://SITE_ADIN.vercel.app/tr/admin`

Arkadaşına bu linki vererek siteyi ve yönetim panelini gösterebilirsin.

---

## Yol 2: Railway (Uygulama + veritabanı tek yerde)

1. [railway.app](https://railway.app) → GitHub ile giriş.
2. **New Project** → **Deploy from GitHub repo** → `a-mertdincer/acenta` reposunu seç.
3. Aynı projede **New** → **Database** → **PostgreSQL** ekle.
4. PostgreSQL servisine tıkla → **Variables** → `DATABASE_URL`’i kopyala.
5. Next.js uygulamasına tıkla → **Variables** → `DATABASE_URL`’i yapıştır.
6. **Deploy** tetiklenir. Bittikten sonra **Settings** → **Generate Domain** ile dış linki alırsın.
7. Veritabanını hazırlamak için: yerelde `.env`’e Railway’ın `DATABASE_URL`’ini yazıp `npx prisma migrate deploy` ve `npm run seed` çalıştır (yukarıdaki gibi).

---

## Özet – Hangi ortam değişkenleri?

| Değişken        | Zorunlu | Açıklama |
|-----------------|--------|----------|
| `DATABASE_URL`  | Evet   | PostgreSQL bağlantı dizesi (Neon / Railway / cPanel vb.) |
| `RESEND_API_KEY`| Hayır  | Rezervasyon onay e-postası göndermek için (Resend.com) |
| `RESEND_FROM`   | Hayır  | Gönderen e-posta adresi (RESEND kullanıyorsan) |

---

## cPanel veya kendi sunucun varsa

Detaylı adımlar için **KURULUM.md** dosyasındaki “cPanel’e taşıma ve yayına alma” bölümüne bak. Özet: Node.js 18+, PostgreSQL, `DATABASE_URL` tanımla, sunucuda `npm install`, `npx prisma migrate deploy`, `npm run build`, `npm run start` (veya standalone).

---

## Canlıda denemen gerekenler

- Ana sayfa, turlar, dil değiştirme.
- Bir tur seç → tarih seç → sepete ekle → sepet sayacı.
- `/tr/register` ile yeni hesap → `/tr/login` ile giriş.
- Admin: `/tr/login` → `admin@acenta.local` / `Admin123!` → `/tr/admin` (dashboard, rezervasyonlar, balon takvimi).

Bu adımlarla projeyi canlıya alıp arkadaşına sunabilirsin.
