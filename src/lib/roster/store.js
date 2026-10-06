import { prisma } from '../db';
import { serverId, sourceUrl } from './source';
import { buildInsights } from './insights';

/**
 * Read path for the roster: the database only.
 *
 * The scraper is the bot's job and stays there - it runs on a schedule, writes
 * snapshots to Supabase, and is never between a visitor and their page. This
 * module is the same read path the bot used to serve over HTTP, moved here so
 * that rendering a roster page is one process talking to one database instead
 * of a request crossing into another service first.
 *
 * STATUS VALUES:
 *   ok             - a snapshot was found and served
 *   awaiting_sync  - nothing has been ingested yet (cold start)
 *   not_configured - the source URL could not be resolved
 */

const MAX_ROWS = 500;

/**
 * Source figures are rendered with thousands separators ("773,371,680") and
 * the web prints them verbatim (`PlayerRoster` does `String(value)`), so power
 * is converted back into that display form here rather than exposing a raw
 * BigInt, which would also break JSON serialisation.
 */
function formatStat(value) {
  if (value === null || value === undefined) return null;
  try {
    return BigInt(value).toLocaleString('en-US');
  } catch {
    return String(value);
  }
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

/**
 * The source hands out one shared "no picture yet" asset. Storing it is
 * harmless, but serving it would show the same face for every player, so the
 * reads here skip it and fall through to the player's real history.
 */
const PLACEHOLDER_AVATAR = /codweb_all_three_avatar|\/static\/images\//;

function usableAvatar(value) {
  return value && !PLACEHOLDER_AVATAR.test(value) ? value : null;
}

async function historicalAvatarMap(serverIdValue, lordIds) {
  if (!lordIds.length) return new Map();
  const rows = await prisma.lordSnapshot.findMany({
    where: {
      lordId: { in: lordIds },
      avatarUrl: { not: null },
      snapshot: { serverId: serverIdValue, status: 'COMPLETE' },
    },
    select: { lordId: true, avatarUrl: true },
    orderBy: { snapshot: { snapshotDate: 'desc' } },
  });
  const result = new Map();
  for (const row of rows) {
    const value = usableAvatar(row.avatarUrl);
    if (value && !result.has(row.lordId)) result.set(row.lordId, value);
  }
  return result;
}

function compactNumber(value) {
  if (value === null || value === undefined) return '—';
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return Math.round(value).toLocaleString();
}

export async function getLeadershipDashboard() {
  const number = Number(serverId());
  const server = await prisma.sourceServer.findUnique({ where: { serverNumber: number } });
  if (!server) return null;

  const today = new Date();
  const windowStart = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() - 7,
  ));
  const snapshots = await prisma.rosterSnapshot.findMany({
    where: { serverId: server.id, status: 'COMPLETE', snapshotDate: { gte: windowStart } },
    orderBy: { snapshotDate: 'asc' },
    select: { id: true, snapshotDate: true, lordCount: true },
  });
  const latest = snapshots[snapshots.length - 1];
  if (!latest) return null;
  const baseline = snapshots[0];

  const [currentRows, snapshotRows] = await Promise.all([
    prisma.lordSnapshot.findMany({
      where: { snapshotId: latest.id },
      include: { lord: true, alliance: true },
      orderBy: { rank: 'asc' },
    }),
    prisma.lordSnapshot.findMany({
      where: { snapshotId: { in: snapshots.map((item) => item.id) } },
      select: { snapshotId: true, lordId: true, power: true },
    }),
  ]);
  const lordIds = currentRows.map((row) => row.lordId);
  const metricRows = await prisma.snapshotMetric.findMany({
    where: {
      snapshotId: { in: snapshots.map((item) => item.id) },
      subjectType: 'LORD',
      subjectId: { in: lordIds },
    },
    select: { snapshotId: true, subjectId: true, label: true, section: true, valueNumber: true },
  });
  const baselineRows = snapshotRows.filter((row) => row.snapshotId === baseline.id);
  const rowsByLord = new Map();
  snapshotRows.forEach((row) => {
    if (!rowsByLord.has(row.lordId)) rowsByLord.set(row.lordId, []);
    rowsByLord.get(row.lordId).push(row);
  });
  const metricsByLord = new Map();
  metricRows.forEach((row) => {
    if (!metricsByLord.has(row.subjectId)) metricsByLord.set(row.subjectId, new Map());
    const bySnapshot = metricsByLord.get(row.subjectId);
    if (!bySnapshot.has(row.snapshotId)) bySnapshot.set(row.snapshotId, []);
    bySnapshot.get(row.snapshotId).push(row);
  });

  function metricAt(rows, label) {
    const matches = rows.filter((item) => item.label === label);
    const preferred = matches.find((item) => item.section === 'War Stats') || matches[0];
    return preferred?.valueNumber === null || preferred?.valueNumber === undefined
      ? null
      : Number(preferred.valueNumber);
  }

  function metricMatching(rows, patterns) {
    const match = rows.find((item) => patterns.some((pattern) => pattern.test(item.label)));
    return match?.valueNumber === null || match?.valueNumber === undefined
      ? null
      : Number(match.valueNumber);
  }

  const players = currentRows.map((row) => {
    const history = metricsByLord.get(row.lordId) || new Map();
    const latestDetail = history.get(latest.id) || snapshots
      .slice()
      .reverse()
      .map((snapshot) => history.get(snapshot.id) || [])
      .find((values) => values.length) || [];
    const rowMetrics = latestDetail.filter((item) => /root(?:s)? of war|row/i.test(item.section || ''));
    const competitiveMetrics = latestDetail.filter((item) => /tournament of champion|toc/i.test(item.section || ''));
    const rowScore = metricMatching(rowMetrics, [/^(?:row|roots? of war)?\s*(?:score|highest score)$/i, /highest.*score/i]);
    const rowWins = metricMatching(rowMetrics, [/wins?/i, /victories/i]);
    const rowMatches = metricMatching(rowMetrics, [/matches?/i, /games?/i, /battles?/i]);
    const competitiveWins = metricMatching(competitiveMetrics, [/wins?/i, /victories/i]);
    const competitiveBattles = metricMatching(competitiveMetrics, [/battles?/i, /matches?/i, /games?/i]);
    const competitiveWinRate = metricMatching(competitiveMetrics, [/win\s*rate/i, /victory\s*rate/i]);
    const observations = snapshots
      .map((snapshot, index) => {
        const values = history.get(snapshot.id) || [];
        const powerRow = (rowsByLord.get(row.lordId) || []).find(
          (item) => item.snapshotId === snapshot.id,
        );
        return {
          index,
          values: {
            kills: metricAt(values, 'Units Killed'),
            deaths: metricAt(values, 'Units Dead'),
            healing: metricAt(values, 'Units Healed'),
            merits: metricAt(values, 'Merits'),
          },
          power: powerRow ? Number(powerRow.power) : null,
        };
      })
      .filter((item) => Object.values(item.values).some((value) => value !== null) || item.power !== null);
    const first = observations[0] || null;
    const metricObservations = observations.filter((item) =>
      Object.values(item.values).some((value) => value !== null),
    );
    const firstMetric = metricObservations[0] || null;
    const lastMetric = metricObservations[metricObservations.length - 1] || null;
    const current = lastMetric?.values || {};
    const previousValues = firstMetric?.values || {};
    const powerChange = first?.power === null || first?.power === undefined
      ? null
      : Number(row.power) - first.power;
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
      ) || (observations[index].power !== null &&
        observation.power !== null &&
        observation.power > observations[index].power);
    }).length;
    const activity = activeObservations >= 6
      ? 'Highly Active'
      : activeObservations >= 4
        ? 'Active'
        : activeObservations >= 1
          ? 'Low Activity'
          : 'Dormant';
    const status = activity === 'Highly Active' ? 'Core Fighter' : activity === 'Active' ? 'Support' : activity === 'Dormant' ? 'Dormant' : 'Monitor';
    return {
      id: row.lord.sourceId.toString(),
      name: row.lord.name,
      power: compactNumber(Number(row.power)),
      powerValue: Number(row.power),
      activity,
      status,
      powerChange,
      changes,
      activityDays: activeObservations,
      kills: current.kills,
      merits: current.merits,
      healing: current.healing,
      deaths: current.deaths,
      alliance: row.alliance?.name || 'Unaffiliated',
      row: rowMetrics.length ? {
        score: rowScore,
        wins: rowWins,
        matches: rowMatches,
      } : undefined,
      toc: competitiveMetrics.length ? {
        wins: competitiveWins,
        battles: competitiveBattles,
        winRate: competitiveWinRate,
      } : undefined,
    };
  });

  const highPowerLowActivity = players.filter(
    (player) => player.powerValue >= 25000000 && player.activity === 'Low Activity',
  ).length;
  const lowActivity = players.filter((player) => player.activity === 'Low Activity').length;
  const highActivity = players.filter((player) => player.activity === 'Highly Active' || player.activity === 'Active').length;
  const kingdomPower = currentRows.reduce((sum, row) => sum + Number(row.power), 0);
  const previousPower = baselineRows.reduce((sum, row) => sum + Number(row.power), 0);
  const sumChange = (key) => players.reduce((sum, player) => sum + (player.changes[key] || 0), 0);
  const recentChanges = {
    power: players.reduce((sum, player) => sum + (player.powerChange || 0), 0),
    kills: sumChange('kills'),
    deaths: sumChange('deaths'),
    healing: sumChange('healing'),
    merits: sumChange('merits'),
  };
  const activityTimeline = snapshots.map((snapshot, index) => {
    if (index === 0) {
      return { date: snapshot.snapshotDate.toISOString().slice(0, 10), activePlayers: 0 };
    }
    const previousSnapshot = snapshots[index - 1];
    let activePlayers = 0;
    currentRows.forEach((row) => {
      const history = metricsByLord.get(row.lordId) || new Map();
      const currentValues = history.get(snapshot.id) || [];
      const previousValues = history.get(previousSnapshot.id) || [];
      const currentPower = (rowsByLord.get(row.lordId) || []).find((item) => item.snapshotId === snapshot.id)?.power;
      const previousPower = (rowsByLord.get(row.lordId) || []).find((item) => item.snapshotId === previousSnapshot.id)?.power;
      const progressed = ['Units Killed', 'Merits', 'Units Healed'].some((label) => {
        const current = metricAt(currentValues, label);
        const previous = metricAt(previousValues, label);
        return current !== null && previous !== null && current > previous;
      });
      if (progressed || (currentPower !== null && currentPower !== undefined &&
        previousPower !== null && previousPower !== undefined &&
        Number(currentPower) > Number(previousPower))) {
        activePlayers += 1;
      }
    });
    return { date: snapshot.snapshotDate.toISOString().slice(0, 10), activePlayers };
  });

  return {
    server: number,
    snapshotDate: latest.snapshotDate.toISOString().slice(0, 10),
    periodStart: baseline.snapshotDate.toISOString().slice(0, 10),
    periodEnd: latest.snapshotDate.toISOString().slice(0, 10),
    snapshotCount: snapshots.length,
    kingdom: {
      power: compactNumber(kingdomPower),
      powerChange:
        previousPower > 0 ? `${(((kingdomPower - previousPower) / previousPower) * 100).toFixed(1)}%` : '—',
      lords: currentRows.length,
      lordChange: baseline.id === latest.id ? null : currentRows.length - baselineRows.length,
      activity: highActivity ? 'High' : 'Low',
    },
    activityCounts: {
      active: players.filter((player) => player.activity === 'Active' || player.activity === 'Highly Active').length,
      low: lowActivity,
      dormant: players.filter((player) => player.activity === 'Dormant').length,
    },
    recentChanges,
    activityTimeline,
    biggestKillGrowth: [...players].filter((player) => player.changes.kills !== null).sort((a, b) => b.changes.kills - a.changes.kills).slice(0, 5),
    attention: [
      highPowerLowActivity
        ? `${highPowerLowActivity} high-power players have shown very low recent activity`
        : 'No high-power inactivity threshold has been triggered',
      `${lowActivity} players have no measurable progression in the latest scan`,
      baseline.id === latest.id
        ? 'A second snapshot this week is required for change detection'
        : `Changes are aggregated from ${snapshots.length} snapshot${snapshots.length === 1 ? '' : 's'} this week`,
      `${highActivity} players showed measurable combat or merit growth`,
    ],
    readiness: {
      ready: players.filter((player) => player.activity === 'Highly Active' || player.activity === 'Active').length,
      support: players.filter((player) => player.status === 'Support').length,
      lowActivity,
      dormant: players.filter((player) => player.activity === 'Dormant').length,
    },
    players: players.sort((a, b) => b.powerValue - a.powerValue),
  };
}

export async function getStoredRoster() {
  let number;
  let url;
  try {
    number = Number(serverId());
    url = sourceUrl();
  } catch (err) {
    return failure('not_configured', err.message);
  }



  const server = await prisma.sourceServer.findUnique({ where: { serverNumber: number } });
  if (!server) {
    return failure(
      'awaiting_sync',
      'No snapshot has been ingested for this server yet. The first background sync will fill it in.',
    );
  }

  const snapshot = await prisma.rosterSnapshot.findFirst({
    // An unverified read may contain the source homepage shell rather than
    // roster data. Never let it replace the newest complete database snapshot
    // on the public page.
    where: { serverId: server.id, status: 'COMPLETE' },
    orderBy: { snapshotDate: 'desc' },
    include: {
      allianceRows: { include: { alliance: true } },
      lordRows: { include: { lord: true, alliance: true } },
    },
  });

  if (!snapshot) {
    return failure('awaiting_sync', `Server ${number} has no snapshots yet.`);
  }

  // Source order is already power-ranked; rank is assigned at ingest, so the
  // stored value is used as-is and power only decides the tie-break order.
  const allianceRows = [...snapshot.allianceRows].sort(
    (a, b) => (a.rank ?? 0) - (b.rank ?? 0),
  );
  const lordRows = [...snapshot.lordRows].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  const avatarByLord = await historicalAvatarMap(
    server.id,
    lordRows.slice(0, MAX_ROWS).map((row) => row.lordId),
  );

  const alliances = allianceRows.slice(0, MAX_ROWS).map((row) => {
    const stats = {};
    const power = formatStat(row.power);
    if (power) stats.Power = power;
    if (row.memberCount) stats.Members = String(row.memberCount);
    return {
      id: row.alliance.id,
      name: row.alliance.name,
      rank: row.rank,
      stats,
    };
  });

  const players = lordRows.slice(0, MAX_ROWS).map((row) => {
    const stats = {};
    if (row.rank) stats.Rank = String(row.rank);
    const power = formatStat(row.power);
    if (power) stats.Power = power;
    return {
      id: row.lord.sourceId.toString(),
      name: row.lord.name,
      index: row.rank,
      allianceId: row.alliance ? row.alliance.name : null,
      avatar: usableAvatar(row.avatarUrl) || avatarByLord.get(row.lordId) || null,
      stats,
    };
  });

  const notes = [];
  const staleDays = Math.floor(
    (Date.now() - new Date(snapshot.snapshotDate).getTime()) / 86400000,
  );
  if (staleDays > 2) {
    notes.push(
      `This is the snapshot from ${new Date(snapshot.snapshotDate).toISOString().slice(0, 10)}, ${staleDays} days old.`,
    );
  }

  return {
    status: alliances.length === 0 && players.length === 0 ? 'parse_empty' : 'ok',
    detail: notes.length ? notes.join(' ') : null,
    server: { id: String(number), url },
    alliances,
    players,
    crawledAt: new Date(snapshot.updatedAt).toISOString(),
    snapshot: {
      date: new Date(snapshot.snapshotDate).toISOString().slice(0, 10),
      ingestedAt: new Date(snapshot.createdAt).toISOString(),
      staleDays,
    },
    guild: null,
  };
}

/**
 * Detail metrics are only ever written for the players whose detail page the
 * background pass has actually read, so a miss here is normal and means "not
 * measured yet" - never zero.
 *
 * Returns three things rather than one: `Playstyle` holds percentiles that
 * reuse the word "Merits", while `War Stats` holds an absolute merit count, so
 * those two are kept apart or one would overwrite the other. `sections` is the
 * newest date's remaining blocks, grouped exactly as the source prints them -
 * the raw figures behind the interpreted insights, for the tabbed page.
 *
 * `snapshotDate` picks which date's blocks come back - the profile page reads
 * one snapshot at a time. Left unset, the newest date that has any is used.
 * `metrics` and `radar` always span every date either way: the interpreted
 * view is built from a series, and a single point is not a series.
 */
export async function loadPlayerMetrics(serverIdValue, lordId, { snapshotDate = null } = {}) {
  const rows = await prisma.snapshotMetric.findMany({
    where: {
      subjectType: 'LORD',
      subjectId: lordId,
      snapshot: { serverId: serverIdValue, status: 'COMPLETE' },
    },
    select: {
      section: true,
      label: true,
      valueNumber: true,
      valueText: true,
      snapshot: { select: { snapshotDate: true } },
    },
    orderBy: [{ snapshot: { snapshotDate: 'asc' } }, { section: 'asc' }, { label: 'asc' }],
  });

  const metrics = {};
  const radar = {};
  const byDate = new Map();
  let newestWithRows = null;
  for (const row of rows) {
    const value = row.valueNumber !== null ? row.valueNumber : row.valueText;
    if (value === null || value === undefined) continue;
    const date = row.snapshot.snapshotDate.toISOString().slice(0, 10);
    const playstyle = row.section === 'Playstyle';
    const bucket = playstyle ? radar : metrics;
    if (!bucket[date]) bucket[date] = {};
    bucket[date][row.label] = value;
    if (playstyle) continue;

    // The rendered string is what the tabs show: the number alone would turn
    // "54.49%" and "0.0%" into 54.49 and 0, and "21,520 Sec" into 21520.
    if (!byDate.has(date)) byDate.set(date, new Map());
    const bySection = byDate.get(date);
    if (!bySection.has(row.section)) bySection.set(row.section, []);
    bySection.get(row.section).push({ label: row.label, value: row.valueText });
    newestWithRows = date;
  }

  // Ascending order means the last date seen is the newest one.
  const wanted = snapshotDate || newestWithRows;
  const sections = wanted && byDate.has(wanted)
    ? [...byDate.get(wanted)].map(([section, entries]) => ({ section, rows: entries }))
    : [];

  return { metrics, radar, sections, sectionsDate: sections.length ? wanted : null };
}

/**
 * One date a player can be read at, or null when it is not a date.
 *
 * The profile's picker only offers dates that exist, but a bookmarked or
 * stale URL can ask for anything, and an unparsable one must not reach a query.
 */
function snapshotDateParam(value) {
  const iso = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

function isoDay(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function dayStart(iso) {
  return new Date(`${iso}T00:00:00.000Z`);
}

/**
 * The row backing one date, or the newest row when `iso` is null.
 *
 * Both reads are the same query apart from the date filter and the ordering,
 * and the profile issues them together rather than one after the other: the
 * picker always needs the full date list, and the body needs whichever date
 * ends up winning. Each round trip here is a network hop, so collapsing them
 * is the cheapest latency this page can buy.
 */
function lordRowFor(lordId, serverIdValue, iso = null) {
  const snapshot = { serverId: serverIdValue, status: 'COMPLETE' };
  if (iso) snapshot.snapshotDate = dayStart(iso);

  return prisma.lordSnapshot.findFirst({
    where: { lordId, snapshot },
    ...(iso ? {} : { orderBy: { snapshot: { snapshotDate: 'desc' } } }),
    include: { lord: true, alliance: true, achievements: true, snapshot: true },
  });
}

/** Keeps only the dates that are at or before `iso`, so nothing later shows. */
function upTo(byDate, iso) {
  const out = {};
  for (const [date, values] of Object.entries(byDate || {})) {
    if (date <= iso) out[date] = values;
  }
  return out;
}

/**
 * A player's profile at one point in time.
 *
 * `date` selects the snapshot to read; unset means the newest one, which is
 * what the page shows before anyone touches the picker. Everything the page
 * derives from a series - the chart, the insights, the raw stat blocks - is
 * cut at the selected date as well, so an older snapshot reads as that snapshot
 * rather than as today's numbers with an old date next to them.
 *
 * The dates the picker offers come from the same player's own rows, newest
 * first; a player who only appears on one date gets one option and the web UI
 * hides the control.
 *
 * The queries are grouped into the fewest stages the result shape allows -
 * three instead of the seven it would take written top to bottom - because the
 * whole route is blocked on this function and every stage is a round trip.
 */
export async function getPlayerDetail(sourceId, { date = null } = {}) {
  const serverNumber = Number(serverId());

  // The server row is only ever used for its id, so it is read through the
  // player instead of as a lookup of its own. An unknown server and an unknown
  // player both mean "no such profile" and answer identically.
  const lord = await prisma.lord.findFirst({
    where: { sourceId: BigInt(sourceId), server: { serverNumber } },
    select: { id: true, serverId: true },
  });
  if (!lord) return null;

  const requested = snapshotDateParam(date);
  const [dated, optimisticRow] = await Promise.all([
    prisma.lordSnapshot.findMany({
      where: { lordId: lord.id, snapshot: { serverId: lord.serverId, status: 'COMPLETE' } },
      select: { snapshot: { select: { snapshotDate: true } } },
      orderBy: { snapshot: { snapshotDate: 'desc' } },
    }),
    lordRowFor(lord.id, lord.serverId, requested),
  ]);

  const snapshotDates = [];
  for (const item of dated) {
    const iso = isoDay(item.snapshot.snapshotDate);
    if (snapshotDates[0] !== iso) snapshotDates.push(iso);
  }
  if (!snapshotDates.length) return null;

  // A date with no row for this player falls back to the newest one: the page
  // must still render rather than 404 because a link outlived the snapshot.
  const wanted = requested && snapshotDates.includes(requested) ? requested : snapshotDates[0];
  let row = optimisticRow;
  if (!row || isoDay(row.snapshot.snapshotDate) !== wanted) {
    row = await lordRowFor(lord.id, lord.serverId, wanted);
  }
  if (!row) return null;

  // Nothing below depends on anything else in this group, so they travel
  // together: the avatar history, the power/rank series and the metric rows
  // that feed the insights.
  const [avatarByLord, historyRows, nameHistory, otherServerRows, metricBuckets] =
    await Promise.all([
    historicalAvatarMap(lord.serverId, [row.lordId]),
    prisma.lordSnapshot.findMany({
      where: {
        lordId: row.lordId,
        snapshot: { serverId: lord.serverId, status: 'COMPLETE' },
      },
      select: {
        power: true,
        rank: true,
        snapshot: { select: { snapshotDate: true } },
      },
      orderBy: { snapshot: { snapshotDate: 'asc' } },
    }),
    prisma.lordNameHistory.findMany({
      where: { lordId: row.lordId },
      select: { name: true },
      orderBy: { firstSeen: 'asc' },
    }),
    prisma.lord.findMany({
      where: {
        sourceId: BigInt(sourceId),
        serverId: { not: lord.serverId },
      },
      select: {
        server: { select: { serverNumber: true } },
      },
      orderBy: { server: { serverNumber: 'asc' } },
    }),
    loadPlayerMetrics(lord.serverId, row.lordId, { snapshotDate: wanted }),
  ]);

  const history = historyRows
    .map((item) => ({
      date: item.snapshot.snapshotDate.toISOString().slice(0, 10),
      power: item.power === null ? null : Number(item.power),
      rank: item.rank || null,
    }))
    .filter((point) => point.date <= wanted);

  const { metrics: allMetrics, radar: allRadar, sections, sectionsDate } = metricBuckets;
  const metricsByDate = upTo(allMetrics, wanted);
  const radarByDate = upTo(allRadar, wanted);
  const insights = buildInsights({
    history,
    metricsByDate,
    radarByDate,
    serverNumber,
    name: row.lord.name,
  });

  return {
    id: row.lord.sourceId.toString(),
    name: row.lord.name,
    rank: row.rank,
    power: formatStat(row.power),
    avatar: usableAvatar(row.avatarUrl) || avatarByLord.get(row.lordId) || null,
    alliance: row.alliance ? { id: row.alliance.name, name: row.alliance.name } : null,
    snapshotDate: wanted,
    snapshotDates,
    requestedDate: requested,
    isLatest: wanted === snapshotDates[0],
    history,
    previousNames: nameHistory
      .map((item) => item.name)
      .filter((name) => name !== row.lord.name),
    otherServers: otherServerRows.map((item) => item.server.serverNumber),
    sections,
    sectionsDate,
    insights,
    achievements: row.achievements.map((item) => ({
      name: item.name,
      progress: item.progress?.toString() || null,
      target: item.target?.toString() || null,
      completedAt: item.completedAt?.toISOString().slice(0, 10) || null,
    })),
  };
}

/**
 * An alliance's newest stored figures and the members in them.
 *
 * The alliance, its latest row and the server they belong to collapse into one
 * read: the relation filters do the scoping that three separate lookups used to
 * do, so an alliance from another server or one with no stored snapshot simply
 * finds nothing and answers 404 like before. Only the member list still needs
 * its own round trip, and it has to wait for the row it hangs off.
 */
export async function getAllianceDetail(id) {
  const row = await prisma.allianceSnapshot.findFirst({
    where: {
      allianceId: id,
      alliance: { server: { serverNumber: Number(serverId()) } },
      snapshot: { status: 'COMPLETE' },
    },
    include: { alliance: true, snapshot: true },
    orderBy: { snapshot: { snapshotDate: 'desc' } },
  });
  if (!row) return null;

  const snapshot = row.snapshot;
  const members = await prisma.lordSnapshot.findMany({
    where: { snapshotId: snapshot.id, allianceId: row.allianceId },
    include: { lord: true },
    orderBy: { rank: 'asc' },
  });
  return {
    id: row.alliance.id,
    name: row.alliance.name,
    rank: row.rank || null,
    power: formatStat(row.power),
    memberCount: row.memberCount || members.length,
    snapshotDate: snapshot.snapshotDate.toISOString().slice(0, 10),
    players: members.map((item) => ({
      id: item.lord.sourceId.toString(),
      name: item.lord.name,
      rank: item.rank,
      power: formatStat(item.power),
    })),
  };
}
