'use client';

import CountdownTimer from './CountdownTimer';
import useNow from './useNow';
import { eventPhase } from '../lib/time';

/**
 * The line under an event title that reflects what is actually happening:
 * a countdown before it starts, a pulsing "In progress" once it has begun,
 * "Event ended" past its end, and nothing at all for cancelled/completed
 * events. It ticks itself, so a page that is left open transitions at the
 * right second instead of showing "Starts in … Event started".
 */
export default function EventPhaseLine({ event, className = '' }) {
  const now = useNow();
  const phase = eventPhase(event, now);

  if (phase === 'countdown') {
    return (
      <div className={`flex items-center gap-1 text-[11px] text-gray-500 ${className}`}>
        <span>Starts in</span>
        <CountdownTimer startTime={event.startTime} className="font-semibold text-neutral-100" />
      </div>
    );
  }

  if (phase === 'running') {
    return (
      <div className={`inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 ${className}`}>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        In progress
      </div>
    );
  }

  if (phase === 'ended') {
    return <div className={`text-[11px] text-gray-500 ${className}`}>Event ended</div>;
  }

  return null;
}
