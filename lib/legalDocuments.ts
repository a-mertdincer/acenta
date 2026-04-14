import { readFileSync } from 'fs';
import { join } from 'path';

export const LEGAL_DOC_FILES = {
  terms: 'kismet_terms_conditions_detailed.txt',
  cancellation: 'cancellation-refund-policy.txt',
  distanceSales: 'distance-sales-agreement.txt',
  privacy: 'privacy-policy.txt',
  kvkk: 'personal-data-protection.txt',
} as const;

export type LegalDocKey = keyof typeof LEGAL_DOC_FILES;

export function readLegalDocument(key: LegalDocKey): string {
  const filename = LEGAL_DOC_FILES[key];
  const filePath = join(process.cwd(), 'docs', 'legal', filename);
  return readFileSync(filePath, 'utf-8');
}
