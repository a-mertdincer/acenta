import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

const BCRYPT_ROUNDS = 10;

export function isLegacySha256Hash(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test((hash ?? '').trim());
}

export function verifyLegacySha256Password(password: string, hash: string): boolean {
  if (!isLegacySha256Hash(hash)) return false;
  return createHash('sha256').update(password).digest('hex') === hash;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): boolean {
  const normalizedHash = (hash ?? '').trim();
  if (!normalizedHash) return false;
  if (isLegacySha256Hash(normalizedHash)) {
    return verifyLegacySha256Password(password, normalizedHash);
  }
  return bcrypt.compareSync(password, normalizedHash);
}
