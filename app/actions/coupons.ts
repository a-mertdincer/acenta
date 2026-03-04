'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../../lib/prisma';
import { getSession } from './auth';

function revalidateAdminUsers() {
  ['en', 'tr', 'zh'].forEach(lang => revalidatePath(`/${lang}/admin/users`));
}

export async function validateCoupon(code: string, userId?: string | null): Promise<
  { ok: true; discountPct?: number; discountAbs?: number } | { ok: false; error: string }
> {
  if (!code?.trim()) return { ok: false, error: 'Code required' };
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase(), isActive: true },
    });
    if (!coupon) return { ok: false, error: 'Invalid or inactive coupon' };
    if (coupon.validUntil && coupon.validUntil < new Date()) return { ok: false, error: 'Coupon expired' };
    if (coupon.userId && userId && coupon.userId !== userId) return { ok: false, error: 'Coupon not valid for this account' };
    return {
      ok: true,
      discountPct: coupon.discountPct ?? undefined,
      discountAbs: coupon.discountAbs ?? undefined,
    };
  } catch {
    return { ok: false, error: 'Could not validate coupon' };
  }
}

export type CouponListItem = {
  id: string;
  code: string;
  discountPct: number | null;
  discountAbs: number | null;
  validUntil: Date | null;
  isActive: boolean;
  createdAt: Date;
};

export async function getCoupons(): Promise<{ ok: boolean; coupons?: CouponListItem[]; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, code: true, discountPct: true, discountAbs: true, validUntil: true, isActive: true, createdAt: true },
    });
    return { ok: true, coupons };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load coupons' };
  }
}

export async function createCoupon(form: {
  code: string;
  discountPct?: number;
  discountAbs?: number;
  validUntil?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  const code = form.code?.trim().toUpperCase();
  if (!code) return { ok: false, error: 'Code is required' };
  if (form.discountPct == null && form.discountAbs == null) return { ok: false, error: 'Set either discount % or fixed amount' };
  try {
    await prisma.coupon.create({
      data: {
        code,
        discountPct: form.discountPct ?? null,
        discountAbs: form.discountAbs ?? null,
        validUntil: form.validUntil ? new Date(form.validUntil) : null,
      },
    });
    revalidateAdminUsers();
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to create coupon';
    if (String(msg).includes('Unique constraint')) return { ok: false, error: 'Code already exists' };
    return { ok: false, error: msg };
  }
}

export async function revokeCoupon(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    await prisma.coupon.update({ where: { id }, data: { isActive: false } });
    revalidateAdminUsers();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to revoke' };
  }
}
