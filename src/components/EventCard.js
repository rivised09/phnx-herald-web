import Link from 'next/link';
import { Calendar, Timer, MapPin, XCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import CountdownTimer from './CountdownTimer';
import TimezoneInfo from './TimezoneInfo';
import { formatDuration } from '../lib/time';

const ACCENT = {
  SCHEDULED: 'border-blurple',
  ACTIVE: 'border-green-500',
  CANCELLED: 'border-red-500',
  COMPLETED: 'border-slate-500',
};

export default function EventCard({ event }) {
  const accent = ACCENT[event.status] || ACCENT.SCHEDULED;
  const duration = formatDuration(event.startTime, event.endTime);
  const isScheduled = event.status === 'SCHEDULED';
  const isCancelled = event.status === 'CANCELLED';

  return (
    <div
      className={`group relative flex flex-col rounded-xl border border-l-4 bg-discord-surface p-5 shadow-sm ${accent}`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold leading-snug uppercase tracking-wide">
          {isCancelled && <XCircle className="mr-1 inline h-3.5 w-3.5 text-red-400" />}
          ▰ {event.title}
        </h3>
        <StatusBadge status={event.status} />
      </div>

      {isScheduled && (
        <div className="mb-2 flex items-center gap-1 text-xs text-discord-muted">
          <span>Starts in</span>
          <CountdownTimer startTime={event.startTime} />
        </div>
      )}

      {event.description && (
        <p className="mb-3 line-clamp-2 text-xs text-discord-muted">{event.description}</p>
      )}

      <div className="mt-auto space-y-1.5 border-t border-black/30 pt-2.5 text-sm">
        <div className="flex items-start gap-2">
          <Calendar className="mt-0.5 h-3.5 w-3.5 text-discord-muted" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-discord-muted">Scheduled for</div>
            <TimezoneInfo date={event.startTime} />
          </div>
        </div>

        {duration && (
          <div className="flex items-start gap-2">
            <Timer className="mt-0.5 h-3.5 w-3.5 text-discord-muted" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-discord-muted">Duration</div>
              <div className="text-sm font-medium text-discord-text">{duration}</div>
            </div>
          </div>
        )}

        {event.location && (
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 text-discord-muted" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-discord-muted">Location</div>
              <div className="text-sm font-medium text-discord-text">{event.location}</div>
            </div>
          </div>
        )}
      </div>

      <Link
        href={`/events/${event.id}`}
        className="absolute inset-0 rounded-xl"
        aria-label={`View ${event.title}`}
      />
    </div>
  );
}