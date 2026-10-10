'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Database, KeyRound, Radio, ServerCrash } from 'lucide-react';
import RosterSearch from './RosterSearch';
import RosterSection from './RosterSection';
import RosterTabs from './RosterTabs';
import ServerStats from './ServerStats';
import { ErrorNotice, Loading, Notice, RosterFooter } from './shared';
import { buildSuggestions } from './suggestions';
import { useT } from '../i18n/LocaleProvider';

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
 *
 * Every visible string is a dictionary key resolved through `t`; tone and
 * icons stay structural so a translation never has to carry them.
 */
const STATUS_COPY = {
  not_configured: {
    title: 'home.notConfigured.title',
    body: 'home.notConfigured.body',
  },
  fetch_failed: { title: 'home.fetchFailed.title' },
  parse_empty: { title: 'home.parseEmpty.title' },
  auth_failed: {
    title: 'home.authFailed.title',
    tone: 'error',
  },
  auth_expired: {
    title: 'home.authExpired.title',
    tone: 'error',
  },
  awaiting_sync: {
    title: 'home.awaitingSync.title',
    body: 'home.awaitingSync.body',
  },
  unavailable: { title: 'home.unavailable.title', tone: 'error' },
};

export default function Home({ data, loading, error, onRetry }) {
  // Hooks come first: the loading and error paths below return early, and a
  // hook declared after them would run on some renders and not others.
  const [query, setQuery] = useState('');
  const t = useT();

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
  const stale = data.snapshot?.staleDays > 2;

  // Counts are pre-formatted here so the message can order them per language.
  const alliancesWord = t(alliances.length === 1 ? 'home.allianceOne' : 'home.allianceMany');
  const playersWord = t(players.length === 1 ? 'home.playerOne' : 'home.playerMany');

  return (
    <div className="space-y-6">
      {copy && (
        <Notice
          tone={copy.tone || 'neutral'}
          icon={ICONS[status] || Radio}
          title={t(copy.title)}
        >
          {data.detail || (copy.body ? t(copy.body) : null)}
        </Notice>
      )}

      {/* A usable roster can still carry a caveat, such as a crawl that hit its
          alliance cap. Surface it without reading as a failure. */}
      {status === 'ok' && data.detail && (
        <Notice
          tone="warn"
          icon={AlertTriangle}
          title={stale ? t('home.stale.title') : t('home.syncNote.title')}
        >
          {stale ? t('home.stale.body', { date: data.snapshot.date }) : data.detail}
        </Notice>
      )}

      {status === 'ok' && total === 0 && (
        <Notice icon={Radio} title={t('home.noRows.title')}>
          {t('home.noRows.body')}
        </Notice>
      )}

      {status === 'ok' && total > 0 && (
        <div className="space-y-2">
          <RosterSearch
            value={query}
            onChange={setQuery}
            suggestions={suggestions}
            label={t('search.label')}
            placeholder={t('search.placeholder')}
            clearLabel={t('search.clear')}
            listLabel={t('search.list')}
            loadingLabel={t('search.loading')}
            noMatchesLabel={t('search.noMatches', { q: query.trim() })}
            kindLabels={{ alliance: t('search.kindAlliance'), lord: t('search.kindLord') }}
          />

          <RosterTabs
            tabs={[
              {
                key: 'alliances',
                label: t('home.tabAlliances'),
                count: alliances.length,
                panel: (
                  <RosterSection
                    // Keyed per tab so the two keep their own place instead of
                    // handing a deep page index across on a switch.
                    key="alliances"
                    items={alliances}
                    perPage={10}
                    itemType="alliance"
                    emptyLabel={t('home.emptyAlliances')}
                    showHeader={false}
                    framed={false}
                  />
                ),
              },
              {
                key: 'players',
                label: t('home.tabPlayers'),
                shortLabel: t('home.tabPlayersShort'),
                count: players.length,
                panel: (
                  <RosterSection
                    key="players"
                    items={players}
                    perPage={10}
                    emptyLabel={t('home.emptyPlayers')}
                    showHeader={false}
                    framed={false}
                  />
                ),
              },
              {
                // The same rows read as a server: totals, the two leaderboards
                // and how power is spread, without another request.
                key: 'stats',
                label: t('home.tabStats'),
                shortLabel: t('home.tabStatsShort'),
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
        label={t('home.counts', {
          alliances: `${alliances.length} ${alliancesWord}`,
          players: `${players.length} ${playersWord}`,
        })}
        onRetry={onRetry}
        source={`${t('home.source')}${data.snapshot?.date ? ` · ${data.snapshot.date}` : ''}`}
      />
    </div>
  );
}
