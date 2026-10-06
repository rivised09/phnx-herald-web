'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PlayerRoster from './PlayerRoster';

/** Row window controls. Hidden when everything fits on a single page. */
function Pagination({ page, pages, onPage, start, end, total, perPage }) {
  if (!total) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
        {start + 1}–{end} of {total} · {perPage} per page
      </span>

      {pages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPage(page - 1)}
            disabled={page === 0}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-gray-800 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400 transition hover:border-gray-600 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-gray-800 disabled:hover:text-gray-400"
          >
            <ChevronLeft className="h-3 w-3" />
            Prev
          </button>

          <span className="font-mono text-[10px] text-gray-500">
            {page + 1} / {pages}
          </span>

          <button
            type="button"
            onClick={() => onPage(page + 1)}
            disabled={page >= pages - 1}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-gray-800 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400 transition hover:border-gray-600 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-gray-800 disabled:hover:text-gray-400"
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

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
