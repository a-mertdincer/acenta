'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { hashPassword, verifyPassword } from '../../lib/auth';

const SESSION_COOKIE = 'kismet-user';

export async function getSession(): Promise<{ id: string; email: string; name: string; role: string } | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;
  try {
    const { prisma } = await import('../../lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });
    return user;
  } catch {
    return null;
  }
}

const BACKDOOR_EMAIL = 'test';
const BACKDOOR_PASSWORD = 'test';
const TEST_USER_EMAIL = 'test@test.com';

export async function login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { prisma } = await import('../../lib/prisma');
    const cookieStore = await cookies();

    // Backdoor: test:test → test user (for local/dev; no email needed)
    if (email === BACKDOOR_EMAIL && password === BACKDOOR_PASSWORD) {
      let user = await prisma.user.findUnique({ where: { email: TEST_USER_EMAIL } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            name: 'Test User',
            email: TEST_USER_EMAIL,
            passwordHash: hashPassword(BACKDOOR_PASSWORD),
            role: 'ADMIN',
          },
        });
      }
      cookieStore.set(SESSION_COOKIE, user.id, { path: '/', maxAge: 60 * 60 * 24 * 7 });
      return { ok: true };
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return { ok: false, error: 'Invalid email or password' };
    }
    cookieStore.set(SESSION_COOKIE, user.id, { path: '/', maxAge: 60 * 60 * 24 * 7 });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Login failed' };
  }
}

export async function register(name: string, email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { prisma } = await import('../../lib/prisma');
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { ok: false, error: 'Email already registered' };
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
        role: 'CUSTOMER',
      },
    });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, user.id, { path: '/', maxAge: 60 * 60 * 24 * 7 });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Registration failed' };
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect('/en/login');
}

export type UserListItem = { id: string; name: string; email: string; role: string; createdAt: Date };

export async function getUsers(): Promise<{ ok: boolean; users?: UserListItem[]; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { ok: false, error: 'Unauthorized' };
  }
  try {
    const { prisma } = await import('../../lib/prisma');
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return { ok: true, users };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load users' };
  }
}
