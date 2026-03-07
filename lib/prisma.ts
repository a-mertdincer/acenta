import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/** Stub that throws on any method call so callers can catch and return fallbacks (e.g. getTours → [], getSession → null). */
function noOpClient(): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_, prop) {
      return new Proxy(
        {},
        {
          get(_, method) {
            return () => {
              throw new Error('DATABASE_URL is not set or database is unavailable');
            };
          },
        }
      );
    },
  });
}

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma !== undefined) return globalForPrisma.prisma;
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === '') {
    globalForPrisma.prisma = noOpClient() as unknown as PrismaClient;
    return globalForPrisma.prisma;
  }
  try {
    // Silence pg SSL warning: use explicit sslmode=verify-full when URL has prefer/require/verify-ca
    let connectionString = url;
    if (url.includes('postgres') && /[?&]sslmode=(prefer|require|verify-ca)(&|$)/i.test(url)) {
      connectionString = url.replace(/sslmode=(prefer|require|verify-ca)/i, 'sslmode=verify-full');
    }
    const adapter = new PrismaPg({ connectionString });
    globalForPrisma.prisma = new PrismaClient({ adapter });
    return globalForPrisma.prisma;
  } catch {
    globalForPrisma.prisma = noOpClient() as unknown as PrismaClient;
    return globalForPrisma.prisma;
  }
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return getPrismaClient()[prop as keyof PrismaClient];
  },
});
