# Acenta – Yerel Kurulum ve cPanel Yayına Alma

## Gereksinimler

- **Node.js** 20+ ([nodejs.org](https://nodejs.org))
- **Docker Desktop** (PostgreSQL için – [docker.com](https://www.docker.com/products/docker-desktop/))
- **Git** (isteğe bağlı)

---

## 1. Yerel kurulum (bilgisayarınızda demo)

### 1.1 Docker Desktop kurulumu

1. [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) indirip kurun.
2. Kurulumdan sonra bilgisayarı yeniden başlatın (gerekirse).
3. Docker Desktop’ı açın; sistem tepsisinde “Docker is running” görünene kadar bekleyin.

### 1.2 Projeyi hazırlama

Proje klasöründe (örn. `acenta`):

```bash
# Bağımlılıklar (zaten yüklüyse atlayın)
npm install
```

### 1.3 Veritabanını başlatma (PostgreSQL)

```bash
docker-compose up -d
```

Bu komut yerelde bir PostgreSQL 15 konteyneri çalıştırır (port 5432). İlk seferde image indirilir.

### 1.4 Ortam değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayın ve gerekirse düzenleyin:

```bash
# Windows (PowerShell)
copy .env.example .env

# veya manuel: .env dosyası oluşturup şunu yazın:
# DATABASE_URL="postgresql://acenta:acenta@localhost:5432/acenta"
```

Yerel Docker için varsayılan değerler:

- Kullanıcı: `acenta`
- Şifre: `acenta`
- Veritabanı: `acenta`
- Port: `5432`

### 1.5 Veritabanı şeması ve demo veri

```bash
npx prisma migrate deploy
npm run seed
```

- `migrate deploy`: Tabloları oluşturur / günceller.
- `seed`: Balon, Yeşil Tur ve Transfer turlarını ekler.

### 1.6 Uygulamayı çalıştırma

```bash
npm run dev
```

Tarayıcıda: [http://localhost:3000](http://localhost:3000)  
Dil için: [http://localhost:3000/tr](http://localhost:3000/tr)

**Admin girişi:** Seed çalıştırdıysanız varsayılan admin hesabı oluşturulur:
- **E-posta:** `admin@acenta.local`
- **Şifre:** `Admin123!`  
İlk girişten sonra şifreyi değiştirmeniz önerilir (şu an uygulama içinde şifre değiştirme sayfası yoksa veritabanı veya yeni bir kullanıcı ile değiştirebilirsiniz).  
Giriş: `/tr/login` → Admin panel: `/tr/admin`

---

## 2. cPanel’e taşıma ve yayına alma

### 2.1 Sunucu gereksinimleri

- **Node.js** (cPanel’de “Setup Node.js App” veya benzeri ile 18+ / 20+)
- **PostgreSQL**  
  - cPanel’de PostgreSQL varsa: cPanel → PostgreSQL Databases ile veritabanı ve kullanıcı oluşturun.  
  - Yoksa: Uzak bir PostgreSQL kullanın (ör. [Neon](https://neon.tech), [Supabase](https://supabase.com), [Railway](https://railway.app) vb.) ve `DATABASE_URL`’i oradan alın.

### 2.2 Projeyi build etme (yerelde)

```bash
npm run build
```

Çıktı: `.next` klasörü ve gerekli dosyalar.

### 2.3 Sunucuya yükleme

- **FTP / cPanel Dosya Yöneticisi** veya **Git** ile projeyi sunucuya atın.
- Yüklemeniz gerekenler:
  - `package.json`, `package-lock.json`
  - `prisma/` (schema + migrations)
  - `app/`, `lib/`, `public/`, `docs/` vb. kaynak klasörler
  - `next.config.*`, `tsconfig.json`, `tailwind.config.*`, `postcss.config.*` (varsa)
  - Build sonrası `.next` klasörü (veya sunucuda `npm run build` çalıştıracaksanız .next’i yüklemeniz gerekmez; sadece kaynak kodu yükleyip sunucuda build alın)

### 2.4 Sunucuda ortam değişkenleri

cPanel’de Node.js uygulaması için (veya `.env` dosyası ile):

- `DATABASE_URL` = Canlı PostgreSQL bağlantı dizesi  
  Örnek: `postgresql://kullanici:sifre@sunucu:5432/veritabani`
- İsteğe bağlı: `RESEND_API_KEY`, `RESEND_FROM` (onay e-postası için)

### 2.5 Sunucuda kurulum

SSH veya cPanel terminal ile proje klasörüne girin:

```bash
npm install --production
npx prisma migrate deploy
npm run build
```

İlk admin kullanıcıyı oluşturmak için:

- Uygulama açıldıktan sonra site üzerinden Register ile kayıt olun.
- Veritabanında ilgili kullanıcının `role` değerini `ADMIN` yapın (SQL: `UPDATE "User" SET role = 'ADMIN' WHERE email = 'sizin@email.com';`).

Demo turlar için: Admin panele girip **Turlar ve Fiyatlandırma** → **Demo turları yükle** ile ekleyebilirsiniz; isterseniz yerelde `npm run seed` çalıştırıp sonra veritabanını export/import da edebilirsiniz.

### 2.6 Uygulamayı çalıştırma (cPanel)

- **“Setup Node.js App”** (veya benzeri) ile:
  - Application root: proje klasörü
  - Application URL: istediğiniz alt alan veya domain
  - Start command: `npm run start` veya `node .next/standalone/server.js` (Next.js standalone kullandıysanız)
- Gerekirse **Application Mode**: Production
- **Restart** ile uygulamayı başlatın.

Not: Next.js bazen **standalone** çıktı ile daha kolay deploy edilir. Bunu kullanmak için `next.config.js` içine `output: 'standalone'` ekleyip sunucuda `npm run build` alıp, çıkan `standalone` klasöründeki komutla çalıştırabilirsiniz.

---

## Özet komutlar (yerel)

| Adım | Komut |
|------|--------|
| PostgreSQL başlat | `docker-compose up -d` |
| .env | `copy .env.example .env` (Windows) |
| Şema + veri | `npx prisma migrate deploy` → `npm run seed` |
| Çalıştır | `npm run dev` |

Sorun olursa: Docker’ın çalıştığını, `.env` içinde `DATABASE_URL`’in doğru olduğunu ve `migrate deploy` + `seed` komutlarının hata vermediğini kontrol edin.
