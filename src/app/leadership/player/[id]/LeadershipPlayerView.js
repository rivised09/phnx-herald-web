'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Coins, ExternalLink, Skull, Swords } from 'lucide-react';
import { Card, Change, compact, sectionNumber, sectionValue, WAR_ICONS } from './player-ui';
import PlayerGrowth from './PlayerGrowth';
import PlayerProfileTab from './PlayerProfileTab';

const TABS = [
  ['overview', 'Overview'],
  ['combat', 'Combat'],
  ['growth', 'Growth'],
  ['profile', 'Profile'],
];

const ACTIVITY_DEFINITION =
  'Active intervals count snapshots where kills, merits, healing or power rose since the previous snapshot. Bands: Highly Active ≥6, Active 4–5, Low Activity 1–3, Dormant 0.';

const MERIT_ICONS = {
  infantry: '/icons/infantry.svg',
  cavalry: '/icons/cavalry.svg',
  mage: '/icons/mage.svg',
  marksman: '/icons/archer.svg',
};

function Avatar({ profile }) {
  if (profile.avatar) {
    return (
      <img
        src={profile.avatar}
        alt=""
        className="h-16 w-16 shrink-0 rounded-lg border border-gray-800 object-cover"
      />
    );
  }
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-gray-800 bg-gray-800/60 font-mono text-xl text-gray-300">
      {String(profile.name || '?').slice(0, 2).toUpperCase()}
    </div>
  );
}

function Chip({ children, title, tone = 'default' }) {
  const tones = {
    default: 'border-gray-700/70 bg-gray-500/5 text-gray-300',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    sky: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  };
  return (
    <span title={title} className={`rounded border px-2 py-1 text-[11px] ${tones[tone]}`}>
      {children}
    </span>
  );
}

function StatCell({ label, children, note }) {
  return (
    <div className="bg-discord-bg-darker px-4 py-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">{label}</p>
      <p className="mt-1">{children}</p>
      {note ? <p className="mt-0.5 text-[10px] text-gray-600">{note}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ combat */

const ADVANCED_ROWS = [
  'Cavalry Merits',
  'Infantry Merits',
  'Mage Merits',
  'Marksman Merits',
  'Other Merits',
  'T4/T5 Units Dead',
  'T4/T5 Units Rss Healed',
];

function WarStatsCard({ profile }) {
  const block = (profile.sections || []).find((section) => section.section === 'War Stats');
  const rows = (block?.rows || []).filter((row) => WAR_ICONS[row.label]);
  if (!rows.length) return null;
  return (
    <Card title="War stats" description="Lifetime counters from the latest snapshot.">
      <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded border border-gray-800 bg-gray-800 sm:grid-cols-3">
        {rows.map((row) => {
          const Icon = WAR_ICONS[row.label];
          return (
            <div key={row.label} className="bg-discord-bg-darker px-3 py-3">
              <Icon className="h-6 w-6 text-white" strokeWidth={1.7} />
              <p className="mt-2 text-xs text-gray-400">{row.label}</p>
              <p className="mt-1 font-mono text-sm text-neutral-100">{row.value ?? 'No data'}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function AdvancedWarStatsCard({ profile }) {
  const block = (profile.sections || []).find((section) => section.section === 'Advanced War Stats');
  const rows = (block?.rows || []).filter((row) => ADVANCED_ROWS.includes(row.label));
  if (!rows.length) return null;
  const icons = {
    'Cavalry Merits': <img src="/icons/cavalry.svg" alt="" className="h-7 w-7 brightness-0 invert" />,
    'Infantry Merits': <img src="/icons/infantry.svg" alt="" className="h-7 w-7 brightness-0 invert" />,
    'Mage Merits': <img src="/icons/mage.svg" alt="" className="h-7 w-7 brightness-0 invert" />,
    'Marksman Merits': <img src="/icons/archer.svg" alt="" className="h-7 w-7 brightness-0 invert" />,
    'Other Merits': <Swords className="h-7 w-7 text-white" strokeWidth={1.7} />,
    'T4/T5 Units Dead': <Skull className="h-7 w-7 text-white" strokeWidth={1.7} />,
    'T4/T5 Units Rss Healed': <Coins className="h-7 w-7 text-white" strokeWidth={1.7} />,
  };
  return (
    <Card title="Advanced war stats" description="Tier-4/5 losses and healing, plus per-type merits.">
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label} className="flex min-h-16 items-center gap-3 rounded border border-gray-800 bg-gray-500/[0.03] px-3 py-2.5">
            {icons[row.label] || <span className="flex h-8 w-8 items-center justify-center rounded border border-gray-700 font-mono text-[10px] text-white">•</span>}
            <div className="min-w-0">
              <p className="text-xs leading-tight text-gray-400">{row.label}</p>
              <p className="mt-1 font-mono text-sm text-gray-200">{row.value ?? 'No data'}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LeagueCard({ title, row, kind }) {
  if (!row) {
    return (
      <Card title={title}>
        <p className="mt-3 text-xs text-gray-600">Not tracked in this window.</p>
      </Card>
    );
  }
  const winRate =
    kind === 'toc' && row.winRate != null
      ? `${row.winRate}%`
      : row.wins != null && row.matches
        ? `${Math.round(((row.wins || 0) / row.matches) * 100)}%`
        : null;
  const cells =
    kind === 'row'
      ? [
          ['Highest score', row.score?.toLocaleString('en-US') ?? '—'],
          ['Record', `${row.wins ?? 0}W / ${(row.matches ?? 0) - (row.wins ?? 0)}L`],
          ['Win rate', winRate ?? '—'],
        ]
      : [
          ['Wins', row.wins?.toLocaleString('en-US') ?? '—'],
          ['Battles', row.battles?.toLocaleString('en-US') ?? '—'],
          ['Win rate', winRate ?? '—'],
        ];
  return (
    <Card title={title}>
      <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded border border-gray-800 bg-gray-800">
        {cells.map(([label, value]) => (
          <div key={label} className="bg-discord-bg-darker px-3 py-3 text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-600">{label}</p>
            <p className="mt-1 font-mono text-sm text-neutral-100">{value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- overview */

function OverviewTab({ profile, player, dashboard }) {
  const windowDays = Math.max(1, (dashboard.snapshotCount || 1) - 1);
  const baselinePower =
    player.powerChange !== null && player.powerChange !== undefined && player.powerFull != null
      ? player.powerFull - player.powerChange
      : null;
  const powerChangePct =
    baselinePower && baselinePower > 0 && player.powerChange != null
      ? ((player.powerChange / baselinePower) * 100).toFixed(1)
      : null;
  const merits = player.merits && typeof player.merits === 'object' ? player.merits : null;
  const insights = profile.insights?.available ? profile.insights : null;
  const missing = insights?.coverage?.missing || [];

  const totals = [
    ['Units killed', sectionValue(profile, 'War Stats', 'Units Killed')],
    ['Units dead', sectionValue(profile, 'War Stats', 'Units Dead')],
    ['Units healed', sectionValue(profile, 'War Stats', 'Units Healed')],
    ['Merits', sectionValue(profile, 'War Stats', 'Merits')],
    ['Current power', player.powerFull != null ? player.powerFull.toLocaleString('en-US') : null],
    ['Rank', profile.rank ? `#${profile.rank}` : null],
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-5">
        <Card
          title="Reporting window"
          description={`Changes are measured across ${windowDays} snapshot interval${windowDays === 1 ? '' : 's'} ending ${dashboard.snapshotDate}.`}
        >
          <div className="mt-3 rounded border border-gray-800 bg-gray-500/[0.03] p-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">Baseline → now</p>
                <p className="mt-1 font-mono text-sm text-gray-300">
                  {baselinePower != null ? baselinePower.toLocaleString('en-US') : '—'}
                  <span className="mx-1.5 text-gray-600">→</span>
                  <span className="text-amber-200">{player.powerFull != null ? player.powerFull.toLocaleString('en-US') : '—'}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">Change</p>
                <p className="mt-1">
                  <Change value={player.powerChange} />
                  {powerChangePct !== null ? (
                    <span className="ml-1.5 font-mono text-[11px] text-gray-500">({powerChangePct}%)</span>
                  ) : null}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-gray-600">
              Baseline {dashboard.periodStart}, in full precision above.
            </p>
          </div>

          <div className="mt-3 rounded border border-gray-800 bg-gray-500/[0.03] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">Activity</p>
              <p className="font-mono text-[11px] text-gray-400" title={ACTIVITY_DEFINITION}>
                {player.activityDays} of {windowDays} intervals
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip tone="amber">{player.activity}</Chip>
              <Chip>{player.status}</Chip>
              <Chip>{player.alliance}</Chip>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-gray-600" title={ACTIVITY_DEFINITION}>
              {ACTIVITY_DEFINITION}
            </p>
          </div>

          {merits ? (
            <div className="mt-3 rounded border border-gray-800 bg-gray-500/[0.03] p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">Current merits by troop</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {Object.entries(MERIT_ICONS).map(([key, icon]) => (
                  <div key={key} className="rounded border border-gray-800 bg-black/10 px-2 py-2 text-center">
                    <img src={icon} alt="" className="mx-auto h-5 w-5 brightness-0 invert" />
                    <p className="mt-1 font-mono text-[11px] text-gray-300">
                      {(Number(merits[key]) || 0).toLocaleString('en-US')}
                    </p>
                    <p className="text-[9px] uppercase tracking-wider text-gray-600">{key}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <Card title="Current totals" description="Lifetime counters at the window's last snapshot.">
          <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded border border-gray-800 bg-gray-800 sm:grid-cols-3">
            {totals.map(([label, value]) => (
              <StatCell key={label} label={label}>
                <span className="font-mono text-sm text-neutral-100">{value ?? 'No data'}</span>
              </StatCell>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card title="Quick read" description="What the numbers say, in one paragraph.">
          {insights ? (
            <p className="mt-3 text-sm leading-relaxed text-gray-300">{insights.narrative.summary}</p>
          ) : (
            <p className="mt-3 text-sm text-gray-600">
              No tracked history yet - this player has no comparable snapshots in storage.
            </p>
          )}
          {missing.length ? (
            <p className="mt-2 text-[11px] text-amber-300/90">
              Not tracked for this player: {missing.join(', ')}.
            </p>
          ) : null}
          {insights?.coverage?.seasonReset ? (
            <p className="mt-2 text-[11px] text-sky-300/90">
              A new season opened during the tracked window - current-season counters restarted.
            </p>
          ) : null}
          <ul className="mt-3 space-y-1.5 border-t border-gray-800 pt-3 text-xs text-gray-400">
            {player.activity === 'Dormant' ? (
              <li>· No measurable progression in this window - worth a follow-up.</li>
            ) : null}
            {player.powerChange != null && player.powerChange < 0 ? (
              <li>· Power is down {compact(Math.abs(player.powerChange))} against the window start.</li>
            ) : null}
            {player.changes?.kills != null && player.changes.kills > 0 ? (
              <li>· Gained {player.changes.kills.toLocaleString('en-US')} kills in the window.</li>
            ) : null}
            {player.activityDays >= windowDays ? (
              <li>· Progressed in every interval of the window - fully active.</li>
            ) : null}
          </ul>
        </Card>

        <Card title="Coverage" description="How much of this player's history is in storage.">
          <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded border border-gray-800 bg-gray-800">
            {[
              ['Snapshots', insights?.coverage?.snapshots ?? profile.history?.length ?? 0],
              ['First seen', insights?.coverage?.first ?? '—'],
              ['Last seen', insights?.coverage?.last ?? '—'],
            ].map(([label, value]) => (
              <div key={label} className="bg-discord-bg-darker px-3 py-3 text-center">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-600">{label}</p>
                <p className="mt-1 font-mono text-[11px] text-neutral-200">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-gray-600">
            {profile.snapshotDates?.length ?? 0} stored snapshot dates ·{' '}
            {profile.requestedDate ? `pinned to ${profile.requestedDate}` : 'newest window'}
          </p>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- view */

export default function LeadershipPlayerView({ profile, player, dashboard, date }) {
  const [tab, setTab] = useState('overview');
  const backHref = date ? `/leadership?date=${encodeURIComponent(date)}` : '/leadership';
  const tocRecord =
    player.toc?.wins != null && player.toc?.battles
      ? `${player.toc.wins}/${player.toc.battles}`
      : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500 transition hover:text-amber-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to leadership
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
            Snapshot {profile.snapshotDate}
            {!profile.isLatest ? ' (pinned)' : ''}
          </span>
          <Link
            href={`/roster/player/${encodeURIComponent(profile.id)}${date ? `?date=${encodeURIComponent(date)}` : ''}`}
            className="inline-flex items-center gap-1.5 rounded border border-gray-800 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 transition hover:border-gray-600 hover:text-neutral-200"
            title="The public profile with the full stat blocks, radar and gallery"
          >
            Full profile <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="overflow-hidden rounded-md border border-gray-800 bg-discord-bg-darker">
        <div className="flex flex-col gap-4 border-b border-gray-800 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar profile={profile} />
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
                Leadership profile · #{profile.id} · Server {dashboard.server}
              </p>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-neutral-100">
                {profile.name}
              </h1>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Chip tone="amber">{player.activity}</Chip>
                {/* The role word for a Dormant player is "Dormant" too - showing
                    both chips reads as a duplicate, so only roles that add
                    information are shown. */}
                {player.status !== player.activity ? <Chip>{player.status}</Chip> : null}
                <Chip title={ACTIVITY_DEFINITION}>
                  {player.activityDays} active interval{player.activityDays === 1 ? '' : 's'}
                </Chip>
                <Chip>{player.alliance}</Chip>
                {player.row?.score != null ? (
                  <Chip tone="sky" title="Highest Roots of War score on record">
                    RoW {Number(player.row.score).toLocaleString('en-US')}
                  </Chip>
                ) : null}
                {tocRecord ? (
                  <Chip tone="emerald" title="Tournament of Champions record">
                    ToC {tocRecord}
                  </Chip>
                ) : null}
              </div>
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded border border-gray-800 bg-gray-800 lg:min-w-72">
            <div className="bg-discord-bg-darker px-4 py-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">Power</p>
              <p className="mt-1 font-mono text-lg text-amber-200">
                {player.powerFull != null ? player.powerFull.toLocaleString('en-US') : '—'}
              </p>
            </div>
            <div className="bg-discord-bg-darker px-4 py-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">Rank</p>
              <p className="mt-1 font-mono text-lg text-gray-200">
                {profile.rank ? `#${profile.rank}` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Delta strip */}
        <div className="grid grid-cols-2 gap-px bg-gray-800 sm:grid-cols-3 lg:grid-cols-6">
          <StatCell label="Power Δ"><Change value={player.powerChange} /></StatCell>
          <StatCell label="Kills Δ"><Change value={player.changes?.kills} /></StatCell>
          <StatCell label="Deaths Δ"><Change value={player.changes?.deaths} /></StatCell>
          <StatCell label="Healing Δ"><Change value={player.changes?.healing} /></StatCell>
          <StatCell label="Merit Δ"><Change value={player.changes?.merits} /></StatCell>
          <StatCell label="Kill / Death" note="lifetime ratio">
            {(() => {
              const kills = sectionNumber(profile, 'War Stats', 'Units Killed');
              const deaths = sectionNumber(profile, 'War Stats', 'Units Dead');
              return kills != null && deaths ? (
                <span className="font-mono text-sm text-gray-200">{(kills / deaths).toFixed(2)}×</span>
              ) : (
                <span className="font-mono text-sm text-gray-600">—</span>
              );
            })()}
          </StatCell>
        </div>
      </section>

      {/* Tabs */}
      <nav className="flex gap-2 border-b border-gray-800" aria-label="Player sections">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] transition ${
              tab === key
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'overview' ? <OverviewTab profile={profile} player={player} dashboard={dashboard} /> : null}
      {tab === 'combat' ? (
        <div className="space-y-5">
          <WarStatsCard profile={profile} />
          <AdvancedWarStatsCard profile={profile} />
          <div className="grid gap-5 lg:grid-cols-2">
            <LeagueCard title="Roots of War" row={player.row} kind="row" />
            <LeagueCard title="Tournament of Champions" row={player.toc} kind="toc" />
          </div>
        </div>
      ) : null}
      {tab === 'growth' ? <PlayerGrowth profile={profile} /> : null}
      {tab === 'profile' ? <PlayerProfileTab profile={profile} player={player} /> : null}
    </div>
  );
}
