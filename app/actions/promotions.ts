'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { SUPPORTED_LOCALES } from '@/lib/i18n';
import { getSession } from '@/app/actions/auth';
import { pickBestPromotionForLine, type PromotionRowLite } from '@/lib/promotionPricing';

export async function fetchEligiblePromotions(
  activityDate: Date
): Promise<PromotionRowLite[]> {
  const now = new Date();
  const rows = await prisma.promotion.findMany({
    where: {
      isActive: true,
      validFrom: { lte: now },
      validUntil: { gte: now },
      bookableFrom: { lte: activityDate },
      bookableUntil: { gte: activityDate },
    },
    select: {
      id: true,
      discountType: true,
      discountValue: true,
      applicableTourIds: true,
    },
  });
  return rows;
}

export async function getBestPromotionDiscountForLine(
  rackPrice: number,
  tourId: string,
  activityDate: Date
): Promise<{ discount: number; promotionId: string | null }> {
  try {
    const promotions = await fetchEligiblePromotions(activityDate);
    return pickBestPromotionForLine(rackPrice, tourId, promotions);
  } catch {
    return { discount: 0, promotionId: null };
  }
}

/** Batch: one query for promotions for “today” as activity proxy (tour cards). */
export async function getPromotionCardPrices(
  entries: { tourId: string; rackPrice: number }[],
  activityDate: Date
): Promise<Map<string, { rack: number; final: number; discount: number; percentLabel: number | null }>> {
  const out = new Map<string, { rack: number; final: number; discount: number; percentLabel: number | null }>();
  if (entries.length === 0) return out;
  try {
    const promotions = await fetchEligiblePromotions(activityDate);
    for (const e of entries) {
      const { discount, promotionId } = pickBestPromotionForLine(e.rackPrice, e.tourId, promotions);
      const final = Math.max(0, e.rackPrice - discount);
      let percentLabel: number | null = null;
      if (promotionId) {
        const winner = promotions.find((p) => p.id === promotionId);
        if (winner?.discountType === 'percentage') {
          percentLabel = winner.discountValue;
        }
      }
      out.set(e.tourId, { rack: e.rackPrice, final, discount, percentLabel });
    }
  } catch {
    entries.forEach((e) =>
      out.set(e.tourId, { rack: e.rackPrice, final: e.rackPrice, discount: 0, percentLabel: null })
    );
  }
  return out;
}

export async function previewPromotionForBooking(
  tourId: string,
  activityDateIso: string,
  rackTotal: number
): Promise<{ discount: number; final: number; promotionId: string | null; percentOff: number | null }> {
  const d = new Date(activityDateIso);
  if (Number.isNaN(d.getTime())) {
    return { discount: 0, final: rackTotal, promotionId: null, percentOff: null };
  }
  try {
    const promotions = await fetchEligiblePromotions(d);
    const { discount, promotionId } = pickBestPromotionForLine(rackTotal, tourId, promotions);
    let percentOff: number | null = null;
    if (promotionId) {
      const w = promotions.find((p) => p.id === promotionId);
      if (w?.discountType === 'percentage') percentOff = w.discountValue;
    }
    return {
      discount,
      final: Math.max(0, rackTotal - discount),
      promotionId,
      percentOff,
    };
  } catch {
    return { discount: 0, final: rackTotal, promotionId: null, percentOff: null };
  }
}

export type CheckoutPreviewItem = {
  tourId: string;
  date: string;
  totalPrice: number;
  listTotalPrice?: number;
  tourType?: string;
};

export async function computeCheckoutPricing(input: {
  items: CheckoutPreviewItem[];
  couponCode: string | null;
}): Promise<{
  rackSubtotal: number;
  promotionDiscountTotal: number;
  couponDiscount: number;
  effectiveDiscount: number;
  finalTotal: number;
  useCouponNotPromotion: boolean;
} | null> {
  try {
    const session = await getSession();
    const userId = session?.id ?? undefined;
    let rackSubtotal = 0;
    let promotionDiscountTotal = 0;

    for (const item of input.items) {
      const rack = item.listTotalPrice ?? item.totalPrice;
      rackSubtotal += rack;
      const activityDate = new Date(item.date);
      if (item.listTotalPrice != null && item.listTotalPrice > 0) {
        const promotions = await fetchEligiblePromotions(activityDate);
        const { discount } = pickBestPromotionForLine(rack, item.tourId, promotions);
        promotionDiscountTotal += discount;
      }
    }

    let couponDiscount = 0;
    if (input.couponCode?.trim()) {
      const { validateCoupon } = await import('./coupons');
      const v = await validateCoupon({
        code: input.couponCode.trim(),
        subtotal: rackSubtotal,
        items: input.items.map((i) => ({
          date: i.date,
          tourType: i.tourType ?? 'TOUR',
          totalPrice: i.listTotalPrice ?? i.totalPrice,
          title: '',
        })),
        userId,
      });
      if (v.ok) couponDiscount = v.discountAmount;
    }

    const useCouponNotPromotion = couponDiscount > promotionDiscountTotal;
    const effectiveDiscount = useCouponNotPromotion ? couponDiscount : promotionDiscountTotal;
    const finalTotal = Math.max(0, rackSubtotal - effectiveDiscount);

    return {
      rackSubtotal,
      promotionDiscountTotal,
      couponDiscount,
      effectiveDiscount,
      finalTotal,
      useCouponNotPromotion,
    };
  } catch {
    return null;
  }
}

// ─── Admin CRUD ──────────────────────────────────────────────────────────────

async function assertAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');
  return session;
}

export async function listPromotionsAdmin(): Promise<
  { ok: true; promotions: Awaited<ReturnType<typeof prisma.promotion.findMany>> } | { ok: false; error: string }
> {
  try {
    await assertAdmin();
    const promotions = await prisma.promotion.findMany({ orderBy: { createdAt: 'desc' } });
    return { ok: true, promotions };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function createPromotionAdmin(data: {
  name: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountCurrency?: string | null;
  validFrom: string;
  validUntil: string;
  bookableFrom: string;
  bookableUntil: string;
  tourIds: string[] | null;
  isActive?: boolean;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    await assertAdmin();
    const name = data.name.trim();
    if (!name) return { ok: false, error: 'Name required' };
    if (data.discountValue < 0) return { ok: false, error: 'Invalid value' };
    const vf = new Date(data.validFrom);
    const vu = new Date(data.validUntil);
    const bf = new Date(data.bookableFrom);
    const bu = new Date(data.bookableUntil);
    if ([vf, vu, bf, bu].some((d) => Number.isNaN(d.getTime()))) {
      return { ok: false, error: 'Invalid date' };
    }
    const row = await prisma.promotion.create({
      data: {
        name,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountCurrency: data.discountType === 'fixed' ? (data.discountCurrency ?? 'EUR') : null,
        validFrom: vf,
        validUntil: vu,
        bookableFrom: bf,
        bookableUntil: bu,
        applicableTourIds: data.tourIds == null ? Prisma.JsonNull : data.tourIds,
        isActive: data.isActive ?? true,
      },
    });
    revalidatePromotionPaths();
    return { ok: true, id: row.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function updatePromotionAdmin(
  id: string,
  data: Partial<{
    name: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    discountCurrency: string | null;
    validFrom: string;
    validUntil: string;
    bookableFrom: string;
    bookableUntil: string;
    tourIds: string[] | null;
    isActive: boolean;
  }>
): Promise<{ ok: boolean; error?: string }> {
  try {
    await assertAdmin();
    const patch: Record<string, unknown> = {};
    if (data.name != null) patch.name = data.name.trim();
    if (data.discountType != null) patch.discountType = data.discountType;
    if (data.discountValue != null) patch.discountValue = data.discountValue;
    if (data.discountCurrency !== undefined) patch.discountCurrency = data.discountCurrency;
    if (data.validFrom != null) patch.validFrom = new Date(data.validFrom);
    if (data.validUntil != null) patch.validUntil = new Date(data.validUntil);
    if (data.bookableFrom != null) patch.bookableFrom = new Date(data.bookableFrom);
    if (data.bookableUntil != null) patch.bookableUntil = new Date(data.bookableUntil);
    if (data.tourIds !== undefined) {
      patch.applicableTourIds = data.tourIds === null ? Prisma.JsonNull : data.tourIds;
    }
    if (data.isActive !== undefined) patch.isActive = data.isActive;
    await prisma.promotion.update({ where: { id }, data: patch });
    revalidatePromotionPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function listTourOptionsForPromotion(): Promise<
  { ok: true; tours: { id: string; titleEn: string; titleTr: string }[] } | { ok: false; error: string }
> {
  try {
    await assertAdmin();
    const tours = await prisma.tour.findMany({
      select: { id: true, titleEn: true, titleTr: true },
      orderBy: { titleEn: 'asc' },
    });
    return { ok: true, tours };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function deletePromotionAdmin(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await assertAdmin();
    await prisma.promotion.delete({ where: { id } });
    revalidatePromotionPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

function revalidatePromotionPaths() {
  for (const lang of SUPPORTED_LOCALES) {
    revalidatePath(`/${lang}`, 'page');
    revalidatePath(`/${lang}/tours`, 'layout');
    revalidatePath(`/${lang}/tour`, 'layout');
    revalidatePath(`/${lang}/checkout`, 'page');
    revalidatePath(`/${lang}/admin/promotions`, 'page');
  }
}

