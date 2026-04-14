import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set in .env')
const adapter = new PrismaPg({ connectionString: url })
const prisma = new PrismaClient({ adapter })

function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10)
}

async function main() {
    await prisma.reservation.deleteMany()
    await prisma.tourDatePrice.deleteMany()
    await prisma.tourOption.deleteMany()
    await prisma.tour.deleteMany()

    // Admin kullanıcısını en başta tanımla (sonraki adımlar hata verse bile admin kalsın)
    const adminEmail = 'admin@acenta.local'
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          name: 'Admin',
          email: adminEmail,
          passwordHash: hashPassword('Admin123!'),
          role: 'ADMIN',
        },
      })
      console.log('Admin user created: admin@acenta.local / Admin123! (please change after first login)')
    } else if (existingAdmin.role !== 'ADMIN') {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: 'ADMIN' },
      })
      console.log('Existing user admin@acenta.local set to ADMIN role.')
    }

    const balloon = await prisma.tour.create({
        data: {
            type: 'BALLOON',
            titleEn: 'Standard Balloon Flight',
            titleTr: 'Standart Balon Turu',
            titleZh: '标准热气球飞行',
            descEn: 'Float above the fairy chimneys at sunrise in our spacious baskets. 1 hour flight with champagne toast.',
            descTr: 'Geniş sepetlerimizde gün doğumunda peribacalarının üzerinde süzülün. Şampanya ikramlı 1 saatlik uçuş.',
            descZh: '在宽敞的吊篮中，在日出时分漂浮在仙女烟囱上方。香槟吐司1小时飞行。',
            basePrice: 150.0,
            capacity: 20
        }
    })

    // Seed dynamic prices for the next 7 days for balloon
    for (let i = 0; i < 7; i++) {
        const d = new Date()
        d.setDate(d.getDate() + i)
        d.setHours(0, 0, 0, 0)

        await prisma.tourDatePrice.create({
            data: {
                tourId: balloon.id,
                date: d,
                price: 150.0 + (i * 10), // Prices increasing artificially for demo
                capacityOverride: 20
            }
        })
    }

    const greenTour = await prisma.tour.create({
        data: {
            type: 'TOUR',
            titleEn: 'Cappadocia Green Tour',
            titleTr: 'Kapadokya Yeşil Tur',
            titleZh: '卡帕多奇亚绿线之旅',
            descEn: 'Explore the underground city, hike in Ihlara Valley and visit Selime Monastery. Includes lunch.',
            descTr: 'Yeraltı şehrini keşfedin, Ihlara Vadisinde yürüyüş yapın ve Selime Manastırını ziyaret edin. Öğle yemeği dahildir.',
            descZh: '探索地下城，在伊赫拉拉山谷徒步旅行，并参观塞利梅修道院。包括午餐。',
            basePrice: 40.0,
            capacity: 15,
            hasTourType: true,
            destination: 'cappadocia',
            category: 'daily-tours',
        }
    })

    // Seed variants for Green Tour (Eco/Plus × Regular/Private) — tek kart çoklu seçenek
    try {
        await (prisma as any).tourVariant.createMany({
            data: [
                { tourId: greenTour.id, tourType: 'eco', reservationType: 'regular', airport: null, titleEn: 'Regular Eco Green Tour', titleTr: 'Paylaşımlı Eko Yeşil Tur', titleZh: '拼团经济绿线', descEn: 'Compact 4-hour group tour. English only.', descTr: '4 saatlik kompakt grup turu. Sadece İngilizce.', descZh: '4小时紧凑团体游。仅英语。', includes: ['Air-conditioned vehicle', 'Guide'], excludes: ['Lunch', 'Museum entries'], duration: '4 hours', adultPrice: 45, childPrice: 35, pricingType: 'per_person', sortOrder: 0, maxGroupSize: 12 },
                { tourId: greenTour.id, tourType: 'eco', reservationType: 'private', airport: null, titleEn: 'Private Eco Green Tour', titleTr: 'Özel Eko Yeşil Tur', titleZh: '包车经济绿线', descEn: 'Private 4-hour tour for your group only.', descTr: 'Sadece sizin grubunuz için özel 4 saatlik tur.', descZh: '仅限您团体的4小时私人游。', includes: ['Private vehicle', 'Guide'], excludes: ['Lunch'], duration: '4 hours', adultPrice: 280, childPrice: null, pricingType: 'per_vehicle', sortOrder: 1, isRecommended: true },
                { tourId: greenTour.id, tourType: 'plus', reservationType: 'regular', airport: null, titleEn: 'Regular Plus Green Tour', titleTr: 'Paylaşımlı Plus Yeşil Tur', titleZh: '拼团升级绿线', descEn: 'Full 8-hour tour with lunch. Multi-language.', descTr: 'Öğle yemeği dahil 8 saatlik tam tur. Çok dilli.', descZh: '含午餐8小时全程游。多语种。', includes: ['Lunch', 'Vehicle', 'Guide', 'Museum entries'], excludes: [], duration: '8 hours', adultPrice: 75, childPrice: 55, pricingType: 'per_person', sortOrder: 2, maxGroupSize: 15 },
                { tourId: greenTour.id, tourType: 'plus', reservationType: 'private', airport: null, titleEn: 'Private Plus Green Tour', titleTr: 'Özel Plus Yeşil Tur', titleZh: '包车升级绿线', descEn: 'Full private 8-hour tour with lunch.', descTr: 'Öğle yemeği dahil 8 saatlik özel tam tur.', descZh: '含午餐8小时私人全程游。', includes: ['Lunch', 'Private vehicle', 'Guide', 'Museum entries'], excludes: [], duration: '8 hours', adultPrice: 450, childPrice: null, pricingType: 'per_vehicle', sortOrder: 3 },
            ]
        })
        console.log('Green Tour: 4 variants created.')
    } catch (e) {
        console.warn('Green Tour variants not created (run npx prisma generate if needed):', (e as Error)?.message)
    }

    // Seed Add-on options for Green Tour
    await prisma.tourOption.createMany({
        data: [
            { tourId: greenTour.id, titleEn: 'Vegetarian Lunch', titleTr: 'Vejetaryen Menü', titleZh: '素食午餐', priceAdd: 0 },
            { tourId: greenTour.id, titleEn: 'Private Guide', titleTr: 'Özel Rehber', titleZh: '私人导游', priceAdd: 50.0 }
        ]
    })

    const transfer = await prisma.tour.create({
        data: {
            type: 'TRANSFER',
            titleEn: 'Airport Transfer',
            titleTr: 'Havalimanı Transferi',
            titleZh: '机场接送',
            descEn: 'Transfer to and from Nevşehir or Kayseri airports. Shuttle or private.',
            descTr: 'Nevşehir veya Kayseri havalimanlarına transfer. Paylaşımlı veya özel.',
            descZh: '内夫谢希尔或开塞利机场接送。拼车或包车。',
            basePrice: 50.0,
            capacity: 10,
            hasAirportSelect: true,
            destination: 'cappadocia',
            category: 'transfers',
        }
    })

    // Transfer varyantları: NAV/ASR × Regular/Private (tek kart çoklu seçenek)
    try {
        const tv = (prisma as any).tourVariant
        if (tv?.createMany) {
            await tv.createMany({
                data: [
                    { tourId: transfer.id, tourType: null, reservationType: 'regular', airport: 'NAV', titleEn: 'Shuttle — Nevşehir (NAV)', titleTr: 'Paylaşımlı — Nevşehir (NAV)', titleZh: '拼车 — 内夫谢希尔', descEn: 'Shared shuttle from Nevşehir airport. ~40 min to Göreme.', descTr: 'Nevşehir havalimanından paylaşımlı shuttle. Göreme ~40 dk.', descZh: '内夫谢希尔机场拼车。至格雷梅约40分钟。', includes: ['Wi-Fi', 'A/C'], excludes: ['Door-to-door'], duration: '~40 min', adultPrice: 15, childPrice: null, pricingType: 'per_person', sortOrder: 0, maxGroupSize: 8 },
                    { tourId: transfer.id, tourType: null, reservationType: 'regular', airport: 'ASR', titleEn: 'Shuttle — Kayseri (ASR)', titleTr: 'Paylaşımlı — Kayseri (ASR)', titleZh: '拼车 — 开塞利', descEn: 'Shared shuttle from Kayseri airport. ~75 min to Göreme.', descTr: 'Kayseri havalimanından paylaşımlı shuttle. Göreme ~75 dk.', descZh: '开塞利机场拼车。至格雷梅约75分钟。', includes: ['Wi-Fi', 'A/C'], excludes: ['Door-to-door'], duration: '~75 min', adultPrice: 20, childPrice: null, pricingType: 'per_person', sortOrder: 1, maxGroupSize: 8 },
                    { tourId: transfer.id, tourType: null, reservationType: 'private', airport: 'NAV', titleEn: 'Private — Nevşehir (NAV)', titleTr: 'Özel — Nevşehir (NAV)', titleZh: '包车 — 内夫谢希尔', descEn: 'Private transfer from Nevşehir. Door-to-door, ~40 min.', descTr: 'Nevşehir özel transfer. Kapıdan kapıya, ~40 dk.', descZh: '内夫谢希尔包车。门到门，约40分钟。', includes: ['Door-to-door', 'Flight tracking', 'A/C'], excludes: [], duration: '~40 min', adultPrice: 90, childPrice: null, pricingType: 'per_vehicle', sortOrder: 2, isRecommended: true },
                    { tourId: transfer.id, tourType: null, reservationType: 'private', airport: 'ASR', titleEn: 'Private — Kayseri (ASR)', titleTr: 'Özel — Kayseri (ASR)', titleZh: '包车 — 开塞利', descEn: 'Private transfer from Kayseri. Door-to-door, ~75 min.', descTr: 'Kayseri özel transfer. Kapıdan kapıya, ~75 dk.', descZh: '开塞利包车。门到门，约75分钟。', includes: ['Door-to-door', 'Flight tracking', 'A/C'], excludes: [], duration: '~75 min', adultPrice: 120, childPrice: null, pricingType: 'per_vehicle', sortOrder: 3 },
                ]
            })
            console.log('Transfer: 4 variants created (NAV/ASR × Shuttle/Private)')
        }
    } catch (e) {
        console.warn('Transfer variants not created (run: npx prisma generate).', e)
    }

    const messagingDefaults = [
        { key: 'whatsapp_link', value: 'https://wa.me/905362115993' },
        { key: 'wechat_id', value: 'kismetgoreme' },
        { key: 'line_link', value: 'https://line.me/ti/p/~kismetgoreme' },
    ] as const
    for (const d of messagingDefaults) {
        await prisma.siteSetting.upsert({
            where: { key: d.key },
            create: { key: d.key, value: d.value },
            update: {},
        })
    }

    console.log('Seed data inserted successfully')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        const msg = e?.message || String(e)
        const isConnectionRefused = msg.includes('ECONNREFUSED') || e?.code === 'ECONNREFUSED'
        if (isConnectionRefused) {
            console.error('')
            console.error('Veritabanına bağlanılamadı (ECONNREFUSED).')
            console.error('  • PostgreSQL sunucusu çalışıyor mu? (örn. servis olarak veya Docker)')
            console.error('  • .env dosyasında DATABASE_URL doğru mu? (host, port, kullanıcı, şifre)')
            console.error('  Örnek: postgresql://kullanici:sifre@localhost:5432/veritabani')
            console.error('')
            console.error('Could not connect to database (ECONNREFUSED).')
            console.error('  • Is PostgreSQL running?')
            console.error('  • Is DATABASE_URL in .env correct?')
        } else {
            console.error(e)
        }
        await prisma.$disconnect()
        process.exit(1)
    })
