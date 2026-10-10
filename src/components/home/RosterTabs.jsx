'use client';

import { useState } from 'react';
import { ChartBar, Shield, Users } from 'lucide-react';
import { useT } from '../i18n/LocaleProvider';

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
  const t = useT();

  if (!current) return null;

  return (
    <div className="overflow-hidden rounded-md border border-gray-800 bg-discord-bg-darker">
      <div
        role="tablist"
        aria-label={t('tabs.aria')}
        className="grid grid-cols-3 gap-1.5 border-b border-gray-800 bg-gradient-to-b from-black/50 to-black/20 p-2 sm:flex sm:flex-wrap sm:items-center"
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
              className={`group inline-flex w-full min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-1.5 py-2 font-mono uppercase transition sm:w-auto sm:justify-start sm:gap-2 sm:px-3 ${
                selected
                  ? 'border-amber-500/50 text-amber-300'
                  : 'border-transparent text-gray-400 hover:border-gray-800 hover:bg-white/[0.03] hover:text-neutral-200'
              }`}
            >
              {Icon ? (
                <Icon
                  className={`hidden h-3.5 w-3.5 shrink-0 transition sm:block ${
                    selected ? 'text-amber-400' : 'text-gray-600 group-hover:text-gray-500'
                  }`}
                  aria-hidden="true"
                />
              ) : null}
              <span className="truncate text-[9px] uppercase tracking-[0.1em] sm:hidden">
                {tab.shortLabel || tab.label}
              </span>
              <span className="hidden truncate text-[11px] tracking-[0.16em] sm:inline">
                {tab.label}
              </span>
              <span
                className={`shrink-0 text-[9px] tabular-nums transition sm:text-[10px] ${
                  selected ? 'text-amber-400' : 'text-gray-600'
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
