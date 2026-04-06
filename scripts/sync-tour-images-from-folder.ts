import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../lib/prisma';

type MappingRule = {
  folder: string;
  matchers: string[];
};

const ROOT = process.cwd();
const SOURCE_ROOT = path.join(ROOT, 'turlar-fotolar');
const TARGET_ROOT = path.join(ROOT, 'public', 'uploads', 'tours');

const RULES: MappingRule[] = [
  {
    folder: 'transfer/airport-transfer',
    matchers: ['airport transfer', 'transfer'],
  },
  {
    folder: 'daily-tours/green-tour',
    matchers: ['green tour'],
  },
  {
    folder: 'balloon/balon-ihlara-valley',
    matchers: ['ihlara valley', 'ihlara'],
  },
  {
    folder: 'balloon/balon-goreme',
    matchers: ['goreme', 'göreme'],
  },
  {
    folder: 'cultural-activities/dervis-ceremony',
    matchers: ['dervish', 'dervis'],
  },
  {
    folder: 'cultural-activities/turk-gecesi',
    matchers: ['turkish night', 'turki', 'gecesi'],
  },
];

function isImageFile(filePath: string): boolean {
  return /\.(jpe?g|png|webp)$/i.test(filePath);
}

function listImagesRecursively(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const stack = [dir];
  const out: string[] = [];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
      } else if (entry.isFile() && isImageFile(abs)) {
        out.push(abs);
      }
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function sanitizeFilename(name: string): string {
  const ext = path.extname(name).toLowerCase();
  const base = path.basename(name, ext);
  const safe = base
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
  return `${safe || 'image'}${ext}`;
}

function includesAny(text: string, needles: string[]): boolean {
  const lower = text.toLowerCase();
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

async function run() {
  const tours = await prisma.tour.findMany({
    select: { id: true, titleEn: true, titleTr: true },
  });

  fs.mkdirSync(TARGET_ROOT, { recursive: true });

  for (const rule of RULES) {
    const sourceDir = path.join(SOURCE_ROOT, rule.folder);
    const images = listImagesRecursively(sourceDir).slice(0, 14);
    if (images.length === 0) {
      console.log(`[skip] no images in folder: ${rule.folder}`);
      continue;
    }

    const matched = tours.find((tour) =>
      includesAny(`${tour.titleEn} ${tour.titleTr}`, rule.matchers)
    );
    if (!matched) {
      console.log(`[skip] no matching tour for folder: ${rule.folder}`);
      continue;
    }

    const tourTargetDir = path.join(TARGET_ROOT, matched.id);
    fs.mkdirSync(tourTargetDir, { recursive: true });

    const copiedUrls: string[] = [];
    for (let i = 0; i < images.length; i += 1) {
      const src = images[i];
      const safeName = `${String(i + 1).padStart(2, '0')}-${sanitizeFilename(path.basename(src))}`;
      const dest = path.join(tourTargetDir, safeName);
      fs.copyFileSync(src, dest);
      copiedUrls.push(`/uploads/tours/${matched.id}/${safeName}`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.tourImage.deleteMany({ where: { tourId: matched.id } });
      for (let i = 0; i < copiedUrls.length; i += 1) {
        await tx.tourImage.create({
          data: {
            tourId: matched.id,
            url: copiedUrls[i],
            isPrimary: i === 0,
            sortOrder: i,
            altEn: matched.titleEn,
            altTr: matched.titleTr,
            altZh: matched.titleEn,
          },
        });
      }
    });

    console.log(`[ok] ${matched.titleEn} <= ${rule.folder} (${copiedUrls.length} image)`);
  }
}

run()
  .then(async () => {
    await prisma.$disconnect();
    console.log('done');
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
