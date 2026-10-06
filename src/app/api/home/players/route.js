import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { readHomeRoster } from '../../../../lib/roster';
import { getStoredRoster } from '../../../../lib/roster/store';

export const dynamic = 'force-dynamic';

/**
 * Public read-only roster payload for the home page. The home page is public,
 * so this carries no credentials and reads only what is already stored in the
 * roster database - never the source site.
 *
 * `?refresh=1` is what the Refresh button calls. It re-reads rather than
 * serving the cached copy, and drops the shared cache on the way out: without
 * that, the rest of the site would keep showing the roster this request just
 * replaced for up to another minute.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get('refresh') === '1';

  try {
    if (refresh) revalidateTag('roster');
    const body = refresh ? await getStoredRoster() : await readHomeRoster();

    // A roster payload always carries `status`. Anything else - a read that
    // failed part way, or a shape that never made it to the client - is shown
    // as an unavailable source rather than leaking an error.
    if (!body?.status) {
      return unavailable('The roster could not be read right now. Try again shortly.');
    }

    return NextResponse.json(body, { status: 200 });
  } catch {
    return unavailable('The roster could not be read right now. Try again shortly.');
  }
}

function unavailable(detail) {
  return NextResponse.json(
    {
      status: 'unavailable',
      detail,
      alliances: [],
      players: [],
    },
    { status: 200 },
  );
}
