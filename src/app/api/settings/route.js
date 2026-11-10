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

/**
 * The proxy used to have no timeout: a bot that accepted the connection and
 * never answered left the caller waiting forever (the RoW saved-roster tab
 * spun indefinitely). 20s is generous for a settings read and turns a hang
 * into a 504 the UI can show with a retry.
 */
const UPSTREAM_TIMEOUT_MS = 20000;

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

  let res;
  try {
    res = await fetch(`${getApiBaseUrl()}/api/settings`, {
      method: req.method,
      headers: {
        'content-type': req.headers.get('content-type') || 'application/json',
        'x-dashboard-code': process.env.DASHBOARD_ACCESS_CODE || '',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text(),
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return NextResponse.json(
        { error: 'The settings service did not respond in time. Please try again.' },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: 'The settings service is unreachable. Please try again.' },
      { status: 502 },
    );
  }

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
export const DELETE = proxy;
export const POST = async (req) => {
  const url = `${getApiBaseUrl()}/api/settings/fetch`;
  const store = await cookies();
  if (!AUTH_DISABLED && process.env.DASHBOARD_ACCESS_CODE && !store.get('phnx_access')?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': req.headers.get('content-type') || 'application/json',
        'x-dashboard-code': process.env.DASHBOARD_ACCESS_CODE || '',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      body: await req.text(),
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return NextResponse.json(
        { error: 'The snapshot fetch did not start in time. Please try again.' },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: 'The snapshot fetch service is unreachable. Please try again.' },
      { status: 502 },
    );
  }
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
  });
};
