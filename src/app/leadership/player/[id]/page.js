import { notFound } from 'next/navigation';
import { readLeadership, readPlayer } from '../../../../lib/roster';
import LeadershipPlayerView from './LeadershipPlayerView';

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The leadership player detail: the full profile plus the leadership-only
 * context (window deltas, readiness, RoW/ToC) and the exclusive Growth tab.
 *
 * Everything fetches here on the server; the view below is a client
 * component that owns the tabs. `?date=` pins both the profile and the
 * dashboard to the same snapshot window, so the two can never disagree
 * about which day they describe.
 */
export default async function LeadershipPlayerPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const date = sp?.date && DATE_PARAM.test(String(sp.date)) ? String(sp.date) : null;
  const [profile, dashboard] = await Promise.all([
    readPlayer(id, date),
    readLeadership({ endDate: date }),
  ]);
  const player = dashboard?.players?.find((item) => item.id === String(id));
  if (!profile || !dashboard || !player) notFound();

  return (
    <LeadershipPlayerView
      profile={profile}
      player={player}
      dashboard={dashboard}
      date={dashboard.requestedDate || date}
    />
  );
}
