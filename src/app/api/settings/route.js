import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getApiBaseUrl } from '../../../lib/apiBase';

/**
 * Settings decide what the public home page renders, so the bot now requires an
 * access code on this route. The web app holds the code in its own env and
 * forwards it; the session cookie is checked first so an unauthenticated
 * request never reaches the bot at all.
 */
const AUTH_DISABLED = process.env.AUTH_ENABLED === 'false';

async function proxy(req) {
  // Match the middleware exactly. When auth is off (or no code is configured)
  // the middleware never issues phnx_access, so demanding that cookie here
  // would make the settings page permanently unusable.
  if (!AUTH_DISABLED && process.env.DASHBOARD_ACCESS_CODE) {
    const store = await cookies();
    if (!store.get('phnx_access')?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const res = await fetch(`${getApiBaseUrl()}/api/settings`, {
    method: req.method,
    headers: {
      'content-type': req.headers.get('content-type') || 'application/json',
      'x-dashboard-code': process.env.DASHBOARD_ACCESS_CODE || '',
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
