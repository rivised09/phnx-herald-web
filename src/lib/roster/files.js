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
 * The day an album image was posted. The published link is a base64
 * image-proxy URL, so the original CDN path - which carries the upload date -
 * has to be decoded out of the payload. Older scrapes stored the day the image
 * was first seen instead, so that stays as the fallback.
 */
function albumPostedAt(album) {
  const url = String(album?.url || '');
  const proxy = url.match(/image-proxy\/([A-Za-z0-9+/=]+)$/);
  if (proxy) {
    try {
      const original = Buffer.from(proxy[1], 'base64').toString('utf8');
      const match = original.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    } catch {
      // fall through to the stored value
    }
  }
  const direct = url.match(/(\d{4}-\d{2}-\d{2})/);
  if (direct) return direct[1];
  return album?.postedAt || null;
}

/**
 * Albums for a specific date. Only per-date albums are used: a snapshot must
 * show the gallery as it existed on that exact day, not a global gallery
 * copied from another date.
 */
function albumsForDate(file, wanted) {
  const entry = file.byDate?.[wanted];
  return entry?.albums?.slice(0, 8) || [];
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
    avatar: (() => {
      // Enriched dates (with per-date albums) keep their own avatar.
      // Unenriched dates show the newest available avatar so the
      // profile never looks stale before the next enrichment run.
      const hasEnrichment = Array.isArray(file.byDate?.[wanted]?.albums) && file.byDate[wanted].albums.length > 0;
      return hasEnrichment ? (entry.avatar || latestAvatar(file)) : latestAvatar(file);
    })(),
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

function compactNumber(value) {
  if (value === null || value === undefined) return '—';
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return Math.round(value).toLocaleString();
}

/** Fetch multiple JSON files with a concurrency limit, returning results in the same order. */
async function readFilesInParallel(urls, limit = 15) {
  const results = new Array(urls.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, urls.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= urls.length) return;
      try {
        results[i] = await readJson(urls[i]);
      } catch {
        results[i] = null;
      }
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * R2-native replacement for the Postgres `getLeadershipDashboard`.
 *
 * Reads snapshot files for the last 7 days and player files to build the
 * same leadership dashboard shape the `LeadershipClient` expects, so the
 * leadership page works without a database.
 */
export async function getLeadershipDashboard() {
  if (!filesEnabled()) return null;

  const number = Number(serverId());

  // Read index to get all stored dates
  const index = await readJson('index.json');
  if (!index || !Array.isArray(index.dates) || !index.dates.length) return null;

  const today = new Date();
  const windowStart = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() - 7,
  ));

  // Filter dates to last 7 days (inclusive)
  const dates = index.dates
    .filter((d) => new Date(d) >= windowStart)
    .sort();

  if (!dates.length) return null;

  const latestDate = dates[dates.length - 1];
  const baselineDate = dates[0];

  // Read snapshot files for each date to get players with power
  const snapshots = await Promise.all(
    dates.map((date) => readJson(`snapshots/${date}.json`)),
  );

  // Collect all unique player IDs across snapshots in the window
  const allPlayerIds = new Set();
  for (const snap of snapshots) {
    if (snap?.players) {
      for (const p of snap.players) allPlayerIds.add(p.id);
    }
  }

  // Read player files with concurrency limit
  const playerFileResults = await readFilesInParallel(
    [...allPlayerIds].map((id) => `players/${id}.json`),
    15,
  );

  const playerFiles = new Map();
  const idArray = [...allPlayerIds];
  for (let i = 0; i < playerFileResults.length; i++) {
    if (playerFileResults[i]) playerFiles.set(idArray[i], playerFileResults[i]);
  }

  // Build per-date player maps from snapshots: date -> Map(playerId -> {power, alliance, name})
  const snapshotData = new Map();
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const snap = snapshots[i];
    const playersById = new Map();
    if (snap?.players) {
      for (const p of snap.players) {
        playersById.set(p.id, {
          power: Number(String(p.stats?.Power).replace(/,/g, '')) || null,
          alliance: p.allianceId || null,
          name: p.name,
        });
      }
    }
    snapshotData.set(date, playersById);
  }

  const latestSnapPlayers = snapshotData.get(latestDate);
  if (!latestSnapPlayers || !latestSnapPlayers.size) return null;

  const baselineSnapPlayers = snapshotData.get(baselineDate);

  // Build player entries
  const players = [];
  for (const [playerId, snapPlayer] of latestSnapPlayers) {
    const file = playerFiles.get(playerId);
    if (!file) continue;

    // Gather metrics for each date in the window
    const observations = dates.map((date, index) => {
      const m = file.metrics?.[date] || {};
      const snapPlayers = snapshotData.get(date);
      const snapEntry = snapPlayers?.get(playerId);

      return {
        index,
        date,
        values: {
          kills: m['Units Killed'] ?? null,
          deaths: m['Units Dead'] ?? null,
          healing: m['Units Healed'] ?? null,
          merits: m['Merits'] ?? null,
        },
        power: snapEntry?.power ?? m['Current Power'] ?? null,
      };
    }).filter((item) =>
      Object.values(item.values).some((value) => value !== null) || item.power !== null,
    );

    if (!observations.length) continue;

    const first = observations[0] || null;
    const metricObservations = observations.filter((item) =>
      Object.values(item.values).some((value) => value !== null),
    );
    const firstMetric = metricObservations[0] || null;
    const lastMetric = metricObservations[metricObservations.length - 1] || null;
    const current = lastMetric?.values || {};
    const previousValues = firstMetric?.values || {};

    const powerChange =
      first?.power === null || first?.power === undefined || snapPlayer.power === null
        ? null
        : snapPlayer.power - first.power;

    const changes = Object.fromEntries(
      Object.keys(current).map((key) => [
        key,
        current[key] !== null && previousValues[key] !== null
          ? current[key] - previousValues[key]
          : null,
      ]),
    );

    const activeObservations = observations.slice(1).filter((observation, index) => {
      const before = observations[index].values;
      return ['kills', 'merits', 'healing'].some(
        (key) =>
          before[key] !== null &&
          observation.values[key] !== null &&
          observation.values[key] > before[key],
      ) || (observation.power !== null &&
        before.power !== null &&
        observation.power > before.power);
    }).length;

    const activity =
      activeObservations >= 6
        ? 'Highly Active'
        : activeObservations >= 4
          ? 'Active'
          : activeObservations >= 1
            ? 'Low Activity'
            : 'Dormant';

    const status =
      activity === 'Highly Active'
        ? 'Core Fighter'
        : activity === 'Active'
          ? 'Support'
          : activity === 'Dormant'
            ? 'Dormant'
            : 'Monitor';

    const lastMetrics = lastMetric || {};
    const rowMetrics = {
      score: lastMetrics['Highest RoW Score'] ?? null,
      wins: lastMetrics['RoW Wins'] ?? null,
      matches: lastMetrics['RoW Matches Played'] ?? null,
    };

    const tocMetrics = {
      wins: lastMetrics['ToC Wins'] ?? null,
      battles: lastMetrics['ToC Battles'] ?? null,
      winRate: lastMetrics['ToC Winrate'] ?? null,
    };

    players.push({
      id: playerId,
      name: snapPlayer.name,
      power: compactNumber(snapPlayer.power),
      powerValue: snapPlayer.power ?? 0,
      activity,
      status,
      powerChange,
      changes,
      activityDays: activeObservations,
      kills: current.kills,
      merits: current.merits,
      healing: current.healing,
      deaths: current.deaths,
      alliance: snapPlayer.alliance || 'Not In An Alliance',
      row:
        rowMetrics.score !== null ||
        rowMetrics.wins !== null ||
        rowMetrics.matches !== null
          ? rowMetrics
          : undefined,
      toc:
        tocMetrics.wins !== null ||
        tocMetrics.battles !== null ||
        tocMetrics.winRate !== null
          ? tocMetrics
          : undefined,
    });
  }

  // Aggregations
  const highPowerLowActivity = players.filter(
    (player) => player.powerValue >= 25000000 && player.activity === 'Low Activity',
  ).length;
  const lowActivity = players.filter((player) => player.activity === 'Low Activity').length;
  const highActivity = players.filter(
    (player) => player.activity === 'Highly Active' || player.activity === 'Active',
  ).length;
  const kingdomPower = players.reduce((sum, player) => sum + (player.powerValue || 0), 0);

  // Previous power from baseline snapshot
  let previousPower = 0;
  if (baselineSnapPlayers) {
    for (const entry of baselineSnapPlayers.values()) {
      if (entry.power) previousPower += entry.power;
    }
  }

  const sumChange = (key) => players.reduce((sum, player) => sum + (player.changes[key] || 0), 0);
  const recentChanges = {
    power: players.reduce((sum, player) => sum + (player.powerChange || 0), 0),
    kills: sumChange('kills'),
    deaths: sumChange('deaths'),
    healing: sumChange('healing'),
    merits: sumChange('merits'),
  };

  // Activity timeline: per date, count players who progressed vs previous date
  const activityTimeline = dates.map((date, index) => {
    if (index === 0) {
      return { date, activePlayers: 0 };
    }
    const previousDate = dates[index - 1];
    let activePlayers = 0;
    for (const [, file] of playerFiles) {
      const currentM = file.metrics?.[date] || {};
      const previousM = file.metrics?.[previousDate] || {};
      const currentPower = currentM['Current Power'] ?? null;
      const previousPowerVal = previousM['Current Power'] ?? null;

      const progressed = ['Units Killed', 'Merits', 'Units Healed'].some((label) => {
        const current = currentM[label];
        const previous = previousM[label];
        return current !== null && previous !== null && current > previous;
      });

      if (
        progressed ||
        (currentPower !== null &&
          previousPowerVal !== null &&
          currentPower > previousPowerVal)
      ) {
        activePlayers += 1;
      }
    }
    return { date, activePlayers };
  });

  return {
    server: number,
    snapshotDate: latestDate,
    periodStart: baselineDate,
    periodEnd: latestDate,
    snapshotCount: dates.length,
    kingdom: {
      power: compactNumber(kingdomPower),
      powerChange:
        previousPower > 0
          ? `${(((kingdomPower - previousPower) / previousPower) * 100).toFixed(1)}%`
          : '—',
      lords: players.length,
      lordChange: baselineSnapPlayers
        ? players.length - baselineSnapPlayers.size
        : null,
      activity: highActivity ? 'High' : 'Low',
    },
    activityCounts: {
      active: players.filter(
        (player) => player.activity === 'Active' || player.activity === 'Highly Active',
      ).length,
      low: lowActivity,
      dormant: players.filter((player) => player.activity === 'Dormant').length,
    },
    recentChanges,
    activityTimeline,
    biggestKillGrowth: [...players]
      .filter((player) => player.changes.kills !== null)
      .sort((a, b) => b.changes.kills - a.changes.kills)
      .slice(0, 5),
    attention: [
      highPowerLowActivity
        ? `${highPowerLowActivity} high-power players have shown very low recent activity`
        : 'No high-power inactivity threshold has been triggered',
      `${lowActivity} players have no measurable progression in the latest scan`,
      dates.length === 1
        ? 'A second snapshot this week is required for change detection'
        : `Changes are aggregated from ${dates.length} snapshot${dates.length === 1 ? '' : 's'} this week`,
      `${highActivity} players showed measurable combat or merit growth`,
    ],
    readiness: {
      ready: players.filter(
        (player) => player.activity === 'Highly Active' || player.activity === 'Active',
      ).length,
      support: players.filter((player) => player.status === 'Support').length,
      lowActivity,
      dormant: players.filter((player) => player.activity === 'Dormant').length,
    },
    players: players.sort((a, b) => b.powerValue - a.powerValue),
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
