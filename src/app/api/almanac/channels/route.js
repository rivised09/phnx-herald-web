import { NextResponse } from 'next/server';
import { getApiBaseUrl } from '../../../../lib/apiBase';
import { ALMANAC_COOKIE, isUnlocked } from '../../../../lib/almanacAuth';
import { cookies } from 'next/headers';

export async function GET() {
  const store = await cookies();
  if (!isUnlocked(store.get(ALMANAC_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${getApiBaseUrl()}/api/almanac/channels`, {
    headers: { 'x-almanac-secret': process.env.ALMANAC_SECRET || '' },
    cache: 'no-store',
  });

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}