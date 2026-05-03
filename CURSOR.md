# CURSOR.md — Acenta Geliştirme Kuralları

> Bu dosya Cursor'ın projede çalışırken uyması gereken davranışsal kuralları tanımlar.
> Her görevde uygulanır. Hatırlatma istemeden okuduğunu varsayıyoruz.

**Kaynaklar:** Andrej Karpathy'nin LLM kod yazma gözlemleri + bu projede 12 revize boyunca tekrarlayan hatalar.

---

## 1. Kod Yazmadan Önce Düşün

**Varsayım yapma. Belirsizliği saklama. Tradeoff'ları yüzeye çıkar.**

Implementasyona başlamadan önce:

- **Varsayımları açıkça yaz.** "Şunu varsaydım: ..." diye listele. Emin değilsen sor.
- **Birden fazla yorum varsa, tümünü göster.** Sessizce bir tanesini seçme.
- **Daha basit yol varsa söyle.** Gerektiğinde itiraz et — "bu çok karmaşık olabilir" deme hakkın var.
- **Kafan karışıksa dur.** Neyin belirsiz olduğunu söyle, sor.

**Format örneği — her görev başında:**

```
Assumptions:
- Mevcut TourImage modeli ile aynı pattern'i kullanacağım
- "Slug" alanı boş olabilir, eski URL'ler de çalışmaya devam edecek

Open questions:
- Slug zaten mevcut bir tour'da varsa duplicate kontrolü ne yapsın? (varsayılan: hata fırlat)

Plan:
1. ...
```

---

## 2. Önce Sadelik

**Sorunu çözen minimum kod. Spekülatif hiçbir şey yok.**

- İstenmedikse özellik ekleme.
- Tek kullanımlık kod için soyutlama yapma.
- "Esneklik" veya "konfigüre edilebilirlik" istenmediyse koyma.
- Olamayacak senaryolar için error handling yazma.
- 200 satır yazıp 50'ye sığabilecekse, 50'de yaz.

**Test:** "Senior bir engineer 'bu over-engineered' der mi?" Cevap evet ise sadeleştir.

---

## 3. Cerrahi Değişiklikler

**Sadece yapman gereken yere dokun. Sadece kendi yarattığın artığı temizle.**

Mevcut kodu düzenlerken:

- **Yanındaki kodu, yorumu, formatı "iyileştirme."**
- Bozulmamış şeyleri refactor etme.
- Mevcut stile uy — kendin farklı yapardın bile.
- İlgisiz dead code görürsen söyle, silme.

Senin değişikliklerin yetim bir şeyler bıraktıysa:

- **Senin değişikliklerin yüzünden kullanılmayan** import/variable/function'ları kaldır.
- Önceden var olan dead code'a dokunma (özel olarak istenmedikçe).

**Test:** Değiştirdiğin her satır kullanıcının isteğine doğrudan bağlanabilmeli.

---

## 4. Hedef Odaklı Yürütme

**Başarı kriterini tanımla. Doğrulayana kadar döngüye gir.**

Görevleri doğrulanabilir hedeflere çevir:

- "Validasyon ekle" → "Geçersiz input için test yaz, sonra geçecek hale getir"
- "Bug'ı düzelt" → "Bug'ı tetikleyen test yaz, sonra geçir"
- "X'i refactor et" → "Önce ve sonra testler geçiyor olmalı"

Çok adımlı görevler için kısa plan yaz:

```
1. [Adım] → verify: [kontrol]
2. [Adım] → verify: [kontrol]
3. [Adım] → verify: [kontrol]
```

Güçlü başarı kriterleri bağımsız çalışmana izin verir. Zayıf kriter ("çalışsın yeter") sürekli netleştirme gerektirir.

---

# Acenta Projesine Özgü Kurallar

Bu kurallar 12 revizelik birikimden geliyor. Tekrar tekrar yapılan hatalardan kaçınmak için.

## A. Dictionary (i18n) Hijyeni

13 dil var: `en, tr, zh, es, it, fr, de, nl, ro, ru, pl, ko, ja`. Hepsi `app/dictionaries/*.json` altında, **aynı key set'ine sahip olmalı**.

**Kurallar:**
- Yeni key eklerken **13 dosyaya da ekle**. Tek dosyaya ekleyip diğerlerini unutma.
- Mevcut bir key'i kaldırırken **13 dosyadan da kaldır**.
- Bir key'i yeniden adlandırırken **13 dosyada da yap**.
- Mevcut çeviriyi silmeden yeni alan ekle. Özellikle `whatsIncluded`, `notIncluded`, `faqs` gibi mevcut alanları korumayı unutma.
- TR ve ZH çevirilerini manuel yap (LLM çevirisi seyahat terimini bozabilir).
- Diğer 10 dili Cursor'a "translate these keys to X" diyerek halledebilirsin.

**Verify:** Tamamladıktan sonra şu komutu zihnen çalıştır:
```
Tüm 13 dilde aynı key sayısı mı var?
Yeni eklenen key tüm dillerde mi?
Eski çeviri içeriği bozulmadı mı?
```

## B. Prisma Schema Değişiklikleri

DB değişikliği yaparken:

- **Migration adı söyle.** Örn: `npx prisma migrate dev --name add-tour-start-times`
- **Mevcut veriyi etkilemediğini doğrula.** Yeni alanlar `nullable` veya `@default(...)` olmalı.
- **Migration sonrası ne yapmak gerekir** söyle: seed mi, manuel veri girişi mi, hiçbir şey mi.
- DB'yi production'a deploy etmeden önce migration dosyasını review et.

**Verify:** "Bu migration prod'da çalışırsa mevcut Reservation/Tour/User verilerini etkiler mi?" Cevap "evet" ise dur, sor.

## C. Admin Panel ↔ Frontend Bağlantısı

12 revizenin en sık tekrarlanan hatası:
- Admin panel'de yeni alan eklendi ✓
- DB'ye yazıldı ✓
- **Frontend'de okunup gösterilmedi ✗** ← her seferinde unutulan adım

**Kural:** Bir admin alanı eklediğinde, mutlaka şu zinciri tamamla:

```
Admin form → Action (DB write) → DB → Page query (DB read) → Component render
```

Her halkayı kendin doğrula. "Admin'den girdim ama sitede görünmüyor" hatası bu zincirin bir noktasında kopuyor demektir.

**Verify:** Yeni alan eklediğinde, admin'den bir test değer gir, sonra public sayfayı aç ve gör.

## D. Mobile + Desktop Beraber Test

Component değişikliği yaparken:

- Component hem mobile hem desktop'ta render ediliyor mu?
- Mobile breakpoint'te (< 640px) layout bozulmuyor mu?
- Mobile'da gizlenen alan (örn. açıklama metni) varsa, kullanıcı önemli bilgiyi kaybetmiyor mu?

**Verify:** DevTools responsive mode ile 360px, 768px, 1024px, 1440px test et.

## E. Slug ve Route Bağlantısı

Tour ve Attraction modellerinde `slug` alanı var. Slug eklediğinde route'ta çalıştığını **manuel test et**:

```
/en/tour/uuid → çalışıyor mu?
/en/tour/slug → çalışıyor mu?
/en/attractions/slug → çalışıyor mu?
```

Sadece DB'ye yazmak yetmez. Page query'sinde `findFirst({ where: { OR: [{ id: param }, { slug: param }] }})` pattern'i olmalı.

**Verify:** Yeni slug girdiğinde URL'i tarayıcıda aç, 200 dönüyor mu?

## F. Modal, toast, overlay — `createPortal` + containing block

**Kök sebep:** `position: fixed` viewport'a göre konumlanır *ancak* üst parent'lardan birinde `transform`, `filter`, `perspective` veya `will-change` varsa, fixed eleman o parent'a göre konumlanır. Örnek: `app/globals.css` içinde `.card:hover { transform: translateY(-4px) }` — içerideki fixed toast/modal mouse ile hover açılıp kapanınca **kayar gibi** görünür.

**Kural — modal, toast, popover, tam ekran overlay:**

- `createPortal(..., document.body)` ile DOM'da `body` direkt çocuğu ol; React ağacında nerede üretildiği fark etmez.
- **SSR / hydration:** `document.body` yalnızca client'ta vardır. `const [mounted, setMounted] = useState(false)` + `useEffect(() => { setMounted(true); }, [])` ile `mounted && open && createPortal(...)` — ilk paint'te portal yok, mismatch olmaz.
- İptal / onay modallarında: **body scroll lock** (`overflow: hidden`, cleanup'ta eski değer), **ESC** ve **backdrop** ile kapanma.
- Z-index: toast (ör. 9999) < tam ekran modal backdrop (daha yüksek) — aynı anda üst üste binmesin.

```tsx
import { createPortal } from 'react-dom';

const [mounted, setMounted] = useState(false);
useEffect(() => { setMounted(true); }, []);

return mounted && open && createPortal(
  <div className="modal-backdrop">...</div>,
  document.body
);
```

Daha önce `AskForPriceModal` ve `WriteReviewModal`'da benzer nedenlerle flicker / kayma yaşandı; sepet toast ve iade politikası modal'ı da aynı pattern'e uyar.

## G. Component Library Limitleri

Şu kütüphanelere bağlıyız, bunların dışında bir UI lib eklemeyin:
- `lucide-react` — ikonlar
- `recharts` — grafikler (kullanılıyorsa)
- Tailwind utility class'ları
- Mevcut design token'lar (`--color-*`, `--space-*`, `--radius-*`)

Yeni bir UI library önermeden önce mevcut çözümle yapılabilir mi sor.

## H. Yeni Dependency

Yeni paket eklemeden önce:
- "Bu olmadan da yapılabilir mi?"
- "Mevcut benzeri var mı?" (`lib/`, `app/components/`)
- "Bundle size kabul edilebilir mi?"

Cevap belirsizse sor.

## I. Promotion / Pricing Hesaplamaları

`lib/promotionPricing.ts` ve `lib/pricingTiers.ts` fiyat hesaplamasının tek doğruluk kaynağı. Her yerde aynı fonksiyonu kullan, paralel hesaplama yapma.

Eğer ürün kartında, tur detayda, sepette, checkout'ta fiyat farklı görünüyorsa — bu fonksiyonların biri çağrılmamış demektir.

## I.b Mobil breakpoint referansı (`globals.css`)

Responsive düzen eklerken tek kaynak `app/globals.css` içindeki `@media` bloklarıdır. Özet karar noktaları:

| Üst sınır | Ne anlama geliyor |
|-----------|-------------------|
| **1024px** | Tablet / dar masaüstü; bazı grid’ler 2–3 sütuna iner. |
| **768px** | Büyük telefon / küçük tablet; nav drawer, hero stack, How It Works tek sütun vb. |
| **640px** | “Gerçek mobil” başlangıcı; tours grid kompakt kart, footer v2 tek sütun (`.site-footer-v2-grid`). |
| **480px** | Dar mobil; anasayfa carousel **1 kart/slide**, tour-type pill sıkılığı, stats band sıkılığı. |
| **360px** | Çok dar ekran; gerektiğinde tours grid **tek sütun**. |

Anasayfa carousel için JS tarafında `itemsPerPage`: `<480` → 1, `<768` → 2, `<1024` → 3, aksi → 4 (`HomeTourCarousel.tsx`). Carousel kartları ile liste grid kartları farklı stillenir: liste `.tours-grid` içinde sade, carousel `.home-tour-carousel` içinde geniş kartta daha zengin.

## J. Test ve Doğrulama

Her promptun sonunda kontrol listesi var. Cursor:

- Madde madde gözden geçir
- Doğrulanmamış adım varsa söyle
- Eksik gördüğün şey varsa "şunu test edemedim" de
- "Tamam" dememeli, "şu test edildi, şu edilmedi" demelisin

## K. E2E Test Yazımı

Playwright testlerinde **content-based locator** (`text=...`) kullanma — pazarlama
metinleri her revize'de değişiyor.

**Onun yerine semantic locator kullan:**
- `getByRole('heading', { level: 1 })` — h1
- `getByRole('banner')` — header
- `getByRole('navigation')` — nav
- `getByRole('contentinfo')` — footer
- `getByRole('button', { name: 'X' })` — button (link değil!)
- `getByRole('link', { name: 'X' })` — link

**Tour/attraction card'larında click etmek yerine href oku:**
```typescript
const href = await link.getAttribute('href');
await page.goto(href!);
```
Çünkü tour-card-clickable yapısında img overlay click'i intercept ediyor.

**Header'daki "Tours" buttondur, link değil** (dropdown trigger). Direkt
`/en/tours`'a navigate ederek test et.

**Vercel rewrite davranışı:** `/.env`, `/package.json` gibi yollar 200 dönebilir
(anasayfaya rewrite). Status code yerine **içerik kontrolü** yap.

**Bu yaklaşım test'lerin uzun ömürlü olmasını sağlar.**

---

# Davranış Şablonu

Her görev başında şu yapıyı kullan:

```markdown
## Assumptions
- ...

## Open questions (varsa)
- ...

## Plan
1. [Adım] → verify: [doğrulama]
2. [Adım] → verify: [doğrulama]

## Implementation
[kod]

## Verification
- [ ] Adım 1 verify edildi: ...
- [ ] Adım 2 verify edildi: ...
- [ ] Test edemediğim noktalar: ...
```

Trivial işler için (tek satır CSS düzeltmesi, typo fix) bu yapı opsiyonel. Her şey için kullanma — yorgun edici olur.

---

**Bu kurallar şunlar gerçekleşirse çalışıyor demektir:**

- Diff'te gereksiz değişiklik yok
- Aynı bug'ı ikinci kez düzeltmiyoruz
- Soru yanıt gerektiren noktalar implementasyon sırasında değil, öncesinde geliyor
- "Admin'den girdim ama sitede görünmüyor" tipi hata azalıyor
- Çevirilerde regression olmuyor

Karpathy:
> "Models make wrong assumptions on your behalf and just run along with them without checking."

Bu dosyanın varlık sebebi tam olarak bunu engellemek.