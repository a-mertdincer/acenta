'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../../lib/prisma';
import { getSession } from './auth';

function revalidateTours() {
  ['en', 'tr', 'zh'].forEach(lang => {
    revalidatePath(`/${lang}/tours`);
    revalidatePath(`/${lang}/tour`);
    revalidatePath(`/${lang}/admin/tours`);
    revalidatePath(`/${lang}/admin/pricing`);
    revalidatePath(`/${lang}/admin/balloon-calendar`);
  });
}

export type TourType = 'BALLOON' | 'TOUR' | 'TRANSFER' | 'CONCIERGE' | 'PACKAGE';

export type TransferTier = { minPax: number; maxPax: number; price: number };

/** Per-airport transfer tiers. ASR = Kayseri, NAV = Nevşehir. */
export type TransferAirportTiers = { ASR?: TransferTier[]; NAV?: TransferTier[] };

export interface TourWithOptions {
  id: string;
  type: string;
  titleTr: string;
  titleEn: string;
  titleZh: string;
  descTr: string;
  descEn: string;
  descZh: string;
  basePrice: number;
  capacity: number;
  destination?: string;
  category?: string | null;
  hasTourType?: boolean;
  hasAirportSelect?: boolean;
  transferTiers: TransferTier[] | null;
  transferAirportTiers: TransferAirportTiers | null;
  options: { id: string; titleTr: string; titleEn: string; titleZh: string; priceAdd: number }[];
}

export interface TourDatePriceResult {
  price: number;
  capacity: number;
  isClosed: boolean;
}

export async function getTours(filters?: { destination?: string; category?: string }): Promise<TourWithOptions[]> {
  try {
    const where: { destination?: string; category?: string | null } = {};
    if (filters?.destination) where.destination = filters.destination;
    if (filters?.category !== undefined) where.category = filters.category || null;
    const tours = await prisma.tour.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { createdAt: 'asc' },
    });
    return tours.map((t: { id: string; type: string; titleTr: string; titleEn: string; titleZh: string; descTr: string; descEn: string; descZh: string; basePrice: number; capacity: number; transferTiers: unknown; transferAirportTiers?: unknown; destination?: string; category?: string | null }) => {
      const { transferTiers, transferAirportTiers } = buildTransferAirportTiers(t.transferAirportTiers, parseTransferTiers(t.transferTiers));
      return {
        id: t.id,
        type: t.type,
        titleTr: t.titleTr,
        titleEn: t.titleEn,
        titleZh: t.titleZh,
        descTr: t.descTr,
        descEn: t.descEn,
        descZh: t.descZh,
        basePrice: t.basePrice,
        capacity: t.capacity,
        hasTourType: Boolean((t as { hasTourType?: boolean }).hasTourType),
        hasAirportSelect: Boolean((t as { hasAirportSelect?: boolean }).hasAirportSelect),
        transferTiers,
        transferAirportTiers,
        // NOTE: Tour list API is used for catalog/listing contexts; options are fetched by getTourById.
        options: [],
      };
    });
  } catch {
    return [];
  }
}

function parseTransferTiers(json: unknown): TransferTier[] | null {
  if (!json || !Array.isArray(json)) return null;
  const tiers = (json as unknown[]).map((item: unknown) => {
    if (item && typeof item === 'object' && 'minPax' in item && 'maxPax' in item && 'price' in item)
      return { minPax: Number((item as TransferTier).minPax), maxPax: Number((item as TransferTier).maxPax), price: Number((item as TransferTier).price) };
    return null;
  }).filter(Boolean) as TransferTier[];
  return tiers.length ? tiers : null;
}

function parseTransferAirportTiers(json: unknown): TransferAirportTiers | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  const ASR = Array.isArray(o.ASR) ? parseTransferTiers(o.ASR) : null;
  const NAV = Array.isArray(o.NAV) ? parseTransferTiers(o.NAV) : null;
  if ((ASR?.length ?? 0) > 0 || (NAV?.length ?? 0) > 0)
    return { ASR: ASR ?? [], NAV: NAV ?? [] };
  return null;
}

function buildTransferAirportTiers(
  transferAirportTiersJson: unknown,
  legacyTransferTiers: TransferTier[] | null
): { transferTiers: TransferTier[] | null; transferAirportTiers: TransferAirportTiers | null } {
  const byAirport = parseTransferAirportTiers(transferAirportTiersJson);
  if (byAirport) {
    const asr = byAirport.ASR ?? [];
    return { transferTiers: asr.length ? asr : null, transferAirportTiers: byAirport };
  }
  const legacy = legacyTransferTiers ?? [];
  return {
    transferTiers: legacy.length ? legacy : null,
    transferAirportTiers: legacy.length ? { ASR: legacy, NAV: [] } : null,
  };
}

export async function getTourById(id: string): Promise<TourWithOptions | null> {
  try {
    const tour = await prisma.tour.findUnique({
      where: { id },
    });
    if (!tour) return null;
    const options = await prisma.tourOption.findMany({
      where: { tourId: id },
      orderBy: { createdAt: 'asc' },
    });
    const raw = tour as { transferAirportTiers?: unknown };
    const { transferTiers, transferAirportTiers } = buildTransferAirportTiers(raw.transferAirportTiers, parseTransferTiers(tour.transferTiers));
    const t = tour as { destination?: string; category?: string | null };
    const tourRecord = tour as { hasTourType?: boolean; hasAirportSelect?: boolean };
    return {
      id: tour.id,
      type: tour.type,
      titleTr: tour.titleTr,
      titleEn: tour.titleEn,
      titleZh: tour.titleZh,
      descTr: tour.descTr,
      descEn: tour.descEn,
      descZh: tour.descZh,
      basePrice: tour.basePrice,
      capacity: tour.capacity,
      destination: t.destination ?? 'cappadocia',
      category: t.category ?? null,
      hasTourType: Boolean(tourRecord.hasTourType),
      hasAirportSelect: Boolean(tourRecord.hasAirportSelect),
      transferTiers,
      transferAirportTiers,
      options: options.map((o: { id: string; titleTr: string; titleEn: string; titleZh: string; priceAdd: number }) => ({
        id: o.id,
        titleTr: o.titleTr,
        titleEn: o.titleEn,
        titleZh: o.titleZh,
        priceAdd: o.priceAdd,
      })),
    };
  } catch {
    return null;
  }
}

/** Get price/capacity/closed for a tour on a specific date. Uses same day-range logic as setTourDatePrice (UTC day). */
export async function getTourDatePrice(
  tourId: string,
  dateStr: string
): Promise<TourDatePriceResult | null> {
  try {
    const dayStart = new Date(dateStr + 'T00:00:00.000Z');
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const dp = await prisma.tourDatePrice.findFirst({
      where: {
        tourId,
        date: { gte: dayStart, lt: dayEnd },
      },
    });
    if (dp) {
      return {
        price: dp.price,
        capacity: dp.capacityOverride ?? (await prisma.tour.findUnique({ where: { id: tourId } }))?.capacity ?? 0,
        isClosed: dp.isClosed,
      };
    }
    const tour = await prisma.tour.findUnique({ where: { id: tourId } });
    if (!tour) return null;
    return {
      price: tour.basePrice,
      capacity: tour.capacity,
      isClosed: false,
    };
  } catch {
    return null;
  }
}

export async function setTourDatePrice(
  tourId: string,
  dateStr: string,
  data: { price: number; capacityOverride?: number; isClosed?: boolean }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const dayStart = new Date(dateStr + 'T00:00:00.000Z');
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const isClosed = data.isClosed === true;
    const capacityOverride = data.capacityOverride != null && Number.isInteger(data.capacityOverride)
      ? data.capacityOverride
      : null;

    const existing = await prisma.tourDatePrice.findFirst({
      where: {
        tourId,
        date: { gte: dayStart, lt: dayEnd },
      },
    });

    if (existing) {
      await prisma.tourDatePrice.update({
        where: { id: existing.id },
        data: {
          price: data.price,
          capacityOverride,
          isClosed,
        },
      });
    } else {
      await prisma.tourDatePrice.create({
        data: {
          tourId,
          date: dayStart,
          price: data.price,
          capacityOverride,
          isClosed,
        },
      });
    }
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function setTourDatePricesBulk(
  tourId: string,
  dateStrs: string[],
  data: { price: number; capacityOverride?: number; isClosed?: boolean }
): Promise<{ ok: boolean; updatedCount?: number; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    const dates = Array.from(
      new Set(
        dateStrs
          .map((date) => date.trim())
          .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      )
    );
    if (dates.length === 0) return { ok: false, error: 'Tarih seçimi boş olamaz.' };
    const isClosed = data.isClosed === true;
    const capacityOverride =
      data.capacityOverride != null && Number.isInteger(data.capacityOverride)
        ? data.capacityOverride
        : null;
    let updatedCount = 0;
    for (const dateStr of dates) {
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
      const existing = await prisma.tourDatePrice.findFirst({
        where: {
          tourId,
          date: { gte: dayStart, lt: dayEnd },
        },
      });
      if (existing) {
        await prisma.tourDatePrice.update({
          where: { id: existing.id },
          data: {
            price: data.price,
            capacityOverride,
            isClosed,
          },
        });
      } else {
        await prisma.tourDatePrice.create({
          data: {
            tourId,
            date: dayStart,
            price: data.price,
            capacityOverride,
            isClosed,
          },
        });
      }
      updatedCount += 1;
    }
    revalidateTours();
    return { ok: true, updatedCount };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

/** Get all date prices for a tour in a date range (for balloon price calendar). */
export type DatePriceEntry = { date: string; price: number; capacityOverride: number | null; isClosed: boolean };

export async function getTourDatePricesInRange(
  tourId: string,
  fromStr: string,
  toStr: string
): Promise<{ basePrice: number; defaultCapacity: number; entries: DatePriceEntry[] } | null> {
  try {
    const tour = await prisma.tour.findUnique({ where: { id: tourId } });
    if (!tour) return null;
    const from = new Date(fromStr + 'T00:00:00.000Z');
    const to = new Date(toStr + 'T23:59:59.999Z');
    const rows = await prisma.tourDatePrice.findMany({
      where: { tourId, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });
    const entries: DatePriceEntry[] = rows.map((r: { date: Date; price: number; capacityOverride: number | null; isClosed: boolean }) => ({
      date: r.date.toISOString().split('T')[0],
      price: r.price,
      capacityOverride: r.capacityOverride,
      isClosed: r.isClosed,
    }));
    return {
      basePrice: tour.basePrice,
      defaultCapacity: tour.capacity,
      entries,
    };
  } catch {
    return null;
  }
}

/** Guest update: list of available tour dates (not closed) for dropdown. Default next 90 days. */
export async function getAvailableTourDatesForGuest(
  tourId: string,
  fromDateStr?: string,
  days = 90
): Promise<string[]> {
  try {
    const from = fromDateStr ? new Date(fromDateStr + 'T00:00:00.000Z') : new Date();
    from.setUTCHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + days);

    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      select: { id: true },
    });
    if (!tour) return [];

    const closedRows = await prisma.tourDatePrice.findMany({
      where: {
        tourId,
        date: { gte: from, lte: to },
        isClosed: true,
      },
      select: { date: true },
    });
    const closedDates = new Set(closedRows.map((row) => row.date.toISOString().split('T')[0]));

    const availableDates: string[] = [];
    const cursor = new Date(from);
    while (cursor <= to) {
      const dateKey = cursor.toISOString().split('T')[0];
      if (!closedDates.has(dateKey)) {
        availableDates.push(dateKey);
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return availableDates;
  } catch {
    return [];
  }
}

// --- Tour CRUD (admin only) ---
export type CreateTourInput = {
  type: TourType;
  titleEn: string;
  titleTr: string;
  titleZh: string;
  descEn: string;
  descTr: string;
  descZh: string;
  basePrice: number;
  capacity: number;
  destination?: string;
  category?: string | null;
};

export async function createTour(data: CreateTourInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    await prisma.tour.create({
      data: {
        type: data.type,
        titleEn: data.titleEn.trim(),
        titleTr: data.titleTr.trim(),
        titleZh: data.titleZh.trim(),
        descEn: data.descEn.trim(),
        descTr: data.descTr.trim(),
        descZh: data.descZh.trim(),
        basePrice: Number(data.basePrice) || 0,
        capacity: Number(data.capacity) || 0,
        destination: data.destination?.trim() || 'cappadocia',
        category: data.category?.trim() || null,
      },
    });
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Tur eklenemedi' };
  }
}

export type UpdateTourInput = CreateTourInput & { hasTourType?: boolean; hasAirportSelect?: boolean };

export async function updateTour(tourId: string, data: UpdateTourInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    await prisma.tour.update({
      where: { id: tourId },
      data: {
        type: data.type,
        titleEn: data.titleEn.trim(),
        titleTr: data.titleTr.trim(),
        titleZh: data.titleZh.trim(),
        descEn: data.descEn.trim(),
        descTr: data.descTr.trim(),
        descZh: data.descZh.trim(),
        basePrice: Number(data.basePrice) || 0,
        capacity: Number(data.capacity) || 0,
        destination: data.destination?.trim() || 'cappadocia',
        category: data.category?.trim() || null,
        ...(data.hasTourType !== undefined && { hasTourType: data.hasTourType }),
        ...(data.hasAirportSelect !== undefined && { hasAirportSelect: data.hasAirportSelect }),
      },
    });
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Tur güncellenemedi' };
  }
}

export async function deleteTour(tourId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    const reservationCount = await prisma.reservation.count({ where: { tourId } });
    if (reservationCount > 0) {
      return { ok: false, error: 'Bu ürüne bağlı rezervasyonlar olduğu için silinemez.' };
    }
    await prisma.tour.delete({ where: { id: tourId } });
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Ürün silinemedi' };
  }
}

// --- Tour options CRUD (admin only) ---
export type TourOptionRow = { id: string; titleTr: string; titleEn: string; titleZh: string; priceAdd: number };

export async function createTourOption(
  tourId: string,
  data: { titleTr: string; titleEn: string; titleZh: string; priceAdd: number }
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    await prisma.tourOption.create({
      data: { tourId, titleTr: data.titleTr.trim(), titleEn: data.titleEn.trim(), titleZh: data.titleZh.trim(), priceAdd: data.priceAdd },
    });
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function updateTourOption(
  id: string,
  data: { titleTr?: string; titleEn?: string; titleZh?: string; priceAdd?: number }
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    await prisma.tourOption.update({
      where: { id },
      data: {
        ...(data.titleTr != null && { titleTr: data.titleTr.trim() }),
        ...(data.titleEn != null && { titleEn: data.titleEn.trim() }),
        ...(data.titleZh != null && { titleZh: data.titleZh.trim() }),
        ...(data.priceAdd != null && { priceAdd: data.priceAdd }),
      },
    });
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function deleteTourOption(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    await prisma.tourOption.delete({ where: { id } });
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function setTourTransferTiers(tourId: string, tiers: TransferTier[]): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    await prisma.tour.update({
      where: { id: tourId },
      data: { transferTiers: tiers },
    });
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

/** Set transfer tiers per airport (ASR, NAV). Admin only. */
export async function setTourTransferAirportTiers(
  tourId: string,
  payload: TransferAirportTiers
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    await prisma.tour.update({
      where: { id: tourId },
      data: { transferAirportTiers: payload as object },
    });
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

/** Demo turlarını ekler (hiç tur yoksa). Sadece admin. */
export async function seedDemoTours(): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    const count = await prisma.tour.count();
    if (count > 0) return { ok: true };
    const balloon = await prisma.tour.create({
      data: {
        type: 'BALLOON',
        titleEn: 'Standard Balloon Flight',
        titleTr: 'Standart Balon Turu',
        titleZh: '标准热气球飞行',
        descEn: 'Float above the fairy chimneys at sunrise in our spacious baskets. 1 hour flight with champagne toast.',
        descTr: 'Geniş sepetlerimizde gün doğumunda peribacalarının üzerinde süzülün. Şampanya ikramlı 1 saatlik uçuş.',
        descZh: '在宽敞的吊篮中，在日出时分漂浮在仙女烟囱上方。香槟吐司1小时飞行。',
        basePrice: 150,
        capacity: 20,
        destination: 'cappadocia',
        category: 'hot-air-balloon',
      },
    });
    const greenTour = await prisma.tour.create({
      data: {
        type: 'TOUR',
        titleEn: 'Cappadocia Green Tour',
        titleTr: 'Kapadokya Yeşil Tur',
        titleZh: '卡帕多奇亚绿线之旅',
        descEn: 'Explore the underground city, hike in Ihlara Valley and visit Selime Monastery. Includes lunch.',
        descTr: 'Yeraltı şehrini keşfedin, Ihlara Vadisinde yürüyüş yapın ve Selime Manastırını ziyaret edin. Öğle yemeği dahildir.',
        descZh: '探索地下城，在伊赫拉拉山谷徒步旅行，并参观塞利梅修道院。包括午餐。',
        basePrice: 40,
        capacity: 15,
        destination: 'cappadocia',
        category: 'daily-tours',
      },
    });
    await prisma.tourOption.createMany({
      data: [
        { tourId: greenTour.id, titleEn: 'Vegetarian Lunch', titleTr: 'Vejetaryen Menü', titleZh: '素食午餐', priceAdd: 0 },
        { tourId: greenTour.id, titleEn: 'Private Guide', titleTr: 'Özel Rehber', titleZh: '私人导游', priceAdd: 50 },
      ],
    });
    await prisma.tour.create({
      data: {
        type: 'TRANSFER',
        titleEn: 'Private Airport Transfer',
        titleTr: 'Özel Havalimanı Transferi',
        titleZh: '私人机场接送',
        descEn: 'VIP transfer to and from Nevşehir or Kayseri airports. 1-4 Pax in Mercedes Vito.',
        descTr: 'Nevşehir veya Kayseri havalimanlarına Mercedes Vito ile VIP transfer. 1-4 Kişi.',
        descZh: '内夫谢希尔或开塞利机场的VIP接送服务。 1-4人在奔驰Vito。',
        basePrice: 50,
        capacity: 10,
        destination: 'cappadocia',
        category: 'transfers',
      },
    });
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Demo veri eklenemedi' };
  }
}
