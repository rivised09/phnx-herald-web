'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';

/**
 * Catches render failures in the events area (detail, edit, create).
 *
 * Without a boundary, an exception thrown while rendering a server component
 * replaces the whole page with Vercel's generic "Application error" screen and
 * a digest that means nothing to a member. This keeps the shell, says what
 * happened, and offers a retry.
 */
export default function EventsError({ error, reset }) {
  useEffect(() => {
    console.error('[events] render failed:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-red-500/40 bg-red-500/10 px-6 py-8 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-red-400/80">05 / Event</p>
      <h1 className="mt-2 text-lg font-semibold tracking-tight text-neutral-100">
        This event could not be shown
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-400">
        The request reached the server, but rendering the page failed. Retry, or go back to the
        dashboard and open it again.
      </p>
      {error?.message ? (
        <p className="mx-auto mt-3 max-w-md break-words font-mono text-[11px] text-red-300/80">
          {error.message}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-red-500/40 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-red-300 transition hover:bg-red-500/10"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-800 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-gray-400 transition hover:border-gray-600 hover:text-neutral-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
      </div>
    </div>
  );
}
