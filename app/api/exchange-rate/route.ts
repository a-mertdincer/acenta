import { NextResponse } from 'next/server';
import { getEurTryRate } from '@/lib/exchangeRate';

export async function GET() {
  const data = await getEurTryRate();
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=3600',
    },
  });
}
