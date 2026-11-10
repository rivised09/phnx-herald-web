/**
 * Shown while the leadership RSC is assembling the dashboard. The dashboard
 * reads one pre-aggregated window summary (or, as a fallback, the player
 * histories), so the first paint should arrive quickly - this skeleton keeps
 * the page honest about the wait instead of showing a blank screen.
 */
export default function LeadershipSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading leadership dashboard">
      <span className="sr-only">Loading leadership dashboard…</span>

      {/* Header: eyebrow, title, controls, window line */}
      <div>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <div className="h-2.5 w-28 animate-pulse rounded bg-gray-800" />
            <div className="mt-2 h-7 w-44 animate-pulse rounded bg-gray-800" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-9 w-full animate-pulse rounded-md bg-gray-800 sm:w-72" />
            <div className="h-9 w-32 animate-pulse rounded-md bg-gray-800" />
            <div className="h-9 w-24 animate-pulse rounded-md bg-gray-800" />
            <div className="hidden h-9 w-24 animate-pulse rounded-md bg-gray-800 sm:block" />
          </div>
        </div>
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-gray-800" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-gray-800">
        {[76, 68, 88, 52].map((width, i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded-t-md bg-gray-800"
            style={{ width }}
          />
        ))}
      </div>

      {/* Kingdom activity: reporting window + active players */}
      <div className="grid gap-4 sm:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-md border border-gray-800 bg-discord-bg-darker p-4">
          <div className="h-3 w-32 animate-pulse rounded bg-gray-800" />
          <div className="mt-4 h-4 w-40 animate-pulse rounded bg-gray-800" />
          <div className="mt-3 h-4 w-28 animate-pulse rounded bg-gray-800" />
          <div className="mt-6 h-10 w-full animate-pulse rounded bg-gray-800" />
        </div>
        <div className="rounded-md border border-gray-800 bg-discord-bg-darker p-4">
          <div className="h-3 w-36 animate-pulse rounded bg-gray-800" />
          <div className="mt-4 h-10 w-40 animate-pulse rounded bg-gray-800" />
          <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-gray-800" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="h-14 animate-pulse rounded border border-gray-800 bg-gray-800/40" />
            <div className="h-14 animate-pulse rounded border border-gray-800 bg-gray-800/40" />
          </div>
        </div>
      </div>

      {/* Summary + attention */}
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-md border border-gray-800 bg-discord-bg-darker p-4">
          <div className="h-3 w-36 animate-pulse rounded bg-gray-800" />
          <div className="mt-4 h-24 w-full animate-pulse rounded bg-gray-800" />
        </div>
        <div className="rounded-md border border-gray-800 bg-discord-bg-darker p-4">
          <div className="h-3 w-40 animate-pulse rounded bg-gray-800" />
          <div className="mt-4 space-y-2">
            <div className="h-10 w-full animate-pulse rounded bg-gray-800" />
            <div className="h-10 w-full animate-pulse rounded bg-gray-800" />
          </div>
        </div>
      </div>

      {/* Trend chart placeholder */}
      <div className="h-64 animate-pulse rounded-md border border-gray-800 bg-discord-bg-darker" />
    </div>
  );
}
