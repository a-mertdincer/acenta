/**
 * Smoke test for DeepL helper (requires DEEPL_API_KEY_* in .env).
 *
 *   npx tsx scripts/test-deepl.ts
 */
import 'dotenv/config';

import { getDeepLUsage, translateText } from '../lib/deeplTranslate';

async function main(): Promise<void> {
  console.log('=== DeepL connectivity test ===');

  const usage = await getDeepLUsage();
  console.log('\nAPI key usage:');
  if (usage.length === 0) {
    console.error('No keys configured or every usage request failed. Set DEEPL_API_KEY_1 in .env');
    process.exit(1);
  }
  usage.forEach((u) => {
    const pct = u.percentage != null ? `${u.percentage}%` : 'n/a';
    console.log(
      `  ${u.keyHint} (${u.isPro ? 'PRO' : 'FREE'}): ${u.used.toLocaleString()} / ${u.limit.toLocaleString()} (${pct})`
    );
  });

  console.log('\nTest translation EN → ES:');
  const result = await translateText(
    'Experience the magic of Cappadocia from the sky with a hot air balloon flight.',
    { sourceLang: 'EN', targetLang: 'ES' }
  );
  console.log(`  Result: ${result ?? '(null)'}`);
  console.log('\nDeepL helper OK');
}

main().catch((err: unknown) => {
  console.error('Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
