import HomeClient from '../components/home/HomeClient';
import { readHomeRoster } from '../lib/roster';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Phoenix of War — Server 973',
  description: 'Phoenix of War alliance roster and player statistics for Server 973.',
};

/**
 * The home page is public, so it must not depend on the leadership session.
 * It reads whatever the scraper has already stored in the roster database -
 * the latest snapshot of alliances and players - and never touches the source
 * site. There is no service in between: one read, then the cached copy.
 *
 * The first load happens here so the roster is in the HTML rather than
 * arriving after hydration; the client component keeps the refresh button
 * working against its own route.
 */
async function loadRoster() {
  try {
    const body = await readHomeRoster();
    if (!body?.status) return null;
    return body;
  } catch {
    return null;
  }
}

export default async function Home() {
  return <HomeClient initialData={await loadRoster()} />;
}
