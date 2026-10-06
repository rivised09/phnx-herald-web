'use client';

/**
 * The third home tab: the snapshot read as a server rather than as two lists.
 * Every figure here is aggregated from the same rows the other two tabs show,
 * so it costs no extra request and can never disagree with them.
 */

const BANDS = [
  { key: 'titan', label: '5B and above', test: (n) => n >= 5e9 },
  { key: 'giant', label: '1B – 5B', test: (n) => n >= 1e9 && n < 5e9 },
  { key: 'major', label: '500M – 1B', test: (n) => n >= 5e8 && n < 1e9 },
  { key: 'solid', label: '100M – 500M', test: (n) => n >= 1e8 && n < 5e8 },
  { key: 'small', label: 'Under 100M', test: (n) => n > 0 && n < 1e8 },
];

/** Powers arrive as display strings ("3,107,409,746"); strip the separators. */
function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const digits = String(value).replace(/[^0-9.]/g, '');
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n) {
  return Math.round(n).toLocaleString('en-US');
}

function compact(n) {
  const trim = (x) => String(Math.round(x * 10) / 10);
  if (n >= 1e12) return `${trim(n / 1e12)}T`;
  if (n >= 1e9) return `${trim(n / 1e9)}B`;
  if (n >= 1e6) return `${trim(n / 1e6)}M`;
  if (n >= 1e3) return `${trim(n / 1e3)}K`;
  return fmt(n);
}

function Tile({ label, value, hint }) {
  return (
    <div className="bg-discord-surface px-3 py-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-600">{label}</dt>
      <dd className="mt-1 truncate font-mono text-base text-neutral-100">{value}</dd>
      {hint ? <p className="mt-0.5 truncate text-[11px] text-gray-600">{hint}</p> : null}
    </div>
  );
}

function RankedList({ title, rows, max, empty }) {
  return (
    <section className="min-w-0">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">{title}</h3>

      {rows.length ? (
        <ol className="mt-2">
          {rows.map((row, index) => (
            <li key={row.key} className="border-b border-gray-800/70 py-2">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="shrink-0 font-mono text-[10px] text-gray-600">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 truncate text-neutral-100">{row.name}</span>
                </span>
                <span className="shrink-0 font-mono text-[11px] text-neutral-200">
                  {fmt(row.value)}
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${Math.max(2, Math.round((row.value / max) * 100))}%` }}
                />
              </div>
              {row.note ? (
                <p className="mt-1 truncate text-[11px] text-gray-600">{row.note}</p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
          {empty}
        </p>
      )}
    </section>
  );
}

export default function ServerStats({ alliances = [], players = [], snapshot = null }) {
  const allianceRows = alliances
    .map((item) => ({
      key: item.id || item.name,
      name: item.name,
      value: toNumber(item.stats?.Power),
      note: item.stats?.Members ? `${item.stats.Members} members` : null,
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const lordRows = players
    .map((item) => ({
      key: item.id || item.name,
      name: item.name,
      value: toNumber(item.stats?.Power),
      note: item.allianceId || null,
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalPower = lordRows.reduce((sum, row) => sum + row.value, 0);
  const topAlliances = allianceRows.slice(0, 8);
  const topLords = lordRows.slice(0, 10);
  const maxAlliance = topAlliances[0]?.value || 1;
  const maxLord = topLords[0]?.value || 1;
  const average = lordRows.length ? totalPower / lordRows.length : 0;

  const bands = BANDS.map((band) => ({
    ...band,
    count: lordRows.filter((row) => band.test(row.value)).length,
  }));

  return (
    <div className="space-y-5 px-4 py-4">
      <dl className="grid grid-cols-2 gap-px bg-gray-800 sm:grid-cols-4">
        <Tile label="Alliances" value={fmt(alliances.length)} hint="tracked in this snapshot" />
        <Tile label="Lords" value={fmt(players.length)} hint="tracked in this snapshot" />
        <Tile label="Server power" value={compact(totalPower)} hint={`${fmt(totalPower)} total`} />
        <Tile label="Average power" value={compact(average)} hint="per lord" />
      </dl>

      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
        Snapshot · {snapshot?.date || 'unknown'}
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <RankedList
          title="Strongest alliances"
          rows={topAlliances}
          max={maxAlliance}
          empty="No alliance power stored yet."
        />
        <RankedList
          title="Strongest lords"
          rows={topLords}
          max={maxLord}
          empty="No lord power stored yet."
        />
      </div>

      <section>
        <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">
          Power spread
        </h3>
        <dl className="mt-2 grid grid-cols-2 gap-px bg-gray-800 sm:grid-cols-3 lg:grid-cols-5">
          {bands.map((band) => (
            <div key={band.key} className="bg-discord-surface px-3 py-2.5">
              <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-600">
                {band.label}
              </dt>
              <dd className="mt-1 font-mono text-sm text-neutral-100">
                {fmt(band.count)}
                <span className="ml-1.5 text-[11px] text-gray-600">
                  {lordRows.length
                    ? `${Math.round((band.count / lordRows.length) * 100)}%`
                    : '0%'}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
