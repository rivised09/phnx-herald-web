import { Coins, Scale, Shield, Skull, Swords } from 'lucide-react';

/**
 * Shared building blocks for the leadership player detail view: the card
 * chrome (matching the rest of Leadership), the change cell that refuses to
 * print 0 for missing data, and small readers for the stat sections the
 * profile carries.
 */

export function Card({ title, description, children, actions }) {
  return (
    <section className="rounded-md border border-gray-800 bg-discord-bg-darker p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">{title}</p>
          {description ? (
            <p className="mt-1 text-[11px] leading-relaxed text-gray-600">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Full precision, signed, and honest about "no data". */
export function Change({ value, suffix = '' }) {
  if (value === null || value === undefined) {
    return (
      <span className="font-mono text-sm text-gray-600">
        —<span className="ml-1 text-[9px] uppercase tracking-[0.1em] text-gray-700">no data</span>
      </span>
    );
  }
  const n = Number(value);
  const text = n > 0 ? `+${n.toLocaleString('en-US')}` : n.toLocaleString('en-US');
  return (
    <span className={`font-mono text-sm ${n > 0 ? 'text-amber-200' : n < 0 ? 'text-red-300' : 'text-gray-300'}`}>
      {text}{suffix}
    </span>
  );
}

/** One row's value from a named stat section, or null when it is not tracked. */
export function sectionValue(profile, sectionName, label) {
  const block = (profile?.sections || []).find((section) => section.section === sectionName);
  const row = (block?.rows || []).find((item) => item.label === label);
  return row?.value ?? null;
}

/** A number from a stat row (thousands separators stripped), or null. */
export function sectionNumber(profile, sectionName, label) {
  const raw = sectionValue(profile, sectionName, label);
  if (raw === null || raw === undefined) return null;
  const parsed = Number(String(raw).replace(/[,%\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export function compact(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return Math.round(n).toLocaleString('en-US');
}

export const WAR_ICONS = {
  'Kill to Heal Ratio': Swords,
  'Merit to Power Ratio': Scale,
  Merits: Coins,
  'Units Dead': Skull,
  'Units Healed': Shield,
  'Units Killed': Swords,
};
