'use client';

import Link from 'next/link';

/**
 * The third home tab: the snapshot read as a server rather than as two lists.
 * Every figure is aggregated from the same rows the other two tabs show, so it
 * costs no extra request and can never disagree with them.
 *
 * The layout is one summary block, one distribution and two leaderboards. The
 * only colour in it is the accent, and only where it carries information: the
 * three leading ranks, the bar that encodes share, and the distribution's own
 * segments. Everything else is type, rules and alignment.
 */

const BANDS = [
  { key: 'tiny', label: 'Under 10M', fill: 'bg-gray-700', test: (n) => n > 0 && n < 1e7 },
  { key: 'low', label: '10M – 30M', fill: 'bg-amber-600/25', test: (n) => n >= 1e7 && n < 3e7 },
  { key: 'mid', label: '30M – 50M', fill: 'bg-amber-600/45', test: (n) => n >= 3e7 && n < 5e7 },
  { key: 'high', label: '50M – 80M', fill: 'bg-amber-500/55', test: (n) => n >= 5e7 && n < 8e7 },
  { key: 'top', label: '80M – 100M', fill: 'bg-amber-500/75', test: (n) => n >= 8e7 && n < 1e8 },
  { key: 'cap', label: '100M and above', fill: 'bg-amber-400', test: (n) => n >= 1e8 },
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

function SectionHead({ title, meta }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-gray-800 pb-2">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-400">{title}</h3>
      {meta ? (
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-600">
          {meta}
        </span>
      ) : null}
    </div>
  );
}

function Figure({ label, value, note }) {
  return (
    <div className="px-3 first:pl-0 last:pr-0">
      <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">{label}</dt>
      <dd className="mt-1 truncate font-mono text-sm tabular-nums text-neutral-100">{value}</dd>
      {note ? <p className="mt-0.5 truncate text-[11px] text-gray-600">{note}</p> : null}
    </div>
  );
}

function RankedList({ title, meta, rows, max, href, columns, empty }) {
  return (
    <section className="min-w-0">
      <SectionHead title={title} meta={meta} />

      {rows.length ? (
        <table className="mt-1 w-full table-fixed border-collapse text-left">
          <tbody className="divide-y divide-gray-800/60">
            {rows.map((row, index) => (
              <tr key={row.key} className="group">
                <td className="w-7 py-2 align-middle font-mono text-[10px] tabular-nums text-gray-600">
                  <span className={index < 3 ? 'text-amber-400' : undefined}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </td>

                <td className="min-w-0 py-2 pr-3 align-middle">
                  <Link
                    href={`${href}/${row.id}`}
                    className="block truncate text-xs text-neutral-100 transition group-hover:text-amber-300"
                  >
                    {row.name}
                  </Link>
                  {row.note ? (
                    <span className="mt-0.5 block truncate text-[11px] text-gray-600">
                      {row.note}
                    </span>
                  ) : null}
                </td>

                {columns.members ? (
                  <td className="hidden w-16 py-2 text-right align-middle font-mono text-[11px] tabular-nums text-gray-500 sm:table-cell">
                    {row.members}
                  </td>
                ) : null}

                <td className="w-24 py-2 text-right align-middle font-mono text-[11px] tabular-nums text-neutral-200">
                  {fmt(row.value)}
                </td>

                <td className="hidden w-20 py-2 pl-3 align-middle sm:table-cell">
                  <span className="block h-1 w-full overflow-hidden rounded-full bg-gray-800">
                    <span
                      className="block h-full rounded-full bg-amber-400"
                      style={{
                        width: `${Math.max(3, Math.round((row.value / max) * 100))}%`,
                      }}
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
          {empty}
        </p>
      )}
    </section>
  );
}

export default function ServerStats({ alliances = [], players = [], snapshot = null }) {
  const allianceRows = alliances
    .map((item) => ({
      id: item.id,
      key: item.id || item.name,
      name: item.name,
      members: item.stats?.Members || '—',
      value: toNumber(item.stats?.Power),
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const lordRows = players
    .map((item) => ({
      id: item.id,
      key: item.id || item.name,
      name: item.name,
      note: item.allianceId || null,
      value: toNumber(item.stats?.Power),
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
  const known = bands.reduce((sum, band) => sum + band.count, 0) || 1;

  return (
    <div className="space-y-6 px-4 py-4">
      {/* Summary: one dominant figure with the three that qualify it beside it. */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-gray-800 pb-2">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-400">
            Server snapshot
          </h3>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-600">
            {snapshot?.date ? `Snapshot · ${snapshot.date}` : 'Snapshot · unknown'}
          </span>
        </div>

        <div className="grid gap-4 pt-4 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] sm:items-end sm:gap-6">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-600">
              Total lord power
            </p>
            <p className="mt-1 font-mono text-3xl tabular-nums leading-none tracking-tight text-neutral-50 sm:text-4xl">
              {fmt(totalPower)}
            </p>
            <p className="mt-1.5 text-[11px] text-gray-600">
              {`${fmt(alliances.length)} alliances and ${fmt(players.length)} lords in this snapshot`}
            </p>
          </div>

          <dl className="grid grid-cols-3 divide-x divide-gray-800 border-t border-gray-800 pt-3 sm:border-t-0 sm:pt-0">
            <Figure label="Average" value={compact(average)} note="per lord" />
            <Figure
              label="Strongest lord"
              value={topLords[0] ? compact(topLords[0].value) : '—'}
              note={topLords[0]?.name || 'No data'}
            />
            <Figure
              label="Strongest alliance"
              value={topAlliances[0] ? compact(topAlliances[0].value) : '—'}
              note={topAlliances[0]?.name || 'No data'}
            />
          </dl>
        </div>
      </div>

      {/* Distribution: one bar carries the shape, the legend carries the counts. */}
      <section>
        <SectionHead
          title="Power distribution"
          meta={`${fmt(lordRows.length)} lords measured`}
        />
        <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-gray-800">
          {bands.map((band) => (
            <span
              key={band.key}
              className={band.fill}
              style={{ width: `${Math.round((band.count / known) * 100)}%` }}
              title={`${band.label}: ${fmt(band.count)}`}
            />
          ))}
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
          {bands.map((band) => (
            <div
              key={band.key}
              className="flex items-baseline gap-2 border-t border-gray-800/70 pt-2"
            >
              <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${band.fill}`} />
              <dt className="min-w-0 flex-1 truncate text-[11px] text-gray-400">{band.label}</dt>
              <dd className="font-mono text-[11px] tabular-nums text-neutral-200">
                {fmt(band.count)}
              </dd>
              <dd className="w-8 text-right font-mono text-[10px] tabular-nums text-gray-600">
                {Math.round((band.count / known) * 100)}%
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <RankedList
          title="Top alliances"
          meta={`${topAlliances.length} of ${allianceRows.length}`}
          rows={topAlliances}
          max={maxAlliance}
          href="/roster/alliance"
          columns={{ members: true }}
          empty="No alliance power stored yet."
        />
        <RankedList
          title="Top lords"
          meta={`${topLords.length} of ${lordRows.length}`}
          rows={topLords}
          max={maxLord}
          href="/roster/player"
          columns={{}}
          empty="No lord power stored yet."
        />
      </div>
    </div>
  );
}
