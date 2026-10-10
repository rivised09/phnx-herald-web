'use client';

import Link from 'next/link';

function humanize(key) {
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

export { humanize };

function imageSrc(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.hostname === 'oss-resource.farlightgames.com') {
      const encoded = btoa(url.toString())
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      return `/image-proxy/${encoded}`;
    }
  } catch {
    return null;
  }
  return value;
}

/**
 * Renders whatever stats the stored roster supplies. Stat fields are not fixed,
 * so keys are displayed generically: a new field appears here without a UI
 * change. The home page passes `noStatsLabel` and `statLabel` so this shared
 * row can speak the visitor's language; other callers keep the English
 * defaults.
 *
 * `bare` drops the card chrome so a section can wrap the rows itself and keep
 * its pagination controls in the same box.
 */
export default function PlayerRoster({
  players,
  bare = false,
  itemType = 'player',
  noStatsLabel = 'No stats yet',
  statLabel = null,
}) {
  if (!players?.length) return null;

  const frame = bare
    ? 'divide-y divide-gray-800/80 overflow-hidden'
    : 'divide-y divide-gray-800/80 overflow-hidden rounded-lg border border-gray-800 bg-discord-surface';

  return (
    <ul className={frame}>
      {players.map((player) => {
        const stats = Object.entries(player.stats || {});

        return (
          <li key={player.id} className="transition hover:bg-gray-500/5">
            {/* The whole row is the link, so a thumb landing anywhere on a
                roster row still opens it. */}
            <Link
              href={
                itemType === 'alliance'
                  ? `/roster/alliance/${encodeURIComponent(player.id)}`
                  : `/roster/player/${encodeURIComponent(player.id)}`
              }
              className="flex items-center gap-3 px-3 py-2 sm:px-4"
            >
              <span className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-700 bg-gray-500/10 font-mono text-[9px] text-gray-400">
                {player.name.slice(0, 2).toUpperCase()}
                {imageSrc(player.avatar) && (
                  <img
                    src={imageSrc(player.avatar)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => {
                      // Keep the initials underneath rather than leaving a
                      // broken-image hole when the source URL is dead.
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-neutral-100">
                {player.name}
              </span>

              {stats.length === 0 ? (
                <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-gray-600">
                  {noStatsLabel}
                </span>
              ) : (
                <dl className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 sm:gap-x-4">
                  {stats.map(([key, value]) => (
                    <div key={key} className="flex items-baseline gap-1.5">
                      <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-600">
                        {statLabel ? statLabel(key) : humanize(key)}
                      </dt>
                      <dd className="font-mono text-[11px] tabular-nums text-neutral-100">
                        {String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
