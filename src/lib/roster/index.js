import { unstable_cache } from 'next/cache';
import { getAllianceDetail, getPlayerDetail, getStoredRoster } from './store';

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

const readHomeRoster = unstable_cache(getStoredRoster, ['roster:home'], {
  revalidate: LATEST_TTL,
  tags: ['roster'],
});

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

const readAllianceCached = unstable_cache(
  (id) => getAllianceDetail(id),
  ['roster:alliance'],
  { revalidate: LATEST_TTL, tags: ['roster'] },
);

export { readHomeRoster };

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
 * An alliance at its newest snapshot, or null when the id is not one.
 *
 * The store keys alliances on their UUID, and the query rejects anything else
 * as an invalid value - a 500 - where a stranger's URL should read as a miss.
 */
export async function readAlliance(id) {
  const key = String(id ?? '');
  if (!UUID.test(key)) return null;
  return readAllianceCached(key);
}
