/**
 * Orchestrates EN → 10 locale DeepL batches for tours / attractions / FAQs.
 * Per-language failures are swallowed so other languages still apply (caller may wrap).
 */

import { translateBatch, TARGET_LANGS } from '@/lib/deeplTranslate';

export type TranslateFieldsOutput = Record<string, string | null>;

interface TranslateFieldsInput {
  fields: Record<string, string | null | undefined>;
}

/**
 * Translate non-empty fields from EN to each configured DeepL target language.
 * Keys must be logical bases without locale suffix (e.g. `title`, `desc`).
 * Output keys are `${base}${suffix}` e.g. `titleEs`, `descDe`.
 */
export async function translateFieldsToAllLangs(
  fields: TranslateFieldsInput['fields']
): Promise<TranslateFieldsOutput> {
  const result: TranslateFieldsOutput = {};

  const nonEmpty = Object.entries(fields).filter(([, v]) => v != null && String(v).trim());
  if (nonEmpty.length === 0) return result;

  const fieldNames = nonEmpty.map(([name]) => name);
  const fieldValues = nonEmpty.map(([, value]) => String(value));

  for (const lang of TARGET_LANGS) {
    try {
      const translated = await translateBatch(fieldValues, {
        sourceLang: 'EN',
        targetLang: lang.deepl,
      });
      fieldNames.forEach((name, i) => {
        const suffixed = `${name}${lang.suffix}`;
        result[suffixed] = translated[i];
      });
      console.warn(`[autoTranslate] ${lang.name} (${lang.deepl}) OK (${fieldNames.length} field(s))`);
    } catch (err) {
      console.error(`[autoTranslate] ${lang.name} (${lang.deepl}) failed:`, err instanceof Error ? err.message : err);
    }
  }

  return result;
}

export type TourEnFieldsInput = {
  titleEn?: string | null;
  descEn?: string | null;
  highlightsEn?: string | null;
  itineraryEn?: string | null;
  knowBeforeEn?: string | null;
  notSuitableEn?: string | null;
  notAllowedEn?: string | null;
  whatsIncludedEn?: string | null;
  notIncludedEn?: string | null;
  cancellationNoteEn?: string | null;
  ageRestrictionEn?: string | null;
};

/** Strip trailing `En` from keys (titleEn → title) and batch-translate bases */
export async function translateTourToAllLangs(tourEnFields: TourEnFieldsInput): Promise<TranslateFieldsOutput> {
  const stripped: Record<string, string | null | undefined> = {};
  Object.entries(tourEnFields).forEach(([key, value]) => {
    if (!key.endsWith('En')) return;
    const baseKey = key.slice(0, -2);
    stripped[baseKey] = value;
  });
  return translateFieldsToAllLangs(stripped);
}

export async function translateAttractionToAllLangs(input: {
  nameEn?: string | null;
  descriptionEn?: string | null;
}): Promise<TranslateFieldsOutput> {
  const stripped: Record<string, string | null | undefined> = {};
  if (input.nameEn != null && String(input.nameEn).trim()) stripped.name = input.nameEn;
  if (input.descriptionEn != null && String(input.descriptionEn).trim()) stripped.description = input.descriptionEn;
  return translateFieldsToAllLangs(stripped);
}

export type FaqPair = { question: string; answer: string };

/** Translate FAQ pairs to faqsEs, faqsIt, … JSON-ready arrays */
export async function translateFaqsToAllLangs(
  faqsEn: FaqPair[] | null | undefined
): Promise<Record<string, FaqPair[]>> {
  const result: Record<string, FaqPair[]> = {};
  if (!faqsEn || faqsEn.length === 0) return result;

  const flatTexts = faqsEn.flatMap((f) => [f.question, f.answer]);

  for (const lang of TARGET_LANGS) {
    try {
      const translated = await translateBatch(flatTexts, {
        sourceLang: 'EN',
        targetLang: lang.deepl,
      });
      const translatedFaqs: FaqPair[] = [];
      for (let j = 0; j < faqsEn.length; j += 1) {
        const qi = j * 2;
        translatedFaqs.push({
          question: translated[qi] ?? '',
          answer: translated[qi + 1] ?? '',
        });
      }
      result[`faqs${lang.suffix}`] = translatedFaqs;
      console.warn(`[autoTranslate] FAQs ${lang.name} (${lang.deepl}) OK (${faqsEn.length} pair(s))`);
    } catch (err) {
      console.error(`[autoTranslate] FAQs ${lang.name} (${lang.deepl}) failed:`, err instanceof Error ? err.message : err);
    }
  }

  return result;
}
