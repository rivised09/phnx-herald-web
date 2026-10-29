import { buildInsights } from './insights';
import { carryForwardEntry } from './normalize';
import { gatheredSeries, formatStat } from './store';
import { serverId, sourceUrl } from './source';

/**
 * Read path for the roster when it is served as JSON files instead of rows.
 *
 * The files are produced by the bot (`npm run export`, `src/roster/archive.js`)
 * and are laid out as:
 *
 *   index.json                 every stored date, newest first
 *   snapshots/<date>.json      one date's alliances and players
 *   players/<sourceId>.json    one player's whole history
 *   alliances/<id>.json        one alliance's whole history
 *
 * The payloads below are the same objects `./store` returns from Postgres, on
 * purpose: the pages, the API routes and the components were written against
 * those shapes, and a storage swap should not be visible to any of them.
 *
 * Only the roster is read from files. The leadership dashboard aggregates
 * metrics across every player in a window, which is a query, not a document -
 * it keeps reading the database.
 */

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;
const REQUEST_TIMEOUT_MS = 8000;

function dataBase() {
  return String(process.env.ROSTER_DATA_BASE_URL || '').trim().replace(/\/+$/, '');
}

export function filesEnabled() {
  return Boolean(dataBase());
}

/**
 * One JSON document, or null when it is not there.
 *
 * A missing file is a normal answer, not an error: a player id nobody has
 * crawled, a date that was never stored. Anything else - a timeout, a bucket
 * that is misconfigured - is thrown, because serving an empty roster as if the
 * server were quiet would hide a broken deployment.
 */
async function readJson(path) {
  const url = `${dataBase()}/${path}`;
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Roster file ${path} answered ${response.status}.`);
  }
  return response.json();
}

function failure(status, detail) {
  return {
    status,
    detail,
    server: null,
    alliances: [],
    players: [],
    crawledAt: null,
    guild: null,
  };
}

function snapshotDateParam(value) {
  const iso = String(value || '').trim();
  return DATE_PARAM.test(iso) ? iso : null;
}

/**
 * The bucket callofstats publishes for players who are in no alliance. It has
 * a real alliance page and a real id, so it sorts and links like any other.
 * DragonStats leaves those players with an empty alliance instead, which used
 * to make the bucket disappear from the alliances tab; the read path adds it
 * back with the same id so old and new days agree.
 */
const UNAFFILIATED = {
  id: '030d6dc7-910b-4186-bafb-13df68dc3a96',
  name: 'Not In An Alliance',
};

function powerOf(value) {
  return Number(String(value ?? 0).replace(/[^\d.-]/g, '')) || 0;
}

/**
 * One snapshot's alliances, with the "Not In An Alliance" bucket added when
 * some players have no alliance. Ranks are recomputed from power because the
 * bucket belongs in its real place, not after the named alliances.
 */
function alliancesWithUnaffiliated(alliances, players) {
  const list = (alliances || []).map((alliance) => ({ ...alliance }));
  const members = (players || []).filter((player) => !player.allianceId);
  const present = list.some(
    (alliance) => alliance.id === UNAFFILIATED.id || alliance.name === UNAFFILIATED.name,
  );

  if (members.length && !present) {
    const power = members.reduce((sum, player) => sum + powerOf(player.stats?.Power), 0);
    list.push({
      id: UNAFFILIATED.id,
      name: UNAFFILIATED.name,
      stats: { Power: power.toLocaleString('en-US'), Members: String(members.length) },
    });
  }

  list.sort(
    (a, b) =>
      powerOf(b.stats?.Power) - powerOf(a.stats?.Power) ||
      String(a.name).localeCompare(String(b.name)),
  );
  list.forEach((alliance, index) => {
    alliance.rank = index + 1;
  });
  return list;
}

/** Days between a stored snapshot and now, as the home page reports it. */
function staleDays(iso) {
  return Math.floor((Date.now() - new Date(`${iso}T00:00:00.000Z`).getTime()) / 86400000);
}

/**
 * The home roster at one date, or at the newest one.
 *
 * The index decides which date is newest and which dates a pinned URL may name;
 * an absent or unknown date falls back to the newest, exactly like the database
 * read, so a link outliving a snapshot still renders.
 */
export async function getStoredRoster({ date = null } = {}) {
  let number;
  let url;
  try {
    number = Number(serverId());
    url = sourceUrl();
  } catch (err) {
    return failure('not_configured', err.message);
  }

  const index = await readJson('index.json');
  if (!index || !Array.isArray(index.dates) || !index.dates.length) {
    return failure('awaiting_sync', `Server ${number} has no snapshots yet.`);
  }

  const requested = snapshotDateParam(date);
  const wanted = requested && index.dates.includes(requested) ? requested : index.latest;
  const body = await readJson(`snapshots/${wanted}.json`);
  if (!body) return failure('awaiting_sync', `Server ${number} has no snapshot for ${wanted}.`);

  // DragonStats writes avatar: null for every date, so a snapshot read from R2
  // loses the avatar that callofstats recorded on earlier dates. Look up the
  // latest non-null avatar from each player's own history file.
  const avatarById = await loadAvatars(body.players);

  const age = staleDays(body.snapshot.date);
  const alliances = alliancesWithUnaffiliated(body.alliances, body.players);
  const players = body.players.map((player) => ({
    ...player,
    allianceId: player.allianceId || UNAFFILIATED.name,
    avatar: player.avatar || avatarById.get(player.id) || null,
  }));
  return {
    ...body,
    alliances,
    players,
    // The stored file carries the facts; the two derived fields are computed
    // when it is read, because they depend on today, not on the export.
    detail: age > 2 ? `This is the snapshot from ${body.snapshot.date}, ${age} days old.` : null,
    server: { id: String(number), url },
    snapshot: { ...body.snapshot, staleDays: age, dates: index.dates },
    guild: null,
  };
}

/**
 * Reads each player's own history file and returns the latest non-null avatar
 * for any player whose snapshot avatar is missing. Runs in parallel so the
 * home page doesn't pay for players that already have an avatar.
 */
async function loadAvatars(players) {
  const missing = players.filter((p) => !p.avatar).map((p) => p.id);
  if (!missing.length) return new Map();
  const results = await Promise.allSettled(
    missing.map((id) => readJson(`players/${id}.json`)),
  );
  const map = new Map();
  for (let i = 0; i < missing.length; i++) {
    const result = results[i];
    if (result.status !== 'fulfilled' || !result.value) continue;
    const file = result.value;
    for (const date of file.dates) {
      const value = file.byDate?.[date]?.avatar;
      if (value) {
        map.set(missing[i], value);
        break;
      }
    }
  }
  return map;
}

function upTo(byDate, iso) {
  const out = {};
  for (const [date, values] of Object.entries(byDate || {})) {
    if (date <= iso) out[date] = values;
  }
  return out;
}

/** The newest picture this player has, whichever date it came from. */
function latestAvatar(file) {
  for (const date of file.dates) {
    const value = file.byDate?.[date]?.avatar;
    if (value) return value;
  }
  return null;
}

/**
 * Splits nameHistory into previous names and previous server numbers.
 *
 * Some sources (callofstats) mixed server numbers into nameHistory. We
 * separate them so names and servers each get their own section.
 */
function splitNameHistory(nameHistory, currentName) {
  const previousNames = [];
  const previousServers = [];
  for (const name of nameHistory || []) {
    if (name === currentName) continue;
    if (/^\d+$/.test(String(name).trim())) {
      previousServers.push(String(name).trim());
    } else {
      previousNames.push(name);
    }
  }
  return { previousNames, previousServers };
}

/**
 * Albums for a specific date. Prefers per-date albums stored by the bot
 * (DragonStats), falling back to top-level callofstats albums filtered by
 * their postedAt date matching the wanted snapshot date.
 */
function albumsForDate(file, wanted) {
  const entry = file.byDate?.[wanted];
  if (entry?.albums?.length) return entry.albums;

  const topLevel = file.albums || [];
  if (!topLevel.length) return [];

  const byDate = topLevel.filter((a) => a.postedAt === wanted);
  return byDate.length ? byDate : [];
}

/**
 * A player's profile at one date, or at the newest one.
 *
 * One file holds the whole history, so the picker's dates and every series the
 * page draws come from the same read - the database version needs three
 * queries for that, and here it is one document.
 */
export async function getPlayerDetail(sourceId, { date = null } = {}) {
  const file = await readJson(`players/${sourceId}.json`);
  if (!file || !Array.isArray(file.dates) || !file.dates.length) return null;

  const requested = snapshotDateParam(date);
  const wanted = requested && file.dates.includes(requested) ? requested : file.dates[0];
  const entry = carryForwardEntry(file, wanted);
  if (!entry) return null;

  const history = file.dates
    .slice()
    .sort()
    .map((iso) => ({
      date: iso,
      power: file.byDate[iso]?.power ?? null,
      rank: file.byDate[iso]?.rank ?? null,
    }))
    .filter((point) => point.date <= wanted);

  const metricsByDate = upTo(file.metrics, wanted);
  const radarByDate = upTo(file.radar, wanted);
  const sections = entry.sections || [];

  const { previousNames: splitNames, previousServers: splitServers } =
    splitNameHistory(file.nameHistory, entry.name);

  const allPreviousServers = [
    ...new Set([...(file.previousServers || []), ...(file.otherServers || []), ...splitServers]),
  ];

  return {
    id: file.id,
    name: entry.name,
    rank: entry.rank,
    power: formatStat(entry.power),
    avatar: entry.avatar || latestAvatar(file),
    alliance: entry.alliance
      ? { id: entry.alliance, name: entry.alliance }
      : { id: UNAFFILIATED.id, name: UNAFFILIATED.name },
    snapshotDate: wanted,
    snapshotDates: file.dates,
    requestedDate: requested,
    isLatest: wanted === file.dates[0],
    history,
    gathered: gatheredSeries(metricsByDate),
    previousNames: splitNames,
    previousServers: allPreviousServers,
    otherServers: file.otherServers || [],
    albums: albumsForDate(file, wanted),
    sections,
    sectionsDate: sections.length ? wanted : null,
    insights: buildInsights({
      history,
      metricsByDate,
      radarByDate,
      serverNumber: Number(serverId()),
      name: entry.name,
    }),
    achievements: entry.achievements || [],
  };
}

/**
 * The "Not In An Alliance" page for a date the stored alliance file does not
 * cover yet (the DragonStats days). Built from that date's snapshot, so the
 * bucket opens like any other alliance instead of falling back to its newest
 * callofstats entry.
 */
async function unaffiliatedDetail(date) {
  const index = await readJson('index.json');
  if (!index || !Array.isArray(index.dates) || !index.dates.length) return null;

  const requested = snapshotDateParam(date);
  const wanted = requested && index.dates.includes(requested) ? requested : index.latest;
  const snapshot = await readJson(`snapshots/${wanted}.json`);
  if (!snapshot) return null;

  const members = (snapshot.players || [])
    .filter((player) => !player.allianceId)
    .sort((a, b) => (a.index ?? Infinity) - (b.index ?? Infinity));
  if (!members.length) return null;

  const alliances = alliancesWithUnaffiliated(snapshot.alliances, snapshot.players);
  const entry = alliances.find((alliance) => alliance.id === UNAFFILIATED.id);
  const power = members.reduce((sum, player) => sum + powerOf(player.stats?.Power), 0);

  return {
    id: UNAFFILIATED.id,
    name: UNAFFILIATED.name,
    rank: entry?.rank ?? null,
    power: formatStat(power),
    memberCount: members.length,
    snapshotDate: wanted,
    snapshotDates: index.dates,
    requestedDate: requested,
    isLatest: wanted === index.dates[0],
    players: members.map((player) => ({
      id: player.id,
      name: player.name,
      rank: player.index,
      power: formatStat(powerOf(player.stats?.Power)),
    })),
  };
}

/** An alliance at one date, or at its newest snapshot. */
export async function getAllianceDetail(id, { date = null } = {}) {
  if (id === UNAFFILIATED.id) {
    const derived = await unaffiliatedDetail(date);
    if (derived) return derived;
  }

  const file = await readJson(`alliances/${id}.json`);
  if (!file || !Array.isArray(file.dates) || !file.dates.length) return null;

  const requested = snapshotDateParam(date);
  const wanted = requested && file.dates.includes(requested) ? requested : file.dates[0];
  const entry = file.byDate?.[wanted];
  if (!entry) return null;

  return {
    id: file.id,
    name: entry.name,
    rank: entry.rank,
    power: formatStat(entry.power),
    memberCount: entry.memberCount || (entry.players || []).length,
    snapshotDate: wanted,
    snapshotDates: file.dates,
    requestedDate: requested,
    isLatest: wanted === file.dates[0],
    players: (entry.players || []).map((player) => ({
      id: player.id,
      name: player.name,
      rank: player.rank,
      power: formatStat(player.power),
    })),
  };
}
