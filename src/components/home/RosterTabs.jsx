'use client';

import { useState } from 'react';
import { ChartBar, Shield, Users } from 'lucide-react';

const TAB_ICONS = {
  alliances: Shield,
  players: Users,
  stats: ChartBar,
};

/**
 * The home roster's category switch: a segmented control sitting in a
 * recessed track rather than a browser tab strip. The selected segment fills
 * with the accent, keeps its count on a matching chip and carries an icon, so
 * the switch reads as a control instead of as a flat strip of labels.
 *
 * `tabs` carries `{ key, label, count, panel }`; the panel node is built by
 * the caller, so this component never has to know what a roster row is.
 */
export default function RosterTabs({ tabs = [] }) {
  const [active, setActive] = useState(() => tabs[0]?.key);
  const current = tabs.find((tab) => tab.key === active) || tabs[0];

  if (!current) return null;

  return (
    <div className="overflow-hidden rounded-md border border-gray-800 bg-discord-surface">
      <div
        role="tablist"
        aria-label="Roster categories"
        className="flex flex-wrap items-center gap-1.5 border-b border-gray-800 bg-gradient-to-b from-black/50 to-black/20 p-2"
      >
        {tabs.map((tab) => {
          const selected = tab.key === current.key;
          const Icon = TAB_ICONS[tab.key];
          return (
            <button
              key={tab.key}
              id={`roster-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`roster-panel-${tab.key}`}
              onClick={() => setActive(tab.key)}
              className={`group inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 font-mono uppercase tracking-[0.16em] transition ${
                selected
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-100 shadow-[0_10px_22px_-16px_rgba(245,158,11,0.9)]'
                  : 'border-transparent text-gray-400 hover:border-gray-800 hover:bg-white/[0.04] hover:text-neutral-200'
              }`}
            >
              {Icon ? (
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 transition ${
                    selected ? 'text-amber-300' : 'text-gray-600 group-hover:text-gray-500'
                  }`}
                  aria-hidden="true"
                />
              ) : null}
              <span className="truncate text-[11px]">{tab.label}</span>
              <span
                className={`rounded-sm px-1.5 py-0.5 text-[10px] tabular-nums transition ${
                  selected ? 'bg-amber-400/20 text-amber-100' : 'bg-gray-800/80 text-gray-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div
        id={`roster-panel-${current.key}`}
        role="tabpanel"
        aria-labelledby={`roster-tab-${current.key}`}
      >
        <h2 className="sr-only">{current.label}</h2>
        {current.panel}
      </div>
    </div>
  );
}
