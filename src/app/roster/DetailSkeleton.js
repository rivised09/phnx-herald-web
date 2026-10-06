import { ArrowLeft, Shield } from 'lucide-react';

/**
 * The first paint of a roster detail page. The page itself has to wait for the
 * bot's database read before it can say anything at all - name, chips and
 * stats all come from the same payload - so instead of a blank route this
 * mirrors the real layout's silhouette and holds the space the answer will
 * drop into. That also means a prefetch (which only gets as far as this
 * boundary) gives every click an instant response.
 *
 * Blocks pulse at the same rhythm as the rest of the app's loading states, and
 * the outer element is a status landmark so the wait is announced rather than
 * silent.
 */
function Bar({ className = '' }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded bg-gray-800 ${className}`} />;
}

export function PlayerDetailSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading player profile">
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Loading player
      </span>

      <div className="overflow-hidden rounded-md border border-gray-800 bg-discord-surface">
        <div className="relative overflow-hidden border-b border-gray-800">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/12 via-transparent to-sky-500/8"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 right-[-5rem] h-56 w-56 rounded-full bg-amber-400/10 blur-3xl"
          />

          <div className="relative flex items-start gap-4 px-4 py-5">
            <span
              aria-hidden="true"
              className="h-16 w-16 shrink-0 animate-pulse rounded-lg border border-gray-700 bg-gray-800"
            />
            <div className="min-w-0 flex-1 space-y-3">
              <Bar className="h-2.5 w-24" />
              <Bar className="h-6 w-56 max-w-full" />
              <div className="flex flex-wrap gap-1.5">
                <Bar className="h-7 w-24" />
                <Bar className="h-7 w-20" />
                <Bar className="h-7 w-32" />
                <Bar className="h-7 w-28" />
              </div>
            </div>
            <Bar className="hidden h-9 w-40 shrink-0 sm:block" />
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-gray-800 px-3 py-3" aria-hidden="true">
          <Bar className="h-6 w-24" />
          <Bar className="h-6 w-20" />
          <Bar className="h-6 w-20" />
          <Bar className="h-6 w-24" />
          <Bar className="h-6 w-20" />
        </div>

        <div className="space-y-5 px-4 py-4" aria-hidden="true">
          <div className="space-y-2">
            <Bar className="h-2.5 w-32" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Bar className="h-12" />
              <Bar className="h-12" />
              <Bar className="h-12" />
              <Bar className="h-12" />
              <Bar className="h-12" />
              <Bar className="h-12" />
            </div>
          </div>

          <div className="space-y-2">
            <Bar className="h-2.5 w-40" />
            <Bar className="h-9 w-full" />
            <Bar className="h-9 w-full" />
            <Bar className="h-9 w-full" />
            <Bar className="h-9 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AllianceDetailSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading alliance profile">
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Loading alliance
      </span>

      <div className="overflow-hidden rounded-md border border-gray-800 bg-discord-surface">
        <div className="border-b border-gray-800 px-4 py-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-gray-400" aria-hidden="true" />
            <div className="min-w-0 flex-1 space-y-2">
              <Bar className="h-2.5 w-24" />
              <Bar className="h-5 w-64 max-w-full" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-gray-800 sm:grid-cols-4" aria-hidden="true">
          {[0, 1, 2, 3].map((cell) => (
            <div key={cell} className="bg-discord-surface px-3 py-3">
              <Bar className="h-2.5 w-16" />
              <Bar className="mt-2 h-4 w-24" />
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800" aria-hidden="true">
          <div className="border-b border-gray-800 px-4 py-2">
            <Bar className="h-2.5 w-32" />
          </div>
          <div className="divide-y divide-gray-800/80">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => (
              <div key={row} className="flex items-center justify-between px-4 py-2.5">
                <Bar className="h-4 w-40" />
                <Bar className="h-3 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
