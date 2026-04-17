'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { getSession } from './auth';
import { getCategoryQuerySlugs, normalizeCategorySlug } from '@/lib/destinations';
import { SUPPORTED_LOCALES } from '@/lib/i18n';
import { normalizeSalesTagsInput } from '@/lib/tourTags';

function revalidateTours() {
  SUPPORTED_LOCALES.forEach((lang) => {
    revalidatePath(`/${lang}`);
    revalidatePath(`/${lang}/tours`);
    revalidatePath(`/${lang}/tour`);
    revalidatePath(`/${lang}/admin/tours`);
    revalidatePath(`/${lang}/admin/pricing`);
    revalidatePath(`/${lang}/admin/balloon-calendar`);
  });
}

export type TourType = 'BALLOON' | 'TOUR' | 'TRANSFER' | 'ACTIVITY' | 'CONCIERGE' | 'PACKAGE';
export type ReservationTypeMode = 'private_regular' | 'option2' | 'option3' | 'option4' | 'none';

export type TransferTier = { minPax: number; maxPax: number; price: number };

/** Per-airport transfer tiers. ASR = Kayseri, NAV = Nevşehir. */
export type TransferAirportTiers = { ASR?: TransferTier[]; NAV?: TransferTier[] };

export interface TourWithOptions {
  id: string;
  type: string;
  slug?: string | null;
  salesTags?: string[];
  titleTr: string;
  titleEn: string;
  titleZh: string;
  descTr: string;
  descEn: string;
  descZh: string;
  highlightsEn?: string | null;
  highlightsTr?: string | null;
  highlightsZh?: string | null;
  itineraryEn?: string | null;
  itineraryTr?: string | null;
  itineraryZh?: string | null;
  knowBeforeEn?: string | null;
  knowBeforeTr?: string | null;
  knowBeforeZh?: string | null;
  notSuitableEn?: string | null;
  notSuitableTr?: string | null;
  notSuitableZh?: string | null;
  notAllowedEn?: string | null;
  notAllowedTr?: string | null;
  notAllowedZh?: string | null;
  faqsEn?: { question: string; answer: string }[] | null;
  faqsTr?: { question: string; answer: string }[] | null;
  faqsZh?: { question: string; answer: string }[] | null;
  isAskForPrice: boolean;
  isFeatured: boolean;
  cancellationNoteEn?: string | null;
  cancellationNoteTr?: string | null;
  cancellationNoteZh?: string | null;
  createdAt: string;
  basePrice: number;
  capacity: number;
  destination?: string;
  category?: string | null;
  hasTourType?: boolean;
  hasAirportSelect?: boolean;
  hasReservationType?: boolean;
  reservationTypeMode?: ReservationTypeMode;
  minAgeLimit?: number | null;
  ageRestrictionEn?: string | null;
  ageRestrictionTr?: string | null;
  ageRestrictionZh?: string | null;
  ageGroups?: {
    id: string;
    minAge: number;
    maxAge: number;
    pricingType: 'free' | 'child' | 'adult' | 'not_allowed';
    descriptionEn: string;
    descriptionTr: string;
    descriptionZh: string | null;
    sortOrder: number;
  }[];
  images?: {
    id: string;
    url: string;
    isPrimary: boolean;
    sortOrder: number;
    altEn: string | null;
    altTr: string | null;
    altZh: string | null;
  }[];
  attractions?: {
    id: string;
    slug: string;
    nameEn: string;
    nameTr: string;
    nameZh: string | null;
    imageUrl: string | null;
  }[];
  attractionIds?: string[];
  transferTiers: TransferTier[] | null;
  transferAirportTiers: TransferAirportTiers | null;
  options: { id: string; titleTr: string; titleEn: string; titleZh: string; priceAdd: number; pricingMode: 'per_person' | 'flat' }[];
}

export interface TourDatePriceResult {
  price: number;
  capacity: number;
  isClosed: boolean;
}

export async function getTours(filters?: { destination?: string; category?: string }): Promise<TourWithOptions[]> {
  try {
    const where: {
      destination?: string;
      category?: string | null;
      OR?: { category: string }[];
    } = {};
    if (filters?.destination) where.destination = filters.destination;
    if (filters?.category !== undefined) {
      if (!filters.category) {
        where.category = null;
      } else {
        const querySlugs = getCategoryQuerySlugs(filters.category);
        where.OR = querySlugs.map((category) => ({ category }));
      }
    }
    const tours = await prisma.tour.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { createdAt: 'asc' },
    });
    const allImages = await prisma.tourImage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const imageMap = new Map<string, { id: string; url: string; isPrimary: boolean; sortOrder: number; altEn: string | null; altTr: string | null; altZh: string | null }[]>();
    allImages.forEach((img) => {
      const list = imageMap.get(img.tourId) ?? [];
      list.push({
        id: img.id,
        url: img.url,
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
        altEn: img.altEn ?? null,
        altTr: img.altTr ?? null,
        altZh: img.altZh ?? null,
      });
      imageMap.set(img.tourId, list);
    });
    return tours.map((t: { id: string; type: string; titleTr: string; titleEn: string; titleZh: string; descTr: string; descEn: string; descZh: string; highlightsEn?: string | null; highlightsTr?: string | null; highlightsZh?: string | null; itineraryEn?: string | null; itineraryTr?: string | null; itineraryZh?: string | null; knowBeforeEn?: string | null; knowBeforeTr?: string | null; knowBeforeZh?: string | null; notSuitableEn?: string | null; notSuitableTr?: string | null; notSuitableZh?: string | null; notAllowedEn?: string | null; notAllowedTr?: string | null; notAllowedZh?: string | null; faqsEn?: unknown; faqsTr?: unknown; faqsZh?: unknown; basePrice: number; capacity: number; transferTiers: unknown; transferAirportTiers?: unknown; destination?: string; category?: string | null; salesTags?: unknown }) => {
      const { transferTiers, transferAirportTiers } = buildTransferAirportTiers(t.transferAirportTiers, parseTransferTiers(t.transferTiers));
      return {
        id: t.id,
        type: t.type,
        salesTags: normalizeSalesTagsInput(t.salesTags),
        titleTr: t.titleTr,
        titleEn: t.titleEn,
        titleZh: t.titleZh,
        descTr: t.descTr,
        descEn: t.descEn,
        descZh: t.descZh,
        highlightsEn: t.highlightsEn ?? null,
        highlightsTr: t.highlightsTr ?? null,
        highlightsZh: t.highlightsZh ?? null,
        itineraryEn: t.itineraryEn ?? null,
        itineraryTr: t.itineraryTr ?? null,
        itineraryZh: t.itineraryZh ?? null,
        knowBeforeEn: t.knowBeforeEn ?? null,
        knowBeforeTr: t.knowBeforeTr ?? null,
        knowBeforeZh: t.knowBeforeZh ?? null,
        notSuitableEn: t.notSuitableEn ?? null,
        notSuitableTr: t.notSuitableTr ?? null,
        notSuitableZh: t.notSuitableZh ?? null,
        notAllowedEn: t.notAllowedEn ?? null,
        notAllowedTr: t.notAllowedTr ?? null,
        notAllowedZh: t.notAllowedZh ?? null,
        faqsEn: Array.isArray(t.faqsEn) ? (t.faqsEn as { question: string; answer: string }[]) : null,
        faqsTr: Array.isArray(t.faqsTr) ? (t.faqsTr as { question: string; answer: string }[]) : null,
        faqsZh: Array.isArray(t.faqsZh) ? (t.faqsZh as { question: string; answer: string }[]) : null,
        isAskForPrice: Boolean((t as { isAskForPrice?: boolean }).isAskForPrice),
        isFeatured: Boolean((t as { isFeatured?: boolean }).isFeatured),
        cancellationNoteEn: (t as { cancellationNoteEn?: string | null }).cancellationNoteEn?.trim() || null,
        cancellationNoteTr: (t as { cancellationNoteTr?: string | null }).cancellationNoteTr?.trim() || null,
        cancellationNoteZh: (t as { cancellationNoteZh?: string | null }).cancellationNoteZh?.trim() || null,
        createdAt: (() => {
          const row = t as unknown as { createdAt?: Date };
          return row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date().toISOString();
        })(),
        basePrice: t.basePrice,
        capacity: t.capacity,
        destination: t.destination ?? 'cappadocia',
        category: t.category ? normalizeCategorySlug(t.category) : null,
        hasTourType: Boolean((t as { hasTourType?: boolean }).hasTourType),
        hasAirportSelect: Boolean((t as { hasAirportSelect?: boolean }).hasAirportSelect),
        hasReservationType: Boolean((t as { hasReservationType?: boolean }).hasReservationType ?? true),
        reservationTypeMode: ((t as { reservationTypeMode?: string }).reservationTypeMode as ReservationTypeMode | undefined) ?? 'private_regular',
        minAgeLimit: (t as { minAgeLimit?: number | null }).minAgeLimit ?? null,
        ageRestrictionEn: (t as { ageRestrictionEn?: string | null }).ageRestrictionEn ?? null,
        ageRestrictionTr: (t as { ageRestrictionTr?: string | null }).ageRestrictionTr ?? null,
        ageRestrictionZh: (t as { ageRestrictionZh?: string | null }).ageRestrictionZh ?? null,
        transferTiers,
        transferAirportTiers,
        // NOTE: Tour list API is used for catalog/listing contexts; options are fetched by getTourById.
        options: [],
        images: imageMap.get(t.id) ?? [],
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

function parseFaqArray(value: unknown): { question: string; answer: string }[] | null {
  if (!Array.isArray(value)) return null;
  const rows = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const item = entry as { question?: unknown; answer?: unknown };
      const question = typeof item.question === 'string' ? item.question.trim() : '';
      const answer = typeof item.answer === 'string' ? item.answer.trim() : '';
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((entry): entry is { question: string; answer: string } => Boolean(entry));
  return rows.length > 0 ? rows : null;
}

function jsonInputOrNull(value: { question: string; answer: string }[] | null | undefined): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  return value && value.length > 0 ? (value as Prisma.InputJsonValue) : Prisma.JsonNull;
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

export type RelatedTourCard = {
  id: string;
  type: string;
  titleEn: string;
  titleTr: string;
  titleZh: string;
  basePrice: number;
  category: string | null;
  isAskForPrice: boolean;
  imageUrl: string | null;
};

const COMPLEMENTARY_TYPES: Record<string, string[]> = {
  BALLOON: ['TRANSFER', 'CONCIERGE', 'TOUR', 'ACTIVITY'],
  TOUR: ['BALLOON', 'ACTIVITY', 'TRANSFER', 'CONCIERGE'],
  TRANSFER: ['BALLOON', 'TOUR', 'ACTIVITY', 'CONCIERGE'],
  ACTIVITY: ['BALLOON', 'TOUR', 'TRANSFER', 'CONCIERGE'],
  CONCIERGE: ['BALLOON', 'TOUR', 'ACTIVITY', 'TRANSFER'],
  PACKAGE: ['BALLOON', 'TOUR', 'TRANSFER', 'ACTIVITY'],
};

/**
 * Category-based v1 related-tours picker: prefer tours whose type is complementary
 * to the current tour's type, fall back to any other active tour. Returns up to `limit`.
 */
export async function getRelatedTours(currentTourId: string, limit = 4): Promise<RelatedTourCard[]> {
  try {
    const current = await prisma.tour.findUnique({
      where: { id: currentTourId },
      select: { type: true },
    });
    const currentType = current?.type ?? 'TOUR';
    const preferred = COMPLEMENTARY_TYPES[currentType] ?? [];

    const candidates = await prisma.tour.findMany({
      where: { NOT: { id: currentTourId } },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });
    const images = await prisma.tourImage.findMany({
      where: { tourId: { in: candidates.map((t) => t.id) } },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
    });
    const firstImageByTour = new Map<string, string>();
    for (const img of images) {
      if (!firstImageByTour.has(img.tourId)) firstImageByTour.set(img.tourId, img.url);
    }

    const byType = new Map<string, typeof candidates>();
    for (const tour of candidates) {
      const list = byType.get(tour.type) ?? [];
      list.push(tour);
      byType.set(tour.type, list);
    }

    const picked: typeof candidates = [];
    // Round-robin across preferred types first, then fallback types.
    const order = [...preferred, ...Array.from(byType.keys()).filter((k) => !preferred.includes(k))];
    let changed = true;
    while (picked.length < limit && changed) {
      changed = false;
      for (const type of order) {
        if (picked.length >= limit) break;
        const list = byType.get(type);
        if (!list || list.length === 0) continue;
        picked.push(list.shift()!);
        changed = true;
      }
    }

    return picked.map((t) => ({
      id: t.id,
      type: t.type,
      titleEn: t.titleEn,
      titleTr: t.titleTr,
      titleZh: t.titleZh,
      basePrice: Number(t.basePrice ?? 0),
      category: t.category ?? null,
      isAskForPrice: Boolean(t.isAskForPrice),
      imageUrl: firstImageByTour.get(t.id) ?? null,
    }));
  } catch {
    return [];
  }
}

export async function getTourById(idOrSlug: string): Promise<TourWithOptions | null> {
  try {
    // Try id first (UUID-like), then fall back to slug lookup.
    let tour = await prisma.tour.findUnique({ where: { id: idOrSlug } });
    if (!tour) {
      tour = await prisma.tour.findUnique({ where: { slug: idOrSlug } });
    }
    if (!tour) return null;
    const id = tour.id;
    const options = await prisma.tourOption.findMany({
      where: { tourId: id },
      orderBy: { createdAt: 'asc' },
    });
    const ageGroups = await prisma.productAgeGroup.findMany({
      where: { tourId: id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const images = await prisma.tourImage.findMany({
      where: { tourId: id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const tourAttractions = await prisma.tourAttraction.findMany({
      where: { tourId: id },
      include: {
        attraction: {
          select: {
            id: true,
            slug: true,
            nameEn: true,
            nameTr: true,
            nameZh: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const raw = tour as { transferAirportTiers?: unknown };
    const { transferTiers, transferAirportTiers } = buildTransferAirportTiers(raw.transferAirportTiers, parseTransferTiers(tour.transferTiers));
    const t = tour as { destination?: string; category?: string | null };
    const tourRecord = tour as {
      hasTourType?: boolean;
      hasAirportSelect?: boolean;
      hasReservationType?: boolean;
      reservationTypeMode?: string;
      minAgeLimit?: number | null;
      ageRestrictionEn?: string | null;
      ageRestrictionTr?: string | null;
      ageRestrictionZh?: string | null;
    };
    return {
      id: tour.id,
      type: tour.type,
      slug: (tour as { slug?: string | null }).slug ?? null,
      salesTags: normalizeSalesTagsInput((tour as { salesTags?: unknown }).salesTags),
      titleTr: tour.titleTr,
      titleEn: tour.titleEn,
      titleZh: tour.titleZh,
      descTr: tour.descTr,
      descEn: tour.descEn,
      descZh: tour.descZh,
      highlightsEn: (tour as { highlightsEn?: string | null }).highlightsEn ?? null,
      highlightsTr: (tour as { highlightsTr?: string | null }).highlightsTr ?? null,
      highlightsZh: (tour as { highlightsZh?: string | null }).highlightsZh ?? null,
      itineraryEn: (tour as { itineraryEn?: string | null }).itineraryEn ?? null,
      itineraryTr: (tour as { itineraryTr?: string | null }).itineraryTr ?? null,
      itineraryZh: (tour as { itineraryZh?: string | null }).itineraryZh ?? null,
      knowBeforeEn: (tour as { knowBeforeEn?: string | null }).knowBeforeEn ?? null,
      knowBeforeTr: (tour as { knowBeforeTr?: string | null }).knowBeforeTr ?? null,
      knowBeforeZh: (tour as { knowBeforeZh?: string | null }).knowBeforeZh ?? null,
      notSuitableEn: (tour as { notSuitableEn?: string | null }).notSuitableEn ?? null,
      notSuitableTr: (tour as { notSuitableTr?: string | null }).notSuitableTr ?? null,
      notSuitableZh: (tour as { notSuitableZh?: string | null }).notSuitableZh ?? null,
      notAllowedEn: (tour as { notAllowedEn?: string | null }).notAllowedEn ?? null,
      notAllowedTr: (tour as { notAllowedTr?: string | null }).notAllowedTr ?? null,
      notAllowedZh: (tour as { notAllowedZh?: string | null }).notAllowedZh ?? null,
      faqsEn: parseFaqArray((tour as { faqsEn?: unknown }).faqsEn),
      faqsTr: parseFaqArray((tour as { faqsTr?: unknown }).faqsTr),
      faqsZh: parseFaqArray((tour as { faqsZh?: unknown }).faqsZh),
      isAskForPrice: Boolean((tour as { isAskForPrice?: boolean }).isAskForPrice),
      isFeatured: Boolean((tour as { isFeatured?: boolean }).isFeatured),
      cancellationNoteEn: (tour as { cancellationNoteEn?: string | null }).cancellationNoteEn?.trim() || null,
      cancellationNoteTr: (tour as { cancellationNoteTr?: string | null }).cancellationNoteTr?.trim() || null,
      cancellationNoteZh: (tour as { cancellationNoteZh?: string | null }).cancellationNoteZh?.trim() || null,
      createdAt: tour.createdAt instanceof Date ? tour.createdAt.toISOString() : new Date().toISOString(),
      basePrice: tour.basePrice,
      capacity: tour.capacity,
      destination: t.destination ?? 'cappadocia',
      category: t.category ?? null,
      hasTourType: Boolean(tourRecord.hasTourType),
      hasAirportSelect: Boolean(tourRecord.hasAirportSelect),
      hasReservationType: Boolean(tourRecord.hasReservationType ?? true),
      reservationTypeMode: (tourRecord.reservationTypeMode as ReservationTypeMode | undefined) ?? 'private_regular',
      minAgeLimit: tourRecord.minAgeLimit ?? null,
      ageRestrictionEn: tourRecord.ageRestrictionEn ?? null,
      ageRestrictionTr: tourRecord.ageRestrictionTr ?? null,
      ageRestrictionZh: tourRecord.ageRestrictionZh ?? null,
      transferTiers,
      transferAirportTiers,
      ageGroups: ageGroups.map((g) => ({
        id: g.id,
        minAge: g.minAge,
        maxAge: g.maxAge,
        pricingType: (g.pricingType as 'free' | 'child' | 'adult' | 'not_allowed') ?? 'adult',
        descriptionEn: g.descriptionEn,
        descriptionTr: g.descriptionTr,
        descriptionZh: g.descriptionZh ?? null,
        sortOrder: g.sortOrder,
      })),
      images: images.map((img) => ({
        id: img.id,
        url: img.url,
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
        altEn: img.altEn ?? null,
        altTr: img.altTr ?? null,
        altZh: img.altZh ?? null,
      })),
      attractions: tourAttractions.map((row) => ({
        id: row.attraction.id,
        slug: row.attraction.slug,
        nameEn: row.attraction.nameEn,
        nameTr: row.attraction.nameTr,
        nameZh: row.attraction.nameZh ?? null,
        imageUrl: row.attraction.imageUrl ?? null,
      })),
      attractionIds: tourAttractions.map((row) => row.attraction.id),
      options: options.map((o: { id: string; titleTr: string; titleEn: string; titleZh: string; priceAdd: number }) => ({
        id: o.id,
        titleTr: o.titleTr,
        titleEn: o.titleEn,
        titleZh: o.titleZh,
        priceAdd: o.priceAdd,
        pricingMode: ((o as { pricingMode?: string }).pricingMode === 'flat' ? 'flat' : 'per_person'),
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
function normalizeSlug(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return v || null;
}

export type CreateTourInput = {
  type: TourType;
  slug?: string | null;
  salesTags?: string[];
  titleEn: string;
  titleTr: string;
  titleZh: string;
  descEn: string;
  descTr: string;
  descZh: string;
  highlightsEn?: string | null;
  highlightsTr?: string | null;
  highlightsZh?: string | null;
  itineraryEn?: string | null;
  itineraryTr?: string | null;
  itineraryZh?: string | null;
  knowBeforeEn?: string | null;
  knowBeforeTr?: string | null;
  knowBeforeZh?: string | null;
  notSuitableEn?: string | null;
  notSuitableTr?: string | null;
  notSuitableZh?: string | null;
  notAllowedEn?: string | null;
  notAllowedTr?: string | null;
  notAllowedZh?: string | null;
  faqsEn?: { question: string; answer: string }[] | null;
  faqsTr?: { question: string; answer: string }[] | null;
  faqsZh?: { question: string; answer: string }[] | null;
  isAskForPrice?: boolean;
  isFeatured?: boolean;
  cancellationNoteEn?: string | null;
  cancellationNoteTr?: string | null;
  cancellationNoteZh?: string | null;
  basePrice: number;
  capacity: number;
  destination?: string;
  category?: string | null;
  attractionIds?: string[];
  hasTourType?: boolean;
  hasAirportSelect?: boolean;
  hasReservationType?: boolean;
  reservationTypeMode?: ReservationTypeMode;
  minAgeLimit?: number | null;
  ageRestrictionEn?: string | null;
  ageRestrictionTr?: string | null;
  ageRestrictionZh?: string | null;
  ageGroups?: {
    minAge: number;
    maxAge: number;
    pricingType: 'free' | 'child' | 'adult' | 'not_allowed';
    descriptionEn: string;
    descriptionTr: string;
    descriptionZh?: string | null;
    sortOrder?: number;
  }[];
};

export async function createTour(data: CreateTourInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    const reservationTypeMode: ReservationTypeMode = data.reservationTypeMode ?? (data.hasReservationType === false ? 'none' : 'private_regular');
    const createdTour = await prisma.tour.create({
      data: {
        type: data.type,
        slug: normalizeSlug(data.slug),
        salesTags: normalizeSalesTagsInput(data.salesTags),
        titleEn: data.titleEn.trim(),
        titleTr: data.titleTr.trim(),
        titleZh: data.titleZh.trim(),
        descEn: data.descEn.trim(),
        descTr: data.descTr.trim(),
        descZh: data.descZh.trim(),
        highlightsEn: data.highlightsEn?.trim() || null,
        highlightsTr: data.highlightsTr?.trim() || null,
        highlightsZh: data.highlightsZh?.trim() || null,
        itineraryEn: data.itineraryEn?.trim() || null,
        itineraryTr: data.itineraryTr?.trim() || null,
        itineraryZh: data.itineraryZh?.trim() || null,
        knowBeforeEn: data.knowBeforeEn?.trim() || null,
        knowBeforeTr: data.knowBeforeTr?.trim() || null,
        knowBeforeZh: data.knowBeforeZh?.trim() || null,
        notSuitableEn: data.notSuitableEn?.trim() || null,
        notSuitableTr: data.notSuitableTr?.trim() || null,
        notSuitableZh: data.notSuitableZh?.trim() || null,
        notAllowedEn: data.notAllowedEn?.trim() || null,
        notAllowedTr: data.notAllowedTr?.trim() || null,
        notAllowedZh: data.notAllowedZh?.trim() || null,
        faqsEn: jsonInputOrNull(data.faqsEn),
        faqsTr: jsonInputOrNull(data.faqsTr),
        faqsZh: jsonInputOrNull(data.faqsZh),
        isAskForPrice: data.isAskForPrice ?? false,
        isFeatured: data.isFeatured ?? false,
        cancellationNoteEn: data.cancellationNoteEn?.trim() || null,
        cancellationNoteTr: data.cancellationNoteTr?.trim() || null,
        cancellationNoteZh: data.cancellationNoteZh?.trim() || null,
        basePrice: Number(data.basePrice) || 0,
        capacity: Number(data.capacity) || 0,
        destination: data.destination?.trim() || 'cappadocia',
        category: data.category?.trim() || null,
        hasTourType: data.hasTourType ?? false,
        hasAirportSelect: data.hasAirportSelect ?? false,
        hasReservationType: reservationTypeMode !== 'none',
        reservationTypeMode,
        minAgeLimit: data.minAgeLimit ?? null,
        ageRestrictionEn: data.ageRestrictionEn?.trim() || null,
        ageRestrictionTr: data.ageRestrictionTr?.trim() || null,
        ageRestrictionZh: data.ageRestrictionZh?.trim() || null,
        ageGroups: {
          create: (data.ageGroups && data.ageGroups.length > 0 ? data.ageGroups : [
            { minAge: 0, maxAge: 3, pricingType: 'free', descriptionEn: 'Free of charge', descriptionTr: 'Ücretsiz', descriptionZh: '免费', sortOrder: 0 },
            { minAge: 4, maxAge: 7, pricingType: 'child', descriptionEn: 'Child price applies', descriptionTr: 'Çocuk fiyatı uygulanır', descriptionZh: '儿童价格适用', sortOrder: 1 },
            { minAge: 8, maxAge: 99, pricingType: 'adult', descriptionEn: 'Adult price applies', descriptionTr: 'Yetişkin fiyatı uygulanır', descriptionZh: '成人价格适用', sortOrder: 2 },
          ]).map((g, index) => ({
            minAge: g.minAge,
            maxAge: g.maxAge,
            pricingType: g.pricingType,
            descriptionEn: g.descriptionEn.trim(),
            descriptionTr: g.descriptionTr.trim(),
            descriptionZh: g.descriptionZh?.trim() || null,
            sortOrder: g.sortOrder ?? index,
          })),
        },
      },
    });
    if (Array.isArray(data.attractionIds)) {
      const attractionIds = Array.from(new Set(data.attractionIds.map((id) => id.trim()).filter(Boolean)));
      if (attractionIds.length > 0) {
        await prisma.tourAttraction.createMany({
          data: attractionIds.map((attractionId) => ({ tourId: createdTour.id, attractionId })),
          skipDuplicates: true,
        });
      }
    }
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Tur eklenemedi' };
  }
}

export type UpdateTourInput = CreateTourInput;

export async function updateTour(tourId: string, data: UpdateTourInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    const reservationTypeMode: ReservationTypeMode | undefined =
      data.reservationTypeMode !== undefined
        ? data.reservationTypeMode
        : data.hasReservationType !== undefined
          ? (data.hasReservationType ? 'private_regular' : 'none')
          : undefined;
    await prisma.tour.update({
      where: { id: tourId },
      data: {
        type: data.type,
        ...(data.slug !== undefined && { slug: normalizeSlug(data.slug) }),
        ...(data.salesTags !== undefined && { salesTags: normalizeSalesTagsInput(data.salesTags) }),
        titleEn: data.titleEn.trim(),
        titleTr: data.titleTr.trim(),
        titleZh: data.titleZh.trim(),
        descEn: data.descEn.trim(),
        descTr: data.descTr.trim(),
        descZh: data.descZh.trim(),
        highlightsEn: data.highlightsEn?.trim() || null,
        highlightsTr: data.highlightsTr?.trim() || null,
        highlightsZh: data.highlightsZh?.trim() || null,
        itineraryEn: data.itineraryEn?.trim() || null,
        itineraryTr: data.itineraryTr?.trim() || null,
        itineraryZh: data.itineraryZh?.trim() || null,
        knowBeforeEn: data.knowBeforeEn?.trim() || null,
        knowBeforeTr: data.knowBeforeTr?.trim() || null,
        knowBeforeZh: data.knowBeforeZh?.trim() || null,
        notSuitableEn: data.notSuitableEn?.trim() || null,
        notSuitableTr: data.notSuitableTr?.trim() || null,
        notSuitableZh: data.notSuitableZh?.trim() || null,
        notAllowedEn: data.notAllowedEn?.trim() || null,
        notAllowedTr: data.notAllowedTr?.trim() || null,
        notAllowedZh: data.notAllowedZh?.trim() || null,
        faqsEn: jsonInputOrNull(data.faqsEn),
        faqsTr: jsonInputOrNull(data.faqsTr),
        faqsZh: jsonInputOrNull(data.faqsZh),
        ...(data.isAskForPrice !== undefined && { isAskForPrice: data.isAskForPrice }),
        ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
        ...(data.cancellationNoteEn !== undefined && { cancellationNoteEn: data.cancellationNoteEn?.trim() || null }),
        ...(data.cancellationNoteTr !== undefined && { cancellationNoteTr: data.cancellationNoteTr?.trim() || null }),
        ...(data.cancellationNoteZh !== undefined && { cancellationNoteZh: data.cancellationNoteZh?.trim() || null }),
        basePrice: Number(data.basePrice) || 0,
        capacity: Number(data.capacity) || 0,
        destination: data.destination?.trim() || 'cappadocia',
        category: data.category?.trim() || null,
        ...(data.hasTourType !== undefined && { hasTourType: data.hasTourType }),
        ...(data.hasAirportSelect !== undefined && { hasAirportSelect: data.hasAirportSelect }),
        ...(reservationTypeMode !== undefined && { reservationTypeMode }),
        ...(reservationTypeMode !== undefined && { hasReservationType: reservationTypeMode !== 'none' }),
        ...(data.minAgeLimit !== undefined && { minAgeLimit: data.minAgeLimit }),
        ...(data.ageRestrictionEn !== undefined && { ageRestrictionEn: data.ageRestrictionEn?.trim() || null }),
        ...(data.ageRestrictionTr !== undefined && { ageRestrictionTr: data.ageRestrictionTr?.trim() || null }),
        ...(data.ageRestrictionZh !== undefined && { ageRestrictionZh: data.ageRestrictionZh?.trim() || null }),
      },
    });
    if (Array.isArray(data.attractionIds)) {
      const attractionIds = Array.from(new Set(data.attractionIds.map((id) => id.trim()).filter(Boolean)));
      await prisma.tourAttraction.deleteMany({ where: { tourId } });
      if (attractionIds.length > 0) {
        await prisma.tourAttraction.createMany({
          data: attractionIds.map((attractionId) => ({ tourId, attractionId })),
          skipDuplicates: true,
        });
      }
    }
    if (data.ageGroups !== undefined) {
      await prisma.productAgeGroup.deleteMany({ where: { tourId } });
      if (data.ageGroups.length > 0) {
        await prisma.productAgeGroup.createMany({
          data: data.ageGroups.map((g, index) => ({
            tourId,
            minAge: g.minAge,
            maxAge: g.maxAge,
            pricingType: g.pricingType,
            descriptionEn: g.descriptionEn.trim(),
            descriptionTr: g.descriptionTr.trim(),
            descriptionZh: g.descriptionZh?.trim() || null,
            sortOrder: g.sortOrder ?? index,
          })),
        });
      }
    }
    if (reservationTypeMode === 'none') {
      await prisma.tourVariant.updateMany({
        where: { tourId },
        data: { reservationType: null },
      });
    }
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Tur güncellenemedi' };
  }
}

// --- Tour images CRUD (admin only) ---
export async function addTourImage(
  tourId: string,
  data: { url: string; altEn?: string | null; altTr?: string | null; altZh?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    const existing = await prisma.tourImage.findMany({ where: { tourId }, orderBy: { sortOrder: 'asc' } });
    await prisma.tourImage.create({
      data: {
        tourId,
        url: data.url.trim(),
        altEn: data.altEn?.trim() || null,
        altTr: data.altTr?.trim() || null,
        altZh: data.altZh?.trim() || null,
        sortOrder: existing.length,
        isPrimary: existing.length === 0,
      },
    });
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Görsel eklenemedi' };
  }
}

export async function deleteTourImage(imageId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    const current = await prisma.tourImage.findUnique({ where: { id: imageId } });
    if (!current) return { ok: false, error: 'Görsel bulunamadı' };
    await prisma.tourImage.delete({ where: { id: imageId } });
    const remains = await prisma.tourImage.findMany({
      where: { tourId: current.tourId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    if (remains.length > 0 && !remains.some((img) => img.isPrimary)) {
      await prisma.tourImage.update({ where: { id: remains[0].id }, data: { isPrimary: true } });
    }
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Görsel silinemedi' };
  }
}

export async function setPrimaryTourImage(imageId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    const current = await prisma.tourImage.findUnique({ where: { id: imageId } });
    if (!current) return { ok: false, error: 'Görsel bulunamadı' };
    await prisma.tourImage.updateMany({
      where: { tourId: current.tourId },
      data: { isPrimary: false },
    });
    await prisma.tourImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Ana görsel ayarlanamadı' };
  }
}

export async function moveTourImage(
  imageId: string,
  direction: 'up' | 'down'
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    const current = await prisma.tourImage.findUnique({ where: { id: imageId } });
    if (!current) return { ok: false, error: 'Görsel bulunamadı' };
    const list = await prisma.tourImage.findMany({
      where: { tourId: current.tourId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const idx = list.findIndex((item) => item.id === imageId);
    if (idx < 0) return { ok: false, error: 'Görsel bulunamadı' };
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return { ok: true };
    const a = list[idx];
    const b = list[swapIdx];
    await prisma.tourImage.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } });
    await prisma.tourImage.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } });
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Görsel sıralanamadı' };
  }
}

export async function deleteTour(tourId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    const blockers = await prisma.reservation.findMany({
      where: {
        tourId,
        NOT: {
          OR: [
            { status: { equals: 'CANCELLED', mode: 'insensitive' } },
            { status: { equals: 'CANCELED', mode: 'insensitive' } },
          ],
        },
      },
      select: {
        id: true,
        date: true,
        status: true,
        guestName: true,
      },
      orderBy: { date: 'asc' },
      take: 5,
    });

    if (blockers.length > 0) {
      const details = blockers
        .map((r) => {
          const dateText = new Date(r.date).toLocaleDateString('tr-TR');
          const shortId = r.id.slice(0, 8);
          return `${dateText} (${shortId}, ${r.status}, ${r.guestName})`;
        })
        .join('; ');
      const moreText = blockers.length === 5 ? ' (ilk 5 kayit gosterildi)' : '';
      return {
        ok: false,
        error: `Bu urun silinemez. Iptal edilmemis rezervasyon(lar) var: ${details}${moreText}.`,
      };
    }

    await prisma.reservation.deleteMany({
      where: {
        tourId,
        OR: [
          { status: { equals: 'CANCELLED', mode: 'insensitive' } },
          { status: { equals: 'CANCELED', mode: 'insensitive' } },
        ],
      },
    });

    const danglingReservationCount = await prisma.reservation.count({ where: { tourId } });
    if (danglingReservationCount > 0) {
      return {
        ok: false,
        error: `Bu urun silinemedi: urune bagli ${danglingReservationCount} rezervasyon kaydi hala mevcut.`,
      };
    }

    await prisma.tour.delete({ where: { id: tourId } });
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Ürün silinemedi' };
  }
}

// --- Tour options CRUD (admin only) ---
export type TourOptionRow = { id: string; titleTr: string; titleEn: string; titleZh: string; priceAdd: number; pricingMode: 'per_person' | 'flat' };

export async function createTourOption(
  tourId: string,
  data: { titleTr: string; titleEn: string; titleZh: string; priceAdd: number; pricingMode?: 'per_person' | 'flat' }
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    await prisma.tourOption.create({
      data: {
        tourId,
        titleTr: data.titleTr.trim(),
        titleEn: data.titleEn.trim(),
        titleZh: data.titleZh.trim(),
        priceAdd: data.priceAdd,
        pricingMode: data.pricingMode === 'flat' ? 'flat' : 'per_person',
      },
    });
    revalidateTours();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function updateTourOption(
  id: string,
  data: { titleTr?: string; titleEn?: string; titleZh?: string; priceAdd?: number; pricingMode?: 'per_person' | 'flat' }
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
        ...(data.pricingMode != null && { pricingMode: data.pricingMode }),
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
