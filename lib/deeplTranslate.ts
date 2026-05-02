/**
 * DeepL translation helper with multi-key rotation.
 *
 * Usage:
 *   const translated = await translateText('Hello', { sourceLang: 'EN', targetLang: 'ES' });
 *   const batch = await translateBatch(['Hello', 'World'], { sourceLang: 'EN', targetLang: 'ES' });
 *
 * Key rotation: when one key runs out (HTTP 456), automatically tries next key.
 * Configure keys via DEEPL_API_KEY_1, DEEPL_API_KEY_2, ... env vars.
 */

export type DeepLSourceLang = 'EN' | 'TR' | 'ZH';
export type DeepLTargetLang =
  | 'ES'
  | 'IT'
  | 'FR'
  | 'DE'
  | 'NL'
  | 'RO'
  | 'RU'
  | 'PL'
  | 'KO'
  | 'JA';

export interface TranslateOptions {
  sourceLang: DeepLSourceLang;
  targetLang: DeepLTargetLang;
  /** Default true — preserves punctuation / line breaks where DeepL supports it */
  preserveFormatting?: boolean;
  /** Default 'html' — use 'none' for API calls without HTML tag handling */
  tagHandling?: 'html' | 'none';
}

interface DeepLResponse {
  translations: Array<{
    detected_source_language: string;
    text: string;
  }>;
}

interface DeepLUsageResponse {
  character_count: number;
  character_limit: number;
}

export class DeepLQuotaExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeepLQuotaExhaustedError';
  }
}

export class DeepLAllKeysExhaustedError extends Error {
  readonly lastQuotaError?: DeepLQuotaExhaustedError;

  constructor(lastQuota?: DeepLQuotaExhaustedError | null) {
    super(
      'All configured DeepL API keys have exhausted their monthly quota (HTTP 456). Add more keys or wait until next month.'
    );
    this.name = 'DeepLAllKeysExhaustedError';
    this.lastQuotaError = lastQuota ?? undefined;
  }
}

function keyHint(key: string): string {
  const tail = key.length >= 6 ? key.slice(-6) : key;
  return `...${tail}`;
}

/** Collect configured DeepL keys from env (DEEPL_API_KEY_1 … _10), then optional Pro key */
export function getDeepLKeys(): Array<{ key: string; isPro: boolean }> {
  const keys: Array<{ key: string; isPro: boolean }> = [];

  for (let i = 1; i <= 10; i += 1) {
    const raw = process.env[`DEEPL_API_KEY_${i}`];
    const key = typeof raw === 'string' ? raw.trim() : '';
    if (key) keys.push({ key, isPro: false });
  }

  const proRaw = process.env.DEEPL_API_KEY_PRO;
  const proKey = typeof proRaw === 'string' ? proRaw.trim() : '';
  if (proKey) keys.push({ key: proKey, isPro: true });

  return keys;
}

function getDeepLEndpoint(isPro: boolean): string {
  return isPro ? 'https://api.deepl.com/v2/translate' : 'https://api-free.deepl.com/v2/translate';
}

function getDeepLUsageEndpoint(isPro: boolean): string {
  return isPro ? 'https://api.deepl.com/v2/usage' : 'https://api-free.deepl.com/v2/usage';
}

function appendTranslateParams(params: URLSearchParams, texts: string[], options: TranslateOptions): void {
  texts.forEach((t) => params.append('text', t));
  params.append('source_lang', options.sourceLang);
  params.append('target_lang', options.targetLang);
  if (options.preserveFormatting !== false) {
    params.append('preserve_formatting', '1');
  }
  const tagHandling = options.tagHandling ?? 'html';
  if (tagHandling === 'html') {
    params.append('tag_handling', 'html');
  }
}

/**
 * Translate texts with a single key.
 * Throws DeepLQuotaExhaustedError on HTTP 456.
 */
async function translateWithKey(
  texts: string[],
  options: TranslateOptions,
  key: string,
  isPro: boolean
): Promise<string[]> {
  const endpoint = getDeepLEndpoint(isPro);
  const params = new URLSearchParams();
  appendTranslateParams(params, texts, options);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (response.status === 456) {
    throw new DeepLQuotaExhaustedError(`DeepL quota exceeded for key ${keyHint(key)} (${isPro ? 'PRO' : 'FREE'})`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepL API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as DeepLResponse;
  const out = data.translations?.map((t) => t.text) ?? [];
  if (out.length !== texts.length) {
    throw new Error(`DeepL returned ${out.length} translations for ${texts.length} inputs`);
  }
  return out;
}

async function translateWithRotation(texts: string[], options: TranslateOptions): Promise<string[]> {
  const keys = getDeepLKeys();
  if (keys.length === 0) {
    throw new Error('No DeepL API keys configured. Set DEEPL_API_KEY_1 (and optionally _2, _3, …) in .env');
  }

  let lastQuotaError: DeepLQuotaExhaustedError | null = null;

  for (const { key, isPro } of keys) {
    try {
      console.warn(`[DeepL] Trying ${isPro ? 'PRO' : 'FREE'} key ${keyHint(key)} (${texts.length} segment(s))`);
      const result = await translateWithKey(texts, options, key, isPro);
      console.warn(`[DeepL] OK — translated ${texts.length} segment(s) with key ${keyHint(key)}`);
      return result;
    } catch (err) {
      if (err instanceof DeepLQuotaExhaustedError) {
        console.warn(`[DeepL] Quota exhausted for ${keyHint(key)}, rotating to next key`);
        lastQuotaError = err;
        continue;
      }
      throw err;
    }
  }

  throw new DeepLAllKeysExhaustedError(lastQuotaError);
}

/** Translate a single string; empty input → null */
export async function translateText(
  text: string | null | undefined,
  options: TranslateOptions
): Promise<string | null> {
  if (text == null || !String(text).trim()) return null;
  const results = await translateWithRotation([String(text)], options);
  return results[0] ?? null;
}

const BATCH_CHUNK = 50;

/**
 * Translate many strings in few API calls (max 50 texts per DeepL request).
 * Empty / whitespace-only slots stay null in the result array.
 */
export async function translateBatch(
  texts: Array<string | null | undefined>,
  options: TranslateOptions
): Promise<Array<string | null>> {
  const indexedTexts: Array<{ index: number; text: string }> = [];
  texts.forEach((t, i) => {
    if (t != null && String(t).trim()) indexedTexts.push({ index: i, text: String(t) });
  });

  if (indexedTexts.length === 0) {
    return texts.map(() => null);
  }

  const translatedByPosition: Array<string | null> = new Array(indexedTexts.length).fill(null);

  for (let offset = 0; offset < indexedTexts.length; offset += BATCH_CHUNK) {
    const slice = indexedTexts.slice(offset, offset + BATCH_CHUNK);
    const translated = await translateWithRotation(
      slice.map((s) => s.text),
      options
    );
    slice.forEach((_, i) => {
      translatedByPosition[offset + i] = translated[i] ?? null;
    });
  }

  const final: Array<string | null> = texts.map(() => null);
  indexedTexts.forEach((item, positionInQueue) => {
    final[item.index] = translatedByPosition[positionInQueue] ?? null;
  });

  return final;
}

export type DeepLUsageRow = {
  keyHint: string;
  isPro: boolean;
  used: number;
  limit: number;
  percentage: number | null;
};

/** Fetch usage for every configured key (skips keys that error) */
export async function getDeepLUsage(): Promise<DeepLUsageRow[]> {
  const keys = getDeepLKeys();
  const results: DeepLUsageRow[] = [];

  for (const { key, isPro } of keys) {
    try {
      const response = await fetch(getDeepLUsageEndpoint(isPro), {
        headers: { Authorization: `DeepL-Auth-Key ${key}` },
      });
      if (!response.ok) {
        console.warn(`[DeepL] Usage HTTP ${response.status} for key ${keyHint(key)}`);
        continue;
      }
      const data = (await response.json()) as DeepLUsageResponse;
      const limit = data.character_limit;
      const used = data.character_count;
      const percentage =
        typeof limit === 'number' && limit > 0 ? Math.round((used / limit) * 100) : null;
      results.push({
        keyHint: keyHint(key),
        isPro,
        used,
        limit,
        percentage,
      });
    } catch (err) {
      console.warn(`[DeepL] Usage fetch failed for key ${keyHint(key)}:`, err);
    }
  }

  return results;
}

export const LANG_SUFFIX_TO_DEEPL: Record<string, DeepLTargetLang> = {
  Es: 'ES',
  It: 'IT',
  Fr: 'FR',
  De: 'DE',
  Nl: 'NL',
  Ro: 'RO',
  Ru: 'RU',
  Pl: 'PL',
  Ko: 'KO',
  Ja: 'JA',
};

export const TARGET_LANGS: Array<{ suffix: string; deepl: DeepLTargetLang; name: string }> = [
  { suffix: 'Es', deepl: 'ES', name: 'Spanish' },
  { suffix: 'It', deepl: 'IT', name: 'Italian' },
  { suffix: 'Fr', deepl: 'FR', name: 'French' },
  { suffix: 'De', deepl: 'DE', name: 'German' },
  { suffix: 'Nl', deepl: 'NL', name: 'Dutch' },
  { suffix: 'Ro', deepl: 'RO', name: 'Romanian' },
  { suffix: 'Ru', deepl: 'RU', name: 'Russian' },
  { suffix: 'Pl', deepl: 'PL', name: 'Polish' },
  { suffix: 'Ko', deepl: 'KO', name: 'Korean' },
  { suffix: 'Ja', deepl: 'JA', name: 'Japanese' },
];
