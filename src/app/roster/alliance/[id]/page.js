import { notFound } from 'next/navigation';
import DetailView from '../../DetailView';
import { readAlliance } from '../../../../lib/roster';

export const dynamic = 'force-dynamic';

export default async function AlliancePage({ params }) {
  const { id } = await params;
  // An alliance's figures only move when a snapshot lands, so a minute of
  // reuse turns every second visit - and every back button - into a cached read
  // rather than another query. An id that is not a stored alliance still 404s
  // immediately, since a miss is never cached as anything else.
  const data = await readAlliance(id);
  if (!data) notFound();
  return <DetailView kind="alliance" data={data} />;
}
