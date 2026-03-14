'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../../lib/prisma';
import { getSession } from './auth';

const ADMIN_PATHS = ['en', 'tr', 'zh'].flatMap(lang => [`/${lang}/admin/coupons`]);
const activeCouponCountCache = new Map<string, { count: number; expiresAt: number }>();

function revalidateAdmin() {
  ADMIN_PATHS.forEach(p => revalidatePath(p));
}

/** Cart item for coupon validation */
export interface CouponCartItem {
  date: string;       // YYYY-MM-DD
  tourType: string;  // BALLOON, TOUR, TRANSFER, etc.
  totalPrice: number;
  title: string;
}

export interface ValidateCouponInput {
  code: string;
  subtotal: number;
  items: CouponCartItem[];
  userId?: string | null;
}

export type ValidateCouponResult =
  | {
      ok: true;
      couponId: string;
      discountAmount: number;
      finalAmount: number;
      message: string;
      activityStart: string;
      activityEnd: string;
    }
  | { ok: false; error: string };

export async function validateCoupon(input: ValidateCouponInput): Promise<ValidateCouponResult> {
  const code = input.code?.trim().toUpperCase();
  if (!code) return { ok: false, error: 'Code required' };

  try {
    const coupon = await prisma.coupon.findUnique({
      where: { code, isActive: true },
    });
    if (!coupon) return { ok: false, error: 'Geçersiz veya devre dışı kupon' };

    if (coupon.userId && input.userId && coupon.userId !== input.userId) {
      return { ok: false, error: 'Bu kupon bu hesap için geçerli değil' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const bookingStart = new Date(coupon.bookingStart);
    bookingStart.setHours(0, 0, 0, 0);
    const bookingEnd = new Date(coupon.bookingEnd);
    bookingEnd.setHours(23, 59, 59, 999);

    if (todayTime < bookingStart.getTime() || todayTime > bookingEnd.getTime()) {
      return { ok: false, error: 'Bu kupon şu an aktif değil' };
    }

    const activityStart = new Date(coupon.activityStart);
    activityStart.setHours(0, 0, 0, 0);
    const activityEnd = new Date(coupon.activityEnd);
    activityEnd.setHours(23, 59, 59, 999);

    for (const item of input.items) {
      const itemDate = new Date(item.date + 'T12:00:00.000Z');
      if (itemDate.getTime() < activityStart.getTime() || itemDate.getTime() > activityEnd.getTime()) {
        return { ok: false, error: 'Bu kupon seçilen tarih için geçerli değil' };
      }
    }

    if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
      return { ok: false, error: 'Bu kuponun kullanım limiti dolmuş' };
    }

    let categories: string[] | null = null;
    if (coupon.applicableCategories) {
      try {
        categories = JSON.parse(coupon.applicableCategories) as string[];
      } catch {
        categories = null;
      }
    }
    if (categories && categories.length > 0) {
      for (const item of input.items) {
        if (!categories.includes(item.tourType)) {
          return { ok: false, error: 'Bu kupon seçilen ürün için geçerli değil' };
        }
      }
    }

    if (coupon.minCartAmount != null && coupon.minCartAmount > 0 && input.subtotal < coupon.minCartAmount) {
      return {
        ok: false,
        error: `Minimum sepet tutarı: €${coupon.minCartAmount}`,
      };
    }

    let discountAmount: number;
    if (coupon.discountType === 'percentage') {
      discountAmount = input.subtotal * (coupon.discountValue / 100);
    } else {
      discountAmount = Math.min(coupon.discountValue, input.subtotal);
    }
    const finalAmount = Math.max(0, input.subtotal - discountAmount);

    const message =
      coupon.discountType === 'percentage'
        ? `%${coupon.discountValue} indirim uygulandı!`
        : `€${coupon.discountValue} indirim uygulandı!`;

    const fmt = (d: Date) => d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
    return {
      ok: true,
      couponId: coupon.id,
      discountAmount,
      finalAmount,
      message,
      activityStart: fmt(coupon.activityStart),
      activityEnd: fmt(coupon.activityEnd),
    };
  } catch {
    return { ok: false, error: 'Kupon doğrulanamadı' };
  }
}

export type CouponListItem = {
  id: string;
  code: string;
  userId?: string | null;
  discountType: string;
  discountValue: number;
  discountCurrency: string | null;
  discountPct: number | null;
  discountAbs: number | null;
  bookingStart: Date;
  bookingEnd: Date;
  activityStart: Date;
  activityEnd: Date;
  usageLimit: number;
  usageCount: number;
  applicableCategories: string | null;
  minCartAmount: number | null;
  isActive: boolean;
  internalNote: string | null;
  createdAt: Date;
};

export async function getCoupons(filter?: 'all' | 'active' | 'expired' | 'limit_reached' | 'disabled'): Promise<{
  ok: boolean;
  coupons?: CouponListItem[];
  error?: string;
}> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let where: Record<string, unknown> = {};
    if (filter === 'expired') {
      where = { bookingEnd: { lt: today } };
    } else if (filter === 'disabled') {
      where = { isActive: false };
    }
    // active and limit_reached: filter in memory (Prisma can't compare two columns in where)

    const coupons = await prisma.coupon.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        userId: true,
        discountType: true,
        discountValue: true,
        discountCurrency: true,
        discountPct: true,
        discountAbs: true,
        bookingStart: true,
        bookingEnd: true,
        activityStart: true,
        activityEnd: true,
        usageLimit: true,
        usageCount: true,
        applicableCategories: true,
        minCartAmount: true,
        isActive: true,
        internalNote: true,
        createdAt: true,
      },
    });

    let filtered = coupons;
    if (filter === 'active') {
      filtered = coupons.filter(
        c =>
          c.isActive &&
          c.bookingEnd >= today &&
          (c.usageLimit === 0 || c.usageCount < c.usageLimit)
      );
    } else if (filter === 'limit_reached') {
      filtered = coupons.filter(
        c => c.isActive && c.usageLimit > 0 && c.usageCount >= c.usageLimit
      );
    }
    return { ok: true, coupons: filtered };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load coupons' };
  }
}

export async function getCouponById(id: string): Promise<{
  ok: boolean;
  coupon?: CouponListItem & { createdBy?: string | null };
  error?: string;
}> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        userId: true,
        discountType: true,
        discountValue: true,
        discountCurrency: true,
        discountPct: true,
        discountAbs: true,
        bookingStart: true,
        bookingEnd: true,
        activityStart: true,
        activityEnd: true,
        usageLimit: true,
        usageCount: true,
        applicableCategories: true,
        minCartAmount: true,
        isActive: true,
        internalNote: true,
        createdBy: true,
        createdAt: true,
      },
    });
    if (!coupon) return { ok: false, error: 'Kupon bulunamadı' };
    return { ok: true, coupon };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load coupon' };
  }
}

export type CouponUsageItem = {
  id: string;
  guestName: string;
  guestEmail: string | null;
  usedAt: Date;
  tourName: string;
  tourDate: Date;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
};

export async function getCouponUsages(couponId: string): Promise<{
  ok: boolean;
  usages?: CouponUsageItem[];
  error?: string;
}> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    const usages = await prisma.couponUsage.findMany({
      where: { couponId },
      orderBy: { usedAt: 'desc' },
    });
    return { ok: true, usages };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load usages' };
  }
}

export async function getCouponByCode(code: string): Promise<{
  ok: boolean;
  coupon?: CouponListItem;
  error?: string;
}> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
      select: {
        id: true,
        code: true,
        userId: true,
        discountType: true,
        discountValue: true,
        discountCurrency: true,
        discountPct: true,
        discountAbs: true,
        bookingStart: true,
        bookingEnd: true,
        activityStart: true,
        activityEnd: true,
        usageLimit: true,
        usageCount: true,
        applicableCategories: true,
        minCartAmount: true,
        isActive: true,
        internalNote: true,
        createdAt: true,
      },
    });
    if (!coupon) return { ok: false, error: 'Kupon bulunamadı' };
    return { ok: true, coupon };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load coupon' };
  }
}

export async function getMyCoupons(): Promise<{ ok: boolean; coupons?: CouponListItem[]; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };
  try {
    const coupons = await prisma.coupon.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        discountCurrency: true,
        discountPct: true,
        discountAbs: true,
        bookingStart: true,
        bookingEnd: true,
        activityStart: true,
        activityEnd: true,
        usageLimit: true,
        usageCount: true,
        applicableCategories: true,
        minCartAmount: true,
        isActive: true,
        internalNote: true,
        createdAt: true,
      },
    });
    return { ok: true, coupons };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load coupons' };
  }
}

export async function claimCouponForCurrentUser(code: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: 'Kupon kodu gerekli' };
  try {
    const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });
    if (!coupon) return { ok: false, error: 'Kupon bulunamadı' };
    if (coupon.userId && coupon.userId !== session.id) return { ok: false, error: 'Bu kupon başka bir kullanıcıya atanmış' };
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { userId: session.id },
    });
    ['en', 'tr', 'zh'].forEach((lang) => revalidatePath(`/${lang}/account/coupons`));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Kupon eklenemedi' };
  }
}

export async function assignCouponToUser(input: { userId: string; couponId: string }): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    await prisma.coupon.update({
      where: { id: input.couponId },
      data: { userId: input.userId },
    });
    ['en', 'tr', 'zh'].forEach((lang) => {
      revalidatePath(`/${lang}/admin/users`);
      revalidatePath(`/${lang}/account/coupons`);
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Kupon atanamadı' };
  }
}

export async function getActiveCouponCountForUser(userId: string): Promise<number> {
  try {
    const cached = activeCouponCountCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached.count;
    const today = new Date();
    const count = await prisma.coupon.count({
      where: {
        userId,
        isActive: true,
        bookingStart: { lte: today },
        bookingEnd: { gte: today },
      },
    });
    activeCouponCountCache.set(userId, { count, expiresAt: Date.now() + 30_000 });
    return count;
  } catch {
    return 0;
  }
}

export interface CreateCouponInput {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountCurrency?: string | null;
  bookingStart: string;
  bookingEnd: string;
  activityStart: string;
  activityEnd: string;
  usageLimit: number;
  applicableCategories?: string | null;
  minCartAmount?: number | null;
  internalNote?: string | null;
}

export async function createCoupon(form: CreateCouponInput): Promise<{
  ok: boolean;
  error?: string;
  existingCoupon?: CouponListItem;
}> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };

  const code = form.code?.trim().toUpperCase().replace(/\s+/g, '');
  if (!code) return { ok: false, error: 'Kupon kodu gerekli' };
  if (!/^[A-Z0-9-]+$/.test(code)) return { ok: false, error: 'Kupon kodu sadece büyük harf, rakam ve tire içerebilir' };
  if (form.discountType === 'percentage' && (form.discountValue <= 0 || form.discountValue > 100)) {
    return { ok: false, error: 'Yüzde indirim 1-100 arasında olmalı' };
  }
  if (form.discountType === 'fixed' && form.discountValue <= 0) {
    return { ok: false, error: 'Sabit indirim 0\'dan büyük olmalı' };
  }

  try {
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      const existingCoupon: CouponListItem = {
        id: existing.id,
        code: existing.code,
        userId: existing.userId,
        discountType: existing.discountType,
        discountValue: existing.discountValue,
        discountCurrency: existing.discountCurrency,
        discountPct: existing.discountPct,
        discountAbs: existing.discountAbs,
        bookingStart: existing.bookingStart,
        bookingEnd: existing.bookingEnd,
        activityStart: existing.activityStart,
        activityEnd: existing.activityEnd,
        usageLimit: existing.usageLimit,
        usageCount: existing.usageCount,
        applicableCategories: existing.applicableCategories,
        minCartAmount: existing.minCartAmount,
        isActive: existing.isActive,
        internalNote: existing.internalNote,
        createdAt: existing.createdAt,
      };
      return { ok: false, error: 'CODE_ALREADY_EXISTS', existingCoupon };
    }

    const categoriesJson =
      form.applicableCategories && form.applicableCategories.trim()
        ? JSON.stringify(
            form.applicableCategories
              .split(/[,\s]+/)
              .map(s => s.trim())
              .filter(Boolean)
          )
        : null;

    await prisma.coupon.create({
      data: {
        code,
        discountType: form.discountType,
        discountValue: form.discountValue,
        discountCurrency: form.discountType === 'fixed' ? (form.discountCurrency || 'EUR') : null,
        bookingStart: new Date(form.bookingStart + 'T00:00:00.000Z'),
        bookingEnd: new Date(form.bookingEnd + 'T23:59:59.999Z'),
        activityStart: new Date(form.activityStart + 'T00:00:00.000Z'),
        activityEnd: new Date(form.activityEnd + 'T23:59:59.999Z'),
        usageLimit: Math.max(0, Math.floor(form.usageLimit)),
        applicableCategories: categoriesJson,
        minCartAmount: form.minCartAmount != null && form.minCartAmount > 0 ? form.minCartAmount : null,
        internalNote: form.internalNote?.trim() || null,
        createdBy: session.id,
      },
    });
    revalidateAdmin();
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to create coupon';
    if (String(msg).includes('Unique constraint'))
      return { ok: false, error: 'CODE_ALREADY_EXISTS' };
    return { ok: false, error: String(msg) };
  }
}

export interface UpdateCouponInput extends Partial<CreateCouponInput> {
  id: string;
}

export async function updateCoupon(form: UpdateCouponInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };

  const data: Record<string, unknown> = {};
  if (form.discountType != null) data.discountType = form.discountType;
  if (form.discountValue != null) data.discountValue = form.discountValue;
  if (form.discountCurrency !== undefined) data.discountCurrency = form.discountCurrency;
  if (form.bookingStart) data.bookingStart = new Date(form.bookingStart + 'T00:00:00.000Z');
  if (form.bookingEnd) data.bookingEnd = new Date(form.bookingEnd + 'T23:59:59.999Z');
  if (form.activityStart) data.activityStart = new Date(form.activityStart + 'T00:00:00.000Z');
  if (form.activityEnd) data.activityEnd = new Date(form.activityEnd + 'T23:59:59.999Z');
  if (form.usageLimit !== undefined) data.usageLimit = Math.max(0, Math.floor(form.usageLimit));
  if (form.applicableCategories !== undefined) {
    data.applicableCategories =
      form.applicableCategories && form.applicableCategories.trim()
        ? JSON.stringify(
            form.applicableCategories
              .split(/[,\s]+/)
              .map(s => s.trim())
              .filter(Boolean)
          )
        : null;
  }
  if (form.minCartAmount !== undefined) data.minCartAmount = form.minCartAmount;
  if (form.internalNote !== undefined) data.internalNote = form.internalNote?.trim() || null;

  try {
    await prisma.coupon.update({
      where: { id: form.id },
      data,
    });
    revalidateAdmin();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to update coupon' };
  }
}

export async function revokeCoupon(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    await prisma.coupon.update({ where: { id }, data: { isActive: false } });
    revalidateAdmin();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to revoke' };
  }
}

export async function reactivateCoupon(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    await prisma.coupon.update({ where: { id }, data: { isActive: true } });
    revalidateAdmin();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to reactivate' };
  }
}

/** Single usage entry for recordCouponUsage */
export interface CouponUsageEntry {
  reservationId: string;
  guestName: string;
  guestEmail: string;
  tourName: string;
  tourDate: Date;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency?: string;
}

/** Rezervasyon iptal edildiğinde usage_count'u 1 azalt. Kupon tekrar kullanılabilir. */
export async function decrementCouponUsage(couponId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) return { ok: true };
    if (coupon.usageCount <= 0) return { ok: true };
    await prisma.coupon.update({
      where: { id: couponId },
      data: { usageCount: { decrement: 1 } },
    });
    revalidateAdmin();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to decrement' };
  }
}

/** Atomic: increment usage_count by 1 and create CouponUsage records. Called from createReservations. */
export async function recordCouponUsage(params: {
  couponId: string;
  usages: CouponUsageEntry[];
}): Promise<{ ok: boolean; error?: string }> {
  if (!params.usages.length) return { ok: true };
  try {
    await prisma.$transaction(async tx => {
      const coupon = await tx.coupon.findUnique({
        where: { id: params.couponId },
      });
      if (!coupon) throw new Error('Coupon not found');
      if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
        throw new Error('Coupon usage limit reached');
      }
      await tx.coupon.update({
        where: { id: params.couponId },
        data: { usageCount: { increment: 1 } },
      });
      for (const u of params.usages) {
        await tx.couponUsage.create({
          data: {
            couponId: params.couponId,
            reservationId: u.reservationId,
            guestName: u.guestName,
            guestEmail: u.guestEmail,
            tourName: u.tourName,
            tourDate: u.tourDate,
            originalAmount: u.originalAmount,
            discountAmount: u.discountAmount,
            finalAmount: u.finalAmount,
            currency: u.currency ?? 'EUR',
          },
        });
      }
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to record usage' };
  }
}
