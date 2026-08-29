import Link from 'next/link';
import { ArrowLeft, Globe, MapPin, Timer, Volume2, Clapperboard, XCircle } from 'lucide-react';
import StatusBadge from '../../../components/StatusBadge';
import CountdownTimer from '../../../components/CountdownTimer';
import TimezoneInfo from '../../../components/TimezoneInfo';
import EventActions from '../../../components/EventActions';
import { getEvent } from '../../../lib/api';
import { formatDuration, BRANDING_FOOTER } from '../../../lib/time';

export const dynamic = 'force-dynamic';

export default async function EventDetailPage({ params }) {
  const { id } = await params;
  let event = null;
  let error = null;

  try {
    const data = await getEvent(id);
    event = data.event;
  } catch (err) {
    error = err.message;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-red-500/40 bg-red-500/10 px-6 py-8 text-center">
        <p className="text-red-400">Failed to load event: {error}</p>
        <Link href="/dashboard" className="mt-4 inline-flex items-center gap-1 text-sm text-discord-muted hover:text-discord-text">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!event) return null;

  const isScheduled = event.status === 'SCHEDULED';
  const isCancelled = event.status === 'CANCELLED';
  const duration = formatDuration(event.startTime, event.endTime);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-discord-muted transition hover:text-discord-text">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to dashboard
      </Link>

      <div className="mt-4 rounded-xl border border-l-4 border-black/40 bg-discord-surface p-6 shadow-lg border-l-blurple">
        {isScheduled && (
          <div className="mb-3 text-sm text-discord-muted">
            Starts in <CountdownTimer startTime={event.startTime} className="font-semibold text-discord-text" />
          </div>
        )}

        <div className="mb-3 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight uppercase tracking-wide">
            {isCancelled && <XCircle className="mr-1 inline h-5 w-5 text-red-400" />}
            ▰ {event.title}
          </h1>
          <StatusBadge status={event.status} />
        </div>

        {event.description && (
          <p className="mb-5 whitespace-pre-wrap text-sm leading-relaxed text-discord-text/90">
            {event.description}
          </p>
        )}

        <div className="space-y-4">
          <div className="rounded-lg bg-discord-bg-darker/40 px-4 py-3">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-discord-muted">
              Scheduled for
            </div>
            <TimezoneInfo date={event.startTime} />
          </div>

          {duration && (
            <div className="rounded-lg bg-discord-bg-darker/40 px-4 py-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-discord-muted">
                Duration
              </div>
              <div className="inline-flex items-center gap-1.5 text-sm font-medium text-discord-text">
                <Timer className="h-4 w-4 text-discord-muted" />
                {duration}
              </div>
            </div>
          )}

          {event.location && (
            <div className="rounded-lg bg-discord-bg-darker/40 px-4 py-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-discord-muted">
                Location
              </div>
              <div className="inline-flex items-center gap-1.5 text-sm text-discord-text">
                <MapPin className="h-4 w-4 text-discord-muted" />
                {event.location}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-discord-bg-darker/40 px-4 py-3">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-discord-muted">
              Event Type
            </div>
            <div className="inline-flex items-center gap-1.5 text-sm text-discord-text">
              {event.entityType === 'EXTERNAL' ? (
                <>
                  <Globe className="h-4 w-4 text-discord-muted" />
                  External Event
                </>
              ) : event.entityType === 'VOICE' ? (
                <>
                  <Volume2 className="h-4 w-4 text-discord-muted" />
                  Voice Channel Event
                </>
              ) : (
                <>
                  <Clapperboard className="h-4 w-4 text-discord-muted" />
                  Stage Event
                </>
              )}
            </div>
          </div>
        </div>

        <EventActions event={event} />

        <div
          className={`mt-6 flex items-center gap-1.5 border-t border-black/30 pt-3 text-xs ${
            isCancelled ? 'font-semibold text-red-400' : 'text-discord-muted'
          }`}
        >
          {isCancelled && <XCircle className="h-3.5 w-3.5" />}
          {isCancelled ? 'Event Cancelled · ' : ''}
          {BRANDING_FOOTER}
        </div>
      </div>
    </div>
  );
}