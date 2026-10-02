export default function DashboardSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2" role="status" aria-label="Loading events">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-800 bg-discord-surface p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="h-3 w-1/3 animate-pulse rounded bg-gray-800" />
            <div className="h-4 w-16 animate-pulse rounded-full border border-gray-800 bg-gray-800" />
          </div>
          <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-gray-800" />
          <div className="mt-4 h-px w-full bg-gray-800" />
          <div className="mt-3 space-y-2">
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-gray-800" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}