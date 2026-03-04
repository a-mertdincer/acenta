import 'dotenv/config'
import { createHash } from 'crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set in .env')
const adapter = new PrismaPg({ connectionString: url })
const prisma = new PrismaClient({ adapter })

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex')
}

async function main() {
    await prisma.reservation.deleteMany()
    await prisma.tourDatePrice.deleteMany()
    await prisma.tourOption.deleteMany()
    await prisma.tour.deleteMany()

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
            capacity: 15
        }
    })

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
            titleEn: 'Private Airport Transfer',
            titleTr: 'Özel Havalimanı Transferi',
            titleZh: '私人机场接送',
            descEn: 'VIP transfer to and from Nevşehir or Kayseri airports. 1-4 Pax in Mercedes Vito.',
            descTr: 'Nevşehir veya Kayseri havalimanlarına Mercedes Vito ile VIP transfer. 1-4 Kişi.',
            descZh: '内夫谢希尔或开塞利机场的VIP接送服务。 1-4人在奔驰Vito。',
            basePrice: 50.0,
            capacity: 10
        }
    })

    const userCount = await prisma.user.count()
    if (userCount === 0) {
      await prisma.user.create({
        data: {
          name: 'Admin',
          email: 'admin@acenta.local',
          passwordHash: hashPassword('Admin123!'),
          role: 'ADMIN',
        },
      })
      console.log('Admin user created: admin@acenta.local / Admin123! (please change after first login)')
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
