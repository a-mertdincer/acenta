'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession } from './auth';
import { SUPPORTED_LOCALES } from '@/lib/i18n';

function revalidateAttractions() {
  SUPPORTED_LOCALES.forEach((lang) => {
    revalidatePath(`/${lang}`);
    revalidatePath(`/${lang}/attractions`);
    revalidatePath(`/${lang}/tours`);
    revalidatePath(`/${lang}/admin/attractions`);
  });
}

function pickFirstLinkedTourImage(
  links: { tour: { images: { url: string }[] } }[]
): string | null {
  for (const link of links) {
    const u = link.tour.images[0]?.url?.trim();
    if (u) return u;
  }
  return null;
}

export type AttractionRow = {
  id: string;
  slug: string;
  nameEn: string;
  nameTr: string;
  nameZh: string | null;
  descriptionEn: string | null;
  descriptionTr: string | null;
  descriptionZh: string | null;
  imageUrl: string | null;
  sortOrder: number;
  tourCount: number;
};

/**
 * @param options.resolveImages When true (public home / attractions list), `imageUrl` is
 *   DB value or the first available primary image from linked tours. Admin must call without this
 *   so `imageUrl` stays the raw DB field for forms.
 */
export async function getAttractions(options?: { resolveImages?: boolean }): Promise<AttractionRow[]> {
  const resolveImages = options?.resolveImages === true;
  try {
    if (resolveImages) {
      const rows = await prisma.attraction.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: {
          _count: { select: { tours: true } },
          tours: {
            orderBy: { createdAt: 'asc' },
            take: 12,
            include: {
              tour: {
                select: {
                  images: {
                    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                    take: 1,
                    select: { url: true },
                  },
                },
              },
            },
          },
        },
      });
      return rows.map((row) => {
        const stored = row.imageUrl?.trim() || null;
        const fromTour = pickFirstLinkedTourImage(row.tours);
        return {
          id: row.id,
          slug: row.slug,
          nameEn: row.nameEn,
          nameTr: row.nameTr,
          nameZh: row.nameZh ?? null,
          descriptionEn: row.descriptionEn ?? null,
          descriptionTr: row.descriptionTr ?? null,
          descriptionZh: row.descriptionZh ?? null,
          imageUrl: stored || fromTour,
          sortOrder: row.sortOrder,
          tourCount: row._count.tours,
        };
      });
    }

    const rows = await prisma.attraction.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        tours: {
          select: { id: true },
        },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      nameEn: row.nameEn,
      nameTr: row.nameTr,
      nameZh: row.nameZh ?? null,
      descriptionEn: row.descriptionEn ?? null,
      descriptionTr: row.descriptionTr ?? null,
      descriptionZh: row.descriptionZh ?? null,
      imageUrl: row.imageUrl ?? null,
      sortOrder: row.sortOrder,
      tourCount: row.tours.length,
    }));
  } catch {
    return [];
  }
}

export type AttractionImageRow = {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
};

export async function getAttractionBySlug(slug: string): Promise<(AttractionRow & {
  tours: {
    id: string;
    type: string;
    titleEn: string;
    titleTr: string;
    titleZh: string;
    descEn: string;
    descTr: string;
    descZh: string;
    basePrice: number;
    category: string | null;
    primaryImage: string | null;
  }[];
  images: AttractionImageRow[];
}) | null> {
  try {
    const row = await prisma.attraction.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        tours: {
          include: {
            tour: {
              include: {
                images: {
                  where: { isPrimary: true },
                  take: 1,
                  orderBy: { sortOrder: 'asc' },
                  select: { url: true },
                },
              },
            },
          },
        },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      slug: row.slug,
      nameEn: row.nameEn,
      nameTr: row.nameTr,
      nameZh: row.nameZh ?? null,
      descriptionEn: row.descriptionEn ?? null,
      descriptionTr: row.descriptionTr ?? null,
      descriptionZh: row.descriptionZh ?? null,
      imageUrl: row.imageUrl ?? null,
      sortOrder: row.sortOrder,
      tourCount: row.tours.length,
      images: row.images.map((img) => ({
        id: img.id,
        url: img.url,
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
      })),
      tours: row.tours.map((rel) => ({
        id: rel.tour.id,
        type: rel.tour.type,
        titleEn: rel.tour.titleEn,
        titleTr: rel.tour.titleTr,
        titleZh: rel.tour.titleZh,
        descEn: rel.tour.descEn,
        descTr: rel.tour.descTr,
        descZh: rel.tour.descZh,
        basePrice: rel.tour.basePrice,
        category: rel.tour.category ?? null,
        primaryImage: rel.tour.images?.[0]?.url ?? null,
      })),
    };
  } catch {
    return null;
  }
}

async function assertAdminAttraction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  return { ok: true };
}

export async function listAttractionImages(attractionId: string): Promise<AttractionImageRow[]> {
  try {
    const rows = await prisma.attractionImage.findMany({
      where: { attractionId },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => ({ id: r.id, url: r.url, isPrimary: r.isPrimary, sortOrder: r.sortOrder }));
  } catch {
    return [];
  }
}

export async function addAttractionImage(attractionId: string, data: { url: string }): Promise<{ ok: boolean; error?: string }> {
  const auth = await assertAdminAttraction();
  if (!auth.ok) return auth;
  try {
    const url = (data.url ?? '').trim();
    if (!url) return { ok: false, error: 'URL gerekli' };
    const existing = await prisma.attractionImage.count({ where: { attractionId } });
    await prisma.attractionImage.create({
      data: {
        attractionId,
        url,
        sortOrder: existing,
        isPrimary: existing === 0,
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function deleteAttractionImage(imageId: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await assertAdminAttraction();
  if (!auth.ok) return auth;
  try {
    const img = await prisma.attractionImage.findUnique({ where: { id: imageId } });
    if (!img) return { ok: false, error: 'Not found' };
    await prisma.attractionImage.delete({ where: { id: imageId } });
    if (img.isPrimary) {
      const next = await prisma.attractionImage.findFirst({
        where: { attractionId: img.attractionId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });
      if (next) {
        await prisma.attractionImage.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function setPrimaryAttractionImage(imageId: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await assertAdminAttraction();
  if (!auth.ok) return auth;
  try {
    const img = await prisma.attractionImage.findUnique({ where: { id: imageId } });
    if (!img) return { ok: false, error: 'Not found' };
    await prisma.$transaction([
      prisma.attractionImage.updateMany({ where: { attractionId: img.attractionId }, data: { isPrimary: false } }),
      prisma.attractionImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
    ]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function createAttraction(input: {
  slug: string;
  nameEn: string;
  nameTr: string;
  nameZh?: string | null;
  descriptionEn?: string | null;
  descriptionTr?: string | null;
  descriptionZh?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    await prisma.attraction.create({
      data: {
        slug: input.slug.trim(),
        nameEn: input.nameEn.trim(),
        nameTr: input.nameTr.trim() || input.nameEn.trim(),
        nameZh: input.nameZh?.trim() || null,
        descriptionEn: input.descriptionEn?.trim() || null,
        descriptionTr: input.descriptionTr?.trim() || null,
        descriptionZh: input.descriptionZh?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
        sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
      },
    });
    revalidateAttractions();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Create failed' };
  }
}

export async function updateAttraction(
  id: string,
  input: {
    slug: string;
    nameEn: string;
    nameTr: string;
    nameZh?: string | null;
    descriptionEn?: string | null;
    descriptionTr?: string | null;
    descriptionZh?: string | null;
    imageUrl?: string | null;
    sortOrder?: number;
  }
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    await prisma.attraction.update({
      where: { id },
      data: {
        slug: input.slug.trim(),
        nameEn: input.nameEn.trim(),
        nameTr: input.nameTr.trim() || input.nameEn.trim(),
        nameZh: input.nameZh?.trim() || null,
        descriptionEn: input.descriptionEn?.trim() || null,
        descriptionTr: input.descriptionTr?.trim() || null,
        descriptionZh: input.descriptionZh?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
        sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
      },
    });
    revalidateAttractions();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Update failed' };
  }
}

export async function deleteAttraction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    await prisma.attraction.delete({ where: { id } });
    revalidateAttractions();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Delete failed' };
  }
}
