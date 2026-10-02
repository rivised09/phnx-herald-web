import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

const VALID_STATUS = ['SCHEDULED', 'ACTIVE', 'CANCELLED', 'COMPLETED'];

export default async function DashboardPage({ searchParams }) {
  const sp = await searchParams;
  const requested = String(sp?.status || '').toUpperCase();
  const hasParam = sp?.status !== undefined && sp?.status !== '';

  let filter = '';
  if (requested === 'ALL') {
    filter = '';
  } else if (VALID_STATUS.includes(requested)) {
    filter = requested;
  } else if (!hasParam) {
    filter = 'SCHEDULED';
  }

  return <DashboardClient initialFilter={filter} />;
}