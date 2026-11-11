'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, compact } from './player-ui';

/**
 * Leadership-exclusive: the same player as trends over their whole stored
 * history (the public page shows snapshots and insight prose, not charts).
 *
 * Everything here comes from `profile.insights.timeline` (one row per stored
 * snapshot: power, rank, kills, deaths, healed, merits, ...) and
 * `profile.gathered` (per-date resource gains), so the charts cover the full
 * history - up to ~60 snapshots - not just the leadership window.
 */

const TICK = { fill: '#71717a', fontSize: 10 };
const TOOLTIP_STYLE = {
  background: '#202225',
  border: '1px solid #3f4147',
  borderRadius: 4,
  fontSize: 11,
};

const AXIS_LABELS = {
  kills: 'Units killed',
  deaths: 'Units dead',
  healed: 'Units healed',
  merits: 'Merits',
};

function dateTick(value) {
  return String(value).slice(5); // MM-DD
}

/** Daily gains from a cumulative counter (null where a reading is missing). */
function dailyGains(timeline, key) {
  const rows = [];
  for (let i = 1; i < timeline.length; i += 1) {
    const previous = timeline[i - 1][key];
    const current = timeline[i][key];
    const dayGap =
      (new Date(`${timeline[i].date}T00:00:00Z`) - new Date(`${timeline[i - 1].date}T00:00:00Z`)) /
      86400000;
    rows.push({
      date: timeline[i].date,
      // Gains across a long hole (the early history is monthly) are not
      // "daily" gains: plotting them drowns every real day's bar under one
      // month-sized spike. They become gaps instead.
      gain: previous != null && current != null && current >= previous && dayGap <= 3 ? current - previous : null,
    });
  }
  return rows;
}

function ChartFrame({ title, description, height = 200, plain = false, children }) {
  return (
    <Card title={title} description={description}>
      <div className="mt-3" style={{ height }}>
        {plain ? (
          children
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

function Empty({ children }) {
  return (
    <Card title="Growth">
      <p className="mt-3 text-sm text-gray-600">{children}</p>
    </Card>
  );
}

export default function PlayerGrowth({ profile }) {
  const timeline = (profile.insights?.timeline || []).filter((row) => row.date);
  const gathered = profile.gathered || [];

  if (timeline.length < 2) {
    return (
      <Empty>
        Not enough tracked snapshots yet - at least two are needed before trends can be drawn.
      </Empty>
    );
  }

  // Value labels ride on the data itself: the row's `powerLabel`/`gainLabel`
  // holds the text where a label should draw and null where it should not.
  // (recharts v3 label content functions receive no payload or data index -
  // only x/y/value/viewBox - so the selection must be baked into the data.)
  const labelStep = Math.max(1, Math.ceil(timeline.length / 6));
  const powerRank = timeline.map((row, index) => ({
    date: row.date,
    power: row.power,
    rank: row.rank,
    // Sparse anchors: roughly every 10th point plus the last, so a 60-point
    // history stays readable instead of a wall of numbers.
    powerLabel:
      row.power != null && (index % labelStep === 0 || index === timeline.length - 1)
        ? compact(row.power)
        : null,
  }));

  // Real rank ticks: without an explicit domain a constant rank (a #1 lord)
  // renders an axis of 0..1 quarters, which reads as nonsense.
  const ranks = timeline.map((row) => row.rank).filter((value) => value != null);
  const rankMin = ranks.length ? Math.min(...ranks) : 1;
  const rankMax = ranks.length ? Math.max(...ranks) : 10;
  const rankDomain = rankMin === rankMax ? [rankMin - 1, rankMax + 1] : [rankMin, rankMax];

  const counters = ['kills', 'deaths', 'healed', 'merits'];
  const killGains = dailyGains(timeline, 'kills');
  // Only the largest bars get a printed value: on 50 bars, labelling every one
  // is a wall of overlapping numbers. The top gains are the ones a leader
  // quotes, so those carry their figure.
  const topGains = [...killGains]
    .filter((row) => row.gain != null && row.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 4)
    .map((row) => row.date);
  const killRows = killGains.map((row) => ({
    ...row,
    gainLabel: topGains.includes(row.date) && row.gain != null ? row.gain.toLocaleString('en-US') : null,
  }));

  // The gathered rows ARE the readings (gatheredSeries emits one row per
  // date that has gathering metrics), so the previous row's date is the true
  // previous reading - measuring against stored dates instead let a
  // history-only date hide a two-week gap and plot a month of gathering as
  // one day's.
  const gatheredRows = gathered.map((row, index) => {
    const previous = index > 0 ? gathered[index - 1].date : null;
    const gapDays = previous
      ? (new Date(`${row.date}T00:00:00Z`) - new Date(`${previous}T00:00:00Z`)) / 86400000
      : null;
    // Same rule as the kill-gain bars: a reading taken weeks after the one
    // before it carries a month of gathering, not a day's - plot it as a gap.
    const stale = gapDays === null || gapDays > 3;
    return {
      date: row.date,
      gold: stale ? null : row.gold ?? null,
      wood: stale ? null : row.wood ?? null,
      ore: stale ? null : row.ore ?? null,
      mana: stale ? null : row.mana ?? null,
    };
  });
  const hasGathered = gatheredRows.some(
    (row) => row.gold != null || row.wood != null || row.ore != null || row.mana != null,
  );

  const coverage = profile.insights?.coverage;

  return (
    <div className="space-y-5">
      <ChartFrame
        title="Power & rank"
        description={`Full stored history · ${timeline.length} snapshots${coverage ? ` · ${coverage.first} → ${coverage.last}` : ''}`}
        height={240}
      >
        <LineChart data={powerRank} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid stroke="#2b2d31" vertical={false} />
          <XAxis dataKey="date" tick={TICK} tickFormatter={dateTick} axisLine={false} tickLine={false} minTickGap={30} />
          <YAxis yAxisId="power" tick={TICK} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => compact(v)} />
          {/* Rank #1 belongs at the top, so this axis runs the other way. */}
          <YAxis
            yAxisId="rank"
            orientation="right"
            reversed
            domain={rankDomain}
            allowDecimals={false}
            tickFormatter={(value) => `#${value}`}
            tick={TICK}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            formatter={(value, name) =>
              name === 'power' ? [Number(value).toLocaleString('en-US'), 'Power'] : [`#${value}`, 'Rank']
            }
            labelFormatter={(label) => `Snapshot ${label}`}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: '#d1d5db' }}
          />
          <Line
            yAxisId="power"
            type="monotone"
            dataKey="power"
            stroke="#fbbf24"
            strokeWidth={2}
            dot={false}
            connectNulls
            isAnimationActive={false}
            label={{
              // The row's `powerLabel` field holds the text to draw (or null):
              // recharts v3 content functions see value/x/y/viewBox but no
              // payload, so the sparse selection is baked into the data.
              dataKey: 'powerLabel',
              content: ({ x, y, value }) =>
                value == null || x === undefined ? null : (
                  <text x={x} y={y - 8} textAnchor="middle" fontSize={10} fill="#fbbf24" className="chart-value-label">
                    {value}
                  </text>
                ),
            }}
          />
          <Line yAxisId="rank" type="monotone" dataKey="rank" stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
        </LineChart>
      </ChartFrame>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartFrame
          title="Daily kill gains"
          description="Kills added between consecutive snapshots - the rhythm of activity, not the total."
        >
          <BarChart data={killRows} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid stroke="#2b2d31" vertical={false} />
            <XAxis dataKey="date" tick={TICK} tickFormatter={dateTick} axisLine={false} tickLine={false} minTickGap={30} />
            <YAxis tick={TICK} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => compact(v)} />
            <Tooltip
              formatter={(value) => [Number(value).toLocaleString('en-US'), 'Kills gained']}
              labelFormatter={(label) => `Snapshot ${label}`}
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: '#d1d5db' }}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar
              dataKey="gain"
              fill="#fbbf24"
              radius={[3, 3, 0, 0]}
              maxBarSize={18}
              isAnimationActive={false}
              label={{
                // Only the top bars carry a printed value (see `killRows`).
                dataKey: 'gainLabel',
                content: ({ x, y, value, width }) =>
                  value == null || x === undefined ? null : (
                    <text
                      x={x + (width || 0) / 2}
                      y={y - 5}
                      textAnchor="middle"
                      fontSize={9}
                      fontFamily="monospace"
                      fill="#d1d5db"
                      className="chart-value-label"
                    >
                      {value}
                    </text>
                  ),
              }}
            />
          </BarChart>
        </ChartFrame>

        <ChartFrame
          title="Activity coverage"
          description="Snapshots where each counter moved - gaps are days with no detail data, not zeroes."
          height={210}
          plain
        >
          <div className="flex h-full flex-col justify-center gap-3 px-1">
            {counters.map((key) => {
              const values = timeline.map((row) => row[key]).filter((v) => v != null);
              const moved = timeline.filter((row, i) => {
                if (i === 0 || row[key] == null || timeline[i - 1][key] == null) return false;
                return row[key] > timeline[i - 1][key];
              }).length;
              const pct = values.length > 1 ? Math.round((moved / (values.length - 1)) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">{AXIS_LABELS[key]}</span>
                    <span className="font-mono text-gray-500">
                      {moved} of {Math.max(0, values.length - 1)} intervals · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-800">
                    <div
                      className={`h-full rounded-full ${pct >= 60 ? 'bg-emerald-400' : pct >= 30 ? 'bg-amber-400' : 'bg-gray-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartFrame>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {counters.map((key) => {
          const data = timeline.map((row) => ({ date: row.date, value: row[key] }));
          return (
            <ChartFrame
              key={key}
              title={AXIS_LABELS[key]}
              description="Cumulative total as recorded on each snapshot."
              height={170}
            >
              <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid stroke="#2b2d31" vertical={false} />
                <XAxis dataKey="date" tick={TICK} tickFormatter={dateTick} axisLine={false} tickLine={false} minTickGap={40} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => compact(v)} />
                <Tooltip
                  formatter={(value) => [Number(value).toLocaleString('en-US'), AXIS_LABELS[key]]}
                  labelFormatter={(label) => `Snapshot ${label}`}
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ color: '#d1d5db' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={key === 'kills' ? '#fbbf24' : key === 'healed' ? '#34d399' : key === 'merits' ? '#38bdf8' : '#f87171'}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ChartFrame>
          );
        })}
      </div>

      {hasGathered ? (
        <ChartFrame
          title="Resources gathered"
          description="Per-snapshot gains by resource (gathering between readings)."
          height={200}
        >
          <LineChart data={gatheredRows} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid stroke="#2b2d31" vertical={false} />
            <XAxis dataKey="date" tick={TICK} tickFormatter={dateTick} axisLine={false} tickLine={false} minTickGap={30} />
            <YAxis tick={TICK} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => compact(v)} />
            <Tooltip
              formatter={(value, name) => [Number(value).toLocaleString('en-US'), String(name).toUpperCase()]}
              labelFormatter={(label) => `Snapshot ${label}`}
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: '#d1d5db' }}
            />
            <Line type="monotone" dataKey="gold" stroke="#fbbf24" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="wood" stroke="#34d399" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="ore" stroke="#38bdf8" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="mana" stroke="#c084fc" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ChartFrame>
      ) : null}
    </div>
  );
}
