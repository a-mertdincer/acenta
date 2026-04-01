'use server';

import { getSession } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';

export type CariRecordRow = {
  id: string;
  reservationId: string | null;
  reservationStatus: string | null;
  adultCount: number | null;
  childCount: number | null;
  infantCount: number | null;
  guestName: string;
  hotelName: string | null;
  roomNumber: string | null;
  activityType: string;
  quantity: number;
  activityDate: Date;
  salePrice: number;
  saleCurrency: string;
  costAmount: number | null;
  costCurrency: string | null;
  costDescription: string | null;
  agentName: string | null;
  paymentMethod: string;
  paymentDestination: string;
  salesperson: string | null;
  paidToAgency: string | null;
  reservationConfirmed: boolean;
  confirmationReceived: boolean;
  paymentReceived: boolean;
  profit: number | null;
  notes: string | null;
  completionStatus: 'MISSING' | 'COMPLETE' | 'CANCELLED';
  missingFields: string[];
  createdAt: Date;
  updatedAt: Date;
};

function computeProfit(salePrice: number, quantity: number, costAmount: number | null): number | null {
  if (costAmount == null) return null;
  return salePrice * quantity - costAmount * quantity;
}

function extractHotelRoomFromReservationNotes(notes: string | null): { hotelName: string | null; roomNumber: string | null } {
  if (!notes) return { hotelName: null, roomNumber: null };
  const [hotel, room] = notes.split('|').map((part) => part?.trim() ?? '');
  return {
    hotelName: hotel || null,
    roomNumber: room || null,
  };
}

function getMissingCompletionFields(row: {
  reservationStatus: string | null;
  salesperson: string | null;
  paidToAgency: string | null;
}): string[] {
  if (row.reservationStatus === 'CANCELLED') return [];
  const missing: string[] = [];
  if (!row.salesperson?.trim()) missing.push('salesperson');
  if (!row.paidToAgency?.trim()) missing.push('paid_to_agency');
  return missing;
}

function computeCompletionStatus(row: {
  reservationStatus: string | null;
  salesperson: string | null;
  paidToAgency: string | null;
}): 'MISSING' | 'COMPLETE' | 'CANCELLED' {
  if (row.reservationStatus === 'CANCELLED') return 'CANCELLED';
  return getMissingCompletionFields(row).length === 0 ? 'COMPLETE' : 'MISSING';
}

async function getReservationStatusMap(reservationIds: string[]): Promise<Map<string, string>> {
  if (reservationIds.length === 0) return new Map();
  // Adapter issue with `in` filters: fetch minimal list and map in-memory.
  const wanted = new Set(reservationIds);
  const rows = await prisma.reservation.findMany({
    select: { id: true, status: true },
  });
  return new Map(rows.filter((r) => wanted.has(r.id)).map((r) => [r.id, r.status]));
}

async function getReservationPaxMap(
  reservationIds: string[]
): Promise<Map<string, { adults: number | null; children: number | null; infants: number | null }>> {
  if (reservationIds.length === 0) return new Map();
  const wanted = new Set(reservationIds);
  const rows = await prisma.reservation.findMany({
    select: { id: true, pax: true, adultCount: true, childCount: true, infantCount: true },
  });
  return new Map(
    rows
      .filter((r) => wanted.has(r.id))
      .map((r) => {
        const children = r.childCount ?? 0;
        const infants = r.infantCount ?? 0;
        const adults = r.adultCount ?? Math.max(1, (r.pax ?? 1) - children - infants);
        return [r.id, { adults, children, infants }];
      })
  );
}

export async function getCariRecords(filters?: { month?: string; agent?: string }): Promise<CariRecordRow[]> {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return [];
    const where: { activityDate?: { gte?: Date; lte?: Date }; agentName?: string } = {};
    if (filters?.month) {
      const [y, m] = filters.month.split('-').map(Number);
      where.activityDate = {
        gte: new Date(y, m - 1, 1),
        lte: new Date(y, m, 0, 23, 59, 59),
      };
    }
    if (filters?.agent) where.agentName = filters.agent;
    const list = await prisma.cariRecord.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { activityDate: 'desc' },
    });
    const reservationStatusMap = await getReservationStatusMap(
      (list ?? [])
        .map((r) => r.reservationId)
        .filter((id): id is string => Boolean(id))
    );
    const reservationPaxMap = await getReservationPaxMap(
      (list ?? [])
        .map((r) => r.reservationId)
        .filter((id): id is string => Boolean(id))
    );
    return (list ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      reservationId: r.reservationId != null ? String(r.reservationId) : null,
      reservationStatus:
        r.reservationId != null ? reservationStatusMap.get(String(r.reservationId)) ?? null : null,
      adultCount:
        r.reservationId != null
          ? reservationPaxMap.get(String(r.reservationId))?.adults ?? null
          : null,
      childCount:
        r.reservationId != null
          ? reservationPaxMap.get(String(r.reservationId))?.children ?? null
          : null,
      infantCount:
        r.reservationId != null
          ? reservationPaxMap.get(String(r.reservationId))?.infants ?? null
          : null,
      guestName: String(r.guestName),
      hotelName: r.hotelName != null ? String(r.hotelName) : null,
      roomNumber: r.roomNumber != null ? String(r.roomNumber) : null,
      activityType: String(r.activityType),
      quantity: Number(r.quantity),
      activityDate: r.activityDate as Date,
      salePrice: Number(r.salePrice),
      saleCurrency: String(r.saleCurrency ?? 'EUR'),
      costAmount: r.costAmount != null ? Number(r.costAmount) : null,
      costCurrency: r.costCurrency != null ? String(r.costCurrency) : null,
      costDescription: r.costDescription != null ? String(r.costDescription) : null,
      agentName: r.agentName != null ? String(r.agentName) : null,
      paymentMethod: String(r.paymentMethod ?? 'cash'),
      paymentDestination: String(r.paymentDestination ?? 'internal'),
      salesperson: r.salesperson != null ? String(r.salesperson) : null,
      paidToAgency: r.paidToAgency != null ? String(r.paidToAgency) : null,
      reservationConfirmed: Boolean(r.reservationConfirmed),
      confirmationReceived: Boolean(r.confirmationReceived),
      paymentReceived: Boolean(r.paymentReceived),
      profit: r.profit != null ? Number(r.profit) : null,
      notes: r.notes != null ? String(r.notes) : null,
      completionStatus: computeCompletionStatus({
        reservationStatus: r.reservationId != null ? reservationStatusMap.get(String(r.reservationId)) ?? null : null,
        salesperson: r.salesperson != null ? String(r.salesperson) : null,
        paidToAgency: r.paidToAgency != null ? String(r.paidToAgency) : null,
      }),
      missingFields: getMissingCompletionFields({
        reservationStatus: r.reservationId != null ? reservationStatusMap.get(String(r.reservationId)) ?? null : null,
        salesperson: r.salesperson != null ? String(r.salesperson) : null,
        paidToAgency: r.paidToAgency != null ? String(r.paidToAgency) : null,
      }),
      createdAt: r.createdAt as Date,
      updatedAt: r.updatedAt as Date,
    }));
  } catch {
    return [];
  }
}

export async function getCariSummary(month: string): Promise<{ totalRevenue: number; totalCost: number; netProfit: number; pendingPayment: number }> {
  try {
    const [y, m] = month.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    const list = await prisma.cariRecord.findMany({
      where: { activityDate: { gte: start, lte: end } },
    });
    const reservationStatusMap = await getReservationStatusMap(
      (list ?? [])
        .map((r) => r.reservationId)
        .filter((id): id is string => Boolean(id))
    );
    let totalRevenue = 0;
    let totalCost = 0;
    let pendingPayment = 0;
    for (const r of list ?? []) {
      const isCancelled =
        r.reservationId != null
          ? reservationStatusMap.get(r.reservationId) === 'CANCELLED'
          : false;
      if (isCancelled) continue;
      totalRevenue += Number(r.salePrice) * Number(r.quantity);
      if (r.costAmount != null) totalCost += Number(r.costAmount) * Number(r.quantity);
      if (r.paidToAgency === 'pending') pendingPayment += (r.costAmount ?? 0) * (r.quantity ?? 1);
    }
    return { totalRevenue, totalCost, netProfit: totalRevenue - totalCost, pendingPayment };
  } catch {
    return { totalRevenue: 0, totalCost: 0, netProfit: 0, pendingPayment: 0 };
  }
}

export type CreateCariInput = {
  reservationId?: string | null;
  guestName: string;
  hotelName?: string | null;
  roomNumber?: string | null;
  activityType: string;
  quantity: number;
  activityDate: string;
  salePrice: number;
  saleCurrency: string;
  costAmount?: number | null;
  costCurrency?: string | null;
  costDescription?: string | null;
  agentName?: string | null;
  paymentMethod: string;
  paymentDestination: string;
  salesperson?: string | null;
  paidToAgency?: string | null;
  reservationConfirmed?: boolean;
  confirmationReceived?: boolean;
  paymentReceived?: boolean;
  notes?: string | null;
};

export async function createCariRecord(data: CreateCariInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    const quantity = Math.max(1, data.quantity);
    const costAmount = data.costAmount ?? null;
    const profit = computeProfit(data.salePrice, quantity, costAmount);
    await prisma.cariRecord.create({
      data: {
        reservationId: data.reservationId ?? null,
        guestName: data.guestName.trim(),
        hotelName: data.hotelName?.trim() ?? null,
        roomNumber: data.roomNumber?.trim() ?? null,
        activityType: data.activityType.trim(),
        quantity,
        activityDate: new Date(data.activityDate),
        salePrice: Number(data.salePrice),
        saleCurrency: data.saleCurrency || 'EUR',
        costAmount,
        costCurrency: data.costCurrency ?? null,
        costDescription: data.costDescription?.trim() ?? null,
        agentName: data.agentName?.trim() ?? null,
        paymentMethod: data.paymentMethod || 'cash',
        paymentDestination: data.paymentDestination || 'internal',
        salesperson: data.salesperson?.trim() ?? null,
        paidToAgency: data.paidToAgency ?? null,
        reservationConfirmed: data.reservationConfirmed ?? false,
        confirmationReceived: data.confirmationReceived ?? false,
        paymentReceived: data.paymentReceived ?? false,
        profit,
        notes: data.notes?.trim() ?? null,
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Kayıt eklenemedi' };
  }
}

export async function updateCariRecord(id: string, data: Partial<CreateCariInput>): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    const existing = await prisma.cariRecord.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: 'Kayıt bulunamadı' };
    const quantity = data.quantity ?? existing.quantity;
    const salePrice = data.salePrice ?? existing.salePrice;
    const costAmount = data.costAmount !== undefined ? data.costAmount : existing.costAmount;
    const profit = computeProfit(salePrice, quantity, costAmount);
    await prisma.cariRecord.update({
      where: { id },
      data: {
        ...(data.guestName != null && { guestName: data.guestName.trim() }),
        ...(data.hotelName !== undefined && { hotelName: data.hotelName?.trim() ?? null }),
        ...(data.roomNumber !== undefined && { roomNumber: data.roomNumber?.trim() ?? null }),
        ...(data.activityType != null && { activityType: data.activityType.trim() }),
        ...(data.quantity != null && { quantity: Math.max(1, data.quantity) }),
        ...(data.activityDate != null && { activityDate: new Date(data.activityDate) }),
        ...(data.salePrice != null && { salePrice: Number(data.salePrice) }),
        ...(data.saleCurrency != null && { saleCurrency: data.saleCurrency }),
        ...(data.costAmount !== undefined && { costAmount: data.costAmount }),
        ...(data.costCurrency !== undefined && { costCurrency: data.costCurrency }),
        ...(data.costDescription !== undefined && { costDescription: data.costDescription?.trim() ?? null }),
        ...(data.agentName !== undefined && { agentName: data.agentName?.trim() ?? null }),
        ...(data.paymentMethod != null && { paymentMethod: data.paymentMethod }),
        ...(data.paymentDestination != null && { paymentDestination: data.paymentDestination }),
        ...(data.salesperson !== undefined && { salesperson: data.salesperson?.trim() ?? null }),
        ...(data.paidToAgency !== undefined && { paidToAgency: data.paidToAgency }),
        ...(data.reservationConfirmed !== undefined && { reservationConfirmed: data.reservationConfirmed }),
        ...(data.confirmationReceived !== undefined && { confirmationReceived: data.confirmationReceived }),
        ...(data.paymentReceived !== undefined && { paymentReceived: data.paymentReceived }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() ?? null }),
        profit,
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Güncellenemedi' };
  }
}

export async function deleteCariRecord(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    await prisma.cariRecord.delete({ where: { id } });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Silinemedi' };
  }
}

/**
 * Reservation lifecycle hook:
 * - CONFIRMED => create/update cari row (idempotent, reservationId unique key)
 * - CANCELLED => keep row, only mark reservationConfirmed false
 */
export async function syncCariWithReservation(
  reservationId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { tour: true, variant: true },
    });
    if (!reservation) return { ok: false, error: 'Reservation not found' };

    const linked = await prisma.cariRecord.findFirst({
      where: { reservationId },
    });

    if (reservation.status === 'CANCELLED') {
      if (linked) {
        await prisma.cariRecord.update({
          where: { id: linked.id },
          data: {
            reservationConfirmed: false,
            notes: [linked.notes, '[Otomatik] Rezervasyon iptal edildi.']
              .filter(Boolean)
              .join(' ')
              .slice(0, 2000),
          },
        });
      }
      return { ok: true };
    }

    if (reservation.status !== 'CONFIRMED') return { ok: true };

    const { hotelName, roomNumber } = extractHotelRoomFromReservationNotes(reservation.notes);
    const quantity = Math.max(1, reservation.pax ?? 1);
    const salePrice = Number(reservation.totalPrice ?? 0);
    const payload = {
      guestName: reservation.guestName,
      hotelName: reservation.transferHotelName ?? hotelName,
      roomNumber,
      activityType:
        reservation.variant?.titleTr ||
        reservation.variant?.titleEn ||
        reservation.tour?.titleTr ||
        reservation.tour?.titleEn ||
        reservation.tourId,
      quantity,
      activityDate: reservation.date,
      salePrice,
      saleCurrency: 'EUR',
      reservationConfirmed: true,
      profit: computeProfit(salePrice, quantity, linked?.costAmount ?? null),
    };

    if (linked) {
      await prisma.cariRecord.update({
        where: { id: linked.id },
        data: payload,
      });
      return { ok: true };
    }

    await prisma.cariRecord.create({
      data: {
        reservationId,
        ...payload,
        paymentMethod: 'cash',
        paymentDestination: 'internal',
        confirmationReceived: false,
        paymentReceived: false,
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Cari sync failed' };
  }
}
