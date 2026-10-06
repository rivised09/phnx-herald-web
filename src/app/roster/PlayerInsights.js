'use client';

import { useState } from 'react';
import {
  Swords,
  TrendingUp,
  Target,
  Trophy,
  Sparkles,
  Shield,
  LayoutDashboard,
  Wheat,
  Building2,
  Hammer,
  Users,
  Scale,
  Info,
} from 'lucide-react';
import PlayerRadar from './PlayerRadar';
import PlayerStatsChart from './PlayerStatsChart';

const LEVEL_STROKE = {
  strong: 'stroke-amber-400',
  good: 'stroke-emerald-400',
  steady: 'stroke-sky-400',
  building: 'stroke-zinc-400',
  new: 'stroke-zinc-600',
  unknown: 'stroke-zinc-700',
};

/** One icon per archetype, so the badge says which profile the account reads as. */
const ARCHETYPE_ICON = {
  warlord: Swords,
  guardian: Shield,
  architect: Hammer,
  rallyer: Users,
  settler: Wheat,
  riser: TrendingUp,
  balanced: Scale,
};

const LEVEL_TEXT = {
  strong: 'text-amber-300',
  good: 'text-emerald-300',
  steady: 'text-sky-300',
  building: 'text-zinc-300',
  new: 'text-zinc-500',
  unknown: 'text-zinc-600',
};

const ACTIVITY_COLOR = {
  surging: 'text-amber-300',
  active: 'text-emerald-300',
  steady: 'text-sky-300',
  quiet: 'text-zinc-400',
  idle: 'text-zinc-600',
  unknown: 'text-zinc-700',
};

/**
 * One row per thing that can be measured, keyed by the stable key the API
 * already ships for progress, comparison, gains, milestones and efficiency.
 * It mirrors the bot's TRACKED list on purpose: a metric added there needs a
 * home here, and an unknown key simply falls out of every category tab rather
 * than landing somewhere wrong.
 */
const CATEGORY = {
  power: 'building',
  rank: 'building',
  kills: 'combat',
  deaths: 'combat',
  healed: 'combat',
  merits: 'combat',
  victories: 'combat',
  defeats: 'combat',
  killDeath: 'combat',
  healDeath: 'combat',
  winRate: 'combat',
  meritPower: 'combat',
  t45LossShare: 'combat',
  gathered: 'farming',
  donations: 'farming',
};

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'combat', label: 'Fighting', icon: Swords },
  { key: 'farming', label: 'Farming', icon: Wheat },
  { key: 'building', label: 'Building', icon: Building2 },
  { key: 'records', label: 'Records', icon: Trophy },
];

/**
 * Where the source's own stat blocks land.
 *
 * The bot ships them grouped under the heading the source printed them under,
 * so this map is the only thing deciding which tab a block belongs to, and the
 * array order is the order blocks appear inside that tab rather than the
 * alphabetical order the database happens to return. A heading the source adds
 * later is known to neither side and is appended to Overview instead of being
 * dropped.
 */
const SECTION_ORDER = {
  overview: [''],
  combat: [
    'War Stats',
    'Advanced War Stats',
    'Extra War Stats',
    'Historical Season Stats',
    'Tournament of Champion Stats',
    'Roots of War Stats',
    'Root of War League Stats',
    'Historic Tiered Kills',
  ],
  farming: ['Gathered Resources', 'Extra Resource Stats', 'Historic Resources Spent'],
  building: ['Power Spread', 'Alliance Activity'],
};

const SECTION_TAB = new Map(
  Object.entries(SECTION_ORDER).flatMap(([tab, names]) => names.map((name) => [name, tab])),
);

const SECTION_TITLE = { '': 'Profile' };

function blocksFor(tab, sections) {
  const known = [];
  const unknown = [];
  for (const block of sections || []) {
    // The Profile block (empty section name) is rendered in the page header.
    if (!block.section) continue;
    if (SECTION_TAB.get(block.section) === tab) known.push(block);
    else if (tab === 'overview' && !SECTION_TAB.has(block.section)) unknown.push(block);
  }
  const order = SECTION_ORDER[tab] || [];
  known.sort((a, b) => order.indexOf(a.section) - order.indexOf(b.section));
  return [...known, ...unknown];
}

function StatBlocks({ tab, sections, date }) {
  const blocks = blocksFor(tab, sections);
  if (!blocks.length) return null;
  return (
    <Section
      title={date ? `Source figures · ${date}` : 'Source figures'}
      hint="Recorded verbatim from the player's own page."
    >
      <div className="space-y-5">
        {blocks.map((block) => (
          <div key={block.section || 'profile'}>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">
              {SECTION_TITLE[block.section] || block.section}
            </h3>
            <dl className="mt-2 grid gap-x-5 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {block.rows.map((row) => (
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
        ))}
      </div>
    </Section>
  );
}

function inCategory(category, row) {
  return CATEGORY[row.key] === category;
}

function number(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('en-US')
    : '—';
}

function Section({ title, hint, children, action }) {
  return (
    <section className="border-t border-gray-800 px-4 py-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">
            {title}
          </h2>
          {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }) {
  return <p className="text-xs text-gray-600">{children}</p>;
}

/**
 * One indicator as a ring instead of a bar: the arc carries the score, the
 * centre carries the label and the reading, so the five sit side by side and
 * read as a set rather than as five separate rows.
 */
function ProfileRing({ signal }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const score = typeof signal.score === 'number' && Number.isFinite(signal.score) ? signal.score : 0;
  const filled = circumference * Math.min(Math.max(score, 0), 1);

  return (
    <li className="flex w-full min-w-0 flex-col items-center">
      <div className="relative mx-auto aspect-square w-full max-w-[104px]">
        <svg
          viewBox="0 0 104 104"
          className="absolute inset-0 h-full w-full -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="52"
            cy="52"
            r={radius}
            fill="none"
            strokeWidth="8"
            className="stroke-gray-800"
          />
          <circle
            cx="52"
            cy="52"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={LEVEL_STROKE[signal.level] || LEVEL_STROKE.unknown}
            strokeDasharray={`${filled} ${circumference - filled}`}
          />
        </svg>
        {/* The reading sits in the middle of its own ring; the name of what is
            being read sits underneath, where it has room to wrap. */}
        <div className="absolute inset-0 flex items-center justify-center px-2 text-center">
          <span
            className={`font-mono text-[11px] uppercase leading-tight tracking-[0.08em] ${LEVEL_TEXT[signal.level] || LEVEL_TEXT.unknown}`}
          >
            {signal.level}
          </span>
        </div>
      </div>
      <span className="mt-2 block text-center font-mono text-[9px] uppercase leading-tight tracking-[0.1em] text-neutral-300">
        {signal.label}
      </span>
    </li>
  );
}

function Delta({ row }) {
  if (row.direction === 'reset') {
    return <span className="font-mono text-[11px] text-amber-300">new season</span>;
  }
  const tone =
    row.better === null
      ? 'text-gray-500'
      : row.better
        ? 'text-emerald-300'
        : 'text-rose-300';
  return <span className={`font-mono text-[11px] ${tone}`}>{row.deltaPctText}</span>;
}

function ProgressTable({ rows, hint }) {
  return (
    <Section
      title="Personal progress"
      hint={
        rows.length
          ? hint
          : 'Two snapshots are needed before progress can be measured in this area.'
      }
    >
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left">
            <thead>
              <tr className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-600">
                <th className="pb-2 font-normal">Metric</th>
                <th className="pb-2 text-right font-normal">Then</th>
                <th className="pb-2 text-right font-normal">Now</th>
                <th className="pb-2 text-right font-normal">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/70">
              {rows.map((row) => (
                <tr key={row.key} className="text-sm">
                  <td className="py-1.5 text-neutral-200">
                    {row.label}
                    {row.note ? (
                      <span className="mt-0.5 block text-[11px] text-amber-300/80">{row.note}</span>
                    ) : null}
                  </td>
                  <td className="py-1.5 text-right font-mono text-[11px] text-gray-500">
                    {number(row.from)}
                  </td>
                  <td className="py-1.5 text-right font-mono text-[11px] text-neutral-100">
                    {number(row.to)}
                  </td>
                  <td className="py-1.5 text-right">
                    <Delta row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Section>
  );
}

function EfficiencyGrid({ rows }) {
  if (!rows.length) return null;
  return (
    <Section title="Efficiency" hint="How effectively this account converts effort into results.">
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.key} className="rounded-sm border border-gray-800 bg-black/20 px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-neutral-200">{row.label}</span>
              <span className="font-mono text-[11px] text-amber-300">{row.text}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-600">{row.narrative}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ComparisonList({ rows, hint }) {
  if (!rows.length) return null;
  return (
    <Section title="Since the last reading" hint={hint}>
      <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-baseline justify-between gap-3 border-b border-gray-800/70 pb-1.5 text-xs"
          >
            <span className="truncate text-neutral-200">{row.label}</span>
            <span className="shrink-0 font-mono text-[11px] text-gray-600">
              {number(row.previous)} → {number(row.recent)}
            </span>
            <span className="w-20 shrink-0 text-right">
              <Delta row={row} />
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function GainsList({ rows }) {
  if (!rows.length) return null;
  return (
    <Section title="Biggest gains" hint="Where this area moved the most over the window.">
      <div className="flex flex-wrap gap-2">
        {rows.map((row) => (
          <div key={row.key} className="rounded-sm border border-gray-800 bg-black/20 px-3 py-2">
            <p className="text-[11px] text-gray-500">{row.label}</p>
            <p className="font-mono text-sm text-emerald-300">
              {row.deltaText}
              <span className="ml-1.5 text-[11px] text-gray-600">{row.deltaPctText}</span>
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function MilestoneBars({ rows }) {
  return (
    <Section title="Milestones" hint="Next round-number target for each tracked stat.">
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.key}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-neutral-200">{row.label}</span>
                <span className="font-mono text-[11px] text-gray-500">
                  {row.currentText} / {row.targetText}
                  <span className="ml-2 text-gray-600">
                    {Math.round(row.pct)}% · {row.remainingText} to go
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${Math.max(2, row.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty>No tracked stat in this area has a value yet.</Empty>
      )}
    </Section>
  );
}

function TabBar({ active, onChange }) {
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 py-2" aria-label="Player sections">
      {TABS.map((item) => {
        const Icon = item.icon;
        const selected = active === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            aria-current={selected ? 'page' : undefined}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-sm px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition ${
              selected
                ? 'bg-amber-500/15 text-amber-300'
                : 'text-gray-500 hover:bg-gray-500/5 hover:text-neutral-200'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${selected ? 'text-amber-400' : 'text-gray-600'}`} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export default function PlayerInsights({
  insights,
  achievements = [],
  history = [],
  radar = null,
  sections = [],
  sectionsDate = null,
}) {
  const [tab, setTab] = useState('overview');
  const [showInfo, setShowInfo] = useState(false);

  if (!insights || !insights.available) {
    return (
      <div>
        <PlayerRadar radar={radar} />
        <PlayerStatsChart history={history} />
        <StatBlocks tab="overview" sections={sections} date={sectionsDate} />
      </div>
    );
  }

  const {
    playstyle,
    profile,
    progress,
    efficiency,
    milestones,
    gains,
    activity,
    comparison,
    achievements: badges,
    narrative,
    coverage,
  } = insights;

  const earned = badges.filter((item) => item.earned);
  const pending = coverage.missing.length
    ? `Awaiting detail capture: ${coverage.missing.join(', ')}. These appear once the background pass has read this player's page.`
    : null;

  const progressHint = progress.series.length
    ? `${progress.from} → ${progress.to} · ${progress.windowDays} days · this player against themselves`
    : null;

  const picks = (rows, category) => rows.filter((row) => inCategory(category, row));
  const periods = comparison.available ? comparison.periods : [];

  const categoryRows = (category) => ({
    progress: picks(progress.series, category),
    periods: picks(periods, category),
    gains: picks(gains, category),
    milestones: picks(milestones, category),
    efficiency: picks(efficiency, category),
  });

  const ArchIcon = ARCHETYPE_ICON[playstyle.key] || Sparkles;

  return (
    <div>
      <TabBar active={tab} onChange={setTab} />

      {tab === 'overview' ? (
        <>
          <PlayerRadar radar={radar} />
          <PlayerStatsChart history={history} />

          <section className="border-t border-gray-800 px-4 py-4">
            {/* Two columns: the profile reads left, and the activity it is
                read against sits beside it rather than underneath. */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
                  Your war profile
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-gray-700/70 bg-gray-500/5">
                    <ArchIcon
                      className={`h-4 w-4 ${LEVEL_TEXT[playstyle.level] || 'text-neutral-200'}`}
                    />
                  </span>
                  <h2 className="text-base font-semibold text-neutral-100">{playstyle.label}</h2>
                  {playstyle.level && playstyle.level !== 'unknown' ? (
                    <span
                      className={`rounded-sm border border-gray-700 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${LEVEL_TEXT[playstyle.level]}`}
                    >
                      {playstyle.level}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setShowInfo((open) => !open)}
                    aria-expanded={showInfo}
                    aria-controls="war-profile-info"
                    aria-label="What this profile means"
                    title="What this profile means"
                    className="rounded p-1 text-gray-500 transition hover:bg-gray-500/10 hover:text-neutral-100"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>

                {/* The description stays one click away: the section reads as
                    the chart first, with the wording behind the info button. */}
                {showInfo ? (
                  <div
                    id="war-profile-info"
                    className="mt-3 rounded-sm border border-gray-800 bg-black/20 px-3 py-3"
                  >
                    <p className="text-sm leading-relaxed text-gray-400">
                      {playstyle.blurb ||
                        "This account's profile is read from its own captured figures."}
                    </p>
                    <dl className="mt-3 grid gap-x-5 gap-y-1 sm:grid-cols-2">
                      {profile.map((signal) => (
                        <div key={signal.key} className="border-b border-gray-800/70 pb-1.5 pt-0.5">
                          <dt className="text-xs text-neutral-300">{signal.label}</dt>
                          <dd className="mt-0.5 text-[11px] leading-relaxed text-gray-500">
                            {signal.reason}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}

                <ul className="mt-4 grid grid-cols-5 gap-x-2 gap-y-4 sm:gap-x-4">
                  {profile.map((signal) => (
                    <ProfileRing key={signal.key} signal={signal} />
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap gap-2">
                  {narrative.strengths.map((item) => (
                    <span
                      key={`s-${item}`}
                      className="rounded-sm bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300"
                    >
                      Strength · {item}
                    </span>
                  ))}
                  {narrative.improvements.map((item) => (
                    <span
                      key={`i-${item}`}
                      className="rounded-sm bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300"
                    >
                      Room to grow · {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
                  Recent activity
                </p>
                <p className="mt-1.5 text-sm text-gray-400">
                  {activity.available ? activity.narrative : 'Activity'}
                </p>
                <div className="mt-3 space-y-1.5">
                  {activity.areas.map((area) => (
                    <div
                      key={area.key}
                      className="flex items-center justify-between border-b border-gray-800/70 pb-1.5 text-xs"
                    >
                      <span className="text-neutral-200">{area.label}</span>
                      <span
                        className={`font-mono text-[11px] uppercase tracking-[0.1em] ${ACTIVITY_COLOR[area.level]}`}
                      >
                        {area.level}
                        {area.deltaText ? (
                          <span className="ml-2 text-gray-600">{area.deltaText}</span>
                        ) : null}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <StatBlocks tab="overview" sections={sections} date={sectionsDate} />
        </>
      ) : null}

      {tab === 'combat' || tab === 'farming' || tab === 'building' ? (
        <>
          <StatBlocks tab={tab} sections={sections} date={sectionsDate} />
          <ProgressTable rows={categoryRows(tab).progress} hint={progressHint} />
          <EfficiencyGrid rows={categoryRows(tab).efficiency} />
          <ComparisonList rows={categoryRows(tab).periods} hint={comparison.narrative} />
          <GainsList rows={categoryRows(tab).gains} />
          <MilestoneBars rows={categoryRows(tab).milestones} />
        </>
      ) : null}

      {tab === 'records' ? (
        <>
          <Section
            title="Milestones earned"
            hint="Phoenix Herald's own badges, awarded on absolute figures."
            action={
              <span className="font-mono text-[10px] text-gray-600">
                {earned.length}/{badges.length}
              </span>
            }
          >
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <span
                  key={badge.key}
                  className={
                    badge.earned
                      ? 'inline-flex items-center gap-1.5 rounded-sm bg-amber-500/15 px-2 py-1 text-[11px] text-amber-300'
                      : 'inline-flex items-center gap-1.5 rounded-sm border border-gray-800 px-2 py-1 text-[11px] text-gray-600'
                  }
                >
                  <Trophy className={`h-3 w-3 ${badge.earned ? 'text-amber-400' : 'text-gray-700'}`} />
                  {badge.label}
                  {badge.earned ? null : (
                    <span className="font-mono text-[10px] text-gray-700">
                      {Math.round(badge.pct)}%
                    </span>
                  )}
                </span>
              ))}
              {!badges.length ? (
                <p className="text-xs text-gray-600">Badges appear once figures are captured.</p>
              ) : null}
            </div>
            {earned.length ? (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-600">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                Most recent: {earned[earned.length - 1].label}
                {earned[earned.length - 1].earnedOn
                  ? ` on ${earned[earned.length - 1].earnedOn}`
                  : ''}
              </p>
            ) : null}
          </Section>

          {achievements.length ? (
            <Section
              title="Source achievements"
              hint="Recorded verbatim from the player's own page."
            >
              <div className="grid gap-1.5 sm:grid-cols-2">
                {achievements.map((item) => {
                  const done = Boolean(item.completedAt);
                  const progressText =
                    item.progress && item.target ? `${number(Number(item.progress))}` : null;
                  return (
                    <div
                      key={item.name}
                      className="flex items-baseline justify-between gap-3 border-b border-gray-800/70 pb-1.5 text-xs"
                    >
                      <span className={`truncate ${done ? 'text-neutral-100' : 'text-neutral-300'}`}>
                        {item.name}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-neutral-100">
                        {done
                          ? item.completedAt
                          : progressText
                            ? `${progressText} / ${number(Number(item.target))}`
                            : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Section>
          ) : null}
        </>
      ) : null}

      {pending ? (
        <div className="border-t border-gray-800 px-4 py-3">
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-gray-600">
            <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-700" />
            {pending}
          </p>
        </div>
      ) : null}

      <div className="border-t border-gray-800 px-4 py-3">
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-gray-600">
          <Swords className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-700" />
          {narrative.privacyNote}
        </p>
      </div>
    </div>
  );
}
