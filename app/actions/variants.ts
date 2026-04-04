'use server';

import { getSession } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';
import type { TourVariantDisplay } from '@/lib/types/variant';
import { parsePriceTiers, validateContinuousPriceTiers } from '@/lib/pricingTiers';
import type { ReservationTypeMode, TransferAirportTiers } from '@/app/actions/tours';

type PrismaWithTourVariant = typeof prisma & {
  tourVariant: {
    findMany: (args: unknown) => Promise<unknown[]>;
    findUnique: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
    updateMany: (args: unknown) => Promise<unknown>;
    delete: (args: unknown) => Promise<unknown>;
  };
};

const prismaWithTourVariant = prisma as PrismaWithTourVariant;

export type TourWithVariantsResult = {
  id: string;
  type: string;
  titleEn: string;
  titleTr: string;
  titleZh: string;
  hasTourType: boolean;
  hasAirportSelect: boolean;
  hasReservationType: boolean;
  reservationTypeMode: ReservationTypeMode;
  minAgeLimit: number | null;
  ageRestrictionEn: string | null;
  ageRestrictionTr: string | null;
  ageRestrictionZh: string | null;
  ageGroups: {
    id: string;
    minAge: number;
    maxAge: number;
    pricingType: 'free' | 'child' | 'adult' | 'not_allowed';
    descriptionEn: string;
    descriptionTr: string;
    descriptionZh: string | null;
    sortOrder: number;
  }[];
  transferAirportTiers: TransferAirportTiers | null;
  variants: TourVariantDisplay[];
};

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === 'string');
  return [];
}

function parseTierArray(value: unknown): { minPax: number; maxPax: number; price: number }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const rec = item as Record<string, unknown>;
      return {
        minPax: Number(rec.minPax),
        maxPax: Number(rec.maxPax),
        price: Number(rec.price),
      };
    })
    .filter((item): item is { minPax: number; maxPax: number; price: number } => {
      if (!item) return false;
      return Number.isFinite(item.minPax) && Number.isFinite(item.maxPax) && Number.isFinite(item.price);
    });
}

function mapVariantToDisplay(v: Record<string, unknown>): TourVariantDisplay {
  return {
    id: String(v.id),
    tourId: String(v.tourId),
    tourType: v.tourType != null ? String(v.tourType) : null,
    reservationType: v.reservationType != null ? String(v.reservationType) : null,
    airport: v.airport != null ? String(v.airport) : null,
    titleEn: String(v.titleEn),
    titleTr: String(v.titleTr),
    titleZh: String(v.titleZh),
    descEn: String(v.descEn),
    descTr: String(v.descTr),
    descZh: String(v.descZh),
    includes: parseJsonArray(v.includes),
    excludes: parseJsonArray(v.excludes),
    duration: v.duration != null ? String(v.duration) : null,
    languages: v.languages != null ? parseJsonArray(v.languages) : null,
    vehicleType: v.vehicleType != null ? String(v.vehicleType) : null,
    maxGroupSize: typeof v.maxGroupSize === 'number' ? v.maxGroupSize : null,
    routeStops: v.routeStops != null ? parseJsonArray(v.routeStops) : null,
    adultPrice: Number(v.adultPrice),
    childPrice: v.childPrice != null ? Number(v.childPrice) : null,
    pricingType: v.pricingType === 'per_vehicle' ? 'per_vehicle' : 'per_person',
    privatePriceTiers: v.privatePriceTiers != null ? parsePriceTiers(v.privatePriceTiers) : null,
    sortOrder: Number(v.sortOrder ?? 0),
    isActive: Boolean(v.isActive),
    isRecommended: Boolean(v.isRecommended),
  };
}

/** Fetch tour by id with variants. Returns null if tour not found or DB error. */
export async function getTourWithVariants(tourId: string): Promise<TourWithVariantsResult | null> {
  try {
    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
    });
    if (!tour) return null;

    const tourRecord = tour as Record<string, unknown>;
    let variants: TourVariantDisplay[] = [];
    const ageGroups = await prisma.productAgeGroup.findMany({
      where: { tourId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    try {
      const variantRows = await prismaWithTourVariant.tourVariant.findMany({
        where: { tourId, isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      variants = Array.isArray(variantRows) ? variantRows.map((v: Record<string, unknown>) => mapVariantToDisplay(v)) : [];
    } catch {
      // TourVariant tablosu veya relation yoksa boş dön
    }

    const rawByAirport = tourRecord.transferAirportTiers as Record<string, unknown> | undefined;
    const byAirport: TransferAirportTiers | null =
      rawByAirport && typeof rawByAirport === 'object'
        ? {
            ASR: parseTierArray(rawByAirport.ASR),
            NAV: parseTierArray(rawByAirport.NAV),
          }
        : null;
    const legacy = parseTierArray(tourRecord.transferTiers);
    const normalizedByAirport =
      byAirport && ((byAirport.ASR?.length ?? 0) > 0 || (byAirport.NAV?.length ?? 0) > 0)
        ? byAirport
        : legacy.length > 0
          ? { ASR: legacy, NAV: [] }
          : null;
    return {
      id: tour.id,
      type: tour.type,
      titleEn: tour.titleEn,
      titleTr: tour.titleTr,
      titleZh: tour.titleZh,
      hasTourType: Boolean(tourRecord.hasTourType),
      hasAirportSelect: Boolean(tourRecord.hasAirportSelect),
      hasReservationType: Boolean((tourRecord as { hasReservationType?: boolean }).hasReservationType ?? true),
      reservationTypeMode: ((tourRecord as { reservationTypeMode?: string }).reservationTypeMode as ReservationTypeMode | undefined) ?? 'private_regular',
      minAgeLimit: (tourRecord as { minAgeLimit?: number | null }).minAgeLimit ?? null,
      ageRestrictionEn: (tourRecord as { ageRestrictionEn?: string | null }).ageRestrictionEn ?? null,
      ageRestrictionTr: (tourRecord as { ageRestrictionTr?: string | null }).ageRestrictionTr ?? null,
      ageRestrictionZh: (tourRecord as { ageRestrictionZh?: string | null }).ageRestrictionZh ?? null,
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
      transferAirportTiers: normalizedByAirport,
      variants,
    };
  } catch {
    return null;
  }
}

/** Admin: get all variants for a tour (including inactive). */
export async function getTourVariantsForAdmin(tourId: string): Promise<TourVariantDisplay[]> {
  try {
    const rows = await prismaWithTourVariant.tourVariant.findMany({
      where: { tourId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return Array.isArray(rows) ? rows.map((v: Record<string, unknown>) => mapVariantToDisplay(v)) : [];
  } catch {
    return [];
  }
}

export type CreateVariantInput = {
  tourId: string;
  tourType: string | null;
  reservationType: string | null;
  airport: string | null;
  titleEn: string;
  titleTr: string;
  titleZh: string;
  descEn: string;
  descTr: string;
  descZh: string;
  includes: string[];
  excludes: string[];
  duration: string | null;
  languages: string[] | null;
  vehicleType: string | null;
  maxGroupSize: number | null;
  routeStops: string[] | null;
  adultPrice: number;
  childPrice: number | null;
  pricingType: 'per_person' | 'per_vehicle';
  privatePriceTiers?: { minPax: number; maxPax: number; price: number }[] | null;
  sortOrder?: number;
  isActive?: boolean;
  isRecommended?: boolean;
};

export async function createVariant(data: CreateVariantInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    if (data.privatePriceTiers && data.privatePriceTiers.length > 0) {
      const valid = validateContinuousPriceTiers(data.privatePriceTiers);
      if (!valid.ok) return { ok: false, error: valid.error };
    }
    const created = await prismaWithTourVariant.tourVariant.create({
      data: {
        tourId: data.tourId,
        tourType: data.tourType || null,
        reservationType: data.reservationType ?? null,
        airport: data.airport || null,
        titleEn: data.titleEn.trim(),
        titleTr: data.titleTr.trim(),
        titleZh: data.titleZh.trim(),
        descEn: data.descEn.trim(),
        descTr: data.descTr.trim(),
        descZh: data.descZh.trim(),
        includes: data.includes,
        excludes: data.excludes,
        duration: data.duration?.trim() || null,
        languages: data.languages,
        vehicleType: data.vehicleType?.trim() || null,
        maxGroupSize: data.maxGroupSize ?? null,
        routeStops: data.routeStops,
        adultPrice: Number(data.adultPrice),
        childPrice: data.childPrice != null ? Number(data.childPrice) : null,
        pricingType: data.pricingType,
        privatePriceTiers: data.privatePriceTiers ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive !== false,
        isRecommended: Boolean(data.isRecommended),
      },
    });
    if (data.isRecommended) {
      const createdVariant = created as { id: string };
      await prismaWithTourVariant.tourVariant.updateMany({
        where: {
          tourId: data.tourId,
          tourType: data.tourType || null,
          airport: data.airport || null,
          reservationType: data.reservationType ?? null,
          id: { not: createdVariant.id },
        },
        data: { isRecommended: false },
      });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Varyant eklenemedi' };
  }
}

export type UpdateVariantInput = Partial<Omit<CreateVariantInput, 'tourId'>>;

export async function updateVariant(variantId: string, data: UpdateVariantInput): Promise<{ ok: boolean; error?: string }> {
    if (data.privatePriceTiers !== undefined && data.privatePriceTiers && data.privatePriceTiers.length > 0) {
      const valid = validateContinuousPriceTiers(data.privatePriceTiers);
      if (!valid.ok) return { ok: false, error: valid.error };
    }
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    const payload: Record<string, unknown> = {};
    if (data.tourType !== undefined) payload.tourType = data.tourType || null;
    if (data.reservationType !== undefined) payload.reservationType = data.reservationType;
    if (data.airport !== undefined) payload.airport = data.airport || null;
    if (data.titleEn !== undefined) payload.titleEn = data.titleEn.trim();
    if (data.titleTr !== undefined) payload.titleTr = data.titleTr.trim();
    if (data.titleZh !== undefined) payload.titleZh = data.titleZh.trim();
    if (data.descEn !== undefined) payload.descEn = data.descEn.trim();
    if (data.descTr !== undefined) payload.descTr = data.descTr.trim();
    if (data.descZh !== undefined) payload.descZh = data.descZh.trim();
    if (data.includes !== undefined) payload.includes = data.includes;
    if (data.excludes !== undefined) payload.excludes = data.excludes;
    if (data.duration !== undefined) payload.duration = data.duration?.trim() || null;
    if (data.languages !== undefined) payload.languages = data.languages;
    if (data.vehicleType !== undefined) payload.vehicleType = data.vehicleType?.trim() || null;
    if (data.maxGroupSize !== undefined) payload.maxGroupSize = data.maxGroupSize;
    if (data.routeStops !== undefined) payload.routeStops = data.routeStops;
    if (data.adultPrice !== undefined) payload.adultPrice = Number(data.adultPrice);
    if (data.childPrice !== undefined) payload.childPrice = data.childPrice != null ? Number(data.childPrice) : null;
    if (data.pricingType !== undefined) payload.pricingType = data.pricingType;
    if (data.privatePriceTiers !== undefined) payload.privatePriceTiers = data.privatePriceTiers;
    if (data.sortOrder !== undefined) payload.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) payload.isActive = data.isActive;
    if (data.isRecommended !== undefined) payload.isRecommended = data.isRecommended;
    const updated = (await prismaWithTourVariant.tourVariant.update({ where: { id: variantId }, data: payload })) as {
      id: string;
      tourId: string;
      tourType: string | null;
      airport: string | null;
      reservationType: string | null;
      isRecommended: boolean;
    };
    if (updated.isRecommended) {
      await prismaWithTourVariant.tourVariant.updateMany({
        where: {
          tourId: updated.tourId,
          tourType: updated.tourType,
          airport: updated.airport,
          reservationType: updated.reservationType,
          id: { not: updated.id },
        },
        data: { isRecommended: false },
      });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Varyant güncellenemedi' };
  }
}

export async function deleteVariant(variantId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    await prismaWithTourVariant.tourVariant.delete({ where: { id: variantId } });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Varyant silinemedi' };
  }
}
