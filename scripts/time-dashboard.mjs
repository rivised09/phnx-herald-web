/**
 * Times the leadership dashboard read against the configured roster bucket
 * and reports which path it took.
 *
 *   node scripts/time-dashboard.mjs [--date YYYY-MM-DD]
 *
 * Fast path = index.json + one leadership/<date>.json summary (~127KB).
 * Fallback  = index + snapshots + every player history file (~86MB).
 */
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

register('./esm-ext-loader.mjs', import.meta.url);

const HERE = path.dirname(fileURLToPath(import.meta.url));
for (const file of ['.env.local', '.env']) {
  try {
    const text = fs.readFileSync(path.join(HERE, '..', file), 'utf8');
    const base = text.match(/^ROSTER_DATA_BASE_URL=(.*)$/m)?.[1]?.trim();
    if (base && !process.env.ROSTER_DATA_BASE_URL) process.env.ROSTER_DATA_BASE_URL = base;
  } catch {
    /* keep looking */
  }
}

const BASE = String(process.env.ROSTER_DATA_BASE_URL || '').replace(/\/+$/, '');
if (!BASE) {
  console.error('ROSTER_DATA_BASE_URL is not configured.');
  process.exit(2);
}

const argDate = process.argv.indexOf('--date');
const endDate = argDate >= 0 ? process.argv[argDate + 1] : null;

async function time(label, fn) {
  const started = Date.now();
  const value = await fn();
  const ms = Date.now() - started;
  console.log(`${label}: ${ms}ms`);
  return { value, ms };
}

const files = await import(pathToFileURL(path.join(HERE, '..', 'src', 'lib', 'roster', 'files.js')).href);

console.log(`Base: ${BASE}`);

// Which path will be taken? The summary decides.
const index = await (await fetch(`${BASE}/index.json`)).json();
const end = endDate || index.dates[0];
const summaryRes = await fetch(`${BASE}/leadership/${end}.json`);
console.log(
  summaryRes.ok
    ? `leadership/${end}.json: ${summaryRes.ok ? Math.round((await summaryRes.clone().arrayBuffer()).byteLength / 1024) : '-'}KB (fast path)`
    : `leadership/${end}.json: MISSING - the fallback full read will run`,
);

const first = await time('first read ', () =>
  files.getLeadershipDashboard(endDate ? { endDate } : {}),
);
const second = await time('second read', () =>
  files.getLeadershipDashboard(endDate ? { endDate } : {}),
);

const data = first.value;
console.log(
  `payload: ${data.players.length} players, snapshot ${data.snapshotDate}, ` +
    `${data.snapshotHealth.count}/${data.snapshotHealth.total} usable days, ` +
    `baseline ${data.kingdom.baselineDate ?? 'none'}`,
);
console.log(
  '(the page layer adds unstable_cache on top: 60s for the newest window, 1h for a pinned one)',
);
