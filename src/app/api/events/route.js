import { NextResponse } from 'next/server';
import { getApiBaseUrl } from '../../../lib/apiBase';

async function proxy(req) {
  const url = new URL(req.url);
  const target = `${getApiBaseUrl()}/api/events${url.search}`;
  const init = {
    method: req.method,
    headers: {
      'content-type': req.headers.get('content-type') || 'application/json',
    },
    cache: 'no-store',
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }
  const res = await fetch(target, init);
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') || 'application/json',
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;