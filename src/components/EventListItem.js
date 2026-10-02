'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarDays, MapPin, Timer, ChevronRight } from 'lucide-react';
import StatusBadge from './StatusBadge';
import CountdownTimer from './CountdownTimer';
import { formatLocalLong, formatUtc, formatDuration } from '../lib/time';

export default function EventListItem({ event }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const duration = formatDuration(event.startTime, event.endTime);
  const showCountdown = event.status === 'SCHEDULED';

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex items-stretch gap-3 rounded-lg border border-gray-800 bg-discord-surface px-4 py-3 transition hover:border-gray-600"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <StatusBadge status={event.status} />
          <span className="truncate text-sm font-medium text-neutral-100">▰ {event.title}</span>
        </div>

        {event.description && (
          <p className="mt-1 truncate text-xs text-gray-500">{event.description}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-0.5 text-[11px] text-gray-500">
          {mounted && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              {formatLocalLong(event.startTime)}
            </span>
          )}
          {duration && (
            <span className="inline-flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 shrink-0" />
              {duration}
            </span>
          )}
          {event.location && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-1 py-0.5 text-right">
        {showCountdown && <CountdownTimer startTime={event.startTime} />}
        {mounted && (
          <div className="hidden text-xs text-gray-500 sm:block">UTC: {formatUtc(event.startTime)}</div>
        )}
        <ChevronRight className="mt-auto h-4 w-4 text-gray-600" />
      </div>
    </Link>
  );
}