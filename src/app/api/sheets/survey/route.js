import { NextResponse } from 'next/server';
import { getApiBaseUrl } from '../../../../lib/apiBase';

export async function GET(req) {
  const url = new URL(req.url);
  const target = `${getApiBaseUrl()}/api/sheets/survey${url.search}`;
  const res = await fetch(target, { cache: 'no-store' });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') || 'application/json',
    },
  });
}