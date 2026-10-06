import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Row window controls, shared by the home roster and the alliance member
 * list. Hidden when everything fits on a single page.
 */
export default function Pagination({ page, pages, onPage, start, end, total, perPage }) {
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
