import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(
  _request: Request,
  context: { params: Promise<{ lang: string }> }
) {
  const { lang } = await context.params;
  const cookieStore = await cookies();
  cookieStore.delete('kismet-user');
  return NextResponse.redirect(new URL(`/${lang}`, _request.url));
}
