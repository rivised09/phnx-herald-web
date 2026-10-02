'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ total, pageSize, page, onPageChange, className = '' }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page < 1) onPageChange(1);
    if (page > totalPages) onPageChange(totalPages);
  }, [page, totalPages, onPageChange]);

  const pages = useMemo(() => {
    const max = 5;
    let start = Math.max(1, page - Math.floor(max / 2));
    let end = Math.min(totalPages, start + max - 1);
    if (end - start < max - 1) {
      start = Math.max(1, end - max + 1);
    }
    const arr = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex items-center gap-1 rounded-full border border-gray-800 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-gray-500 transition hover:border-gray-600 hover:text-neutral-200 disabled:opacity-40"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Prev
      </button>

      {pages[0] > 1 && (
        <>
          <button
            type="button"
            onClick={() => onPageChange(1)}
            className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-gray-800 px-1.5 font-mono text-[11px] uppercase tracking-wider text-gray-500 transition hover:border-gray-600 hover:text-neutral-200"
          >
            1
          </button>
          {pages[0] > 2 && <span className="px-1 font-mono text-[11px] text-gray-600">…</span>}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-1.5 font-mono text-[11px] uppercase tracking-wider transition ${
            p === page
              ? 'border-transparent bg-gray-100 text-neutral-950'
              : 'border-gray-800 text-gray-500 hover:border-gray-600 hover:text-neutral-200'
          }`}
        >
          {p}
        </button>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && (
            <span className="px-1 font-mono text-[11px] text-gray-600">…</span>
          )}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-gray-800 px-1.5 font-mono text-[11px] uppercase tracking-wider text-gray-500 transition hover:border-gray-600 hover:text-neutral-200"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-1 rounded-full border border-gray-800 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-gray-500 transition hover:border-gray-600 hover:text-neutral-200 disabled:opacity-40"
      >
        Next
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}