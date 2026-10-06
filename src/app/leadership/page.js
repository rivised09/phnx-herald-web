import { notFound } from 'next/navigation';
import { getLeadershipDashboard } from '../../lib/roster';
import LeadershipClient from './LeadershipClient';

export const dynamic = 'force-dynamic';

export default async function LeadershipPage() {
  const data = await getLeadershipDashboard();
  if (!data) notFound();
  return <LeadershipClient data={data} />;
}
