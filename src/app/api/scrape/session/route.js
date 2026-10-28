import { NextResponse } from 'next/server';
import { getApiBaseUrl } from '../../../../lib/apiBase';
import { hasDashboardAccess } from '../../../../lib/dashboardAccess';

/**
 * Imports a DragonStats session captured on a desktop.
 *
 * The body is a Playwright storage state (cookies plus the Convex JWT). It is
 * forwarded untouched and never read or logged here.
 */
export async function POST(req) {
  if (!(await hasDashboardAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${getApiBaseUrl()}/api/scrape/session`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-dashboard-code': process.env.DASHBOARD_ACCESS_CODE || '',
    },
    cache: 'no-store',
    body: await req.text(),
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') || 'application/json',
    },
  });
}
