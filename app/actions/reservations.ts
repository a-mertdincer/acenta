'use server';

import { prisma } from '../../lib/prisma';
import { getSession } from '../actions/auth';
import { Resend } from 'resend';
import { sanitizeGuestInput } from '@/lib/guestNotes';
import { getTourDatePrice } from './tours';
import { getTransferPriceForPaxAndAirport } from '@/lib/transferPrice';
import { parsePriceTiers, resolveTierPrice } from '@/lib/pricingTiers';
import { pickBestPromotionForLine, pricesNearlyEqual } from '@/lib/promotionPricing';
import { fetchEligiblePromotions } from '@/app/actions/promotions';
import { normalizeGuestPaymentMethod } from '@/lib/guestPaymentMethod';

type TourSummary = { id: string; titleEn: string; titleTr: string; type: string };
type VariantSummary = { id: string; titleEn: string; titleTr: string; reservationType: string | null; tourType: string | null };
type UserSummary = { id: string; name: string; email: string; createdAt: Date };

async function getTourSummaryMap(tourIds: string[]): Promise<Map<string, TourSummary>> {
  if (tourIds.length === 0) return new Map();
  const wanted = new Set(tourIds);
  const tours = await prisma.tour.findMany({ select: { id: true, titleEn: true, titleTr: true, type: true } });
  const filtered = tours.filter((t: TourSummary) => wanted.has(t.id));
  return new Map(filtered.map((t: TourSummary) => [t.id, t]));
}

async function getVariantSummaryMap(variantIds: string[]): Promise<Map<string, VariantSummary>> {
  if (variantIds.length === 0) return new Map();
  const wanted = new Set(variantIds);
  const variants = await prisma.tourVariant.findMany({
    select: { id: true, titleEn: true, titleTr: true, reservationType: true, tourType: true },
  });
  const filtered = variants.filter((v: VariantSummary) => wanted.has(v.id));
  return new Map(filtered.map((v: VariantSummary) => [v.id, v]));
}

async function getUserSummaryMap(userIds: string[]): Promise<Map<string, UserSummary>> {
  if (userIds.length === 0) return new Map();
  const wanted = new Set(userIds);
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, createdAt: true } });
  const filtered = users.filter((u: UserSummary) => wanted.has(u.id));
  return new Map(filtered.map((u: UserSummary) => [u.id, u]));
}

export type CancellationReason = 'free_cancel' | 'customer_request' | 'wrong_reservation' | 'other';

export interface CreateReservationItem {
  tourId: string;
  date: string;
  pax: number;
  totalPrice: number;
  optionsJson: string;
  /** Tour type for coupon validation: BALLOON, TOUR, TRANSFER, etc. */
  tourType?: string;
  /** For transfer reservations: ASR | NAV */
  transferAirport?: string;
  /** When booking with variant system */
  variantId?: string | null;
  transferDirection?: string | null;
  transferFlightArrival?: string | null;
  transferFlightDeparture?: string | null;
  transferHotelName?: string | null;
  /** Seçilen başlangıç saati (HH:MM), Tour.startTimes'tan. */
  startTime?: string | null;
  childCount?: number | null;
  adultCount?: number | null;
  infantCount?: number | null;
  /** Liste fiyatı (promosyon öncesi); yeni sepet — backend doğrulaması için */
  listTotalPrice?: number;
}

export interface CreateReservationInput {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  userId?: string;
  hotelName?: string;
  roomNumber?: string;
  paymentMethod: string;
  notes?: string;
  items: CreateReservationItem[];
  /** Kupon kodu — backend validate eder, frontend'e güvenilmez */
  couponCode?: string | null;
}

export async function createReservations(input: CreateReservationInput): Promise<{ ok: boolean; ids?: string[]; error?: string }> {
  try {
    const session = await getSession();
    const userId = input.userId ?? session?.id ?? null;
    const paymentMethodStored = normalizeGuestPaymentMethod(input.paymentMethod);

    const promoCache = new Map<string, Awaited<ReturnType<typeof fetchEligiblePromotions>>>();
    async function promosForItemDate(dateIso: string) {
      const key = dateIso.slice(0, 10);
      if (!promoCache.has(key)) {
        promoCache.set(key, await fetchEligiblePromotions(new Date(dateIso)));
      }
      return promoCache.get(key)!;
    }

    type LineMeta = {
      item: CreateReservationItem;
      rack: number;
      linePromoD: number;
      promotionId: string | null;
    };
    const lineMeta: LineMeta[] = [];
    let rackSubtotal = 0;
    let promotionDiscountTotal = 0;

    for (const item of input.items) {
      const rack = item.listTotalPrice ?? item.totalPrice;
      rackSubtotal += rack;
      const promos = await promosForItemDate(item.date);
      const { discount, promotionId } = pickBestPromotionForLine(rack, item.tourId, promos);
      let linePromoD = 0;
      let pid: string | null = null;
      if (item.listTotalPrice != null && item.listTotalPrice > 0) {
        linePromoD = discount;
        pid = promotionId;
        const expectedPay = Math.max(0, rack - linePromoD);
        if (!pricesNearlyEqual(item.totalPrice, expectedPay)) {
          return { ok: false, error: 'Fiyat doğrulanamadı. Sepeti yenileyip tekrar deneyin.' };
        }
      }
      promotionDiscountTotal += linePromoD;
      lineMeta.push({ item, rack, linePromoD, promotionId: pid });
    }

    let couponId: string | null = null;
    let couponCode: string | null = null;
    let totalDiscount = 0;

    if (input.couponCode?.trim()) {
      const { validateCoupon } = await import('./coupons');
      const validation = await validateCoupon({
        code: input.couponCode.trim(),
        subtotal: rackSubtotal,
        items: input.items.map((i) => ({
          date: i.date,
          tourType: i.tourType ?? 'TOUR',
          totalPrice: i.listTotalPrice ?? i.totalPrice,
          title: '',
        })),
        userId: userId ?? undefined,
      });
      if (!validation.ok) return { ok: false, error: validation.error };
      couponId = validation.couponId;
      couponCode = input.couponCode.trim().toUpperCase();
      totalDiscount = validation.discountAmount;
    }

    const useCouponNotPromotion = totalDiscount > promotionDiscountTotal;

    const ids: string[] = [];
    const couponUsages: { reservationId: string; tourId: string; date: string; totalPrice: number; itemDiscount: number; itemTotalPrice: number }[] = [];
    const variantIds = [...new Set(input.items.map((i) => i.variantId).filter((v): v is string => Boolean(v)))];
    const tourIds = [...new Set(input.items.map((i) => i.tourId))];
    const tourRows = await prisma.tour.findMany({
      select: { id: true, minAgeLimit: true },
    });
    const tourAgeMap = new Map(tourRows.map((t: { id: string; minAgeLimit: number | null }) => [t.id, t]));
    const wantedTourIds = new Set(tourIds);
    const ageGroupRows = (await prisma.productAgeGroup.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })).filter((row: { tourId: string; minAge: number; maxAge: number; pricingType: string; sortOrder: number; createdAt: Date }) => wantedTourIds.has(row.tourId));
    const ageGroupMap = new Map<string, { minAge: number; maxAge: number; pricingType: string }[]>();
    ageGroupRows.forEach((row: { tourId: string; minAge: number; maxAge: number; pricingType: string }) => {
      const list = ageGroupMap.get(row.tourId) ?? [];
      list.push({ minAge: row.minAge, maxAge: row.maxAge, pricingType: row.pricingType });
      ageGroupMap.set(row.tourId, list);
    });
    const variantCapacityMap = new Map<string, { maxGroupSize: number | null; titleEn: string; titleTr: string }>();
    if (variantIds.length > 0) {
      const wanted = new Set(variantIds);
      const variants = await prisma.tourVariant.findMany({ select: { id: true, maxGroupSize: true, titleEn: true, titleTr: true } });
      variants
        .filter((v: { id: string; maxGroupSize: number | null; titleEn: string; titleTr: string }) => wanted.has(v.id))
        .forEach((v: { id: string; maxGroupSize: number | null; titleEn: string; titleTr: string }) => {
          variantCapacityMap.set(v.id, { maxGroupSize: v.maxGroupSize, titleEn: v.titleEn, titleTr: v.titleTr });
        });
    }

    for (const meta of lineMeta) {
      const item = meta.item;
      const dateKey = item.date.length >= 10 ? item.date.slice(0, 10) : item.date;
      const tourDayPricing = await getTourDatePrice(item.tourId, dateKey);
      if (tourDayPricing?.isClosed) {
        return { ok: false, error: 'Bu tarih için rezervasyon kabul edilmemektedir.' };
      }
      const adults = Math.max(1, item.adultCount ?? Math.max(1, item.pax - (item.childCount ?? 0) - (item.infantCount ?? 0)));
      const children = Math.max(0, item.childCount ?? 0);
      const infants = Math.max(0, item.infantCount ?? 0);
      const computedPax = adults + children + infants;
      if (computedPax !== item.pax) {
        return { ok: false, error: 'Kisi dagilimi ile toplam kisi sayisi uyusmuyor.' };
      }
      const tourAge = tourAgeMap.get(item.tourId);
      const minAgeLimit = tourAge?.minAgeLimit ?? null;
      if (minAgeLimit != null) {
        if (minAgeLimit >= 4 && infants > 0) return { ok: false, error: `Bu urunde ${minAgeLimit} yas altina izin verilmez.` };
        if (minAgeLimit >= 8 && children > 0) return { ok: false, error: `Bu urunde ${minAgeLimit} yas altina izin verilmez.` };
      }
      const blockedGroups = (ageGroupMap.get(item.tourId) ?? []).filter((g) => g.pricingType === 'not_allowed');
      const infantsBlocked = blockedGroups.some((g) => g.minAge <= 3 && g.maxAge >= 0);
      const childrenBlocked = blockedGroups.some((g) => g.minAge <= 7 && g.maxAge >= 4);
      if (infantsBlocked && infants > 0) return { ok: false, error: 'Bu urun secilen bebek yas grubu icin uygun degil.' };
      if (childrenBlocked && children > 0) return { ok: false, error: 'Bu urun secilen cocuk yas grubu icin uygun degil.' };
      if (item.variantId) {
        const variantCap = variantCapacityMap.get(item.variantId);
        if (variantCap?.maxGroupSize != null && item.pax > variantCap.maxGroupSize) {
          return {
            ok: false,
            error: `Maksimum kişi sınırı aşıldı (${variantCap.maxGroupSize}). Varyant: ${variantCap.titleTr || variantCap.titleEn}`,
          };
        }
      }

      const rack = meta.rack;
      let itemTotalPrice: number;
      let itemDiscount: number;
      const itemOriginalPrice = rack;
      const appliedCouponId = useCouponNotPromotion ? couponId : null;
      const appliedCouponCode = useCouponNotPromotion ? couponCode : null;

      if (useCouponNotPromotion && couponId && totalDiscount > 0 && rackSubtotal > 0) {
        itemDiscount = (rack / rackSubtotal) * totalDiscount;
        itemTotalPrice = Math.max(0, rack - itemDiscount);
      } else if (item.listTotalPrice != null && item.listTotalPrice > 0) {
        itemDiscount = meta.linePromoD;
        itemTotalPrice = item.totalPrice;
      } else {
        itemDiscount = 0;
        itemTotalPrice = item.totalPrice;
      }

      const appliedPromotionId =
        !useCouponNotPromotion && item.listTotalPrice != null && item.listTotalPrice > 0 ? meta.promotionId : null;

      const res = await prisma.reservation.create({
        data: {
          userId,
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          guestPhone: input.guestPhone,
          tourId: item.tourId,
          variantId: item.variantId ?? undefined,
          date: new Date(item.date),
          pax: item.pax,
          totalPrice: itemTotalPrice,
          paymentMethod: paymentMethodStored,
          options: item.optionsJson,
          notes: [input.hotelName, input.roomNumber].filter(Boolean).join(' | ') || input.notes || null,
          transferAirport: item.transferAirport ?? null,
          transferDirection: item.transferDirection ?? null,
          transferFlightArrival: item.transferFlightArrival ?? null,
          transferFlightDeparture: item.transferFlightDeparture ?? null,
          transferHotelName: item.transferHotelName ?? null,
          startTime: item.startTime ?? null,
          adultCount: item.adultCount ?? adults,
          childCount: item.childCount ?? null,
          infantCount: item.infantCount ?? infants,
          couponId: appliedCouponId ?? null,
          couponCode: appliedCouponCode ?? null,
          promotionId: appliedPromotionId ?? null,
          originalPrice: itemOriginalPrice,
          discountAmount: itemDiscount > 0 ? itemDiscount : null,
        },
      });
      ids.push(res.id);

      if (appliedCouponId && itemDiscount > 0) {
        couponUsages.push({
          reservationId: res.id,
          tourId: item.tourId,
          date: item.date,
          totalPrice: rack,
          itemDiscount,
          itemTotalPrice,
        });
      }
    }

    if (couponId && useCouponNotPromotion && couponUsages.length > 0) {
      const { recordCouponUsage } = await import('./coupons');
      const tourIds = [...new Set(couponUsages.map(u => u.tourId))];
      const wantedTours = new Set(tourIds);
      const tours = await prisma.tour.findMany({ select: { id: true, titleEn: true } });
      const tourMap = new Map(tours.filter((t) => wantedTours.has(t.id)).map(t => [t.id, t.titleEn]));
      await recordCouponUsage({
        couponId,
        usages: couponUsages.map(u => ({
          reservationId: u.reservationId,
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          tourName: tourMap.get(u.tourId) ?? 'Tur',
          tourDate: new Date(u.date),
          originalAmount: u.totalPrice,
          discountAmount: u.itemDiscount,
          finalAmount: u.itemTotalPrice,
          currency: 'EUR',
        })),
      });
    }
    return { ok: true, ids };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create reservation';
    return { ok: false, error: message };
  }
}

export async function getReservations(filters?: { from?: Date; to?: Date; status?: string }) {
  try {
    const where: { date?: { gte?: Date; lte?: Date }; status?: string } = {};
    if (filters?.from) where.date = { ...where.date, gte: filters.from };
    if (filters?.to) where.date = { ...where.date, lte: filters.to };
    if (filters?.status) where.status = filters.status;
    const list = await prisma.reservation.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { date: 'asc' },
    });
    const tourMap = await getTourSummaryMap([...new Set(list.map((r) => r.tourId))]);
    const variantMap = await getVariantSummaryMap([...new Set(list.map((r) => r.variantId).filter((v): v is string => Boolean(v)))]);
    const userMap = await getUserSummaryMap([...new Set(list.map((r) => r.userId).filter((u): u is string => Boolean(u)))]);
    return list.map((r) => ({
      ...r,
      tour: tourMap.get(r.tourId) ?? null,
      variant: r.variantId ? variantMap.get(r.variantId) ?? null : null,
      account: r.userId ? userMap.get(r.userId) ?? null : null,
    }));
  } catch {
    return [];
  }
}

/** Public: fetch reservation details by ids for thank-you / success page only. Ids are from redirect URL. */
export async function getReservationDetailsByIds(ids: string[]) {
  if (!ids?.length) return [];
  try {
    const rows = await Promise.all(ids.map((id) => prisma.reservation.findUnique({ where: { id } })));
    const list = rows.filter((r): r is NonNullable<typeof r> => Boolean(r)).sort((a, b) => a.date.getTime() - b.date.getTime());
    const tourMap = await getTourSummaryMap([...new Set(list.map((r) => r.tourId))]);
    return list.map((r) => ({
      ...r,
      tour: tourMap.get(r.tourId) ?? null,
    }));
  } catch {
    return [];
  }
}

export async function updateReservationStatus(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const prev = await prisma.reservation.findUnique({ where: { id }, select: { couponId: true, status: true } });
    await prisma.reservation.update({
      where: { id },
      data: { status },
    });
    if (status === 'CANCELLED' && prev?.couponId && prev.status !== 'CANCELLED') {
      const { decrementCouponUsage } = await import('./coupons');
      await decrementCouponUsage(prev.couponId);
    }
    if (status === 'CONFIRMED' || status === 'CANCELLED') {
      try {
        const { syncCariWithReservation } = await import('./cari');
        await syncCariWithReservation(id);
      } catch {
        // Cari sync should not block reservation status update.
      }
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Update failed' };
  }
}

export async function updateReservationDeposit(id: string, depositPaid: number): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    await prisma.reservation.update({
      where: { id },
      data: { depositPaid: Math.max(0, depositPaid) },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Update failed' };
  }
}

export async function getReservationsByUserId(userId: string) {
  try {
    const list = await prisma.reservation.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    const tourMap = await getTourSummaryMap([...new Set(list.map((r) => r.tourId))]);
    return list.map((r) => ({
      ...r,
      tour: tourMap.get(r.tourId) ?? null,
    }));
  } catch {
    return [];
  }
}

/** Guest: iptal talebi gönderir. İptal ancak operasyon onayı ile uygulanır. */
export async function requestCancellationByGuest(
  reservationId: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };
  try {
    const res = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!res) return { ok: false, error: 'Reservation not found' };
    const isOwner = res.userId === session.id || (res.guestEmail && res.guestEmail === session.email);
    if (!isOwner) return { ok: false, error: 'Not your reservation' };
    if (res.status === 'CANCELLED') return { ok: false, error: 'Already cancelled' };
    if (res.cancellationRequestedAt) return { ok: false, error: 'Zaten iptal talebiniz mevcut, operasyon ekibimiz dönüş yapacaktır.' };
    const safeReason = reason ? sanitizeGuestInput(reason, 500) : '';
    const newNotes = [res.notes, safeReason ? `[İptal nedeni: ${safeReason}]` : null].filter(Boolean).join(' ');
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        cancellationRequestedAt: new Date(),
        cancellationRequestReason: safeReason || null,
        notes: newNotes || res.notes,
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Talep gönderilemedi' };
  }
}

/** Guest: değişiklik talebi gönderir (tarih/kişi/not). Değişiklik ancak operasyon onayı ile uygulanır. */
export async function requestUpdateByGuest(
  reservationId: string,
  data: { date?: string; pax?: number; notes?: string }
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };
  try {
    const res = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!res) return { ok: false, error: 'Reservation not found' };
    const isOwner = res.userId === session.id || (res.guestEmail && res.guestEmail === session.email);
    if (!isOwner) return { ok: false, error: 'Not your reservation' };
    if (res.status === 'CANCELLED') return { ok: false, error: 'Cannot update cancelled reservation' };
    if (res.updateRequestedAt) return { ok: false, error: 'Zaten bir değişiklik talebiniz bekliyor, operasyon ekibimiz dönüş yapacaktır.' };
    const payload: { updateRequestedAt: Date; pendingDate?: Date; pendingPax?: number; pendingNotes?: string | null } = { updateRequestedAt: new Date() };
    if (data.date !== undefined && data.date) {
      const d = new Date(data.date + 'T12:00:00.000Z');
      if (!Number.isNaN(d.getTime())) payload.pendingDate = d;
    }
    if (data.notes !== undefined) payload.pendingNotes = sanitizeGuestInput(data.notes, 500) || null;
    if (data.pax !== undefined && data.pax >= 1) payload.pendingPax = data.pax;
    if (Object.keys(payload).length <= 1) return { ok: false, error: 'En az bir alan değiştirmelisiniz' };
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { ...payload, status: 'CHANGE_REQUESTED' },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Talep gönderilemedi' };
  }
}

function getCancellationReasonLabel(reason: CancellationReason): string {
  switch (reason) {
    case 'free_cancel':
      return 'Ücretsiz iptal';
    case 'customer_request':
      return 'Müşteri talebi';
    case 'wrong_reservation':
      return 'Hatalı rezervasyon';
    case 'other':
    default:
      return 'Diğer';
  }
}

async function sendReservationCancelledEmail(
  reservationId: string,
  reason: CancellationReason,
  note?: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: true };
  try {
    const res = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!res) return { ok: false, error: 'Reservation not found' };
    const tour = await prisma.tour.findUnique({
      where: { id: res.tourId },
      select: { titleEn: true },
    });
    const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';
    const resend = new Resend(apiKey);
    const dateStr = new Date(res.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const reasonLabel = getCancellationReasonLabel(reason);
    const subject = `Rezervasyonunuz iptal edildi – ${tour?.titleEn ?? 'Tur'}`;
    const noteLine = note ? `<p><strong>Not:</strong> ${note}</p>` : '';
    const html = `
      <h2>${subject}</h2>
      <p>Sayın ${res.guestName},</p>
      <p>Rezervasyonunuz operasyon ekibimiz tarafından iptal edilmiştir.</p>
      <p><strong>Tur:</strong> ${tour?.titleEn ?? res.tourId}<br/><strong>Tarih:</strong> ${dateStr}<br/><strong>İptal nedeni:</strong> ${reasonLabel}</p>
      ${noteLine}
      <p>Sorularınız için bizimle iletişime geçebilirsiniz.</p>
      <p>Kısmet Göreme Travel</p>
    `;
    const { error } = await resend.emails.send({
      from,
      to: res.guestEmail,
      subject,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'E-posta gönderilemedi' };
  }
}

/** Admin: misafir iptal talebini onayla → rezervasyon iptal, misafire bildirim. */
export async function approveGuestCancellationRequest(
  reservationId: string,
  sendEmail = true,
  payload?: { reason?: CancellationReason; note?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    const res = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!res) return { ok: false, error: 'Reservation not found' };
    if (!res.cancellationRequestedAt) return { ok: false, error: 'İptal talebi bulunamadı' };
    const reason = payload?.reason ?? 'customer_request';
    const note = payload?.note ? sanitizeGuestInput(payload.note, 500) : null;
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'CANCELLED',
        cancelReason: reason,
        cancelNote: note,
        cancelledBy: 'customer',
        cancellationRequestedAt: null,
        cancellationRequestReason: null,
      },
    });
    try {
      const { syncCariWithReservation } = await import('./cari');
      await syncCariWithReservation(reservationId);
    } catch {
      // Cari sync should not block cancellation approval.
    }
    if (res.couponId) {
      const { decrementCouponUsage } = await import('./coupons');
      await decrementCouponUsage(res.couponId);
    }
    if (sendEmail) await sendReservationCancelledEmail(reservationId, reason, note ?? undefined);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Onaylama başarısız' };
  }
}

/** Admin: rezervasyonu doğrudan iptal eder. */
export async function cancelReservationByAdmin(
  reservationId: string,
  payload: { reason: CancellationReason; note?: string | null; sendEmail?: boolean }
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    const res = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!res) return { ok: false, error: 'Reservation not found' };
    if (res.status === 'CANCELLED') return { ok: false, error: 'Rezervasyon zaten iptal edilmiş.' };
    const note = payload.note ? sanitizeGuestInput(payload.note, 500) : null;
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'CANCELLED',
        cancelReason: payload.reason,
        cancelNote: note,
        cancelledBy: 'admin',
        cancellationRequestedAt: null,
        cancellationRequestReason: null,
      },
    });
    try {
      const { syncCariWithReservation } = await import('./cari');
      await syncCariWithReservation(reservationId);
    } catch {
      // Cari sync should not block direct admin cancellation.
    }
    if (res.couponId) {
      const { decrementCouponUsage } = await import('./coupons');
      await decrementCouponUsage(res.couponId);
    }
    if (payload.sendEmail !== false) await sendReservationCancelledEmail(reservationId, payload.reason, note ?? undefined);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'İptal işlemi başarısız' };
  }
}

/** Admin: misafir iptal talebini reddet → misafire bildirim. */
export async function rejectGuestCancellationRequest(reservationId: string, adminNote?: string, sendEmail = true): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    const res = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!res) return { ok: false, error: 'Reservation not found' };
    if (!res.cancellationRequestedAt) return { ok: false, error: 'İptal talebi bulunamadı' };
    const noteAppend = adminNote ? sanitizeGuestInput(adminNote, 300) : '';
    const updateData: { cancellationRequestedAt: null; cancellationRequestReason: null; notes?: string } = {
      cancellationRequestedAt: null,
      cancellationRequestReason: null,
    };
    if (noteAppend) updateData.notes = [res.notes, `[Operasyon notu: ${noteAppend}]`].filter(Boolean).join(' ');
    await prisma.reservation.update({
      where: { id: reservationId },
      data: updateData,
    });
    if (sendEmail) await sendGuestRequestResponseEmail(reservationId, 'cancellation_rejected', adminNote);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Reddetme başarısız' };
  }
}

/** Rezervasyon fiyatını yeni tarih/kişi sayısına göre yeniden hesapla. Değişiklik talebi onayında kupon için kullanılır. */
async function recalculateReservationPrice(
  res: { tourId: string; variantId: string | null; options: string; transferAirport: string | null; transferDirection: string | null; childCount: number | null },
  newDate: Date,
  newPax: number
): Promise<{ subtotal: number; tourType: string } | null> {
  const dateStr = newDate.toISOString().split('T')[0];
  const tour = await prisma.tour.findUnique({ where: { id: res.tourId } });
  if (!tour) return null;
  const [options, variants] = await Promise.all([
    prisma.tourOption.findMany({ where: { tourId: res.tourId } }),
    prisma.tourVariant.findMany({ where: { tourId: res.tourId } }),
  ]);

  const datePrice = await getTourDatePrice(res.tourId, dateStr);
  const basePrice = datePrice?.price ?? tour.basePrice;

  let subtotal = 0;

  if (res.variantId) {
    const variant = variants.find((v) => v.id === res.variantId);
    if (variant) {
      const children = res.childCount ?? 0;
      const adults = Math.max(0, newPax - children);
      const tierPrice = resolveTierPrice(parsePriceTiers(variant.privatePriceTiers) ?? null, newPax);
      if (variant.pricingType === 'per_person') {
        if (variant.reservationType === 'private' && tierPrice != null) {
          subtotal = tierPrice;
        } else {
          subtotal = variant.adultPrice * adults + (variant.childPrice ?? variant.adultPrice) * children;
        }
      } else {
        subtotal = tierPrice ?? variant.adultPrice;
      }
      if (res.transferDirection === 'roundtrip') subtotal = subtotal * 2 * 0.9;
    } else {
      subtotal = basePrice * newPax;
    }
  } else if (tour.type === 'TRANSFER' && res.transferAirport && (res.transferAirport === 'ASR' || res.transferAirport === 'NAV')) {
    const transferPrice = getTransferPriceForPaxAndAirport(
      {
        basePrice,
        transferTiers: tour.transferTiers as { minPax: number; maxPax: number; price: number }[] | null,
        transferAirportTiers: tour.transferAirportTiers as { ASR?: { minPax: number; maxPax: number; price: number }[]; NAV?: { minPax: number; maxPax: number; price: number }[] } | null,
      },
      newPax,
      res.transferAirport
    );
    subtotal = res.transferDirection === 'roundtrip' ? transferPrice * 2 * 0.9 : transferPrice;
  } else {
    subtotal = basePrice * newPax;
  }

  try {
    const opts = JSON.parse(res.options || '[]') as { id?: string | number; price?: number; pricingMode?: 'per_person' | 'flat' | 'per_unit'; quantity?: number }[];
    if (Array.isArray(opts)) {
      for (const o of opts) {
        const qty = typeof o?.quantity === 'number' && o.quantity > 0 ? o.quantity : 1;
        if (typeof o?.price === 'number') {
          if (o.pricingMode === 'flat') subtotal += o.price;
          else if (o.pricingMode === 'per_unit') subtotal += o.price * qty;
          else subtotal += o.price * newPax;
        } else {
          const tourOpt = options.find((to) => String(to.id) === String(o?.id));
          if (tourOpt) {
            if (tourOpt.pricingMode === 'flat') subtotal += tourOpt.priceAdd;
            else if (tourOpt.pricingMode === 'per_unit') subtotal += tourOpt.priceAdd * qty;
            else subtotal += tourOpt.priceAdd * newPax;
          }
        }
      }
    }
  } catch {
    // options parse failed, skip
  }

  return { subtotal, tourType: tour.type };
}

/** Admin: misafir değişiklik talebini onayla → tarih/kişi/not güncellenir, kupon varsa indirim yeniden hesaplanır. */
export async function approveGuestUpdateRequest(reservationId: string, sendEmail = true): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    const res = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!res) return { ok: false, error: 'Reservation not found' };
    if (!res.updateRequestedAt) return { ok: false, error: 'Değişiklik talebi bulunamadı' };

    const newDate = res.pendingDate ?? res.date;
    const newPax = res.pendingPax ?? res.pax;

    const data: {
      date?: Date;
      pax?: number;
      notes?: string | null;
      totalPrice?: number;
      originalPrice?: number | null;
      discountAmount?: number | null;
      couponId?: string | null;
      couponCode?: string | null;
      updateRequestedAt?: null;
      pendingDate?: null;
      pendingPax?: null;
      pendingNotes?: null;
    } = {
      updateRequestedAt: null,
      pendingDate: null,
      pendingPax: null,
      pendingNotes: null,
    };
    if (res.pendingDate) data.date = res.pendingDate;
    if (res.pendingPax != null) data.pax = res.pendingPax;
    if (res.pendingNotes !== undefined) data.notes = res.pendingNotes;

    if (res.pendingDate || res.pendingPax != null) {
      const recalc = await recalculateReservationPrice(res, newDate, newPax);
      if (recalc) {
        data.totalPrice = recalc.subtotal;
        data.originalPrice = recalc.subtotal;
        data.discountAmount = null;
        data.couponId = null;
        data.couponCode = null;

        if (res.couponId && res.couponCode) {
          const { validateCoupon, decrementCouponUsage } = await import('./coupons');
          const validation = await validateCoupon({
            code: res.couponCode,
            subtotal: recalc.subtotal,
            items: [{ date: newDate.toISOString().split('T')[0], tourType: recalc.tourType, totalPrice: recalc.subtotal, title: '' }],
          });
          if (validation.ok) {
            data.originalPrice = recalc.subtotal;
            data.discountAmount = validation.discountAmount;
            data.totalPrice = Math.max(0, recalc.subtotal - validation.discountAmount);
            data.couponId = res.couponId;
            data.couponCode = res.couponCode;
          } else {
            await decrementCouponUsage(res.couponId);
          }
        }
      }
    }

    await prisma.reservation.update({
      where: { id: reservationId },
      data: { ...data, status: 'CONFIRMED' },
    });
    try {
      const { syncCariWithReservation } = await import('./cari');
      await syncCariWithReservation(reservationId);
    } catch {
      // Cari sync should not block update request approval.
    }
    if (sendEmail) await sendGuestRequestResponseEmail(reservationId, 'update_approved');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Onaylama başarısız' };
  }
}

/** Admin: misafir değişiklik talebini reddet → misafire bildirim. */
export async function rejectGuestUpdateRequest(reservationId: string, adminNote?: string, sendEmail = true): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    const res = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!res) return { ok: false, error: 'Reservation not found' };
    if (!res.updateRequestedAt) return { ok: false, error: 'Değişiklik talebi bulunamadı' };
    const noteAppend = adminNote ? sanitizeGuestInput(adminNote, 300) : '';
    const newNotes = [res.notes, noteAppend ? `[Operasyon notu: ${noteAppend}]` : null].filter(Boolean).join(' ');
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'CONFIRMED',
        updateRequestedAt: null,
        pendingDate: null,
        pendingPax: null,
        pendingNotes: null,
        ...(newNotes ? { notes: newNotes } : {}),
      },
    });
    if (sendEmail) await sendGuestRequestResponseEmail(reservationId, 'update_rejected', adminNote);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Reddetme başarısız' };
  }
}

/** Misafire talep sonucu e-postası (onay/red). */
export async function sendGuestRequestResponseEmail(
  reservationId: string,
  outcome: 'cancellation_approved' | 'cancellation_rejected' | 'update_approved' | 'update_rejected',
  adminNote?: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: true };
  try {
    const res = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!res) return { ok: false, error: 'Reservation not found' };
    const tour = await prisma.tour.findUnique({
      where: { id: res.tourId },
      select: { titleEn: true, titleTr: true },
    });
    const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';
    const resend = new Resend(apiKey);
    const dateStr = new Date(res.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let subject: string;
    let body: string;
    if (outcome === 'cancellation_approved') {
      subject = `Rezervasyonunuz iptal edildi – ${tour?.titleEn ?? 'Tur'}`;
      body = `<p>Sayın ${res.guestName},</p><p>İptal talebiniz onaylandı. Rezervasyonunuz iptal edilmiştir.</p><p><strong>Tur:</strong> ${tour?.titleEn ?? res.tourId}<br/><strong>Tarih:</strong> ${dateStr}</p><p>Sorularınız için bize ulaşabilirsiniz.</p><p>Kısmet Göreme Travel</p>`;
    } else if (outcome === 'cancellation_rejected') {
      subject = `İptal talebiniz – ${tour?.titleEn ?? 'Tur'}`;
      body = `<p>Sayın ${res.guestName},</p><p>İptal talebiniz şu an için onaylanmadı. Rezervasyonunuz geçerliliğini korumaktadır.</p>${adminNote ? `<p><em>Not: ${adminNote}</em></p>` : ''}<p>Lütfen bizimle iletişime geçin; size daha uygun bir çözüm sunabiliriz.</p><p>Kısmet Göreme Travel</p>`;
    } else if (outcome === 'update_approved') {
      const newDateStr = new Date(res.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      subject = `Rezervasyonunuz güncellendi – ${tour?.titleEn ?? 'Tur'}`;
      body = `<p>Sayın ${res.guestName},</p><p>Değişiklik talebiniz onaylandı. Rezervasyonunuz güncellenmiştir.</p><p><strong>Tur:</strong> ${tour?.titleEn ?? res.tourId}<br/><strong>Yeni tarih:</strong> ${newDateStr}<br/><strong>Kişi sayısı:</strong> ${res.pax}</p><p>Kısmet Göreme Travel</p>`;
    } else {
      subject = `Değişiklik talebiniz – ${tour?.titleEn ?? 'Tur'}`;
      body = `<p>Sayın ${res.guestName},</p><p>Değişiklik talebiniz şu an için onaylanmadı.</p>${adminNote ? `<p><em>Not: ${adminNote}</em></p>` : ''}<p>Lütfen bizimle iletişime geçin.</p><p>Kısmet Göreme Travel</p>`;
    }
    const { error } = await resend.emails.send({
      from,
      to: res.guestEmail,
      subject,
      html: `<h2>${subject}</h2>${body}`,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'E-posta gönderilemedi' };
  }
}

/** Dashboard: today's reservation count, pending count, balloon capacity/available, recent activities */
function getTodayUtcRange() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export type DashboardStats = {
  todayReservations: number;
  pendingCount: number;
  balloonTotalCapacity: number;
  balloonAvailableSeats: number;
  tomorrowReservations?: number;
  monthRevenue?: number;
  cancelledCount?: number;
};

export type PendingReservationCard = {
  id: string;
  guestName: string;
  tourTitle: string;
  variantTitle: string | null;
  dateStr: string;
  pax: number;
  totalPrice: number;
  depositPaid: number;
  notes: string | null;
  timeAgo: string;
  createdAt: Date;
};

export type GuestRequestItem = {
  id: string;
  guestName: string;
  guestEmail: string;
  tourTitle: string;
  dateStr: string;
  pax: number;
  totalPrice: number;
  requestType: 'cancellation' | 'update';
  cancellationRequestReason: string | null;
  pendingDate: Date | null;
  pendingPax: number | null;
  pendingNotes: string | null;
  requestedAt: string;
};

/** Admin: misafir iptal ve değişiklik taleplerini listele. */
export async function getGuestRequestReservations(): Promise<GuestRequestItem[]> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return [];
  try {
    const list = await prisma.reservation.findMany({
      where: {
        OR: [
          { cancellationRequestedAt: { not: null } },
          { updateRequestedAt: { not: null } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });
    const tourMap = await getTourSummaryMap([...new Set(list.map((r) => r.tourId))]);
    return list.map((r) => {
      const requestedAt = (r.cancellationRequestedAt ?? r.updateRequestedAt)!;
      return {
        id: r.id,
        guestName: r.guestName,
        guestEmail: r.guestEmail,
        tourTitle: tourMap.get(r.tourId)?.titleEn ?? r.tourId,
        dateStr: r.date.toISOString().split('T')[0],
        pax: r.pax,
        totalPrice: r.totalPrice,
        requestType: r.cancellationRequestedAt != null ? 'cancellation' : 'update',
        cancellationRequestReason: r.cancellationRequestReason ?? null,
        pendingDate: r.pendingDate ?? null,
        pendingPax: r.pendingPax ?? null,
        pendingNotes: r.pendingNotes ?? null,
        requestedAt: requestedAt.toISOString(),
      };
    });
  } catch {
    return [];
  }
}

/** Lightweight count for admin sidebar badge. */
export async function getPendingReservationCount(): Promise<number> {
  try {
    return await prisma.reservation.count({ where: { status: 'PENDING' } });
  } catch {
    return 0;
  }
}

export async function getAdminDashboardStats(): Promise<DashboardStats> {
  try {
    const { start: todayStart, end: todayEnd } = getTodayUtcRange();

    const [todayReservations, pendingCount, balloonTours, todayBalloonPrices, todayBalloonPax] = await Promise.all([
      prisma.reservation.count({ where: { date: { gte: todayStart, lt: todayEnd } } }),
      prisma.reservation.count({ where: { status: 'PENDING' } }),
      prisma.tour.findMany({ where: { type: 'BALLOON' }, select: { id: true, capacity: true } }),
      prisma.tourDatePrice.findMany({
        where: {
          tour: { type: 'BALLOON' },
          date: { gte: todayStart, lt: todayEnd },
        },
        select: { tourId: true, capacityOverride: true },
      }),
      prisma.reservation.aggregate({
        where: {
          date: { gte: todayStart, lt: todayEnd },
          tour: { type: 'BALLOON' },
        },
        _sum: { pax: true },
      }),
    ]);

    const capacityByTourId = new Map<string, number>();
    for (const t of balloonTours) capacityByTourId.set(t.id, t.capacity);
    for (const p of todayBalloonPrices) {
      if (p.capacityOverride != null) capacityByTourId.set(p.tourId, p.capacityOverride);
    }
    const balloonTotalCapacity = Array.from(capacityByTourId.values()).reduce((a, b) => a + b, 0);
    const balloonBooked = todayBalloonPax._sum.pax ?? 0;
    const balloonAvailableSeats = Math.max(0, balloonTotalCapacity - balloonBooked);

    const now = new Date();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [tomorrowRes, monthAgg, cancelledCount] = await Promise.all([
      prisma.reservation.count({ where: { date: { gte: tomorrowStart, lt: tomorrowEnd } } }),
      prisma.reservation.aggregate({
        // Cari otomasyonu CONFIRMED rezervasyonlarda çalıştığı için dashboard gelirini de CONFIRMED ile hizalıyoruz.
        where: { date: { gte: monthStart, lte: monthEnd }, status: 'CONFIRMED' },
        _sum: { totalPrice: true },
      }),
      prisma.reservation.count({ where: { status: 'CANCELLED' } }),
    ]);

    return {
      todayReservations,
      pendingCount,
      balloonTotalCapacity,
      balloonAvailableSeats,
      tomorrowReservations: tomorrowRes,
      monthRevenue: monthAgg._sum.totalPrice ?? 0,
      cancelledCount,
    };
  } catch {
    return {
      todayReservations: 0,
      pendingCount: 0,
      balloonTotalCapacity: 0,
      balloonAvailableSeats: 0,
      tomorrowReservations: 0,
      monthRevenue: 0,
      cancelledCount: 0,
    };
  }
}

export async function getPendingReservationsForDashboard(): Promise<PendingReservationCard[]> {
  try {
    const list = await prisma.reservation.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    const tourMap = await getTourSummaryMap([...new Set(list.map((r) => r.tourId))]);
    const variantMap = await getVariantSummaryMap([...new Set(list.map((r) => r.variantId).filter((v): v is string => Boolean(v)))]);
    return list.map((r: {
      id: string; guestName: string; createdAt: Date; date: Date; pax: number; totalPrice: number; depositPaid: number; notes: string | null;
      tourId: string;
      variantId: string | null;
    }) => ({
      id: r.id,
      guestName: r.guestName,
      tourTitle: tourMap.get(r.tourId)?.titleEn ?? 'Tur',
      variantTitle: r.variantId ? variantMap.get(r.variantId)?.titleEn ?? null : null,
      dateStr: r.date.toISOString().split('T')[0],
      pax: r.pax,
      totalPrice: r.totalPrice,
      depositPaid: r.depositPaid ?? 0,
      notes: r.notes ?? null,
      timeAgo: formatTimeAgo(r.createdAt),
      createdAt: r.createdAt,
    }));
  } catch {
    return [];
  }
}

export type TodayReservationRow = { id: string; tourTitle: string; variantTitle: string | null; pax: number };

export async function getTodayReservationsForDashboard(): Promise<TodayReservationRow[]> {
  try {
    const { start, end } = getTodayUtcRange();
    const list = await prisma.reservation.findMany({
      where: { date: { gte: start, lt: end }, status: { not: 'CANCELLED' } },
      orderBy: { date: 'asc' },
    });
    const tourMap = await getTourSummaryMap([...new Set(list.map((r) => r.tourId))]);
    const variantMap = await getVariantSummaryMap([...new Set(list.map((r) => r.variantId).filter((v): v is string => Boolean(v)))]);
    return list.map((r: { id: string; pax: number; tourId: string; variantId: string | null }) => ({
      id: r.id,
      tourTitle: tourMap.get(r.tourId)?.titleEn ?? 'Tur',
      variantTitle: r.variantId ? variantMap.get(r.variantId)?.titleEn ?? null : null,
      pax: r.pax,
    }));
  } catch {
    return [];
  }
}

export type RecentActivity = {
  id: string;
  guestName: string;
  tourTitle: string;
  description: string;
  timeAgo: string;
  dateStr: string;
  pax: number;
  totalPrice: number;
  status: string;
};

function formatTimeAgo(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return 'az önce';
  if (sec < 3600) return `${Math.floor(sec / 60)} dakika önce`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} saat önce`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} gün önce`;
  return date.toLocaleDateString('tr-TR');
}

export async function getRecentActivities(limit = 10): Promise<RecentActivity[]> {
  try {
    const list = await prisma.reservation.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    const tourMap = await getTourSummaryMap([...new Set(list.map((r) => r.tourId))]);
    return list.map((r: { id: string; guestName: string; tourId: string; depositPaid: number; createdAt: Date; updatedAt: Date; date: Date; pax: number; totalPrice: number; status: string }) => {
      const wasUpdated = r.updatedAt.getTime() - r.createdAt.getTime() > 60_000; // > 1 min
      let description: string;
      if (wasUpdated) description = 'misafir rezervasyonu güncelledi.';
      else if (r.depositPaid > 0) description = 'havale ile depozit ödedi.';
      else description = 'rezervasyon talebi gönderdi.';
      const tour = tourMap.get(r.tourId);
      return {
        id: r.id,
        guestName: r.guestName,
        tourTitle: tour?.titleTr ?? tour?.titleEn ?? 'Tur',
        description,
        timeAgo: formatTimeAgo(wasUpdated ? r.updatedAt : r.createdAt),
        dateStr: r.date.toISOString().split('T')[0],
        pax: r.pax,
        totalPrice: r.totalPrice,
        status: r.status,
      };
    });
  } catch {
    return [];
  }
}

/** Send a confirmation email for a reservation. Requires RESEND_API_KEY and optionally RESEND_FROM (e.g. confirmations@yourdomain.com). */
export async function sendReservationConfirmationEmail(reservationId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: 'Email not configured (RESEND_API_KEY missing)' };
  try {
    const res = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!res) return { ok: false, error: 'Reservation not found' };
    const tour = await prisma.tour.findUnique({
      where: { id: res.tourId },
      select: { titleEn: true, titleTr: true },
    });
    const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';
    const resend = new Resend(apiKey);
    const dateStr = new Date(res.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const html = `
      <h2>Reservation confirmed</h2>
      <p>Dear ${res.guestName},</p>
      <p>Your reservation with Kısmet Göreme Travel has been confirmed.</p>
      <ul>
        <li><strong>Tour / Service:</strong> ${tour?.titleEn ?? res.tourId}</li>
        <li><strong>Date:</strong> ${dateStr}</li>
        <li><strong>Guests:</strong> ${res.pax}</li>
        <li><strong>Total:</strong> €${res.totalPrice}</li>
      </ul>
      <p>If you have any questions, please contact us.</p>
      <p>Best regards,<br/>Kısmet Göreme Travel</p>
    `;
    const { error } = await resend.emails.send({
      from,
      to: res.guestEmail,
      subject: `Reservation confirmed – ${tour?.titleEn ?? 'Tour'}`,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to send email' };
  }
}
