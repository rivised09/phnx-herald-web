import Link from 'next/link';
import { Flame } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/40 bg-discord-bg-dark/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="group flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-phoenix-500 to-blurple text-white shadow-lg shadow-phoenix-500/20 transition group-hover:scale-105">
            <Flame className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold tracking-wide">Phoenix Herald</div>
            <div className="text-xs text-discord-muted">Manage Alliance Events</div>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 text-sm font-medium text-discord-muted transition hover:bg-discord-raised hover:text-discord-text"
          >
            Dashboard
          </Link>
          <Link
            href="/events/new"
            className="rounded-md bg-blurple px-3 py-2 text-sm font-semibold text-white transition hover:bg-blurple-dark"
          >
            + Create Event
          </Link>
        </nav>
      </div>
    </header>
  );
}