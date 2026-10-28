import { NextResponse } from 'next/server';
import { getApiBaseUrl } from '../../../../lib/apiBase';
import { hasDashboardAccess } from '../../../../lib/dashboardAccess';

/** Defaults for the scraping form: dates, session state, account count. */
export async function GET() {
  if (!(await hasDashboardAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${getApiBaseUrl()}/api/scrape/options`, {
    headers: {
      'content-type': 'application/json',
      'x-dashboard-code': process.env.DASHBOARD_ACCESS_CODE || '',
    },
    cache: 'no-store',
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') || 'application/json',
    },
  });
}
