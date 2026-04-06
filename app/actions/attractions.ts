'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession } from './auth';

function revalidateAttractions() {
  ['en', 'tr', 'zh'].forEach((lang) => {
    revalidatePath(`/${lang}/attractions`);
    revalidatePath(`/${lang}/tours`);
    revalidatePath(`/${lang}/admin/attractions`);
  });
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

export async function getAttractions(): Promise<AttractionRow[]> {
  try {
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
  }[];
}) | null> {
  try {
    const row = await prisma.attraction.findUnique({
      where: { slug },
      include: {
        tours: {
          include: {
            tour: true,
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
      })),
    };
  } catch {
    return null;
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
