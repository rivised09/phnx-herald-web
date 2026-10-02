import Link from 'next/link';
import { Calendar, Timer, MapPin, XCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import CountdownTimer from './CountdownTimer';
import TimezoneInfo from './TimezoneInfo';
import { formatDuration } from '../lib/time';

export default function EventCard({ event }) {
  const duration = formatDuration(event.startTime, event.endTime);
  const isScheduled = event.status === 'SCHEDULED';
  const isCancelled = event.status === 'CANCELLED';

  return (
    <div className="group relative flex flex-col rounded-lg border border-gray-800 bg-discord-surface p-3.5 transition hover:border-gray-600">
      <div className="mb-1.5 flex items-start justify-between gap-3">
        <h3 className="text-[13px] font-semibold leading-snug uppercase tracking-wide text-neutral-100">
          {isCancelled && <XCircle className="mr-1 inline h-3.5 w-3.5 text-red-400" />}
          ▰ {event.title}
        </h3>
        <StatusBadge status={event.status} />
      </div>

      {isScheduled && (
        <div className="mb-1.5 flex items-center gap-1 text-[11px] text-gray-500">
          <span>Starts in</span>
          <CountdownTimer startTime={event.startTime} />
        </div>
      )}

      {event.description && (
        <p className="mb-2 line-clamp-2 text-[11px] text-gray-500">{event.description}</p>
      )}

      <div className="mt-auto space-y-1.5 border-t border-gray-800 pt-2.5 text-[13px]">
        <div className="flex items-start gap-2">
          <Calendar className="mt-0.5 h-3.5 w-3.5 text-gray-500" />
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
              Scheduled for
            </div>
            <TimezoneInfo date={event.startTime} />
          </div>
        </div>

        {duration && (
          <div className="flex items-start gap-2">
            <Timer className="mt-0.5 h-3 w-3 text-gray-500" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                Duration
              </div>
              <div className="text-[13px] font-medium text-neutral-100">{duration}</div>
            </div>
          </div>
        )}

        {event.location && (
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3 w-3 text-gray-500" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                Location
              </div>
              <div className="text-[13px] font-medium text-neutral-100">{event.location}</div>
            </div>
          </div>
        )}
      </div>

      <Link
        href={`/events/${event.id}`}
        className="absolute inset-0 rounded-lg"
        aria-label={`View ${event.title}`}
      />
    </div>
  );
}