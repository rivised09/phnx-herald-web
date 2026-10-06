'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Database, KeyRound, Radio, ServerCrash } from 'lucide-react';
import RosterSearch from './RosterSearch';
import RosterSection from './RosterSection';
import RosterTabs from './RosterTabs';
import ServerStats from './ServerStats';
import { ErrorNotice, Loading, Notice, RosterFooter } from './shared';
import { buildSuggestions } from './suggestions';

const ICONS = {
  not_configured: Radio,
  fetch_failed: AlertTriangle,
  parse_empty: AlertTriangle,
  auth_failed: KeyRound,
  auth_expired: KeyRound,
  awaiting_sync: Database,
  unavailable: ServerCrash,
};

/**
 * The public home page. It reads the latest stored snapshot from the roster
 * database and shows both categories - alliances first, then players - behind
 * one browser-style tab strip, each paginated at 10 rows so the page stays a
 * fixed, readable length no matter how large the server grows. It never
 * touches the source site.
 *
 * A search box above the strip suggests matching alliances and lords as the
 * visitor types, labelled by kind and opening straight onto the roster page
 * they came from. The tables themselves are never narrowed: the whole
 * snapshot is already here, so the list is a local pass rather than another
 * read, and the answer arrives with the keystroke.
 *
 * A source that has not been reached yet is presented as a state of the data
 * rather than a page-level failure, so the shell stays usable while the first
 * sync completes or while the bot is being set up.
 */
const STATUS_COPY = {
  not_configured: {
    title: 'Source not connected',
    body: 'The CallofStats credentials are missing. Set CALLOFSTATS_USERNAME and CALLOFSTATS_PASSWORD on the bot.',
  },
  fetch_failed: { title: 'Could not reach the source' },
  parse_empty: { title: 'No rows recognised' },
  auth_failed: {
    title: 'CallofStats rejected the credentials',
    tone: 'error',
  },
  auth_expired: {
    title: 'CallofStats session expired',
    tone: 'error',
  },
  awaiting_sync: {
    title: 'First sync in progress',
    body: 'This page reads from our own database, and no snapshot has been ingested yet. The background sync fills it in within a few minutes.',
  },
  unavailable: { title: 'Roster service unavailable', tone: 'error' },
};

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export default function Home({ data, loading, error, onRetry }) {
  // Hooks come first: the loading and error paths below return early, and a
  // hook declared after them would run on some renders and not others.
  const [query, setQuery] = useState('');

  const alliances = data?.alliances || [];
  const players = data?.players || [];
  const suggestions = useMemo(
    () => buildSuggestions(alliances, players, query),
    [alliances, players, query],
  );

  if (loading) return <Loading />;
  if (error) return <ErrorNotice error={error} />;

  const status = data?.status;
  const copy = STATUS_COPY[status];
  const total = alliances.length + players.length;

  return (
    <div className="space-y-6">
      {copy && (
        <Notice
          tone={copy.tone || 'neutral'}
          icon={ICONS[status] || Radio}
          title={copy.title}
        >
          {data.detail || copy.body}
        </Notice>
      )}

      {/* A usable roster can still carry a caveat, such as a crawl that hit its
          alliance cap. Surface it without reading as a failure. */}
      {status === 'ok' && data.detail && (
        <Notice
          tone="warn"
          icon={AlertTriangle}
          title={data.snapshot?.staleDays > 2 ? 'Last verified data' : 'Sync note'}
        >
          {data.snapshot?.staleDays > 2
            ? `The latest verified database snapshot is ${data.snapshot.date}. A new source sync is required before showing current data.`
            : data.detail}
        </Notice>
      )}

      {status === 'ok' && total === 0 && (
        <Notice icon={Radio} title="No rows yet">
          The stored snapshot has no alliances and no players.
        </Notice>
      )}

      {status === 'ok' && total > 0 && (
        <div className="space-y-2">
          <RosterSearch value={query} onChange={setQuery} suggestions={suggestions} />

          <RosterTabs
            tabs={[
              {
                key: 'alliances',
                label: 'Alliances',
                count: alliances.length,
                panel: (
                  <RosterSection
                    // Keyed per tab so the two keep their own place instead of
                    // handing a deep page index across on a switch.
                    key="alliances"
                    items={alliances}
                    perPage={10}
                    itemType="alliance"
                    emptyLabel="No alliances found on this server."
                    showHeader={false}
                    framed={false}
                  />
                ),
              },
              {
                key: 'players',
                label: 'Lords / Players',
                shortLabel: 'Lords',
                count: players.length,
                panel: (
                  <RosterSection
                    key="players"
                    items={players}
                    perPage={10}
                    emptyLabel="No players found for these alliances."
                    showHeader={false}
                    framed={false}
                  />
                ),
              },
              {
                // The same rows read as a server: totals, the two leaderboards
                // and how power is spread, without another request.
                key: 'stats',
                label: 'Server stats',
                shortLabel: 'Stats',
                count: total,
                panel: (
                  <ServerStats
                    key="stats"
                    alliances={alliances}
                    players={players}
                    snapshot={data.snapshot}
                  />
                ),
              },
            ]}
          />
        </div>
      )}

      <RosterFooter
        count={total}
        label={`${plural(alliances.length, 'alliance')} · ${plural(players.length, 'player')}`}
        onRetry={onRetry}
        source={`database${data.snapshot?.date ? ` · ${data.snapshot.date}` : ''}`}
      />
    </div>
  );
}
