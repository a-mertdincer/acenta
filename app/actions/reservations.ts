'use server';

import { prisma } from '../../lib/prisma';
import { getSession } from '../actions/auth';
import { Resend } from 'resend';

export interface CreateReservationItem {
  tourId: string;
  date: string;
  pax: number;
  totalPrice: number;
  optionsJson: string;
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
          date: new Date(item.date),
          pax: item.pax,
          totalPrice: item.totalPrice,
          options: item.optionsJson,
          notes: [input.hotelName, input.roomNumber].filter(Boolean).join(' | ') || input.notes || null,
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
};

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

    return {
      todayReservations,
      pendingCount,
      balloonTotalCapacity,
      balloonAvailableSeats,
    };
  } catch {
    return {
      todayReservations: 0,
      pendingCount: 0,
      balloonTotalCapacity: 0,
      balloonAvailableSeats: 0,
    };
  }
}

export type RecentActivity = {
  id: string;
  guestName: string;
  tourTitle: string;
  description: string;
  timeAgo: string;
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
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { tour: true },
    });
    return list.map((r) => ({
      id: r.id,
      guestName: r.guestName,
      tourTitle: r.tour?.titleTr ?? r.tour?.titleEn ?? 'Tur',
      description: r.depositPaid > 0 ? 'havale ile depozit ödedi.' : 'rezervasyon talebi gönderdi.',
      timeAgo: formatTimeAgo(r.createdAt),
    }));
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
