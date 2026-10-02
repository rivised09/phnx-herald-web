'use client';

import { useId } from 'react';

const TAU = Math.PI * 2;
const VB_W = 240;
const VB_H = 190;

function vertex(cx, cy, r, index, count) {
  const angle = -Math.PI / 2 + (TAU * index) / count;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function ringPoints(cx, cy, r, count) {
  return Array.from({ length: count }, (_, i) => vertex(cx, cy, r, i, count));
}

function toPoints(list) {
  return list.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

function quad(a, b, c, d) {
  return `M${a[0].toFixed(2)},${a[1].toFixed(2)} L${b[0].toFixed(2)},${b[1].toFixed(
    2,
  )} L${c[0].toFixed(2)},${c[1].toFixed(2)} L${d[0].toFixed(2)},${d[1].toFixed(2)} Z`;
}

export default function Radar3D({
  data = [],
  valueKey = 'value',
  max,
  size = 200,
  depth = 8,
  rings = 4,
  stroke = '#e5e5e5',
  label = 'Playstyle radar',
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const count = data.length;
  if (count < 3) return null;

  const cx = VB_W / 2;
  const cy = 82;
  const R = 58;

  const values = data.map((d) => Number(d[valueKey]) || 0);
  const peak = max ?? Math.max(1, ...values);

  const outer = ringPoints(cx, cy, R, count);
  const outerLow = outer.map(([x, y]) => [x, y + depth]);

  const shape = data.map((d, i) =>
    vertex(cx, cy, (R * (Number(d[valueKey]) || 0)) / peak, i, count),
  );
  const shapeLow = shape.map(([x, y]) => [x, y + depth]);

  const height = Math.round((size * VB_H) / VB_W);

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width={size}
      height={height}
      role="img"
      aria-label={label}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <defs>
        <linearGradient id={`top-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {Array.from({ length: rings - 1 }, (_, k) => (
        <polygon
          key={`ring-${k}`}
          points={toPoints(ringPoints(cx, cy, (R * (k + 1)) / rings, count))}
          fill="none"
          stroke="#2a2a2a"
          strokeWidth="1"
        />
      ))}

      {outer.map(([x, y], i) => (
        <line key={`spoke-${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke="#242424" strokeWidth="1" />
      ))}

      <polygon points={toPoints(outerLow)} fill="none" stroke="#1c1c1c" strokeWidth="1" />

      {outer.map((p, i) => (
        <path
          key={`outer-side-${i}`}
          d={quad(p, outerLow[i], outerLow[(i + 1) % count], outer[(i + 1) % count])}
          fill="#000"
          opacity="0.5"
        />
      ))}

      <polygon points={toPoints(outer)} fill="none" stroke="#3a3a3a" strokeWidth="1" />

      {shape.map((p, i) => (
        <path
          key={`side-${i}`}
          d={quad(p, shapeLow[i], shapeLow[(i + 1) % count], shape[(i + 1) % count])}
          fill="#000"
          opacity="0.45"
        />
      ))}

      <polygon points={toPoints(shapeLow)} fill={stroke} opacity="0.1" />
      <polygon
        points={toPoints(shape)}
        fill={`url(#top-${uid})`}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {shape.map(([x, y], i) => (
        <circle key={`dot-${i}`} cx={x} cy={y} r="2" fill={stroke} />
      ))}

      {data.map((d, i) => {
        const [x, y] = vertex(cx, cy, R + 16, i, count);
        const anchor = Math.abs(x - cx) < 6 ? 'middle' : x > cx ? 'start' : 'end';
        return (
          <text
            key={`label-${i}`}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fill="#a3a3a3"
            fontSize="9"
            fontFamily="ui-monospace, monospace"
            letterSpacing="0.08em"
          >
            {String(d.axis || '').toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}