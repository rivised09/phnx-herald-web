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
          <div className="text-neutral-100">
            <Clock className="mr-1 inline h-3.5 w-3.5 text-gray-500" />
            <span className="font-medium">{formatLocalLong(date)}</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
            UTC: {formatUtc(date)}
          </div>
        </>
      ) : (
        <div className="space-y-1.5">
          <div className="h-4 w-64 animate-pulse rounded bg-gray-800" />
          <div className="h-3 w-44 animate-pulse rounded bg-gray-800" />
        </div>
      )}
    </div>
  );
}