/**
 * Fills missing dictionary keys in each locale JSON from en.json (keeps existing translations).
 *   node scripts/merge-dictionaries-from-en.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const enPath = path.join(ROOT, 'app/dictionaries/en.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const locales = ['tr', 'zh', 'es', 'it', 'fr', 'de', 'nl', 'ro', 'ru', 'pl', 'ko', 'ja'];

function mergeMissing(enBranch, locBranch) {
  if (enBranch !== null && typeof enBranch === 'object' && !Array.isArray(enBranch)) {
    const base = locBranch !== null && typeof locBranch === 'object' && !Array.isArray(locBranch) ? locBranch : {};
    const out = { ...base };
    for (const [k, v] of Object.entries(enBranch)) {
      if (!(k in out)) {
        out[k] = v;
      } else if (
        v !== null &&
        typeof v === 'object' &&
        !Array.isArray(v) &&
        out[k] !== null &&
        typeof out[k] === 'object' &&
        !Array.isArray(out[k])
      ) {
        out[k] = mergeMissing(v, out[k]);
      }
    }
    return out;
  }
  return locBranch === undefined ? enBranch : locBranch;
}

for (const loc of locales) {
  const p = path.join(ROOT, `app/dictionaries/${loc}.json`);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  const merged = mergeMissing(en, data);
  fs.writeFileSync(p, `${JSON.stringify(merged, null, 2)}\n`);
  console.log('merged', loc);
}
