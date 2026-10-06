'use client';

import { useState } from 'react';
import Link from 'next/link';
import Pagination from '../../components/home/Pagination';

const PER_PAGE = 10;

/**
 * An alliance's members, paginated the same way the home roster is: a window
 * of rows with a row range and Prev/Next underneath, so a 191-member alliance
 * does not turn its own page into a wall of names. The index is clamped while
 * rendering, so a shorter member list can never leave the window pointing past
 * the end.
 */
export default function MemberList({ players = [] }) {
  const [page, setPage] = useState(0);

  const total = players.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const current = Math.min(page, pages - 1);
  const start = current * PER_PAGE;
  const slice = players.slice(start, start + PER_PAGE);

  if (!total) {
    return (
      <div className="border-t border-gray-800">
        <div className="border-b border-gray-800 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
          Members · 0
        </div>
        <p className="px-4 py-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
          No members stored for this snapshot.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-800">
      <div className="border-b border-gray-800 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
        Members · {total}
      </div>

      <div className="divide-y divide-gray-800/80">
        {slice.map((item) => (
          <Link
            key={item.id}
            href={`/roster/player/${item.id}`}
            className="flex items-center justify-between px-4 py-2.5 text-sm transition hover:bg-gray-500/5"
          >
            <span className="min-w-0 truncate text-neutral-100">{item.name}</span>
            <span className="shrink-0 font-mono text-[10px] text-gray-500">
              #{item.rank || '—'} · {item.power || '—'}
            </span>
          </Link>
        ))}
      </div>

      <div className="border-t border-gray-800">
        <Pagination
          page={current}
          pages={pages}
          onPage={setPage}
          start={start}
          end={start + slice.length}
          total={total}
          perPage={PER_PAGE}
        />
      </div>
    </div>
  );
}
