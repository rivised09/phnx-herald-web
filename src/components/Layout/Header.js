'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Users } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();

  // The home page is public, so leadership-only destinations are not offered
  // there. They are all access-code protected and would bounce to
  // /unauthorized for anyone without the code.
  const isPublicHome =
    pathname === '/' || pathname.startsWith('/roster/player/') || pathname.startsWith('/roster/alliance/');

  return (
    <header className="sticky top-0 z-40 border-b border-gray-800 bg-neutral-950/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <Link href={isPublicHome ? '/' : '/dashboard'} className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-700 bg-gray-100 text-neutral-950 transition group-hover:-translate-y-px">
            <Flame className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight text-neutral-100">
              {isPublicHome ? 'Phoenix of War' : 'Phoenix Herald'}
            </div>
            <div className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500 sm:block">
              {isPublicHome ? 'Server 973' : 'Manage / Events'}
            </div>
          </div>
        </Link>

        {!isPublicHome && (
          <>
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
                href="/tracking"
                className="group hidden items-center gap-1.5 rounded-md border border-gray-800 bg-gray-500/5 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-400 transition hover:-translate-y-px hover:border-gray-600 hover:bg-gray-500/10 hover:text-neutral-100 sm:inline-flex"
              >
                Tracking
              </Link>
            </nav>
          </>
        )}
      </div>
    </header>
  );
}
