'use client';

import Link from 'next/link';
import TroopIcon from './TroopIcons';

// Source order: the four troop types as the stats site lists them.
const MERIT_ORDER = ['infantry', 'cavalry', 'marksman', 'mage'];

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
  // The source hands out root-relative paths (its own /image-proxy/ routes,
  // which this site serves too). new URL() throws on those without a base,
  // which used to blank the photo out to initials - so they pass straight
  // through, the same guard Avatar.js uses, placeholder asset excepted.
  if (value.startsWith('/')) {
    return /codweb_all_three_avatar|\/static\/images\//.test(value) ? null : value;
  }
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
  meritLabels = null,
  linkDate = null,
}) {
  if (!players?.length) return null;

  // A date pinned in the home filter rides on every row link, so the click
  // lands on that snapshot's detail - where the detail's own picker then shows
  // the same date. Unpinned rows open the newest snapshot as before.
  const dateQuery = linkDate ? `?date=${encodeURIComponent(linkDate)}` : '';

  const frame = bare
    ? 'divide-y divide-gray-800/80 overflow-hidden'
    : 'divide-y divide-gray-800/80 overflow-hidden rounded-lg border border-gray-800 bg-discord-surface';

  return (
    <ul className={frame}>
      {players.map((player) => {
        const stats = Object.entries(player.stats || {});

        // Alternating stripes: odd rows darker, even rows a shade lighter
        // over the panel surface; hover still trumps both.
        return (
          <li
            key={player.id}
            className="transition odd:bg-black/30 even:bg-white/[0.02] hover:bg-gray-500/5"
          >
            {/* The whole row is the link, so a thumb landing anywhere on a
                roster row still opens it. */}
            <Link
              href={
                (itemType === 'alliance'
                  ? `/roster/alliance/${encodeURIComponent(player.id)}`
                  : `/roster/player/${encodeURIComponent(player.id)}`) + dateQuery
              }
              // Top-aligned so the avatar sits on the name line instead of
              // floating centered between the name and the merits block.
              className="flex items-start gap-3 px-3 py-2 sm:px-4"
            >
              {/* Alliances have no portrait at all - the source never supplies
                  one - so the box on that tab only ever held two initials and
                  is left out entirely; the name starts at the row edge. */}
              {itemType !== 'alliance' && (
                <span className="relative -mt-1 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-700 bg-gray-500/10 font-mono text-[9px] text-gray-400">
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
              )}
              <div className="min-w-0 flex-1">
                {/* Line one: the name with rank and power on its right edge. */}
                <div className="flex items-center gap-3">
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
                </div>

                {/* Line two: a dashed rule under the name, then the four
                    troop types in equal columns - four across from sm up,
                    two per row on phones with a hairline between the rows.
                    Players without stored merits (older payloads,
                    alliances) show none of it. */}
                {player.merits && (
                  <div className="mt-2 border-t border-dashed border-gray-700/70 pt-1.5">
                    <ul className="grid grid-cols-2 sm:grid-cols-4">
                      {MERIT_ORDER.map((key, index) => {
                        const count = Number(player.merits[key]) || 0;
                        const title = meritLabels?.[key] || key;
                        return (
                          <li
                            key={key}
                            title={`${title}: ${count.toLocaleString()}`}
                            className={[
                              'flex items-center gap-1.5 border-gray-800/80 py-1.5',
                              // Column rules: between the two phone columns
                              // (indices 1 and 3); from sm up the grid is one
                              // row of four, so index 2 joins in as well.
                              index === 1 || index === 3
                                ? 'border-l pl-2'
                                : index === 2
                                  ? 'sm:border-l sm:pl-2'
                                  : '',
                              // Phone-only rule between the two merit rows.
                              index >= 2 ? 'border-t sm:border-t-0' : '',
                            ].join(' ')}
                          >
                            <TroopIcon type={key} className="h-3.5 w-3.5 shrink-0 text-white" />
                            <span className="font-mono text-[10px] tabular-nums text-gray-300">
                              {count.toLocaleString()}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
