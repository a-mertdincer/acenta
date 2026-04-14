'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { SUPPORTED_LOCALES } from '@/lib/i18n';
import { getSession } from '@/app/actions/auth';
import { sanitizeGuestInput } from '@/lib/guestNotes';

function maskGuestName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return 'Guest';
  if (p.length === 1) return `${p[0].slice(0, 1)}***`;
  const last = p[p.length - 1];
  return `${p[0]} ${last.slice(0, 1)}.`;
}

export type PublicReview = {
  id: string;
  displayName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export async function getApprovedReviewsPage(
  tourId: string,
  skip: number,
  take: number
): Promise<{ ok: true; reviews: PublicReview[]; total: number } | { ok: false; error: string }> {
  try {
    const total = await prisma.review.count({
      where: { tourId, moderationStatus: 'APPROVED' },
    });
    const rows = await prisma.review.findMany({
      where: { tourId, moderationStatus: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        guestName: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });
    const reviews: PublicReview[] = rows.map((r) => ({
      id: r.id,
      displayName: maskGuestName(r.guestName),
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    }));
    return { ok: true, reviews, total };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getTourReviewAggregate(tourId: string): Promise<{
  avg: number;
  count: number;
} | null> {
  try {
    const agg = await prisma.review.aggregate({
      where: { tourId, moderationStatus: 'APPROVED' },
      _avg: { rating: true },
      _count: { id: true },
    });
    return {
      avg: agg._avg.rating ?? 0,
      count: agg._count.id,
    };
  } catch {
    return null;
  }
}

export async function submitReview(input: {
  reservationId: string;
  rating: number;
  comment: string;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };
  const rating = Math.round(Number(input.rating));
  if (rating < 1 || rating > 5) return { ok: false, error: 'Invalid rating' };
  const comment = sanitizeGuestInput(input.comment ?? '', 4000);
  if (comment.length < 2) return { ok: false, error: 'Comment too short' };

  try {
    const existing = await prisma.review.findUnique({ where: { reservationId: input.reservationId } });
    if (existing) return { ok: false, error: 'alreadyReviewed' };

    const res = await prisma.reservation.findUnique({
      where: { id: input.reservationId },
      include: { tour: { select: { id: true, titleEn: true } } },
    });
    if (!res) return { ok: false, error: 'Not found' };
    if (res.userId !== session.id) return { ok: false, error: 'Not your reservation' };
    if (res.status !== 'CONFIRMED') return { ok: false, error: 'Not eligible' };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const activity = new Date(res.date);
    activity.setHours(0, 0, 0, 0);
    if (activity.getTime() >= todayStart.getTime()) {
      return { ok: false, error: 'Tour date not passed' };
    }

    await prisma.review.create({
      data: {
        tourId: res.tourId,
        reservationId: res.id,
        userId: session.id,
        guestName: session.name?.trim() || res.guestName,
        guestEmail: session.email ?? res.guestEmail,
        rating,
        comment,
        moderationStatus: 'PENDING',
      },
    });

    for (const lang of SUPPORTED_LOCALES) {
      revalidatePath(`/${lang}/tour/${res.tourId}`, 'page');
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function loadReviewsAdmin(filter: 'all' | 'pending' | 'approved' | 'rejected') {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false as const, error: 'Unauthorized' };
  const where =
    filter === 'all'
      ? {}
      : filter === 'pending'
        ? { moderationStatus: 'PENDING' as const }
        : filter === 'approved'
          ? { moderationStatus: 'APPROVED' as const }
          : { moderationStatus: 'REJECTED' as const };
  try {
    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        tour: { select: { titleEn: true, titleTr: true } },
        reservation: { select: { id: true, date: true } },
      },
    });
    return { ok: true as const, reviews };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function setReviewModeration(
  id: string,
  status: 'APPROVED' | 'REJECTED'
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    const row = await prisma.review.update({
      where: { id },
      data: { moderationStatus: status },
      select: { tourId: true },
    });
    revalidateReviewPaths(row.tourId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function updateReviewAdmin(
  id: string,
  data: { comment?: string; adminNote?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    const patch: { comment?: string; adminNote?: string | null } = {};
    if (data.comment != null) patch.comment = sanitizeGuestInput(data.comment, 4000);
    if (data.adminNote !== undefined) patch.adminNote = data.adminNote ? sanitizeGuestInput(data.adminNote, 2000) : null;
    const row = await prisma.review.update({
      where: { id },
      data: patch,
      select: { tourId: true },
    });
    revalidateReviewPaths(row.tourId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function deleteReviewAdmin(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };
  try {
    const row = await prisma.review.findUnique({ where: { id }, select: { tourId: true } });
    await prisma.review.delete({ where: { id } });
    if (row) revalidateReviewPaths(row.tourId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

function revalidateReviewPaths(tourId: string) {
  for (const lang of SUPPORTED_LOCALES) {
    revalidatePath(`/${lang}/tour/${tourId}`, 'page');
    revalidatePath(`/${lang}/admin/reviews`, 'page');
  }
}
