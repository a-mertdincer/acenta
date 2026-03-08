'use server';

import { getSession } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';

export type FlightRow = { id: string; code: string; airline: string; airport: string; direction: string; estimatedTime: string };

export type FlightRowAdmin = FlightRow & { isActive: boolean; sortOrder: number };

/** List flights for transfer booking (optional filter by airport and direction). */
export async function getFlights(filters?: { airport?: string; direction?: string }): Promise<FlightRow[]> {
  try {
    const where: { airport?: string; direction?: string; isActive?: boolean } = { isActive: true };
    if (filters?.airport) where.airport = filters.airport;
    if (filters?.direction) where.direction = filters.direction;
    const rows = await prisma.flight.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { estimatedTime: 'asc' }],
    });
    return (rows || []).map((r: { id: string; code: string; airline: string; airport: string; direction: string; estimatedTime: string }) => ({
      id: r.id,
      code: r.code,
      airline: r.airline,
      airport: r.airport,
      direction: r.direction,
      estimatedTime: r.estimatedTime,
    }));
  } catch {
    return [];
  }
}

/** Admin: list all flights (including inactive). */
export async function getFlightsForAdmin(): Promise<FlightRowAdmin[]> {
  try {
    const rows = await prisma.flight.findMany({
      orderBy: [{ sortOrder: 'asc' }, { airport: 'asc' }, { estimatedTime: 'asc' }],
    });
    return (rows || []).map((r: { id: string; code: string; airline: string; airport: string; direction: string; estimatedTime: string; isActive?: boolean; sortOrder?: number }) => ({
      id: r.id,
      code: r.code,
      airline: r.airline,
      airport: r.airport,
      direction: r.direction,
      estimatedTime: r.estimatedTime,
      isActive: r.isActive ?? true,
      sortOrder: r.sortOrder ?? 0,
    }));
  } catch {
    return [];
  }
}

export type CreateFlightInput = { code: string; airline: string; airport: string; direction: string; estimatedTime: string; sortOrder?: number };

export async function createFlight(data: CreateFlightInput): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    await prisma.flight.create({
      data: {
        code: data.code.trim(),
        airline: data.airline.trim(),
        airport: data.airport,
        direction: data.direction,
        estimatedTime: data.estimatedTime.trim(),
        sortOrder: data.sortOrder ?? 0,
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Uçuş eklenemedi' };
  }
}

export async function updateFlight(id: string, data: Partial<CreateFlightInput> & { isActive?: boolean }): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    await prisma.flight.update({
      where: { id },
      data: {
        ...(data.code != null && { code: data.code.trim() }),
        ...(data.airline != null && { airline: data.airline.trim() }),
        ...(data.airport != null && { airport: data.airport }),
        ...(data.direction != null && { direction: data.direction }),
        ...(data.estimatedTime != null && { estimatedTime: data.estimatedTime.trim() }),
        ...(data.sortOrder != null && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Uçuş güncellenemedi' };
  }
}

export async function deleteFlight(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Yetkisiz' };
  try {
    await prisma.flight.delete({ where: { id } });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Uçuş silinemedi' };
  }
}
