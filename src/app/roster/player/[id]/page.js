import { notFound } from 'next/navigation';
import DetailView from '../../DetailView';
import { readPlayer } from '../../../../lib/roster';

export const dynamic = 'force-dynamic';

export default async function PlayerPage({ params, searchParams }) {
  const { id } = await params;
  const { date } = await searchParams;

  // The profile reads one stored snapshot at a time. No date means the newest;
  // an unknown date falls back to the newest in the store rather than 404ing,
  // and an id that is not a source id finds nothing at all.
  //
  // Reads are held in the data cache rather than fetched fresh per view: a
  // pinned date is immutable once ingested and can be reused for an hour, while
  // the undated "latest" only has to be minutes old. Navigation, back buttons
  // and every revisit of a snapshot therefore skip the database round trip
  // entirely instead of paying for it again.
  const data = await readPlayer(id, date);
  if (!data) notFound();
  return <DetailView kind="player" data={data} />;
}
