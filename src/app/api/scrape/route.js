import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getApiBaseUrl } from '../../../lib/apiBase';
import { hasDashboardAccess } from '../../../lib/dashboardAccess';

/** The finishedAt of the last job whose publish already dropped the cache. */
let lastInvalidatedAt = null;

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

  // A finished job has just rewritten the bucket. Dropping the roster cache
  // here is what makes the public and leadership pages show the new snapshot
  // on their next request instead of up to a minute later (and, before the
  // publish stamp existed, up to an hour). Guarded by finishedAt so polling an
  // idle job does not revalidate on every tick.
  if (req.method === 'GET') {
    try {
      const state = JSON.parse(body);
      const finishedAt = state?.job?.running === false ? state.job.finishedAt : null;
      if (finishedAt && finishedAt !== lastInvalidatedAt) {
        lastInvalidatedAt = finishedAt;
        revalidateTag('roster');
      }
    } catch {
      // Not every poll returns JSON (an upstream error page, for one).
    }
  }

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
