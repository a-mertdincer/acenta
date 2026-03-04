'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { getSession } from './auth';

function revalidateTours() {
  ['en', 'tr', 'zh'].forEach(lang => {
    revalidatePath(`/${lang}/tours`);
    revalidatePath(`/${lang}/admin/tours`);
    revalidatePath(`/${lang}/admin/balloon-calendar`);
  });
}

export type TourType = 'BALLOON' | 'TOUR' | 'TRANSFER' | 'CONCIERGE' | 'PACKAGE';

export type TransferTier = { minPax: number; maxPax: number; price: number };

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
  transferTiers: TransferTier[] | null;
  options: { id: string; titleTr: string; titleEn: string; titleZh: string; priceAdd: number }[];
}

export interface TourDatePriceResult {
  price: number;
  capacity: number;
  isClosed: boolean;
}

export async function getTours(): Promise<TourWithOptions[]> {
  try {
    const tours = await prisma.tour.findMany({
      include: { options: true },
      orderBy: { createdAt: 'asc' },
    });
    return tours.map((t: { id: string; type: string; titleTr: string; titleEn: string; titleZh: string; descTr: string; descEn: string; descZh: string; basePrice: number; capacity: number; transferTiers: unknown; options: { id: string; titleTr: string; titleEn: string; titleZh: string; priceAdd: number }[] }) => ({
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
      transferTiers: parseTransferTiers(t.transferTiers),
      options: t.options.map((o: { id: string; titleTr: string; titleEn: string; titleZh: string; priceAdd: number }) => ({
        id: o.id,
        titleTr: o.titleTr,
        titleEn: o.titleEn,
        titleZh: o.titleZh,
        priceAdd: o.priceAdd,
      })),
    }));
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

export async function getTourById(id: string): Promise<TourWithOptions | null> {
  try {
    const tour = await prisma.tour.findUnique({
      where: { id },
      include: { options: true },
    });
    if (!tour) return null;
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
      transferTiers: parseTransferTiers(tour.transferTiers),
      options: tour.options.map((o: { id: string; titleTr: string; titleEn: string; titleZh: string; priceAdd: number }) => ({
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

/** Get transfer price for a given pax from tiers; falls back to basePrice if no tier matches. Use client-side getTransferPriceForPaxClient for UI. */
function getTransferPriceForPax(tour: TourWithOptions, pax: number): number {
  if (tour.transferTiers?.length) {
    const tier = tour.transferTiers.find((t) => pax >= t.minPax && pax <= t.maxPax);
    if (tier) return tier.price;
  }
  return tour.basePrice;
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
      data: { transferTiers: tiers.length ? tiers : Prisma.DbNull },
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
      },
    });
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Demo veri eklenemedi' };
  }
}
