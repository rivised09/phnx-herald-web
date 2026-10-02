import { NextResponse } from 'next/server';
import { getApiBaseUrl } from '../../../../../lib/apiBase';

export async function PATCH(req, { params }) {
  const { id } = await params;
  const target = `${getApiBaseUrl()}/api/events/${id}/cancel`;
  const res = await fetch(target, { method: 'PATCH', cache: 'no-store' });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') || 'application/json',
    },
  });
}