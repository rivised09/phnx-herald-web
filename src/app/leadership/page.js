import { notFound } from 'next/navigation';
import { readLeadership } from '../../lib/roster';
import LeadershipClient from './LeadershipClient';

export const dynamic = 'force-dynamic';

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The leadership dashboard, optionally pinned to the 7-day window ending on
 * `?date=` (the same snapshot picker the public home page has).
 *
 * Two things keep this page off the critical path:
 *
 *  - `readLeadership` caches the assembled dashboard (a minute for the
 *    newest window, an hour for a pinned one), so a repeat visit never
 *    re-reads the window's data;
 *  - the home roster (Alliances tab, global search) is fetched by the
 *    client in the background instead of being awaited here - it used to
 *    double the cold-start cost and delay first paint for content most
 *    visitors never open.
 */
export default async function LeadershipPage({ searchParams }) {
  const params = await searchParams;
  const date =
    params?.date && DATE_PARAM.test(String(params.date)) ? String(params.date) : null;

  const data = await readLeadership({ endDate: date });
  if (!data) notFound();

  return <LeadershipClient data={data} />;
}
