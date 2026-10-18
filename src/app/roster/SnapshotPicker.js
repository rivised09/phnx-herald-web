'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { History, Loader2 } from 'lucide-react';
import { useT } from '../../components/i18n/LocaleProvider';
import LoadingOverlay from '../../components/LoadingOverlay';

/**
 * Which stored snapshot the profile is reading. The newest one is the default,
 * so this only appears once there is more than one date to pick from. Selecting
 * an older date navigates, which re-renders the server component with that
 * date's rows rather than relabelling today's data.
 *
 * The navigation is a server round trip, so the control takes the picked value
 * immediately and runs the route change inside a transition. The select never
 * snaps back to the old date while the new payload is on its way, and the
 * centered loading card stands over the page from the pick until the new date
 * arrives - the route's loading screen keeps the same card up for the rest of
 * the switch, so one wait reads the same way end to end.
 *
 * `kind` names the detail route the picker sits on (the alliance profile got
 * the same picker as the player one), so a pick stays on its own kind instead
 * of always pushing the player route.
 */
export default function SnapshotPicker({ id, dates = [], active, isLatest = true, kind = 'player' }) {
  const router = useRouter();
  const t = useT();
  const latest = dates[0];
  const [selected, setSelected] = useState(active || latest);
  const [isPending, startTransition] = useTransition();

  // Back/forward and any server-driven change land here with the real value,
  // so an optimistic pick only stands until the router reports the truth.
  useEffect(() => {
    setSelected(active || latest);
  }, [active, latest]);

  if (!id || !Array.isArray(dates) || dates.length < 2) return null;

  return (
    <div className="flex w-full flex-col items-start gap-1.5 sm:w-auto sm:shrink-0 sm:items-end">
      <label className="inline-flex w-full flex-col items-stretch gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500 sm:w-auto sm:flex-row sm:items-center sm:gap-2 sm:gap-y-0">
        <span className="inline-flex items-center gap-2">
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <History className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          {isPending ? t('roster.loading') : t('roster.snapshot')}
        </span>
        <select
          aria-label={t('roster.snapshotDateAria')}
          aria-busy={isPending}
          value={selected || active || latest}
          onChange={(event) => {
            const next = event.target.value;
            setSelected(next);
            startTransition(() => {
              router.push(
                `/roster/${kind}/${encodeURIComponent(id)}?date=${encodeURIComponent(next)}`,
              );
            });
          }}
          className="w-full min-w-0 cursor-pointer rounded-md border border-gray-700/70 bg-discord-bg-darker px-2 py-1.5 font-mono text-[11px] tracking-normal text-neutral-100 outline-none transition hover:border-gray-500 focus:border-gray-400 sm:w-auto sm:py-1"
        >
          {dates.map((date) => (
            <option key={date} value={date}>
              {date === latest ? t('roster.latest', { date }) : date}
            </option>
          ))}
        </select>
      </label>

      {!isLatest && (
        <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-amber-200">
          {t('roster.archived', { latest })}
        </span>
      )}

      {/* The pick owns the wait until the new date's page takes over. */}
      {isPending && (
        <LoadingOverlay
          labelKey={kind === 'alliance' ? 'roster.loadingAlliance' : 'roster.loadingPlayer'}
        />
      )}
    </div>
  );
}
