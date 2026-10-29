import { unstable_cache } from 'next/cache';
import * as store from './store';
import * as files from './files';

/**
 * Which storage the roster is read from.
 *
 * Setting `ROSTER_DATA_BASE_URL` switches the public read path to the JSON
 * files the bot exports; leaving it unset keeps the Postgres reads. Both
 * modules return the same payloads, so nothing above this line knows the
 * difference - which is also what makes the switch reversible during a
 * migration.
 */
const roster = files.filesEnabled() ? files : store;

/**
 * Re-exported so the refresh route can bypass the cache with the same source
 * the pages use - refreshing against Postgres while the pages read files (or
 * the other way round) would publish one and serve the other.
 */
export const getStoredRoster = roster.getStoredRoster;

const { getPlayerDetail, getAllianceDetail } = roster;
const { getLeadershipDashboard } = roster;

/**
 * The roster reads behind a small cache, so a page is served from the data
 * tier once and from memory after that.
 *
 * A home render used to walk into another service first; it now costs one
 * read on a miss and nothing on a hit. The windows are short enough that the
 * hourly scraper stays the source of truth: a "latest" figure is at most a
 * minute old, and a date someone pinned in the URL is at most an hour old -
 * both further back than the cron, which re-reads the source anyway.
 *
 * Everything is tagged `roster`, so the home page's Refresh button can drop
 * the whole group at once instead of guessing which entry to clear.
 */

const LATEST_TTL = 60;
const PINNED_TTL = 3600;

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;
const LORD_ID = /^\d+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const readHomeLatest = unstable_cache(() => getStoredRoster(), ['roster:home'], {
  revalidate: LATEST_TTL,
  tags: ['roster'],
});

const readHomeDated = unstable_cache(
  (iso) => getStoredRoster({ date: iso }),
  ['roster:home:dated'],
  { revalidate: PINNED_TTL, tags: ['roster'] },
);

const readPlayerLatest = unstable_cache(
  (id) => getPlayerDetail(id),
  ['roster:player:latest'],
  { revalidate: LATEST_TTL, tags: ['roster'] },
);

const readPlayerDated = unstable_cache(
  (id, iso) => getPlayerDetail(id, { date: iso }),
  ['roster:player:dated'],
  { revalidate: PINNED_TTL, tags: ['roster'] },
);

const readLeadership = unstable_cache(getLeadershipDashboard, ['roster:leadership'], {
  revalidate: LATEST_TTL,
  tags: ['roster'],
});

const readAllianceLatest = unstable_cache(
  (id) => getAllianceDetail(id),
  ['roster:alliance'],
  { revalidate: LATEST_TTL, tags: ['roster'] },
);

const readAllianceDated = unstable_cache(
  (id, iso) => getAllianceDetail(id, { date: iso }),
  ['roster:alliance:dated'],
  { revalidate: PINNED_TTL, tags: ['roster'] },
);

/**
 * The home roster at one date, or at the newest snapshot.
 *
 * A pinned date carries the same payload shape as the newest one - same rows,
 * same format, only read from another immutable snapshot - so the client
 * swaps it in without having to know which date it got. Pinned reads cache
 * like a pinned detail page: for an hour, because the date can never change
 * underneath them; the newest keeps its minutes.
 */
export function readHomeRoster(date) {
  const iso = date && DATE_PARAM.test(String(date)) ? String(date) : null;
  return iso ? readHomeDated(iso) : readHomeLatest();
}

export { getLeadershipDashboard };
export { readLeadership };

/**
 * A player at one date, or at the newest one.
 *
 * Both arguments are checked before the cache is touched: a malformed query
 * string would miss on every spelling of it and cache the same fallback many
 * times over, and an id that is not a source id would reach the query as a
 * value it cannot read instead of simply finding nothing.
 */
export async function readPlayer(id, date) {
  const sourceId = String(id ?? '');
  if (!LORD_ID.test(sourceId)) return null;
  const iso = date && DATE_PARAM.test(String(date)) ? String(date) : null;
  return iso ? readPlayerDated(sourceId, iso) : readPlayerLatest(sourceId);
}

/**
 * An alliance at one date or at its newest snapshot, or null when the id is
 * not one. Date and id are validated the same way the player read validates
 * them, for the same reasons.
 *
 * The store keys alliances on their UUID, and the query rejects anything else
 * as an invalid value - a 500 - where a stranger's URL should read as a miss.
 */
export async function readAlliance(id, date) {
  const key = String(id ?? '');
  if (!UUID.test(key)) return null;
  const iso = date && DATE_PARAM.test(String(date)) ? String(date) : null;
  return iso ? readAllianceDated(key, iso) : readAllianceLatest(key);
}
