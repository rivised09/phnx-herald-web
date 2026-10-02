import { NextResponse } from 'next/server';
import { getApiBaseUrl } from '../../../lib/apiBase';

async function proxy(req) {
  const res = await fetch(`${getApiBaseUrl()}/api/settings`, {
    method: req.method,
    headers: {
      'content-type': req.headers.get('content-type') || 'application/json',
    },
    cache: 'no-store',
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text(),
  });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') || 'application/json',
    },
  });
}

export const GET = proxy;
export const PATCH = proxy;