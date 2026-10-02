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
        <Link href="/dashboard" className="mt-4 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-500 transition hover:text-neutral-100">
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
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard" className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-500 transition hover:text-neutral-100">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to dashboard
      </Link>

      <div className="mt-3 rounded-lg border border-gray-800 bg-discord-surface p-5">
        {isScheduled && (
          <div className="mb-2.5 text-sm text-gray-500">
            Starts in <CountdownTimer startTime={event.startTime} className="font-semibold text-neutral-100" />
          </div>
        )}

        <div className="mb-2.5 flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">
              04 / Event
            </div>
            <h1 className="mt-1 text-xl font-semibold leading-tight tracking-tight text-neutral-100">
              {isCancelled && <XCircle className="mr-1 inline h-4 w-4 text-red-400" />}
              ▰ {event.title}
            </h1>
          </div>
          <StatusBadge status={event.status} />
        </div>

        {event.description && (
          <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-neutral-100/90">
            {event.description}
          </p>
        )}

        <dl className="mt-4 divide-y divide-gray-800 border-y border-gray-800">
          <div className="flex items-start justify-between gap-4 py-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">
              Scheduled for
            </dt>
            <dd className="text-right text-sm">
              <TimezoneInfo date={event.startTime} />
            </dd>
          </div>

          {duration && (
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">
                Duration
              </dt>
              <dd className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-100">
                <Timer className="h-3.5 w-3.5 text-gray-500" />
                {duration}
              </dd>
            </div>
          )}

          {event.location && (
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">
                Location
              </dt>
              <dd className="inline-flex items-center gap-1.5 text-sm text-neutral-100">
                <MapPin className="h-3.5 w-3.5 text-gray-500" />
                {event.location}
              </dd>
            </div>
          )}

          <div className="flex items-start justify-between gap-4 py-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">
              Event Type
            </dt>
            <dd className="inline-flex items-center gap-1.5 text-sm text-neutral-100">
              {event.entityType === 'EXTERNAL' ? (
                <>
                  <Globe className="h-3.5 w-3.5 text-gray-500" />
                  External Event
                </>
              ) : event.entityType === 'VOICE' ? (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-gray-500" />
                  Voice Channel Event
                </>
              ) : (
                <>
                  <Clapperboard className="h-3.5 w-3.5 text-gray-500" />
                  Stage Event
                </>
              )}
            </dd>
          </div>
        </dl>

        <EventActions event={event} />

        <div
          className={`mt-5 flex items-center justify-center gap-1.5 border-t border-gray-800 pt-2.5 font-mono text-[10px] uppercase tracking-[0.25em] ${
            isCancelled ? 'font-semibold text-red-400' : 'text-gray-500'
          }`}
        >
          {isCancelled && <XCircle className="h-3 w-3" />}
          {isCancelled ? 'Event Cancelled · ' : ''}
          {BRANDING_FOOTER}
        </div>
      </div>
    </div>
  );
}