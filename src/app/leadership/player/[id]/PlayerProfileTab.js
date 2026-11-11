'use client';

import { BadgeCheck, Heart, Images, Server, UserRound } from 'lucide-react';
import { Card } from './player-ui';

/**
 * The complete-data tab: everything the public profile shows, plus what it
 * does not - the whole album history with likes, the full server history,
 * every achievement with progress, the complete snapshot history and every
 * source stat row (the public view truncates sections to twelve rows).
 */

function parseCount(value) {
  const parsed = Number(String(value ?? '').replace(/[,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function ChipList({ values, empty }) {
  if (!values?.length) return <p className="mt-2 text-sm text-gray-600">{empty}</p>;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {values.map((value) => (
        <span
          key={value}
          className="rounded border border-gray-700/70 bg-gray-500/5 px-2 py-1 font-mono text-[11px] text-gray-300"
        >
          {value}
        </span>
      ))}
    </div>
  );
}

function IdentityCard({ profile, player }) {
  const nameHistory = profile.previousNames || [];
  const servers = profile.previousServers || [];
  const others = profile.otherServers || [];
  return (
    <Card title="Identity" description="Names and servers this account has been seen on.">
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">
            <UserRound className="h-3 w-3" /> Previous names
          </p>
          <ChipList values={nameHistory} empty="No previous names recorded." />
        </div>
        <div>
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">
            <Server className="h-3 w-3" /> Previous servers
          </p>
          <ChipList values={servers} empty="No previous servers recorded." />
          {others.length ? (
            <p className="mt-2 text-[11px] text-gray-600">Also seen on: {others.join(' · ')}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded border border-gray-800 bg-gray-800">
        {[
          ['Current name', profile.name],
          ['Alliance', player.alliance],
          ['Game ID', `#${profile.id}`],
        ].map(([label, value]) => (
          <div key={label} className="bg-discord-bg-darker px-3 py-2.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-600">{label}</p>
            <p className="mt-1 truncate text-xs text-neutral-200" title={String(value ?? '')}>
              {value || '—'}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AlbumCard({ profile }) {
  const albums = (profile.allAlbums?.length ? profile.allAlbums : profile.albums) || [];
  if (!albums.length) {
    return (
      <Card title="Album" description="Screenshots published on the source site.">
        <p className="mt-3 text-sm text-gray-600">No albums recorded for this player.</p>
      </Card>
    );
  }
  return (
    <Card
      title="Album"
      description={`${albums.length} image${albums.length === 1 ? '' : 's'} across the whole history, newest first - each with its posting date and likes.`}
    >
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {albums.slice(0, 12).map((album) => (
          <a
            key={album.url}
            href={album.url}
            target="_blank"
            rel="noreferrer"
            className="group overflow-hidden rounded border border-gray-700/70 bg-gray-500/5 transition hover:border-gray-500"
            title={album.caption || 'Open image'}
          >
            <div className="aspect-square overflow-hidden bg-gray-800/60">
              <img
                src={album.url}
                alt={album.caption || ''}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition group-hover:scale-[1.02]"
              />
            </div>
            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <span className="font-mono text-[10px] text-gray-500">{album.postedAt || album.date || '—'}</span>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-gray-400">
                <Heart className="h-3 w-3 text-red-400/80" />
                {album.likes ?? 0}
              </span>
            </div>
          </a>
        ))}
      </div>
      {albums.length > 12 ? (
        <p className="mt-2 text-[11px] text-gray-600">Showing the newest 12 of {albums.length}.</p>
      ) : null}
    </Card>
  );
}

function AchievementsCard({ profile }) {
  const achievements = profile.achievements || [];
  if (!achievements.length) {
    return (
      <Card title="Achievements">
        <p className="mt-3 text-sm text-gray-600">No achievements recorded for this player.</p>
      </Card>
    );
  }
  return (
    <Card
      title={`Achievements (${achievements.length})`}
      description="Progress at the latest snapshot; completed ones are marked."
    >
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {achievements.slice(0, 24).map((achievement) => {
          const progress = parseCount(achievement.progress);
          const target = parseCount(achievement.target);
          const done = achievement.completedAt || (progress != null && target != null && progress >= target);
          const pct = progress != null && target ? Math.min(100, Math.round((progress / target) * 100)) : null;
          return (
            <div key={achievement.name} className="rounded border border-gray-800 bg-gray-500/[0.03] px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-xs text-gray-300" title={achievement.name}>
                  {achievement.name}
                </p>
                {done ? <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> : null}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-800">
                  <div
                    className={`h-full rounded-full ${done ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    style={{ width: `${pct ?? 0}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-gray-500">
                  {achievement.progress ?? '—'}
                  {achievement.target ? ` / ${achievement.target}` : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {achievements.length > 24 ? (
        <p className="mt-2 text-[11px] text-gray-600">Showing the newest 24 of {achievements.length}.</p>
      ) : null}
    </Card>
  );
}

function HistoryCard({ profile }) {
  const history = [...(profile.history || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!history.length) {
    return (
      <Card title="Snapshot history">
        <p className="mt-3 text-sm text-gray-600">No snapshot history recorded.</p>
      </Card>
    );
  }
  return (
    <Card
      title={`Snapshot history (${history.length})`}
      description="Every stored reading of power and rank, newest first."
    >
      <div className="mt-3 max-h-72 overflow-auto rounded border border-gray-800">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-discord-bg-darker font-mono text-[9px] uppercase tracking-[0.14em] text-gray-600">
            <tr>
              <th className="px-3 py-2 font-normal">Date</th>
              <th className="px-3 py-2 text-right font-normal">Power</th>
              <th className="px-3 py-2 text-right font-normal">Rank</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/70">
            {history.map((row) => (
              <tr key={row.date}>
                <td className="px-3 py-1.5 font-mono text-[11px] text-gray-400">{row.date}</td>
                <td className="px-3 py-1.5 text-right font-mono text-[11px] text-gray-200">
                  {row.power != null ? Number(row.power).toLocaleString('en-US') : '—'}
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-[11px] text-gray-500">
                  {row.rank != null ? `#${row.rank}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SourceMetricsCard({ profile }) {
  const sections = (profile.sections || []).filter((section) => section.rows?.length);
  if (!sections.length) return null;
  return (
    <Card
      title={`Source metrics (${sections.length} sections)`}
      description="Every stat row the sources recorded for this snapshot, at full precision - none truncated."
    >
      <div className="mt-3 space-y-1.5">
        {sections.map((section, index) => (
          <details key={section.section || `section-${index}`} className="rounded border border-gray-800 bg-gray-500/[0.03] px-3 py-2" open={index === 0}>
            <summary className="cursor-pointer list-none font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">
              {section.section || 'Profile'}
              <span className="ml-2 text-gray-600">({section.rows.length})</span>
            </summary>
            <dl className="mt-2 divide-y divide-gray-800/70">
              {section.rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-3 py-1.5 text-xs">
                  <dt className="truncate text-gray-400">{row.label}</dt>
                  <dd className="shrink-0 font-mono text-gray-200">{row.value ?? 'No data'}</dd>
                </div>
              ))}
            </dl>
          </details>
        ))}
      </div>
    </Card>
  );
}

export default function PlayerProfileTab({ profile, player }) {
  return (
    <div className="space-y-5">
      <IdentityCard profile={profile} player={player} />
      <div className="grid gap-5 lg:grid-cols-2">
        <AlbumCard profile={profile} />
        <AchievementsCard profile={profile} />
      </div>
      <HistoryCard profile={profile} />
      <SourceMetricsCard profile={profile} />
    </div>
  );
}
