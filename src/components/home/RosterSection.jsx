'use client';

import { useState } from 'react';
import Pagination from './Pagination';
import PlayerRoster from './PlayerRoster';

/**
 * A titled category on the home page (Alliances, Players, ...) that shows a
 * window of rows at a time so a long roster never turns into a very long page.
 *
 * `showHeader` and `framed` both default to on for a standalone section. A
 * section dropped inside RosterTabs turns them off: the tab already names the
 * category and the tab strip already draws the box, so a second title and a
 * second border would only fight the one above it.
 *
 * The page index is clamped during render rather than in an effect: the data
 * can be replaced by a refresh at any moment and a shorter result must never
 * leave the view pointing past the end.
 */
export default function RosterSection({
  title,
  items,
  perPage = 10,
  emptyLabel = 'Nothing to show yet.',
  itemType = 'player',
  showHeader = true,
  framed = true,
}) {
  const [page, setPage] = useState(0);

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(page, pages - 1);
  const start = current * perPage;
  const slice = items.slice(start, start + perPage);

  if (total === 0) {
    return (
      <section className={showHeader ? 'space-y-1' : undefined}>
        {showHeader ? <SectionHeader title={title} total={total} /> : null}
        <div
          className={`text-center font-mono text-[10px] uppercase tracking-[0.2em] text-gray-400 ${
            framed ? 'rounded-lg border border-dashed border-gray-800 px-4 py-6' : 'px-4 py-8'
          }`}
        >
          {emptyLabel}
        </div>
      </section>
    );
  }

  return (
    <section className={showHeader ? 'space-y-2' : undefined}>
      {showHeader ? <SectionHeader title={title} total={total} /> : null}

      <div
        className={
          framed
            ? 'overflow-hidden rounded-md border border-gray-800 bg-discord-surface'
            : undefined
        }
      >
        <PlayerRoster players={slice} bare itemType={itemType} />
        <div className="border-t border-gray-800">
          <Pagination
            page={current}
            pages={pages}
            onPage={setPage}
            start={start}
            end={start + slice.length}
            total={total}
            perPage={perPage}
          />
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ title, total }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-gray-400">{title}</h2>
      <span className="font-mono text-[10px] text-gray-600">{total}</span>
    </div>
  );
}
