import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  if (!from || !to || !YMD.test(from) || !YMD.test(to)) {
    return NextResponse.json({ error: 'from and to required (YYYY-MM-DD)' }, { status: 400 });
  }
  const fromStart = new Date(`${from}T00:00:00.000Z`);
  const toEnd = new Date(`${to}T00:00:00.000Z`);
  toEnd.setUTCDate(toEnd.getUTCDate() + 1);
  if (Number.isNaN(fromStart.getTime()) || Number.isNaN(toEnd.getTime()) || fromStart >= toEnd) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
  }

  const rows = await prisma.tourDatePrice.findMany({
    where: {
      tourId: id,
      isClosed: true,
      date: { gte: fromStart, lt: toEnd },
    },
    select: { date: true },
  });

  const dates = rows.map((r) => r.date.toISOString().slice(0, 10));
  return NextResponse.json({ dates });
}
