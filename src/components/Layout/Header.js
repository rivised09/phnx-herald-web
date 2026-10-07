'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Flame, Menu, Users, X } from 'lucide-react';

const DISCORD_INVITE = 'https://discord.gg/kwAc6xpgGa';

function DiscordIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.036A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // The home page is public, so leadership-only destinations are not offered
  // there. They are all access-code protected and would bounce to
  // /unauthorized for anyone without the code.
  const isPublicHome =
    pathname === '/' || pathname.startsWith('/roster/player/') || pathname.startsWith('/roster/alliance/');

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
        )}

        {/* Everything else rides the right edge. The community invite is the
            last stop, but only for the public roster pages - the leadership
            views keep to their own controls. */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          {!isPublicHome && (
            <>
              <nav className="flex items-center gap-1.5">
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
                <Link
                  href="/leadership"
                  className="group hidden items-center gap-1.5 rounded-md border border-gray-800 bg-gray-500/5 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-400 transition hover:-translate-y-px hover:border-gray-600 hover:bg-gray-500/10 hover:text-neutral-100 sm:inline-flex"
                >
                  Leadership
                </Link>
              </nav>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls="mobile-navigation"
                aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-800 bg-gray-500/5 text-gray-400 transition hover:border-gray-600 hover:text-neutral-100 sm:hidden"
              >
                {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </>
          )}

          {isPublicHome && (
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#5865F2]/40 bg-[#5865F2]/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c7ccff] transition hover:-translate-y-px hover:border-[#5865F2]/70 hover:bg-[#5865F2]/20 hover:text-white sm:gap-2 sm:px-3 sm:text-[11px] sm:tracking-[0.18em]"
            >
              <DiscordIcon className="h-3.5 w-3.5 shrink-0" />
              Join Discord
            </a>
          )}
        </div>
      </div>
      {!isPublicHome && menuOpen ? (
        <nav
          id="mobile-navigation"
          className="border-t border-gray-800 bg-neutral-950 px-4 py-2 sm:hidden"
          aria-label="Mobile navigation"
        >
          {[
            ['/dashboard', 'Dashboard'],
            ['/settings', 'Settings'],
            ['/players', 'Player Info'],
            ['/tracking', 'Tracking'],
            ['/leadership', 'Leadership'],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`block border-b border-gray-800/70 px-2 py-3 font-mono text-[11px] uppercase tracking-[0.2em] last:border-b-0 ${
                pathname === href ? 'text-amber-300' : 'text-gray-400 hover:text-neutral-100'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
