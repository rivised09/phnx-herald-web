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
  // callofstats stores "no alliance" as null, DragonStats as the bucket's
  // name - both mean unaffiliated, and both have to count here.
  const members = (players || []).filter(
    (player) => !player.allianceId || player.allianceId === UNAFFILIATED.name,
  );
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
export async function getStoredRoster({ date = null, avatars = true } = {}) {
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
  // latest non-null avatar from each player's own history file. `avatars: false`
  // skips that pass entirely - it reads one full history file per player
  // (~86MB for a 304-lord server), which callers that only need names, power
  // and alliances (the leadership Alliances tab and search) never display.
  const avatarById = avatars ? await loadAvatars(body.players) : new Map();

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
 * Albums for a specific date.
 *
 * A date with its own gallery always wins. When the date has none - typically a
 * DragonStats-only day, which carries no album images - the nearest *earlier*
 * date that does have albums is borrowed. Galleries are never taken from a
 * later date: a snapshot must not show images captured after the day it is
 * pinned to. Only that one date's images are used, so likes and captions stay
 * consistent with a single capture.
 */
function albumsForDate(file, wanted) {
  const own = file.byDate?.[wanted]?.albums;
  if (Array.isArray(own) && own.length) return own.slice(0, 8);

  let nearest = null;
  for (const date of file.dates || []) {
    if (date >= wanted) continue;
    const albums = file.byDate?.[date]?.albums;
    if (!Array.isArray(albums) || !albums.length) continue;
    // Dates are ISO days, so the largest earlier date is the nearest one.
    if (!nearest || date > nearest.date) nearest = { date, albums };
  }
  return nearest ? nearest.albums.slice(0, 8) : [];
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
    .filter((player) => !player.allianceId || player.allianceId === UNAFFILIATED.name)
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
        // One retry: a slow bucket answer must not silently drop a player
        // from every total on the page (304 lords rendering as 301 is exactly
        // what an unretried timeout looks like).
        try {
          await new Promise((resolve) => setTimeout(resolve, 750));
          results[i] = await readJson(urls[i]);
        } catch {
          results[i] = null;
        }
      }
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * The aggregates of a window, computed from the per-player rows alone.
 * Shared by the full read and the pre-aggregated summary path, so the two
 * payloads the UI can receive can never drift apart.
 */
function summarize(players) {
  const lowActivity = players.filter((player) => player.activity === 'Low Activity').length;
  const highActivity = players.filter(
    (player) => player.activity === 'Highly Active' || player.activity === 'Active',
  ).length;
  const dormant = players.filter((player) => player.activity === 'Dormant').length;
  const coreFighters = players.filter((player) => player.activity === 'Highly Active').length;
  const support = players.filter((player) => player.status === 'Support').length;
  const monitor = players.filter((player) => player.status === 'Monitor').length;
  const highPowerLowActivity = players.filter(
    (player) => player.powerValue >= 25000000 && player.activity === 'Low Activity',
  ).length;
  const kingdomPower = players.reduce((sum, player) => sum + (player.powerValue || 0), 0);

  /**
   * A change is null when there is nothing to compare, never 0: showing 0 for
   * "no data" is what made every leader's table read flat. Sums skip nulls and
   * stay null when no player has data at all.
   */
  const sumChange = (key) => {
    const values = players
      .map((player) => player.changes?.[key])
      .filter((value) => value !== null && value !== undefined);
    return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
  };
  const powerChanges = players
    .map((player) => player.powerChange)
    .filter((value) => value !== null && value !== undefined);
  const recentChanges = {
    power: powerChanges.length ? powerChanges.reduce((sum, value) => sum + value, 0) : null,
    kills: sumChange('kills'),
    deaths: sumChange('deaths'),
    healing: sumChange('healing'),
    merits: sumChange('merits'),
  };

  const biggestKillGrowth = [...players]
    .filter((player) => player.changes?.kills !== null && player.changes?.kills !== undefined)
    .sort((a, b) => b.changes.kills - a.changes.kills)
    .slice(0, 5);

  return {
    kingdomPower,
    lowActivity,
    highActivity,
    dormant,
    coreFighters,
    support,
    monitor,
    highPowerLowActivity,
    recentChanges,
    biggestKillGrowth,
  };
}

/**
 * A window summary - either loaded from `leadership/<date>.json` (published
 * by the bot next to the snapshots it summarises) or built in memory by the
 * full read - into the payload `LeadershipClient` renders. This is the single
 * place the final shape is decided, which is what keeps the fast path and
 * the fallback identical.
 */
function assembleLeadership({ summary, index, wanted, number }) {
  const players = summary.players
    .map((player) => ({ ...player, power: compactNumber(player.powerFull ?? null) }))
    .sort((a, b) => (b.powerValue || 0) - (a.powerValue || 0));
  const stats = summarize(players);
  const health = summary.health || {
    lastSnapshot: summary.snapshotDate,
    lastCrawledAt: null,
    count: 0,
    total: 0,
    gaps: [],
    playersWithoutFile: 0,
  };
  const baseline = summary.baseline || { known: false };
  const powerChangeValue =
    baseline.known && baseline.power > 0
      ? ((stats.kingdomPower - baseline.power) / baseline.power) * 100
      : null;

  return {
    server: number,
    snapshotDate: summary.snapshotDate,
    periodStart: summary.periodStart,
    periodEnd: summary.periodEnd,
    snapshotCount: health.count,
    // The date picker lists every stored snapshot, exactly like the public
    // home page's picker; `requestedDate` is the pinned end date (null = the
    // newest window) and `isLatest` tells the UI whether to badge it.
    availableDates: index.dates,
    requestedDate: wanted,
    isLatest: !wanted || wanted === index.dates[0],
    snapshotHealth: health,
    kingdom: {
      power: compactNumber(stats.kingdomPower),
      powerFull: stats.kingdomPower,
      powerChange: powerChangeValue === null ? '—' : `${powerChangeValue.toFixed(1)}%`,
      powerChangeValue,
      baselinePower: baseline.known ? baseline.power : null,
      baselineDate: baseline.known ? baseline.date : null,
      lords: players.length,
      lordChange:
        baseline.playerCount === null || baseline.playerCount === undefined
          ? null
          : players.length - baseline.playerCount,
      activity: stats.highActivity ? 'High' : 'Low',
    },
    activityCounts: {
      active: stats.highActivity,
      low: stats.lowActivity,
      dormant: stats.dormant,
      total: players.length,
    },
    recentChanges: stats.recentChanges,
    activityTimeline: summary.timeline || [],
    biggestKillGrowth: stats.biggestKillGrowth,
    attention: [
      stats.highPowerLowActivity
        ? `${stats.highPowerLowActivity} high-power players have shown very low recent activity`
        : 'No high-power inactivity threshold has been triggered',
      `${stats.lowActivity} players have no measurable progression in the latest scan`,
      health.count === 1
        ? 'A second snapshot this week is required for change detection'
        : `Changes are aggregated from ${health.count} of ${health.total} days this week`,
      `${stats.highActivity} players showed measurable combat or merit growth`,
    ],
    /**
     * Activity buckets are mutually exclusive and sum to the lord total;
     * `support` / `coreFighters` / `monitor` are *roles* derived from the
     * same activity and are reported separately so nothing is counted twice.
     */
    readiness: {
      total: players.length,
      active: stats.highActivity,
      lowActivity: stats.lowActivity,
      dormant: stats.dormant,
      coreFighters: stats.coreFighters,
      support: stats.support,
      monitor: stats.monitor,
    },
    players,
  };
}

/**
 * R2-native replacement for the Postgres `getLeadershipDashboard`.
 *
 * Reads snapshot files for the last 7 days and player files to build the
 * same leadership dashboard shape the `LeadershipClient` expects, so the
 * leadership page works without a database.
 *
 * `endDate` pins the window to the 7 days ending on that snapshot date (the
 * same control the public home page has), so a leader can inspect a past
 * week instead of being locked to the current one.
 */
export async function getLeadershipDashboard({ endDate = null } = {}) {
  if (!filesEnabled()) return null;

  const number = Number(serverId());

  // Read index to get all stored dates
  const index = await readJson('index.json');
  if (!index || !Array.isArray(index.dates) || !index.dates.length) return null;

  const wanted =
    endDate && DATE_PARAM.test(String(endDate)) && index.dates.includes(String(endDate))
      ? String(endDate)
      : null;
  // The window ends at the pinned date, or at the newest stored snapshot, and
  // spans seven days back from there - eight calendar days, seven intervals.
  const end = wanted || index.dates[0];

  /**
   * Fast path: the bot publishes a pre-aggregated summary of each window
   * next to the snapshots it summarises (`leadership/<end>.json`). It holds
   * exactly what the full read below assembles by downloading every player's
   * history file - 304 lords x ~291KB, ~86MB, which was the entire reason
   * this page took 8-12 seconds to render. The summary is one ~200KB file.
   *
   * A missing summary (dates scraped before this existed) is not an error:
   * the full read below still produces the same payload, and `assemble` is
   * shared by both paths so they can never drift apart.
   */
  const summary = await readJson(`leadership/${end}.json`).catch(() => null);
  if (summary && summary.version === 1 && Array.isArray(summary.players)) {
    return assembleLeadership({ summary, index, wanted, number });
  }

  const windowStartIso = new Date(
    new Date(`${end}T00:00:00.000Z`).getTime() - 7 * 86400000,
  )
    .toISOString()
    .slice(0, 10);

  // Every calendar day of the window, not just the stored ones: a day nobody
  // captured is a gap the chart has to show, and a silent skip reads as zero
  // activity (the Aug 2-12 and Oct 16-24 holes in the history).
  const windowDates = [];
  {
    let cursor = new Date(`${windowStartIso}T00:00:00.000Z`);
    const last = new Date(`${end}T00:00:00.000Z`);
    while (cursor <= last) {
      windowDates.push(cursor.toISOString().slice(0, 10));
      cursor = new Date(cursor.getTime() + 86400000);
    }
  }
  const storedDates = windowDates.filter((day) => index.dates.includes(day));

  if (!storedDates.length) return null;

  // Read snapshot files for each stored day to get players with power. One
  // slow or missing file must not take the whole page down: it becomes a gap
  // in the window (handled below), which is what the timeline shows anyway.
  const storedSnapshots = await Promise.all(
    storedDates.map((date) => readJson(`snapshots/${date}.json`).catch(() => null)),
  );
  const snapshotByDate = new Map(storedDates.map((date, i) => [date, storedSnapshots[i]]));

  /**
   * Whether a day can be trusted.
   *
   * A DragonStats snapshot whose `crawledAt` falls on a different day than the
   * date it is filed under was published from another day's scan (the `--date`
   * backfill bug): its numbers are a copy, so comparing across it would
   * produce a fake jump one way and a fake 0 the other. Only DragonStats days
   * are checked - callofstats history was legitimately scraped days or weeks
   * after the fact, so a late `crawledAt` is normal there. Untrusted days stay
   * in the window (the gap is real information) but are excluded from every
   * calculation and plotted as a break instead of a value.
   */
  const meta = windowDates.map((date) => {
    const snap = snapshotByDate.get(date);
    if (!snap) return { date, valid: false, reason: 'missing', crawledAt: null };
    const fromDragon = String(snap.server?.url || '').includes('dragonstats');
    const crawled = String(snap.crawledAt || '').slice(0, 10);
    if (fromDragon && crawled && crawled !== date) {
      return { date, valid: false, reason: 'wrong-scan', crawledAt: snap.crawledAt || null };
    }
    return { date, valid: true, reason: null, crawledAt: snap.crawledAt || null };
  });
  const validDates = meta.filter((entry) => entry.valid).map((entry) => entry.date);
  if (!validDates.length) return null;

  const latestDate = validDates[validDates.length - 1];
  const baselineDate = validDates[0];
  const gaps = meta.filter((entry) => !entry.valid);

  // Collect all unique player IDs across snapshots in the window
  const allPlayerIds = new Set();
  for (const snap of storedSnapshots) {
    if (snap?.players) {
      for (const p of snap.players) allPlayerIds.add(p.id);
    }
  }

  // Read player files with concurrency limit
  const playerFileResults = await readFilesInParallel(
    [...allPlayerIds].map((id) => `players/${id}.json`),
    40,
  );

  const playerFiles = new Map();
  const idArray = [...allPlayerIds];
  for (let i = 0; i < playerFileResults.length; i++) {
    if (playerFileResults[i]) playerFiles.set(idArray[i], playerFileResults[i]);
  }

  // Build per-date player maps from snapshots: date -> Map(playerId -> {power, alliance, name})
  const snapshotData = new Map();
  for (let i = 0; i < storedDates.length; i++) {
    const date = storedDates[i];
    const snap = storedSnapshots[i];
    const playersById = new Map();
    if (snap?.players) {
      for (const p of snap.players) {
        playersById.set(p.id, {
          power: Number(String(p.stats?.Power).replace(/,/g, '')) || null,
          alliance: p.allianceId || null,
          name: p.name,
          merits: p.merits || null,
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
  let playersWithoutFile = 0;
  for (const [playerId, snapPlayer] of latestSnapPlayers) {
    const file = playerFiles.get(playerId);
    if (!file) {
      playersWithoutFile += 1;
      continue;
    }

    // Gather metrics for each valid date in the window
    const observations = validDates.map((date, index) => {
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

    // The observation rows only carry the four change counters; the RoW/ToC
    // metrics live in the full metric set of the same day, so read them from
    // there (reading them off the observation made `row`/`toc` always null).
    const lastMetrics = lastMetric ? (file.metrics?.[lastMetric.date] || lastMetric.values) : {};
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
      powerFull: snapPlayer.power ?? null,
      powerValue: snapPlayer.power ?? 0,
      // Per-troop merits for the merit filter/sort (Infantry / Cavalry /
      // Marksman / Mage), straight from that day's scan. This key name is
      // also the home roster's shape - an earlier version of this object
      // listed a `merits` metric after it, and the duplicate key silently
      // overwrote the per-troop object with a number.
      merits: snapPlayer.merits || null,
      activity,
      status,
      powerChange,
      changes,
      activityDays: activeObservations,
      // One source of truth for the current alliance: the player's own entry
      // for the window's end date - the exact field the profile page reads -
      // with the snapshot as the fallback. List, header and detail can no
      // longer disagree because they read different files.
      alliance:
        (typeof file.byDate?.[latestDate]?.alliance === 'string' &&
          file.byDate[latestDate].alliance.trim()) ||
        snapPlayer.alliance ||
        'Not In An Alliance',
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

  /**
   * Baseline power over the same cohort as the current total, so the % change
   * compares like with like (a lord who arrived mid-window is on neither side)
   * and can be quoted with its value and date next to it. The bot's summary
   * builder computes the same numbers when it writes `leadership/<date>.json`.
   */
  let previousPower = 0;
  let previousPowerKnown = false;
  if (baselineSnapPlayers) {
    for (const player of players) {
      const entry = baselineSnapPlayers.get(player.id);
      if (entry?.power) {
        previousPower += entry.power;
        previousPowerKnown = true;
      }
    }
  }

  /**
   * Activity timeline: per date, players who progressed since the previous
   * date. A date with no snapshot, or one published from another day's scan,
   * is a gap: `activePlayers` is null so the chart breaks there instead of
   * drawing a 0 that never happened. The first date has nothing to compare
   * against and is null for the same reason.
   */
  const activityTimeline = meta.map((entry, index) => {
    if (!entry.valid) {
      return { date: entry.date, activePlayers: null, gap: true, reason: entry.reason };
    }
    if (index === 0) {
      return { date: entry.date, activePlayers: null, gap: false, reason: 'first' };
    }
    const previous = meta[index - 1];
    if (!previous.valid) {
      // No trustworthy day to compare against: a multi-day jump counted as
      // one day would be as misleading as a 0.
      return { date: entry.date, activePlayers: null, gap: true, reason: 'after-gap' };
    }
    const previousDate = previous.date;
    let activePlayers = 0;
    for (const [, file] of playerFiles) {
      const currentM = file.metrics?.[entry.date] || {};
      const previousM = file.metrics?.[previousDate] || {};
      const currentPower = currentM['Current Power'] ?? null;
      const previousPowerVal = previousM['Current Power'] ?? null;

      const progressed = ['Units Killed', 'Merits', 'Units Healed'].some((label) => {
        const current = currentM[label];
        const before = previousM[label];
        return current !== null && before !== null && current > before;
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
    return { date: entry.date, activePlayers, gap: false, reason: null };
  });

  const latestMeta = meta.find((entry) => entry.date === latestDate);

  // The same shape the bot writes to `leadership/<date>.json`: only the
  // per-window facts. `assembleLeadership` turns either source into the
  // payload, which is what keeps the fast path and this fallback identical.
  const windowSummary = {
    version: 1,
    endDate: end,
    windowDates,
    snapshotDate: latestDate,
    periodStart: windowDates[0],
    periodEnd: windowDates[windowDates.length - 1],
    players,
    timeline: activityTimeline,
    health: {
      lastSnapshot: latestDate,
      lastCrawledAt: latestMeta?.crawledAt || null,
      count: validDates.length,
      total: windowDates.length,
      gaps: gaps.map((entry) => ({ date: entry.date, reason: entry.reason })),
      // A lord in the snapshot whose history file could not be read is left
      // out of every bucket; when that happens the page says so instead of
      // quietly showing a smaller kingdom.
      playersWithoutFile,
    },
    baseline: {
      known: previousPowerKnown,
      power: previousPower,
      date: previousPowerKnown ? baselineDate : null,
      playerCount: baselineSnapPlayers ? baselineSnapPlayers.size : null,
    },
  };

  return assembleLeadership({ summary: windowSummary, index, wanted, number });
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
