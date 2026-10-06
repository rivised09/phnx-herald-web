import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import DetailSearch from '../../components/home/DetailSearch';
import Avatar from './Avatar';
import PlayerInsights from './PlayerInsights';
import SnapshotPicker from './SnapshotPicker';

function StatGrid({ cells }) {
  return (
    <dl className="grid grid-cols-2 gap-px bg-gray-800 sm:grid-cols-4">
      {cells.map(([label, value]) => (
        <div key={label} className="bg-discord-surface px-3 py-3">
          <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">{label}</dt>
          <dd className="mt-1 truncate text-sm text-neutral-100">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Chip({ label, value, accent = false }) {
  return (
    <span
      className={`inline-flex max-w-full items-baseline gap-1.5 rounded border px-2 py-1 ${
        accent ? 'border-amber-500/30 bg-amber-500/10' : 'border-gray-700/70 bg-gray-500/5'
      }`}
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">{label}</span>
      <span className={`truncate text-xs ${accent ? 'text-amber-200' : 'text-neutral-100'}`}>
        {value}
      </span>
    </span>
  );
}

export default function DetailView({ kind, data }) {
  const player = kind === 'player';
  // The source's own Profile block: it reads like a caption for the account, so
  // it sits in the header rather than behind a tab.
  const profile = player ? (data.sections || []).find((block) => !block.section) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500 transition hover:text-neutral-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {player ? 'players' : 'alliances'}
        </Link>

        {/* The home page's lookup box, kept on the far right of every roster
            page so the way out of the current account is always one keystroke
            away. */}
        <div className="ml-auto w-full max-w-sm">
          <DetailSearch />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-gray-800 bg-discord-surface">
        {player ? (
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
              <Avatar
                name={data.name}
                src={data.avatar}
                className="h-16 w-16"
                textClass="text-lg"
              />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
                  Lord / Player
                </p>
                <h1 className="mt-1 truncate text-xl font-semibold text-neutral-100">
                  {data.name}
                </h1>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Chip label="Rank" value={`#${data.rank ?? '—'}`} accent />
                  <Chip label="Power" value={data.power || '—'} accent />
                  <Chip label="Alliance" value={data.alliance?.name || 'Unaffiliated'} />
                  <Chip label="Captured" value={data.snapshotDate} />
                </div>
              </div>

              <SnapshotPicker
                id={data.id}
                dates={data.snapshotDates}
                active={data.snapshotDate}
                isLatest={data.isLatest}
              />
            </div>
          </div>
        ) : (
          <div className="border-b border-gray-800 px-4 py-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
                  Alliance
                </p>
                <h1 className="text-lg font-semibold text-neutral-100">{data.name}</h1>
              </div>
            </div>
          </div>
        )}

        {player && profile && profile.rows.length ? (
          <div className="border-b border-gray-800 px-4 py-4">
            <div className="mb-3">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">
                Source figures{data.sectionsDate ? ` · ${data.sectionsDate}` : ''}
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                Recorded verbatim from the player&apos;s own page.
              </p>
            </div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">
              Profile
            </h3>
            <dl className="mt-2 grid gap-x-5 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {profile.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-3 border-b border-gray-800/70 pb-1.5"
                >
                  <dt className="truncate text-xs text-neutral-300">{row.label}</dt>
                  <dd className="shrink-0 font-mono text-[11px] text-neutral-100">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {!player && (
          <StatGrid
            cells={[
              ['Rank', data.rank || '—'],
              ['Power', data.power || '—'],
              ['Members', data.memberCount],
              ['Snapshot', data.snapshotDate],
            ]}
          />
        )}

        {player && (
          <PlayerInsights
            insights={data.insights}
            achievements={data.achievements}
            history={data.history}
            radar={data.insights?.radar}
            sections={data.sections}
            sectionsDate={data.sectionsDate}
          />
        )}

        {!player && (
          <div className="border-t border-gray-800">
            <div className="border-b border-gray-800 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
              Members · {data.players.length}
            </div>
            <div className="divide-y divide-gray-800/80">
              {data.players.map((item) => (
                <Link
                  key={item.id}
                  href={`/roster/player/${item.id}`}
                  className="flex items-center justify-between px-4 py-2.5 text-sm transition hover:bg-gray-500/5"
                >
                  <span className="text-neutral-100">{item.name}</span>
                  <span className="font-mono text-[10px] text-gray-500">
                    #{item.rank || '—'} · {item.power || '—'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
