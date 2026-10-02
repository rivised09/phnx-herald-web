import Link from 'next/link';
import { Flame, Plus, Users } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-800 bg-neutral-950/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <Link href="/dashboard" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-700 bg-gray-100 text-neutral-950 transition group-hover:-translate-y-px">
            <Flame className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight text-neutral-100">
              Phoenix Herald
            </div>
            <div className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500 sm:block">
              Manage / Events
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-1.5">
          <Link
            href="/dashboard"
            className="hidden rounded-md px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-500 transition hover:text-neutral-100 sm:inline-block"
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            className="hidden rounded-md px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-500 transition hover:text-neutral-100 sm:inline-block"
          >
            Settings
          </Link>
        </nav>
        <nav className="ml-auto flex items-center gap-1.5">
          <Link
            href="/players"
            className="group hidden items-center gap-1.5 rounded-md border border-gray-800 bg-gray-500/5 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-400 transition hover:-translate-y-px hover:border-gray-600 hover:bg-gray-500/10 hover:text-neutral-100 sm:inline-flex"
          >
            <Users className="h-3.5 w-3.5" />
            Player Info
          </Link>
          <Link
            href="/events/new"
            className="group inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-950 shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_1px_2px_rgba(0,0,0,0.4)] transition hover:-translate-y-px hover:border-white hover:bg-white hover:shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,0_3px_8px_rgba(0,0,0,0.5)] active:translate-y-0"
          >
            <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
            Create Event
          </Link>
        </nav>
      </div>
    </header>
  );
}