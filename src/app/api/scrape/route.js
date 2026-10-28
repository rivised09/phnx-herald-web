import { NextResponse } from 'next/server';
import { getApiBaseUrl } from '../../../lib/apiBase';
import { hasDashboardAccess } from '../../../lib/dashboardAccess';

/**
 * Proxy for the bot's scrape job endpoint.
 *
 * GET  /api/scrape?after=<seq>   current job plus new log lines
 * POST /api/scrape              start a job
 * DELETE /api/scrape            cancel the running job
 */
async function proxy(req) {
  if (!(await hasDashboardAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const search = new URL(req.url).search;
  const res = await fetch(`${getApiBaseUrl()}/api/scrape${search}`, {
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
export const POST = proxy;
export const DELETE = proxy;
