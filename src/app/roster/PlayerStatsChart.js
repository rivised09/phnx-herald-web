'use client';

import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function number(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatPower(value) {
  return value === null ? '—' : value.toLocaleString('en-US');
}

export default function PlayerStatsChart({ history = [] }) {
  const data = history
    .map((item) => ({
      ...item,
      power: number(item.power),
      rank: number(item.rank),
    }))
    .filter((item) => item.power !== null || item.rank !== null);

  if (data.length < 2) {
    return (
      <div className="border-t border-gray-800 px-4 py-4 text-xs text-gray-500">
        Historical charts will appear after this player has been captured in at least two snapshots.
      </div>
    );
  }

  return (
    <div className="border-t border-gray-800 px-4 py-4">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
            Player trends
          </h2>
          <p className="mt-1 text-xs text-gray-600">Power and leaderboard rank across verified snapshots</p>
        </div>
        <span className="font-mono text-[10px] text-gray-600">{data.length} snapshots</span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#71717a', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              yAxisId="power"
              tick={{ fill: '#71717a', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${Math.round(value / 1000000)}M`}
              width={38}
            />
            <YAxis yAxisId="rank" orientation="right" reversed hide />
            <Tooltip
              contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', fontSize: 11 }}
              labelStyle={{ color: '#a1a1aa' }}
              formatter={(value, name) => [
                name === 'Power' ? formatPower(value) : `#${value ?? '—'}`,
                name,
              ]}
            />
            <Line
              yAxisId="power"
              type="monotone"
              dataKey="power"
              name="Power"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              yAxisId="rank"
              type="monotone"
              dataKey="rank"
              name="Rank"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
