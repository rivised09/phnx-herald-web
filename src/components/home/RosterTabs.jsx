'use client';

import { useState } from 'react';

/**
 * The home roster's category switch, drawn the way a browser draws its tab
 * strip: the tabs sit in a recessed bar along the top of a single panel and
 * the selected one drops its bottom edge over the bar's rule, so its surface
 * reads as continuous with the content underneath. Only the selected panel is
 * rendered, which keeps a long roster to one paginated table per page load.
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
        className="flex items-end gap-1 border-b border-gray-800 bg-black/30 px-2 pt-2"
      >
        {tabs.map((tab) => {
          const selected = tab.key === current.key;
          return (
            <button
              key={tab.key}
              id={`roster-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`roster-panel-${tab.key}`}
              onClick={() => setActive(tab.key)}
              className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-t-md px-3.5 font-mono uppercase tracking-[0.2em] transition ${
                selected
                  ? 'relative -mb-px border-x border-t border-gray-800 bg-discord-surface py-2.5 text-[11px] text-neutral-100'
                  : 'border border-transparent py-2 text-[10px] text-gray-400 hover:bg-white/[0.05] hover:text-neutral-200'
              }`}
            >
              <span className="truncate">{tab.label}</span>
              <span className="text-neutral-400">{tab.count}</span>
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
