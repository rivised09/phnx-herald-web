'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatUtc, formatLocalLong } from '../lib/time';

export default function TimezoneInfo({ date }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-0.5 text-sm">
      {mounted ? (
        <>
          <div className="text-discord-text">
            <Clock className="mr-1 inline h-3.5 w-3.5 text-discord-muted" />
            <span className="font-medium">{formatLocalLong(date)}</span>
          </div>
          <div className="text-xs text-discord-muted">UTC: {formatUtc(date)}</div>
        </>
      ) : (
        <div className="space-y-1.5">
          <div className="h-4 w-64 animate-pulse rounded bg-discord-raised" />
          <div className="h-3 w-44 animate-pulse rounded bg-discord-raised" />
        </div>
      )}
    </div>
  );
}