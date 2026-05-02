/**
 * Bulk EN → 10 locales (DeepL) for existing Tour, Attraction, TourVariant, TourOption rows.
 *
 *   npx tsx scripts/bulk-translate.ts --dry-run
 *   npx tsx scripts/bulk-translate.ts
 *   npx tsx scripts/bulk-translate.ts --only=tours --tour-id=<uuid>
 *
 * Resume: re-run skips language slices that are already complete for each row.
 */
import 'dotenv/config';

import { PrismaClient, type Tour, type Attraction, type TourVariant, type TourOption } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type { Prisma } from '@prisma/client';

import {
  DeepLAllKeysExhaustedError,
  getDeepLUsage,
  translateBatch,
  translateText,
  TARGET_LANGS,
} from '../lib/deeplTranslate';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ONLY_TOURS = args.includes('--only=tours');
const ONLY_ATTRACTIONS = args.includes('--only=attractions');
const ONLY_VARIANTS = args.includes('--only=variants');
const ONLY_OPTIONS = args.includes('--only=options');
const SPECIFIC_TOUR_ID = args.find((a) => a.startsWith('--tour-id='))?.split('=')[1]?.trim();

const ANY_ONLY = ONLY_TOURS || ONLY_ATTRACTIONS || ONLY_VARIANTS || ONLY_OPTIONS;

function shouldRun(section: 'tours' | 'attractions' | 'variants' | 'options'): boolean {
  if (!ANY_ONLY) return true;
  switch (section) {
    case 'tours':
      return ONLY_TOURS;
    case 'attractions':
      return ONLY_ATTRACTIONS;
    case 'variants':
      return ONLY_VARIANTS;
    case 'options':
      return ONLY_OPTIONS;
    default:
      return false;
  }
}

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error('DATABASE_URL is not set in .env');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------

let charsTranslated = 0;

function noteTranslatedChars(texts: string[]): void {
  charsTranslated += texts.reduce((s, t) => s + t.length, 0);
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

type FaqPair = { question: string; answer: string };

function normalizeFaqs(value: unknown): FaqPair[] {
  if (!Array.isArray(value)) return [];
  const out: FaqPair[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const q = 'question' in item && typeof item.question === 'string' ? item.question : '';
    const a = 'answer' in item && typeof item.answer === 'string' ? item.answer : '';
    out.push({ question: q, answer: a });
  }
  return out;
}

function meaningfulFaqs(value: unknown): FaqPair[] {
  return normalizeFaqs(value).filter((f) => f.question.trim().length > 0 || f.answer.trim().length > 0);
}

// ---------------------------------------------------------------------------
// Tour
// ---------------------------------------------------------------------------

const TOUR_TRANSLATABLE_FIELDS = [
  'title',
  'desc',
  'highlights',
  'itinerary',
  'knowBefore',
  'notSuitable',
  'notAllowed',
  'whatsIncluded',
  'notIncluded',
  'cancellationNote',
  'ageRestriction',
] as const;

type TourTranslatableField = (typeof TOUR_TRANSLATABLE_FIELDS)[number];

function tourLocalizedValue(tour: Tour, base: TourTranslatableField, suffix: string): string | null {
  const key = `${base}${suffix}` as keyof Tour;
  const v = tour[key];
  return typeof v === 'string' ? v : null;
}

function tourEnValue(tour: Tour, base: TourTranslatableField): string | null {
  const key = `${base}En` as keyof Tour;
  const v = tour[key];
  return typeof v === 'string' ? v : null;
}

function tourNeedsLangSlice(tour: Tour, suffix: string): boolean {
  for (const field of TOUR_TRANSLATABLE_FIELDS) {
    const en = tourEnValue(tour, field);
    if (!nonEmptyString(en)) continue;
    const loc = tourLocalizedValue(tour, field, suffix);
    if (!nonEmptyString(loc)) return true;
  }

  const faqsEn = meaningfulFaqs(tour.faqsEn);
  if (faqsEn.length === 0) return false;

  const locKey = `faqs${suffix}` as keyof Tour;
  const faqsLoc = meaningfulFaqs(tour[locKey]);
  if (faqsLoc.length !== faqsEn.length) return true;
  for (let i = 0; i < faqsEn.length; i += 1) {
    if (!nonEmptyString(faqsLoc[i]?.question) || !nonEmptyString(faqsLoc[i]?.answer)) return true;
  }
  return false;
}

async function translateAllTours(): Promise<void> {
  console.log('\n=== TOURS ===');

  const where = SPECIFIC_TOUR_ID ? { id: SPECIFIC_TOUR_ID } : {};
  const tours = await prisma.tour.findMany({ where });
  console.log(`Found ${tours.length} tour(s)`);
  if (SPECIFIC_TOUR_ID && tours.length === 0) {
    console.warn(`No tour with id=${SPECIFIC_TOUR_ID}`);
  }

  for (let i = 0; i < tours.length; i += 1) {
    const tour = tours[i];
    console.log(`\n[${i + 1}/${tours.length}] ${tour.titleEn}`);

    for (const lang of TARGET_LANGS) {
      if (!tourNeedsLangSlice(tour, lang.suffix)) {
        console.log(`  (skip ${lang.deepl} — already complete)`);
        continue;
      }

      const textsToTranslate: { field: TourTranslatableField; text: string }[] = [];
      for (const field of TOUR_TRANSLATABLE_FIELDS) {
        const en = tourEnValue(tour, field);
        if (!nonEmptyString(en)) continue;
        const loc = tourLocalizedValue(tour, field, lang.suffix);
        if (nonEmptyString(loc)) continue;
        textsToTranslate.push({ field, text: en });
      }

      const faqsEn = meaningfulFaqs(tour.faqsEn);
      const locKeyFaqs = `faqs${lang.suffix}` as keyof Tour;
      const faqsLocExisting = meaningfulFaqs(tour[locKeyFaqs]);
      const needFaqs =
        faqsEn.length > 0 &&
        (faqsLocExisting.length !== faqsEn.length ||
          faqsEn.some((_, idx) => {
            const pair = faqsLocExisting[idx];
            return !pair || !nonEmptyString(pair.question) || !nonEmptyString(pair.answer);
          }));

      if (textsToTranslate.length === 0 && !needFaqs) {
        console.log(`  (skip ${lang.deepl} — nothing to fill)`);
        continue;
      }

      const faqFlat: string[] = [];
      if (needFaqs) {
        faqsEn.forEach((f) => {
          faqFlat.push(f.question, f.answer);
        });
      }

      const totalChars =
        textsToTranslate.reduce((s, t) => s + t.text.length, 0) + faqFlat.reduce((s, t) => s + t.length, 0);
      console.log(
        `  → ${lang.deepl}: ${textsToTranslate.length} text field(s), faq pairs: ${needFaqs ? faqsEn.length : 0} (~${totalChars} chars)`
      );

      if (DRY_RUN) continue;

      try {
        const updateData: Record<string, unknown> = {};

        if (textsToTranslate.length > 0) {
          const translated = await translateBatch(
            textsToTranslate.map((t) => t.text),
            { sourceLang: 'EN', targetLang: lang.deepl }
          );
          noteTranslatedChars(textsToTranslate.map((t) => t.text));
          textsToTranslate.forEach((t, idx) => {
            const suffixedField = `${t.field}${lang.suffix}`;
            updateData[suffixedField] = translated[idx];
          });
        }

        if (needFaqs && faqFlat.length > 0) {
          const faqTranslated = await translateBatch(faqFlat, {
            sourceLang: 'EN',
            targetLang: lang.deepl,
          });
          noteTranslatedChars(faqFlat);
          const faqsResult: FaqPair[] = [];
          for (let j = 0; j < faqTranslated.length; j += 2) {
            faqsResult.push({
              question: faqTranslated[j] ?? '',
              answer: faqTranslated[j + 1] ?? '',
            });
          }
          updateData[`faqs${lang.suffix}`] = faqsResult;
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.tour.update({
            where: { id: tour.id },
            data: updateData as Prisma.TourUncheckedUpdateInput,
          });
        }

        console.log(`  OK ${lang.deepl} (${Object.keys(updateData).length} key(s))`);
        refreshTourLocals(tour, updateData);
      } catch (err) {
        if (err instanceof DeepLAllKeysExhaustedError) throw err;
        console.error(`  ERR ${lang.deepl}:`, err instanceof Error ? err.message : err);
      }
    }
  }

}

/** Keep in-memory row in sync so same run can skip completed slices */
function refreshTourLocals(tour: Tour, updateData: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(updateData)) {
    if (k.startsWith('faqs')) {
      (tour as Record<string, unknown>)[k] = v;
    } else if (typeof v === 'string' || v == null) {
      (tour as Record<string, unknown>)[k] = v;
    }
  }
}

// ---------------------------------------------------------------------------
// Attraction
// ---------------------------------------------------------------------------

function attractionNeedsLangSlice(attr: Attraction, suffix: string): boolean {
  if (nonEmptyString(attr.nameEn) && !nonEmptyString(attr[`name${suffix}` as keyof Attraction] as unknown)) {
    return true;
  }
  if (
    nonEmptyString(attr.descriptionEn) &&
    !nonEmptyString(attr[`description${suffix}` as keyof Attraction] as unknown)
  ) {
    return true;
  }
  return false;
}

async function translateAllAttractions(): Promise<void> {
  console.log('\n=== ATTRACTIONS ===');

  const attractions = await prisma.attraction.findMany();
  console.log(`Found ${attractions.length} attraction(s)`);

  for (let i = 0; i < attractions.length; i += 1) {
    const attr = attractions[i];
    console.log(`\n[${i + 1}/${attractions.length}] ${attr.nameEn}`);

    for (const lang of TARGET_LANGS) {
      if (!attractionNeedsLangSlice(attr, lang.suffix)) {
        console.log(`  (skip ${lang.deepl} — already complete)`);
        continue;
      }

      const texts: { field: 'name' | 'description'; text: string }[] = [];
      if (nonEmptyString(attr.nameEn) && !nonEmptyString(attr[`name${lang.suffix}` as keyof Attraction] as string)) {
        texts.push({ field: 'name', text: attr.nameEn });
      }
      if (
        nonEmptyString(attr.descriptionEn) &&
        !nonEmptyString(attr[`description${lang.suffix}` as keyof Attraction] as string)
      ) {
        texts.push({ field: 'description', text: attr.descriptionEn! });
      }

      if (texts.length === 0) continue;

      console.log(`  → ${lang.deepl}: ${texts.length} field(s)`);
      if (DRY_RUN) continue;

      try {
        const translated = await translateBatch(
          texts.map((t) => t.text),
          { sourceLang: 'EN', targetLang: lang.deepl }
        );
        noteTranslatedChars(texts.map((t) => t.text));

        const updateData: Record<string, string | null> = {};
        texts.forEach((t, idx) => {
          updateData[`${t.field}${lang.suffix}`] = translated[idx];
        });

        await prisma.attraction.update({
          where: { id: attr.id },
          data: updateData as Prisma.AttractionUncheckedUpdateInput,
        });
        console.log(`  OK ${lang.deepl}`);
        Object.assign(attr, updateData);
      } catch (err) {
        if (err instanceof DeepLAllKeysExhaustedError) throw err;
        console.error(`  ERR ${lang.deepl}:`, err instanceof Error ? err.message : err);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// TourVariant
// ---------------------------------------------------------------------------

function variantNeedsLangSlice(v: TourVariant, suffix: string): boolean {
  if (nonEmptyString(v.titleEn) && !nonEmptyString(v[`title${suffix}` as keyof TourVariant] as string)) {
    return true;
  }
  if (nonEmptyString(v.descEn) && !nonEmptyString(v[`desc${suffix}` as keyof TourVariant] as string)) {
    return true;
  }
  return false;
}

async function translateAllVariants(): Promise<void> {
  console.log('\n=== TOUR VARIANTS ===');

  const variants = await prisma.tourVariant.findMany();
  console.log(`Found ${variants.length} variant(s)`);

  for (let i = 0; i < variants.length; i += 1) {
    const v = variants[i];
    console.log(`\n[${i + 1}/${variants.length}] ${v.titleEn}`);

    for (const lang of TARGET_LANGS) {
      if (!variantNeedsLangSlice(v, lang.suffix)) {
        console.log(`  (skip ${lang.deepl} — already complete)`);
        continue;
      }

      const texts: { field: 'title' | 'desc'; text: string }[] = [];
      if (nonEmptyString(v.titleEn) && !nonEmptyString(v[`title${lang.suffix}` as keyof TourVariant] as string)) {
        texts.push({ field: 'title', text: v.titleEn });
      }
      if (nonEmptyString(v.descEn) && !nonEmptyString(v[`desc${lang.suffix}` as keyof TourVariant] as string)) {
        texts.push({ field: 'desc', text: v.descEn });
      }
      if (texts.length === 0) continue;

      console.log(`  → ${lang.deepl}: ${texts.length} field(s)`);
      if (DRY_RUN) continue;

      try {
        const translated = await translateBatch(
          texts.map((t) => t.text),
          { sourceLang: 'EN', targetLang: lang.deepl }
        );
        noteTranslatedChars(texts.map((t) => t.text));

        const updateData: Record<string, string | null> = {};
        texts.forEach((t, idx) => {
          updateData[`${t.field}${lang.suffix}`] = translated[idx];
        });

        await prisma.tourVariant.update({
          where: { id: v.id },
          data: updateData as Prisma.TourVariantUncheckedUpdateInput,
        });
        console.log(`  OK ${lang.deepl}`);
        Object.assign(v, updateData);
      } catch (err) {
        if (err instanceof DeepLAllKeysExhaustedError) throw err;
        console.error(`  ERR ${lang.deepl}:`, err instanceof Error ? err.message : err);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// TourOption
// ---------------------------------------------------------------------------

function optionNeedsLangSlice(opt: TourOption, suffix: string): boolean {
  return (
    nonEmptyString(opt.titleEn) && !nonEmptyString(opt[`title${suffix}` as keyof TourOption] as string)
  );
}

async function translateAllOptions(): Promise<void> {
  console.log('\n=== TOUR OPTIONS ===');

  const options = await prisma.tourOption.findMany();
  console.log(`Found ${options.length} option(s)`);

  let optIdx = 0;
  for (const opt of options) {
    optIdx += 1;
    const label = opt.titleEn.slice(0, 60);

    for (const lang of TARGET_LANGS) {
      if (!optionNeedsLangSlice(opt, lang.suffix)) continue;
      if (!nonEmptyString(opt.titleEn)) continue;

      console.log(`\n[option ${optIdx}/${options.length}] ${label} → ${lang.deepl}`);
      if (DRY_RUN) continue;

      try {
        const translated = await translateText(opt.titleEn, {
          sourceLang: 'EN',
          targetLang: lang.deepl,
        });
        if (nonEmptyString(opt.titleEn)) {
          noteTranslatedChars([opt.titleEn]);
        }

        await prisma.tourOption.update({
          where: { id: opt.id },
          data: { [`title${lang.suffix}`]: translated } as Prisma.TourOptionUncheckedUpdateInput,
        });
        console.log(`  OK ${lang.deepl}`);
        (opt as Record<string, unknown>)[`title${lang.suffix}`] = translated;
      } catch (err) {
        if (err instanceof DeepLAllKeysExhaustedError) throw err;
        console.error(`  ERR ${lang.deepl}:`, err instanceof Error ? err.message : err);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (DRY_RUN) {
    console.log('DRY RUN — no DeepL translate calls, no DB writes\n');
  }

  let usageStart: Awaited<ReturnType<typeof getDeepLUsage>> = [];

  if (!DRY_RUN) {
    console.log('Initial DeepL quota:');
    usageStart = await getDeepLUsage();
    usageStart.forEach((u) => {
      const pct = u.percentage != null ? `${u.percentage}%` : 'n/a';
      console.log(
        `  ${u.keyHint} (${u.isPro ? 'PRO' : 'FREE'}): ${u.used.toLocaleString()} / ${u.limit.toLocaleString()} (${pct})`
      );
    });

    if (usageStart.length === 0) {
      console.error('\nNo DeepL keys configured or usage fetch failed for all keys.');
      process.exit(1);
    }

    const totalRemaining = usageStart.reduce((sum, u) => sum + Math.max(0, u.limit - u.used), 0);
    console.log(`\nTotal remaining (reported): ${totalRemaining.toLocaleString()} characters\n`);

    if (totalRemaining < 50_000) {
      console.warn('Low quota warning (< 50K chars reported). Consider more keys before a full run.\n');
    }
  }

  try {
    if (shouldRun('tours')) await translateAllTours();
    if (shouldRun('attractions')) await translateAllAttractions();
    if (shouldRun('variants')) await translateAllVariants();
    if (shouldRun('options')) await translateAllOptions();
  } catch (err) {
    if (err instanceof DeepLAllKeysExhaustedError) {
      console.error('\nALL KEYS EXHAUSTED');
      console.error('Add more DEEPL_API_KEY_* entries or wait for quota reset.');
      console.error('Progress is saved per row; re-run to continue.');
      await printFinalUsage(usageStart);
      await prisma.$disconnect();
      process.exit(0);
    }
    throw err;
  }

  console.log(`\nCharacters sent to DeepL (this run): ~${charsTranslated.toLocaleString()}`);

  if (!DRY_RUN) {
    await printFinalUsage(usageStart);
  }

  await prisma.$disconnect();
  console.log('\nDone.');
}

async function printFinalUsage(usageStart: Awaited<ReturnType<typeof getDeepLUsage>>): Promise<void> {
  if (DRY_RUN) return;
  console.log('\nFinal DeepL quota:');
  const usageEnd = await getDeepLUsage();
  usageEnd.forEach((u) => {
    const initial = usageStart.find((s) => s.keyHint === u.keyHint);
    const consumed = initial ? u.used - initial.used : u.used;
    const pct = u.percentage != null ? `${u.percentage}%` : 'n/a';
    console.log(
      `  ${u.keyHint}: ${u.used.toLocaleString()} / ${u.limit.toLocaleString()} (${pct}) — delta ${consumed.toLocaleString()}`
    );
  });
}

main().catch((err: unknown) => {
  console.error(err);
  void prisma.$disconnect();
  process.exit(1);
});
