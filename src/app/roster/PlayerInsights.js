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
  Coins,
  Skull,
  Info,
} from 'lucide-react';
import PlayerRadar from './PlayerRadar';
import PlayerStatsChart from './PlayerStatsChart';
import GatheredResourcesChart from './GatheredResourcesChart';
import { useT } from '../../components/i18n/LocaleProvider';
import {
  SECTION_KEYS,
  SIGNAL_KEYS,
  GROUP_KEYS,
  rowKeyFor,
  achievementKeyFor,
  itemKeyFor,
} from '../../lib/i18n/labels';

/** The bot's growth-reason template wants a signed compact delta. */
function signedCompact(from, to) {
  const delta = (to || 0) - (from || 0);
  if (!Number.isFinite(delta) || delta === 0) return '0';
  return `${delta > 0 ? '+' : '-'}${compact(Math.abs(delta))}`;
}

/** Shorten big numbers the way the bot's own narrative does (20K, 2.1M). */
function compact(value) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.round(value));
}

/**
 * A season-reset note ships pre-composed from the bot. When its template is
 * recognised the dates are pulled back out and the sentence itself is looked
 * up, so the wording follows the locale while the dates stay verbatim.
 */
const SEASON_NOTE = /^A new season opened between (.+) and (.+), so this counter restarted\.$/;

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
  { key: 'overview', labelKey: 'ins.tabOverview', icon: LayoutDashboard },
  { key: 'combat', labelKey: 'ins.tabCombat', icon: Swords },
  { key: 'farming', labelKey: 'ins.tabFarming', icon: Wheat },
  { key: 'building', labelKey: 'ins.tabBuilding', icon: Building2 },
  { key: 'records', labelKey: 'ins.tabRecords', icon: Trophy },
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

function StatBlocks({ tab, sections, date, exclude = [], charts = null }) {
  const t = useT();
  const blocks = blocksFor(tab, sections).filter((block) => !exclude.includes(block.section));
  if (!blocks.length) return null;
  return (
    <Section
      title={date ? t('roster.sourceFiguresMeta', { date }) : t('roster.sourceFigures')}
      hint={t('roster.verbatim')}
    >
      <div className="space-y-5">
        {blocks.map((block) => (
          <div key={block.section || 'profile'}>
            {/* A chart that belongs to one block sits directly above it, so
                the gathered resources read as trend first, rows second. */}
            {charts?.[block.section] || null}
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">
              {!block.section
                ? t('roster.profile')
                : t(SECTION_KEYS[block.section] || '', undefined, block.section)}
            </h3>
            <dl className="mt-2 grid gap-x-5 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {block.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-3 border-b border-gray-800/70 pb-1.5"
                >
                  <dt className="truncate text-xs text-neutral-300">
                    {t(rowKeyFor(row.label) || '', undefined, row.label)}
                  </dt>
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

function WarStats({ sections }) {
  const t = useT();
  const section = sections.find((item) => item.section === 'War Stats');
  if (!section) return null;
  const icons = {
    'Kill to Heal Ratio': Swords,
    'Merit to Power Ratio': Scale,
    Merits: Coins,
    'Units Dead': Skull,
    'Units Healed': Shield,
    'Units Killed': Swords,
  };
  const rows = section.rows.filter((row) => icons[row.label]);
  if (!rows.length) return null;
  return (
    <Section title={t('ins.warStats')}>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-gray-800 bg-gray-800 sm:grid-cols-3">
        {rows.map((row) => {
          const Icon = icons[row.label];
          return (
            <div key={row.label} className="bg-discord-bg-darker px-3 py-3">
              <Icon className="h-7 w-7 text-white" strokeWidth={1.7} />
              <p className="mt-2 text-xs text-gray-400">
                {t(rowKeyFor(row.label) || '', undefined, row.label)}
              </p>
              <p className="mt-1 font-mono text-sm text-neutral-100">{row.value}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function MeritStats({ sections }) {
  const t = useT();
  const section = sections.find((item) => item.section === 'Advanced War Stats');
  if (!section) return null;
  const wanted = [
    ['Cavalry Merits', '/icons/cavalry.svg'],
    ['Infantry Merits', '/icons/infantry.svg'],
    ['Mage Merits', '/icons/mage.svg'],
    ['Marksman Merits', '/icons/archer.svg'],
  ];
  const stats = wanted
    .map(([label, icon]) => ({
      label,
      icon,
      value: section.rows.find((row) => row.label === label)?.value,
    }))
    .filter((item) => item.value !== undefined);
  if (!stats.length) return null;
  return (
    <Section title={t('ins.merits')}>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-gray-800 bg-gray-800 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-discord-bg-darker px-3 py-3">
            <img src={stat.icon} alt="" className="h-8 w-8 brightness-0 invert" />
            <p className="mt-2 text-xs text-gray-400">
              {t(rowKeyFor(stat.label) || '', undefined, stat.label)}
            </p>
            <p className="mt-1 font-mono text-sm text-neutral-100">{stat.value}</p>
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
  const t = useT();
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
            being read sits underneath, where it has room to wrap. Both step
            down on phones, where five rings only have ~60px each. */}
        <div className="absolute inset-0 flex items-center justify-center px-1 text-center sm:px-2">
          <span
            className={`font-mono text-[9px] uppercase leading-tight tracking-[0.04em] sm:text-[11px] sm:tracking-[0.08em] ${LEVEL_TEXT[signal.level] || LEVEL_TEXT.unknown}`}
          >
            {t('lvl.' + signal.level, undefined, signal.level)}
          </span>
        </div>
      </div>
      <span className="mt-1.5 block break-words text-center font-mono text-[8px] uppercase leading-tight tracking-[0.06em] text-neutral-300 sm:mt-2 sm:text-[9px] sm:tracking-[0.1em]">
        {t(SIGNAL_KEYS[signal.key] || '', undefined, signal.label)}
      </span>
    </li>
  );
}

function Delta({ row }) {
  const t = useT();
  if (row.direction === 'reset') {
    return <span className="font-mono text-[11px] text-amber-300">{t('ins.newSeason')}</span>;
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
  const t = useT();
  return (
    <Section
      title={t('ins.progress')}
      hint={
        rows.length ? hint : t('ins.progressNeedTwo')
      }
    >
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left">
            <thead>
              <tr className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-600">
                <th className="pb-2 font-normal">{t('ins.metric')}</th>
                <th className="pb-2 text-right font-normal">{t('ins.then')}</th>
                <th className="pb-2 text-right font-normal">{t('ins.now')}</th>
                <th className="pb-2 text-right font-normal">{t('ins.change')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/70">
              {rows.map((row) => {
                const note = row.note ? (row.note.match(SEASON_NOTE) || []) : [];
                return (
                  <tr key={row.key} className="text-sm">
                    <td className="py-1.5 text-neutral-200">
                      {t('metric.' + row.key, undefined, row.label)}
                      {row.note ? (
                        <span className="mt-0.5 block text-[11px] text-amber-300/80">
                          {note.length
                            ? t('ins.seasonNote', { from: note[1], to: note[2] })
                            : row.note}
                        </span>
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
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </Section>
  );
}

/**
 * The bot ships each efficiency row with an English label, a composed text
 * and a composed narrative. All three are recomputed here from the row's own
 * number (plus the win/loss counts from the progress series) so the wording
 * follows the locale; the bot's English remains the fallback for any ratio
 * added later without a template.
 */
function EfficiencyGrid({ rows, series = [] }) {
  const t = useT();
  if (!rows.length) return null;

  const wording = (row) => {
    const value = typeof row.value === 'number' ? row.value : null;
    if (value === null) return { label: t('eff.' + row.key, undefined, row.label), text: row.text, narrative: row.narrative };
    switch (row.key) {
      case 'killDeath':
        return {
          label: t('eff.killDeath'),
          text: t('eff.killDeathText', { n: value.toFixed(1) }),
          narrative: t('eff.killDeathNarr', { n: value.toFixed(1) }),
        };
      case 'healDeath':
        return {
          label: t('eff.healDeath'),
          text: t('eff.healDeathText', { n: value.toFixed(1) }),
          narrative: t('eff.healDeathNarr', { n: value.toFixed(1) }),
        };
      case 'winRate': {
        const wins = series.find((r) => r.key === 'victories')?.to;
        const losses = series.find((r) => r.key === 'defeats')?.to;
        return {
          label: t('eff.winRate'),
          text: t('eff.winRateText', { pct: (value * 100).toFixed(0) }),
          narrative:
            Number.isFinite(wins) && Number.isFinite(losses)
              ? t('eff.winRateNarr', { wins: compact(wins), losses: compact(losses) })
              : row.narrative,
        };
      }
      case 'meritPower':
        return {
          label: t('eff.meritPower'),
          text: t('eff.meritPowerText', { n: value.toFixed(4) }),
          narrative: t('eff.meritPowerNarr'),
        };
      case 't45LossShare':
        return {
          label: t('eff.t45LossShare'),
          text: t('eff.t45Text', { pct: (value * 100).toFixed(0) }),
          narrative: value > 0.5 ? t('eff.t45HighNarr') : t('eff.t45LowNarr'),
        };
      default:
        return { label: t('eff.' + row.key, undefined, row.label), text: row.text, narrative: row.narrative };
    }
  };

  return (
    <Section title={t('ins.efficiency')} hint={t('ins.efficiencyHint')}>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => {
          const w = wording(row);
          return (
            <div key={row.key} className="rounded-sm border border-gray-800 bg-black/20 px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-neutral-200">{w.label}</span>
                <span className="font-mono text-[11px] text-amber-300">{w.text}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-600">{w.narrative}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function ComparisonList({ rows, hint }) {
  const t = useT();
  if (!rows.length) return null;
  return (
    <Section title={t('ins.sinceLast')} hint={hint}>
      <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-baseline justify-between gap-3 border-b border-gray-800/70 pb-1.5 text-xs"
          >
            <span className="truncate text-neutral-200">
              {t('metric.' + row.key, undefined, row.label)}
            </span>
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
  const t = useT();
  if (!rows.length) return null;
  return (
    <Section title={t('ins.gains')} hint={t('ins.gainsHint')}>
      <div className="flex flex-wrap gap-2">
        {rows.map((row) => (
          <div key={row.key} className="rounded-sm border border-gray-800 bg-black/20 px-3 py-2">
            <p className="text-[11px] text-gray-500">
              {t('metric.' + row.key, undefined, row.label)}
            </p>
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
  const t = useT();
  return (
    <Section title={t('ins.milestones')} hint={t('ins.milestonesHint')}>
      {rows.length ? (
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-800 font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">
              <th className="py-1.5 pr-2 font-normal">{t('ins.statCol')}</th>
              <th className="w-20 py-1.5 pr-2 text-right font-normal sm:w-24">{t('ins.nowTarget')}</th>
              <th className="w-14 py-1.5 pr-2 font-normal sm:w-32">{t('ins.toTarget')}</th>
              <th className="w-9 py-1.5 text-right font-normal sm:w-10">%</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-800/60">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="py-2 pr-2 align-middle">
                  <span className="block truncate text-xs text-neutral-200">
                    {t('metric.' + row.key, undefined, row.label)}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[10px] text-gray-600">
                    {t('ins.toGo', { remaining: row.remainingText })}
                  </span>
                </td>

                <td className="py-2 pr-2 text-right align-middle font-mono text-[11px] tabular-nums">
                  <span className="text-neutral-100">{row.currentText}</span>
                  <span className="text-gray-600"> / {row.targetText}</span>
                </td>

                <td className="py-2 pr-2 align-middle">
                  <span className="block h-1 w-full overflow-hidden rounded-full bg-gray-800">
                    <span
                      className="block h-full rounded-full bg-amber-400"
                      style={{ width: `${Math.max(2, Math.round(row.pct))}%` }}
                    />
                  </span>
                </td>

                <td className="py-2 text-right align-middle font-mono text-[11px] tabular-nums text-neutral-200">
                  {Math.round(row.pct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty>{t('ins.milestonesEmpty')}</Empty>
      )}
    </Section>
  );
}

function TabBar({ active, onChange }) {
  const t = useT();
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 py-2" aria-label={t('ins.sectionsAria')}>
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
            {t(item.labelKey)}
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
  gathered = [],
  radar = null,
  sections = [],
  sectionsDate = null,
}) {
  const t = useT();
  const [tab, setTab] = useState('overview');
  const [showInfo, setShowInfo] = useState(false);

  if (!insights || !insights.available) {
    return (
      <div>
        <PlayerRadar radar={radar} />
        <PlayerStatsChart history={history} />
        <WarStats sections={sections} />
        <MeritStats sections={sections} />
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
  // Badges ship with their own group and the date they were crossed, so the
  // records tab can present them as an ordered award list per subject instead
  // of one undifferentiated pile of chips. Earned first, then closest to done.
  const groupedBadges = badges.reduce((groups, badge) => {
    const group = badge.group || 'Other';
    (groups[group] ||= []).push(badge);
    return groups;
  }, {});
  Object.values(groupedBadges).forEach((items) =>
    items.sort((a, b) => Number(b.earned) - Number(a.earned) || b.pct - a.pct),
  );
  const recentBadge =
    earned
      .filter((item) => item.earnedOn)
      .sort((a, b) => b.earnedOn.localeCompare(a.earnedOn))[0] || null;
  const pending = coverage.missing.length
    ? t('ins.pending', {
        missing: coverage.missing.map((token) => t('cov.' + token, undefined, token)).join(', '),
      })
    : null;

  const progressHint = progress.series.length
    ? t('ins.progressMeta', {
        from: progress.from,
        to: progress.to,
        days: progress.windowDays,
      })
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

  // Reasons ship pre-composed in English; the growth one is rebuilt from the
  // tracked power series so its delta follows the locale too.
  const signalReason = (signal) => {
    if (signal.key === 'growth') {
      const power = progress.series.find((row) => row.key === 'power');
      return power && Number.isFinite(power.from) && Number.isFinite(power.to)
        ? t('sig.reasonGrowth', { delta: signedCompact(power.from, power.to) })
        : t('sig.reasonGrowthStatic');
    }
    const reasons = {
      overall: 'sig.reasonOverall',
      combatActivity: 'sig.reasonCombat',
      warContribution: 'sig.reasonWar',
      accountProgression: 'sig.reasonAccount',
    };
    return reasons[signal.key] ? t(reasons[signal.key]) : signal.reason;
  };

  return (
    <div>
      <TabBar active={tab} onChange={setTab} />

      {tab === 'overview' ? (
        <>
          <PlayerRadar radar={radar} />
          <PlayerStatsChart history={history} />
          <WarStats sections={sections} />
          <MeritStats sections={sections} />

          <section className="border-t border-gray-800 px-4 py-4">
            {/* Two columns: the profile reads left, and the activity it is
                read against sits beside it rather than underneath. */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
                  {t('ins.yourProfile')}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-gray-700/70 bg-gray-500/5">
                    <ArchIcon
                      className={`h-4 w-4 ${LEVEL_TEXT[playstyle.level] || 'text-neutral-200'}`}
                    />
                  </span>
                  <h2 className="text-base font-semibold text-neutral-100">
                    {t('arch.' + playstyle.key, undefined, playstyle.label)}
                  </h2>
                  {playstyle.level && playstyle.level !== 'unknown' ? (
                    <span
                      className={`rounded-sm border border-gray-700 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${LEVEL_TEXT[playstyle.level]}`}
                    >
                      {t('lvl.' + playstyle.level, undefined, playstyle.level)}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setShowInfo((open) => !open)}
                    aria-expanded={showInfo}
                    aria-controls="war-profile-info"
                    aria-label={t('ins.whatMeans')}
                    title={t('ins.whatMeans')}
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
                      {t('blurb.' + playstyle.key, undefined, playstyle.blurb || '') ||
                        t('ins.blurbFallback')}
                    </p>
                    <dl className="mt-3 grid gap-x-5 gap-y-1 sm:grid-cols-2">
                      {profile.map((signal) => (
                        <div key={signal.key} className="border-b border-gray-800/70 pb-1.5 pt-0.5">
                          <dt className="text-xs text-neutral-300">
                            {t(SIGNAL_KEYS[signal.key] || '', undefined, signal.label)}
                          </dt>
                          <dd className="mt-0.5 text-[11px] leading-relaxed text-gray-500">
                            {signalReason(signal)}
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
                      {t('ins.strength', {
                        item: t(itemKeyFor(item) || '', undefined, item),
                      })}
                    </span>
                  ))}
                  {narrative.improvements.map((item) => (
                    <span
                      key={`i-${item}`}
                      className="rounded-sm bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300"
                    >
                      {t('ins.roomGrow', {
                        item: t(itemKeyFor(item) || '', undefined, item),
                      })}
                    </span>
                  ))}
                </div>
              </div>

              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
                  {t('ins.recentActivity')}
                </p>
                <p className="mt-1.5 text-sm text-gray-400">
                  {activity.available
                    ? t(
                        `act.narr${Math.min(
                          activity.areas.filter((area) =>
                            area.level === 'surging' || area.level === 'active',
                          ).length,
                          3,
                        )}`,
                      )
                    : t('act.unavailable')}
                </p>
                <div className="mt-3 space-y-1.5">
                  {activity.areas.map((area) => (
                    <div
                      key={area.key}
                      className="flex items-center justify-between border-b border-gray-800/70 pb-1.5 text-xs"
                    >
                      <span className="text-neutral-200">
                        {t('act.' + area.key, undefined, area.label)}
                      </span>
                      <span
                        className={`font-mono text-[11px] uppercase tracking-[0.1em] ${ACTIVITY_COLOR[area.level]}`}
                      >
                        {t('lvl.' + area.level, undefined, area.level)}
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
          <StatBlocks
            tab={tab}
            sections={sections}
            date={sectionsDate}
            charts={
              tab === 'farming'
                ? {
                    'Gathered Resources': <GatheredResourcesChart points={gathered} />,
                  }
                : null
            }
          />
          <ProgressTable rows={categoryRows(tab).progress} hint={progressHint} />
          <EfficiencyGrid rows={categoryRows(tab).efficiency} series={progress.series} />
          <ComparisonList rows={categoryRows(tab).periods} hint={t('narr.comparison')} />
          <GainsList rows={categoryRows(tab).gains} />
          <MilestoneBars rows={categoryRows(tab).milestones} />
        </>
      ) : null}

      {tab === 'records' ? (
        <>
          <Section
            title={t('ins.earnedTitle')}
            hint={t('ins.earnedHint')}
            action={
              <span className="flex items-center gap-2">
                <span className="h-1 w-14 overflow-hidden rounded-full bg-gray-800">
                  <span
                    className="block h-full rounded-full bg-amber-400"
                    style={{
                      width: `${
                        badges.length ? Math.round((earned.length / badges.length) * 100) : 0
                      }%`,
                    }}
                  />
                </span>
                <span className="font-mono text-[10px] tabular-nums text-gray-600">
                  {earned.length}/{badges.length}
                </span>
              </span>
            }
          >
            {badges.length ? (
              <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {Object.entries(groupedBadges).map(([group, items]) => (
                  <div key={group} className="min-w-0">
                    <div className="flex items-baseline justify-between gap-3 border-b border-gray-800 pb-1.5">
                      <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                        {t(GROUP_KEYS[group] || '', undefined, group)}
                      </h4>
                      <span className="font-mono text-[10px] tabular-nums text-gray-600">
                        {items.filter((item) => item.earned).length}/{items.length}
                      </span>
                    </div>

                    <ul>
                      {items.map((badge) => (
                        <li
                          key={badge.key}
                          className="flex items-center gap-3 border-b border-gray-800/60 py-2"
                        >
                          <Trophy
                            className={`h-3.5 w-3.5 shrink-0 ${
                              badge.earned ? 'text-amber-400' : 'text-gray-700'
                            }`}
                          />
                          <span
                            className={`min-w-0 flex-1 truncate text-xs ${
                              badge.earned ? 'text-neutral-100' : 'text-gray-500'
                            }`}
                          >
                            {t('badge.' + badge.key, undefined, badge.label)}
                          </span>

                          {badge.earned ? (
                            <span className="shrink-0 font-mono text-[10px] tabular-nums text-gray-600">
                              {badge.earnedOn || t('ins.earned')}
                            </span>
                          ) : (
                            <span className="flex shrink-0 items-center gap-2">
                              <span className="h-1 w-12 overflow-hidden rounded-full bg-gray-800">
                                <span
                                  className="block h-full rounded-full bg-amber-500/70"
                                  style={{
                                    width: `${Math.max(2, Math.round(badge.pct))}%`,
                                  }}
                                />
                              </span>
                              <span className="w-7 text-right font-mono text-[10px] tabular-nums text-gray-600">
                                {Math.round(badge.pct)}%
                              </span>
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600">{t('ins.badgesEmpty')}</p>
            )}

            {recentBadge ? (
              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-gray-800 pt-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                <span>{t('ins.mostRecent')}</span>
                <span className="normal-case tracking-normal text-neutral-300">
                  {t('badge.' + recentBadge.key, undefined, recentBadge.label)}
                </span>
                {recentBadge.earnedOn ? (
                  <span className="tabular-nums">· {recentBadge.earnedOn}</span>
                ) : null}
              </p>
            ) : null}
          </Section>

          {achievements.length ? (
            <Section title={t('ins.sourceAchievements')} hint={t('roster.verbatim')}>
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
                        {t(achievementKeyFor(item.name) || '', undefined, item.name)}
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
          {t('narr.privacy')}
        </p>
      </div>
    </div>
  );
}
