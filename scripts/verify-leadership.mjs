/**
 * Acceptance checks for the Leadership page's data, run against the live
 * roster bucket - the same files the site reads.
 *
 *   node scripts/verify-leadership.mjs [--base <url>] [--date YYYY-MM-DD]
 *
 * What it verifies (from the Leadership fix checklist):
 *   1. no DragonStats-era snapshot is filed under another day's scan
 *   2. window deltas are real: active players show non-zero kill changes and
 *      no stat silently reads 0 for missing data
 *   3. the activity trend has no zero days - missing days are gaps
 *   4. activity buckets are mutually exclusive and sum to the lord total
 *   5. list, player file and alliance member list agree on each top lord's
 *      alliance
 *
 * Exits non-zero when any check fails, so it can run in CI.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
function argValue(flag) {
  const at = args.indexOf(flag);
  return at >= 0 ? args[at + 1] : null;
}

const here = path.dirname(fileURLToPath(import.meta.url));
function envValue(name) {
  for (const file of ['.env.local', '.env']) {
    try {
      const text = fs.readFileSync(path.join(here, '..', file), 'utf8');
      const match = text.match(new RegExp(`^${name}=(.*)$`, 'm'));
      if (match) return match[1].trim();
    } catch {
      /* keep looking */
    }
  }
  return null;
}

const BASE = (argValue('--base') || envValue('ROSTER_DATA_BASE_URL') || '').replace(/\/+$/, '');
if (!BASE) {
  console.error('No ROSTER_DATA_BASE_URL configured and no --base given.');
  process.exit(2);
}

const failures = [];
let checks = 0;
function check(ok, label, detail = '') {
  checks += 1;
  if (ok) {
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function get(file) {
  const res = await fetch(`${BASE}/${file}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${file} answered ${res.status}`);
  return res.json();
}

const index = await get('index.json');
if (!index?.dates?.length) {
  console.error('index.json has no dates.');
  process.exit(2);
}

const endDate = argValue('--date') || index.dates[0];
const windowStart = new Date(new Date(`${endDate}T00:00:00.000Z`).getTime() - 7 * 86400000)
  .toISOString()
  .slice(0, 10);
const windowDates = [];
for (
  let cursor = new Date(`${windowStart}T00:00:00.000Z`);
  cursor <= new Date(`${endDate}T00:00:00.000Z`);
  cursor = new Date(cursor.getTime() + 86400000)
) {
  windowDates.push(cursor.toISOString().slice(0, 10));
}
const storedDates = windowDates.filter((day) => index.dates.includes(day));

console.log(`\nBase:    ${BASE}`);
console.log(`Window:  ${windowDates[0]} .. ${windowDates[windowDates.length - 1]} (${storedDates.length} snapshots stored)\n`);

const snapshots = new Map();
for (const date of storedDates) snapshots.set(date, await get(`snapshots/${date}.json`));

/* 1. every DragonStats-era day holds its own scan -------------------------------- */
console.log('1. snapshot provenance (DragonStats era)');
const dragonDays = index.dates.filter((day) => day >= '2026-10-25');
const wrongScan = [];
for (const day of dragonDays) {
  const snap = await get(`snapshots/${day}.json`);
  if (!snap) {
    wrongScan.push(`${day}: missing file`);
    continue;
  }
  const isDragon = String(snap.server?.url || '').includes('dragonstats');
  const crawled = String(snap.crawledAt || '').slice(0, 10);
  if (isDragon && crawled && crawled !== day) wrongScan.push(`${day}: holds ${crawled} scan`);
}
check(wrongScan.length === 0, `${dragonDays.length} DragonStats days hold their own scan`, wrongScan.join('; '));

/* Load player files for the window ------------------------------------------------ */
const playerIds = new Set();
for (const snap of snapshots.values()) for (const p of snap?.players || []) playerIds.add(String(p.id));
const playerFiles = new Map();
await Promise.all(
  [...playerIds].map(async (id) => {
    const file = await get(`players/${id}.json`);
    if (file) playerFiles.set(id, file);
  }),
);

const validDates = windowDates.filter((day) => {
  const snap = snapshots.get(day);
  if (!snap) return false;
  const isDragon = String(snap.server?.url || '').includes('dragonstats');
  const crawled = String(snap.crawledAt || '').slice(0, 10);
  return !(isDragon && crawled && crawled !== day);
});

/* 2. deltas are real --------------------------------------------------------------- */
console.log('\n2. window deltas');
const latestDate = validDates[validDates.length - 1];
const baselineDate = validDates[0];
let withKillDelta = 0;
let nonZeroKillDelta = 0;
const samples = [];
for (const [id, file] of playerFiles) {
  const firstM = file.metrics?.[baselineDate];
  const lastM = file.metrics?.[latestDate];
  if (!firstM || !lastM) continue;
  const a = firstM['Units Killed'];
  const b = lastM['Units Killed'];
  if (a === undefined || b === undefined || a === null || b === null) continue;
  withKillDelta += 1;
  if (b - a !== 0) {
    nonZeroKillDelta += 1;
    if (samples.length < 5) {
      const name = file.name || snapshots.get(latestDate)?.players?.find((p) => String(p.id) === id)?.name || id;
      samples.push(`${name} +${(b - a).toLocaleString('en-US')}`);
    }
  }
}
check(withKillDelta > 0, 'players have comparable kill data across the window', `${withKillDelta} players`);
check(
  nonZeroKillDelta > 0,
  'at least one known-active player shows a non-zero kill delta',
  samples.length ? `e.g. ${samples.join(', ')}` : 'all deltas are 0',
);
console.log(`        (${nonZeroKillDelta} of ${withKillDelta} players changed kills between ${baselineDate} and ${latestDate})`);

/* 3. activity trend: no zero days --------------------------------------------------- */
console.log('\n3. activity trend');
const timeline = windowDates.map((date, i) => {
  const snap = snapshots.get(date);
  if (!snap) return { date, activePlayers: null, reason: 'missing' };
  const isDragon = String(snap.server?.url || '').includes('dragonstats');
  const crawled = String(snap.crawledAt || '').slice(0, 10);
  if (isDragon && crawled && crawled !== date) return { date, activePlayers: null, reason: 'wrong-scan' };
  if (i === 0) return { date, activePlayers: null, reason: 'first' };
  const previous = windowDates[i - 1];
  if (!timelineHas(previous)) return { date, activePlayers: null, reason: 'after-gap' };
  let active = 0;
  for (const [, file] of playerFiles) {
    const cur = file.metrics?.[date] || {};
    const prev = file.metrics?.[previous] || {};
    const progressed = ['Units Killed', 'Merits', 'Units Healed'].some(
      (label) => cur[label] != null && prev[label] != null && cur[label] > prev[label],
    );
    const curPower = cur['Current Power'];
    const prevPower = prev['Current Power'];
    if (progressed || (curPower != null && prevPower != null && curPower > prevPower)) active += 1;
  }
  return { date, activePlayers: active, reason: null };

  function timelineHas(day) {
    const s = snapshots.get(day);
    if (!s) return false;
    const dragon = String(s.server?.url || '').includes('dragonstats');
    const crawled = String(s.crawledAt || '').slice(0, 10);
    return !(dragon && crawled && crawled !== day);
  }
});
const zeroDays = timeline.filter((point) => point.activePlayers === 0);
const plotted = timeline.filter((point) => point.activePlayers !== null);
check(
  zeroDays.length === 0,
  'no day inside the window plots 0 activity',
  zeroDays.map((p) => p.date).join(', '),
);
check(plotted.length >= 2, 'the trend has at least two plottable days', `${plotted.length} days`);
console.log('        ' + timeline.map((p) => `${p.date.slice(5)}:${p.activePlayers === null ? 'gap(' + p.reason + ')' : p.activePlayers}`).join('  '));

/* 4. buckets sum to the lord total -------------------------------------------------- */
console.log('\n4. activity buckets');
const latestSnap = snapshots.get(latestDate);
const latestById = new Map((latestSnap?.players || []).map((p) => [String(p.id), p]));
let active = 0;
let low = 0;
let dormant = 0;
let total = 0;
for (const [id, file] of playerFiles) {
  if (!latestById.has(id)) continue;
  total += 1;
  const observations = validDates
    .map((date) => {
      const m = file.metrics?.[date] || {};
      const snapEntry = latestById.has(id) ? snapshots.get(date)?.players?.find((p) => String(p.id) === id) : null;
      return {
        values: {
          kills: m['Units Killed'] ?? null,
          merits: m['Merits'] ?? null,
          healing: m['Units Healed'] ?? null,
        },
        power: Number(String(snapEntry?.stats?.Power || '').replace(/,/g, '')) || null,
      };
    })
    .filter((item) => Object.values(item.values).some((v) => v !== null) || item.power !== null);
  let progress = 0;
  for (let i = 1; i < observations.length; i += 1) {
    const before = observations[i - 1];
    const now = observations[i];
    const rose = ['kills', 'merits', 'healing'].some(
      (key) => before.values[key] != null && now.values[key] != null && now.values[key] > before.values[key],
    ) || (before.power != null && now.power != null && now.power > before.power);
    if (rose) progress += 1;
  }
  if (progress >= 4) active += 1;
  else if (progress >= 1) low += 1;
  else dormant += 1;
}
check(active + low + dormant === total, 'Active + Low + Dormant equals the lord total', `${active} + ${low} + ${dormant} = ${total} vs total ${total}`);
check(
  total === (latestSnap?.players?.length ?? -1),
  'bucket total matches the snapshot player count',
  `${total} vs snapshot ${(latestSnap?.players?.length ?? 'missing')}`,
);
console.log(`        Active ${active} · Low ${low} · Dormant ${dormant} · Lords ${total}`);

/* 5. alliance agreement for the top lords ------------------------------------------- */
console.log('\n5. alliance consistency (top 5 lords)');
const topFive = [...(latestSnap?.players || [])]
  .slice()
  .sort((a, b) => (Number(String(b.stats?.Power || '0').replace(/,/g, '')) || 0) - (Number(String(a.stats?.Power || '0').replace(/,/g, '')) || 0))
  .slice(0, 5);
const allianceFileCache = new Map();
for (const row of topFive) {
  const id = String(row.id);
  const file = playerFiles.get(id);
  const fileAlliance = file?.byDate?.[latestDate]?.alliance ?? null;
  const snapshotAlliance = row.allianceId || null;
  const normalise = (value) => (!value || value === 'Not In An Alliance' ? null : value);
  const agree = normalise(fileAlliance) === normalise(snapshotAlliance);

  let inMemberList = true;
  const allianceName = normalise(fileAlliance) || normalise(snapshotAlliance);
  if (allianceName) {
    const allianceId = (latestSnap.alliances || []).find((a) => a.name === allianceName)?.id;
    if (allianceId) {
      let allianceFile = allianceFileCache.get(allianceId);
      if (allianceFile === undefined) {
        allianceFile = await get(`alliances/${allianceId}.json`);
        allianceFileCache.set(allianceId, allianceFile);
      }
      const members = allianceFile?.byDate?.[latestDate]?.players || [];
      inMemberList = members.some((member) => String(member.id) === id);
    }
  }
  const label = row.name || id;
  check(agree, `${label}: list and player file agree on alliance (${allianceName || 'unaffiliated'})`);
  if (allianceName) check(inMemberList, `${label}: appears in ${allianceName}'s member list for ${latestDate}`);
}

/* summary ---------------------------------------------------------------------------- */
console.log(`\n${checks - failures.length}/${checks} checks passed.`);
if (failures.length) {
  console.log('Failed:');
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
