import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getApiBaseUrl } from '../../../../../../lib/apiBase';
import { ALMANAC_COOKIE, isUnlocked } from '../../../../../../lib/almanacAuth';

export async function GET(request, { params }) {
  const { id } = await params;

  const store = await cookies();
  if (!isUnlocked(store.get(ALMANAC_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit');
  const before = searchParams.get('before');
  const after = searchParams.get('after');

  const query = new URLSearchParams();
  if (limit) query.set('limit', limit);
  if (before) query.set('before', before);
  if (after) query.set('after', after);

  const qs = query.toString();
  const res = await fetch(
    `${getApiBaseUrl()}/api/almanac/channels/${encodeURIComponent(id)}/messages${qs ? `?${qs}` : ''}`,
    {
      headers: { 'x-almanac-secret': process.env.ALMANAC_SECRET || '' },
      cache: 'no-store',
    },
  );

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}