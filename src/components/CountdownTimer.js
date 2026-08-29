'use client';

import { useEffect, useState } from 'react';

function pad(n) {
  return String(n).padStart(2, '0');
}

function diffParts(ms) {
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0 };
  const total = Math.floor(ms / 1000);
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

export default function CountdownTimer({ startTime, className = '' }) {
  const target = new Date(startTime).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = target - now;
  const { d, h, m, s } = diffParts(remaining);

  if (remaining <= 0) {
    return (
      <span className={`font-semibold text-green-400 ${className}`}>
        Event started
      </span>
    );
  }

  return (
    <span className={`font-mono text-sm font-medium tabular-nums text-discord-muted ${className}`}>
      {d > 0 && <span className="mr-0.5 text-discord-text">{d}d</span>}
      <span>{pad(h)}</span>
      <span className="text-phoenix-500">:</span>
      <span>{pad(m)}</span>
      <span className="text-phoenix-500">:</span>
      <span>{pad(s)}</span>
    </span>
  );
}