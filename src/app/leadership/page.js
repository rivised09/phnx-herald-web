import { notFound } from 'next/navigation';
import { getLeadershipDashboard, readHomeRoster } from '../../lib/roster';
import LeadershipClient from './LeadershipClient';

export const dynamic = 'force-dynamic';

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The leadership dashboard, optionally pinned to the 7-day window ending on
 * `?date=` (the same snapshot picker the public home page has). The home
 * roster rides along so the Alliances tab, Server Stats and the global search
 * render from the same snapshot the dashboard summarises.
 */
export default async function LeadershipPage({ searchParams }) {
  const params = await searchParams;
  const date =
    params?.date && DATE_PARAM.test(String(params.date)) ? String(params.date) : null;

  const [data, roster] = await Promise.all([
    getLeadershipDashboard({ endDate: date }),
    readHomeRoster(date).catch(() => null),
  ]);

  if (!data) notFound();
  return <LeadershipClient data={data} roster={roster} />;
}
