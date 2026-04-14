import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set in .env')

const adapter = new PrismaPg({ connectionString: url })
const prisma = new PrismaClient({ adapter })

const TOURS_DIR = path.join(process.cwd(), 'public', 'images', 'tours')

/** titleEn substring → folder under public/images/tours/ */
const TOUR_IMAGE_MAP: Record<string, string> = {
  // Adventure Activities
  'Cappadocia ATV Tour': 'adventures-activities/atv',
  'Cappadocia Nostalgic E-Bike Tour': 'adventures-activities/vintage-e-bike-tour',
  'Cappadocia Camel Riding Tour': 'adventures-activities/camel-riding',
  'Cappadocia Classic Car Tour': 'adventures-activities/classic-car',
  'Cappadocia Hiking Tour': 'adventures-activities/hiking',
  'Cappadocia Horse Riding Tour': 'adventures-activities/horseback-riding',
  'Cappadocia Jeep Safari Tour': 'adventures-activities/jeep-safari',

  // Balloon Flights (longer keys first — handled via MAP_KEYS_SORTED)
  'Cappadocia Hot Air Balloon Flight - Göreme': 'balloon/balon-goreme',
  'Cappadocia Hot Air Balloon Flight - Cat Valley': 'balloon/balon-cat-valley',
  'Cappadocia Hot Air Balloon Flight - Ihlara Valley': 'balloon/balon-ihlara-valley',
  'Cappadocia Hot Air Balloon Flight - Soğanlı Valley': 'balloon/balon-soganli-valley',
  'Cappadocia Hot Air Balloon Flight -Soğanlı Valley': 'balloon/balon-soganli-valley',

  // Concierge
  'Cappadocia Professional Photo Shooting': 'concierge/phtosooting-with-professional-photpgarepher',

  // Daily Tours
  'Cappadocia Green Tour': 'daily-tours/green-tour',
  'Cappadocia Red Tour': 'daily-tours/red-tour',
  'Cappadocia Blue Tour': 'daily-tours/blue-tour',
  'Cappadocia Mix Tour 1': 'daily-tours/mix-tour',
  'Cappadocia Mix Tour 2': 'daily-tours/mix-tour',
  'Cappadocia Customized Tour': 'daily-tours/costumize-tour',
  'Cappadocia Photo Tour': 'daily-tours/mix-tour',
  'Cappadocia Hidden Tour': 'daily-tours/green-tour',

  // Balloon extras
  'Cappadocia Balloon Sunrise Breakfast': 'balloon/balon-goreme',
  'Cappadocia Balloon Watching Tour': 'balloon/balon-goreme',

  // Transfer
  'Cappadocia Airport Transfer': 'transfer/airport-transfer',
  'Cappadocia Car Rental': 'transfer/rent-a-car',

  // Cultural Activities (when titleEn matches)
  'Cappadocia Vineyard Tour': 'cultural-activities/vineyard-tour',
  'Cappadocia Wine Tasting': 'cultural-activities/wine-tasting',
  'Whirling Dervish Ceremony': 'cultural-activities/dervis-ceremony',
  'Turkish Bath Experience': 'cultural-activities/hamam',
  'Turkish Night Show': 'cultural-activities/turk-gecesi',
  'Vineyard Tour': 'cultural-activities/vineyard-tour',
  'Wine Tasting': 'cultural-activities/wine-tasting',

  // Workshops
  'Cappadocia Local Cooking Class': 'workshops/local-cooking-class',
  'Local Cooking Class': 'workshops/local-cooking-class',
  'Cappadocia Pottery Workshop': 'workshops/pottry-workshops',
  'Pottery Workshop': 'workshops/pottry-workshops',
  'Cappadocia Turkish Coffee Workshop': 'workshops/turkish-coffee-workshops',
  'Turkish Coffee Workshop': 'workshops/turkish-coffee-workshops',
}

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])

/** Longest keys first so specific titles win over shorter substrings. */
const MAP_KEYS_SORTED = Object.keys(TOUR_IMAGE_MAP).sort((a, b) => b.length - a.length)

function findMapKey(titleEn: string): string | null {
  for (const key of MAP_KEYS_SORTED) {
    if (titleEn.includes(key)) {
      return key
    }
  }
  return null
}

/** Encode each path segment for spaces and non-ASCII file names. */
function publicUrlForRelativePath(relativeDir: string, fileName: string): string {
  const segments = [...relativeDir.split('/').filter(Boolean), fileName]
  return `/images/tours/${segments.map((seg) => encodeURIComponent(seg)).join('/')}`
}

function getImagesFromDir(dirPath: string): string[] {
  const fullPath = path.join(TOURS_DIR, dirPath)
  if (!fs.existsSync(fullPath)) {
    console.warn(`  ⚠ Klasör bulunamadı: ${fullPath}`)
    return []
  }
  return fs
    .readdirSync(fullPath)
    .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map((f) => publicUrlForRelativePath(dirPath, f))
}

async function main(): Promise<void> {
  const tours = await prisma.tour.findMany({
    include: { images: true },
    orderBy: { titleEn: 'asc' },
  })

  console.log(`Toplam ${tours.length} tur bulundu.\n`)

  let seeded = 0
  let skipped = 0
  let noMatch = 0
  let emptyDir = 0

  for (const tour of tours) {
    if (tour.images.length > 0) {
      console.log(`⏩ ${tour.titleEn} — zaten ${tour.images.length} görsel var, atlanıyor`)
      skipped++
      continue
    }

    const mapKey = findMapKey(tour.titleEn)
    if (!mapKey) {
      console.log(`❌ ${tour.titleEn} — eşleşen klasör bulunamadı`)
      noMatch++
      continue
    }

    const dirPath = TOUR_IMAGE_MAP[mapKey]
    const images = getImagesFromDir(dirPath)

    if (images.length === 0) {
      console.log(`❌ ${tour.titleEn} → ${dirPath} — klasörde görsel yok`)
      emptyDir++
      continue
    }

    await prisma.tourImage.createMany({
      data: images.map((imageUrl, i) => ({
        tourId: tour.id,
        url: imageUrl,
        isPrimary: i === 0,
        sortOrder: i,
      })),
    })

    console.log(`✅ ${tour.titleEn} → ${images.length} görsel eklendi (${dirPath})`)
    seeded++
  }

  console.log('\n--- Sonuç ---')
  console.log(`Görsel eklenen: ${seeded} tur`)
  console.log(`Atlanan (mevcut görsel): ${skipped} tur`)
  console.log(`Eşleşme yok: ${noMatch} tur`)
  console.log(`Boş klasör: ${emptyDir} tur`)
  console.log(`Toplam tur: ${tours.length}`)
}

main()
  .catch((err: unknown) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
