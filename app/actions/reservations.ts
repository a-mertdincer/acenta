'use server';

import { prisma } from '../../lib/prisma';
import { getSession } from '../actions/auth';
import { Resend } from 'resend';
import { sanitizeGuestInput } from '@/lib/guestNotes';

export interface CreateReservationItem {
  tourId: string;
  date: string;
  pax: number;
  totalPrice: number;
  optionsJson: string;
  /** For transfer reservations: ASR | NAV */
  transferAirport?: string;
  /** When booking with variant system */
  variantId?: string | null;
  transferDirection?: string | null;
  transferFlightArrival?: string | null;
  transferFlightDeparture?: string | null;
  transferHotelName?: string | null;
  childCount?: number | null;
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
}

export async function createReservations(input: CreateReservationInput): Promise<{ ok: boolean; ids?: string[]; error?: string }> {
  try {
    const session = await getSession();
    const userId = input.userId ?? session?.id ?? null;
    const ids: string[] = [];
    for (const item of input.items) {
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
          totalPrice: item.totalPrice,
          options: item.optionsJson,
          notes: [input.hotelName, input.roomNumber].filter(Boolean).join(' | ') || input.notes || null,
          transferAirport: item.transferAirport ?? null,
          transferDirection: item.transferDirection ?? null,
          transferFlightArrival: item.transferFlightArrival ?? null,
          transferFlightDeparture: item.transferFlightDeparture ?? null,
          transferHotelName: item.transferHotelName ?? null,
          childCount: item.childCount ?? null,
        },
      });
      ids.push(res.id);
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
      include: { tour: true, variant: { select: { titleEn: true, titleTr: true } } },
      orderBy: { date: 'asc' },
    });
    return list;
  } catch {
    return [];
  }
}

/** Public: fetch reservation details by ids for thank-you / success page only. Ids are from redirect URL. */
export async function getReservationDetailsByIds(ids: string[]) {
  if (!ids?.length) return [];
  try {
    const list = await prisma.reservation.findMany({
      where: { id: { in: ids } },
      include: { tour: true },
      orderBy: { date: 'asc' },
    });
    return list;
  } catch {
    return [];
  }
}

export async function updateReservationStatus(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await prisma.reservation.update({
      where: { id },
      data: { status },
    });
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
    return await prisma.reservation.findMany({
      where: { userId },
      include: { tour: true },
      orderBy: { date: 'desc' },
    });
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
      data: payload,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Talep gönderilemedi' };
  }
}

/** Admin: misafir iptal talebini onayla → rezervasyon iptal, misafire bildirim. */
export async function approveGuestCancellationRequest(reservationId: string, sendEmail = true): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    const res = await prisma.reservation.findUnique({ where: { id: reservationId }, include: { tour: true } });
    if (!res) return { ok: false, error: 'Reservation not found' };
    if (!res.cancellationRequestedAt) return { ok: false, error: 'İptal talebi bulunamadı' };
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'CANCELLED',
        cancellationRequestedAt: null,
        cancellationRequestReason: null,
      },
    });
    if (sendEmail) await sendGuestRequestResponseEmail(reservationId, 'cancellation_approved');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Onaylama başarısız' };
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

/** Admin: misafir değişiklik talebini onayla → tarih/kişi/not güncellenir, misafire bildirim. */
export async function approveGuestUpdateRequest(reservationId: string, sendEmail = true): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    const res = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!res) return { ok: false, error: 'Reservation not found' };
    if (!res.updateRequestedAt) return { ok: false, error: 'Değişiklik talebi bulunamadı' };
    const data: { date?: Date; pax?: number; notes?: string | null; updateRequestedAt?: null; pendingDate?: null; pendingPax?: null; pendingNotes?: null } = {
      updateRequestedAt: null,
      pendingDate: null,
      pendingPax: null,
      pendingNotes: null,
    };
    if (res.pendingDate) data.date = res.pendingDate;
    if (res.pendingPax != null) data.pax = res.pendingPax;
    if (res.pendingNotes !== undefined) data.notes = res.pendingNotes;
    await prisma.reservation.update({
      where: { id: reservationId },
      data,
    });
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
    const res = await prisma.reservation.findUnique({ where: { id: reservationId }, include: { tour: true } });
    if (!res) return { ok: false, error: 'Reservation not found' };
    const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';
    const resend = new Resend(apiKey);
    const dateStr = new Date(res.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let subject: string;
    let body: string;
    if (outcome === 'cancellation_approved') {
      subject = `Rezervasyonunuz iptal edildi – ${res.tour?.titleEn ?? 'Tur'}`;
      body = `<p>Sayın ${res.guestName},</p><p>İptal talebiniz onaylandı. Rezervasyonunuz iptal edilmiştir.</p><p><strong>Tur:</strong> ${res.tour?.titleEn ?? res.tourId}<br/><strong>Tarih:</strong> ${dateStr}</p><p>Sorularınız için bize ulaşabilirsiniz.</p><p>Kısmet Göreme Travel</p>`;
    } else if (outcome === 'cancellation_rejected') {
      subject = `İptal talebiniz – ${res.tour?.titleEn ?? 'Tur'}`;
      body = `<p>Sayın ${res.guestName},</p><p>İptal talebiniz şu an için onaylanmadı. Rezervasyonunuz geçerliliğini korumaktadır.</p>${adminNote ? `<p><em>Not: ${adminNote}</em></p>` : ''}<p>Lütfen bizimle iletişime geçin; size daha uygun bir çözüm sunabiliriz.</p><p>Kısmet Göreme Travel</p>`;
    } else if (outcome === 'update_approved') {
      const newDateStr = new Date(res.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      subject = `Rezervasyonunuz güncellendi – ${res.tour?.titleEn ?? 'Tur'}`;
      body = `<p>Sayın ${res.guestName},</p><p>Değişiklik talebiniz onaylandı. Rezervasyonunuz güncellenmiştir.</p><p><strong>Tur:</strong> ${res.tour?.titleEn ?? res.tourId}<br/><strong>Yeni tarih:</strong> ${newDateStr}<br/><strong>Kişi sayısı:</strong> ${res.pax}</p><p>Kısmet Göreme Travel</p>`;
    } else {
      subject = `Değişiklik talebiniz – ${res.tour?.titleEn ?? 'Tur'}`;
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
      include: { tour: true },
      orderBy: { updatedAt: 'desc' },
    });
    return list.map((r) => {
      const requestedAt = (r.cancellationRequestedAt ?? r.updateRequestedAt)!;
      return {
        id: r.id,
        guestName: r.guestName,
        guestEmail: r.guestEmail,
        tourTitle: r.tour?.titleEn ?? r.tourId,
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
        where: { date: { gte: monthStart, lte: monthEnd }, status: { not: 'CANCELLED' } },
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
      include: { tour: true, variant: { select: { titleEn: true } } },
    });
    return list.map((r: {
      id: string; guestName: string; createdAt: Date; date: Date; pax: number; totalPrice: number; depositPaid: number; notes: string | null;
      tour?: { titleEn: string } | null;
      variant?: { titleEn: string } | null;
    }) => ({
      id: r.id,
      guestName: r.guestName,
      tourTitle: r.tour?.titleEn ?? 'Tur',
      variantTitle: r.variant?.titleEn ?? null,
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
      include: { tour: true, variant: { select: { titleEn: true } } },
    });
    return list.map((r: { id: string; pax: number; tour?: { titleEn: string } | null; variant?: { titleEn: string } | null }) => ({
      id: r.id,
      tourTitle: r.tour?.titleEn ?? 'Tur',
      variantTitle: r.variant?.titleEn ?? null,
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
      include: { tour: true },
    });
    return list.map((r: { id: string; guestName: string; tour?: { titleTr: string; titleEn: string } | null; depositPaid: number; createdAt: Date; updatedAt: Date; date: Date; pax: number; totalPrice: number; status: string }) => {
      const wasUpdated = r.updatedAt.getTime() - r.createdAt.getTime() > 60_000; // > 1 min
      let description: string;
      if (wasUpdated) description = 'misafir rezervasyonu güncelledi.';
      else if (r.depositPaid > 0) description = 'havale ile depozit ödedi.';
      else description = 'rezervasyon talebi gönderdi.';
      return {
        id: r.id,
        guestName: r.guestName,
        tourTitle: r.tour?.titleTr ?? r.tour?.titleEn ?? 'Tur',
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
    const res = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { tour: true },
    });
    if (!res) return { ok: false, error: 'Reservation not found' };
    const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';
    const resend = new Resend(apiKey);
    const dateStr = new Date(res.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const html = `
      <h2>Reservation confirmed</h2>
      <p>Dear ${res.guestName},</p>
      <p>Your reservation with Kısmet Göreme Travel has been confirmed.</p>
      <ul>
        <li><strong>Tour / Service:</strong> ${res.tour?.titleEn ?? res.tourId}</li>
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
      subject: `Reservation confirmed – ${res.tour?.titleEn ?? 'Tour'}`,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to send email' };
  }
}
