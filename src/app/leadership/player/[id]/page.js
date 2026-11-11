import { notFound } from 'next/navigation';
import { readLeadership, readPlayer } from '../../../../lib/roster';
import LeadershipPlayerView from './LeadershipPlayerView';
import LeadershipUnavailable from '../../LeadershipUnavailable';

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The leadership player detail: the full profile plus the leadership-only
 * context (window deltas, readiness, RoW/ToC) and the exclusive Growth tab.
 *
 * Everything fetches here on the server; the view below is a client
 * component that owns the tabs. `?date=` pins both the profile and the
 * dashboard to the same snapshot window, so the two can never disagree
 * about which day they describe.
 *
 * A lord who has left the current roster must not 404 on their own page:
 * when the requested window's snapshot no longer contains them, the page
 * falls back to the most recent window that does (their own last captured
 * snapshot) and tells the visitor the data is historical. A read that fails
 * right now shows the retryable unavailable state rather than a 404/500 -
 * only a genuinely unknown player id is allowed to notFound.
 */
export default async function LeadershipPlayerPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const date = sp?.date && DATE_PARAM.test(String(sp.date)) ? String(sp.date) : null;

  let profile = null;
  let dashboard = null;
  try {
    [profile, dashboard] = await Promise.all([
      readPlayer(id, date),
      readLeadership({ endDate: date }),
    ]);
  } catch (error) {
    console.error('[leadership/player] read failed:', error);
    return <LeadershipUnavailable detail={error.message} />;
  }
  if (!profile) notFound();

  let player = dashboard?.players?.find((item) => item.id === String(id)) || null;

  // The window's snapshot may predate or postdate this lord's time on the
  // server (they left the roster, or the link pins an old date). Fall back to
  // the newest window that still contains them: the last date they were
  // captured, from their own history file.
  if (!player) {
    const lastSeen = [...(profile.snapshotDates || [])].sort().pop();
    if (lastSeen && lastSeen !== date) {
      try {
        dashboard = await readLeadership({ endDate: lastSeen });
      } catch (error) {
        console.error('[leadership/player] historical window read failed:', error);
        return <LeadershipUnavailable detail={error.message} />;
      }
      player = dashboard?.players?.find((item) => item.id === String(id)) || null;
    }
  }

  if (!dashboard || !player) notFound();

  return (
    <LeadershipPlayerView
      profile={profile}
      player={player}
      dashboard={dashboard}
      date={dashboard.requestedDate || date}
    />
  );
}
