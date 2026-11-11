'use client';

import { RefreshCw, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * "The data exists but could not be read right now."
 *
 * The leadership pages used to answer a transient read failure with a 404
 * (the dashboard builder returned null when every snapshot in the window
 * failed to load), which made the page look like it did not exist. This
 * state keeps the page alive and offers the one thing that fixes it: a retry.
 */
export default function LeadershipUnavailable({ detail }) {
  const router = useRouter();
  return (
    <div className="space-y-5">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">
          03 / Leadership
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">Leadership</h1>
      </div>

      <div
        role="alert"
        className="flex flex-col items-center gap-4 rounded-md border border-amber-500/30 bg-amber-500/[0.06] px-6 py-12 text-center"
      >
        <TriangleAlert className="h-8 w-8 text-amber-300" />
        <div>
          <p className="text-sm font-medium text-neutral-100">
            Leadership data is unavailable right now
          </p>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-gray-500">
            The roster could not be read at this moment - usually a slow or interrupted
            snapshot fetch. Nothing is wrong with your access; retry in a few seconds.
          </p>
          {detail ? (
            <p className="mt-2 font-mono text-[10px] text-gray-600">{detail}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="inline-flex items-center gap-2 rounded border border-amber-400/50 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-300 transition hover:bg-amber-400/10"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    </div>
  );
}
