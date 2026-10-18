'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Database, KeyRound, Radio, ServerCrash } from 'lucide-react';
import RosterSearch from './RosterSearch';
import RosterSection from './RosterSection';
import RosterTabs from './RosterTabs';
import MeritFilter from './MeritFilter';
import SnapshotFilter from './SnapshotFilter';
import ServerStats from './ServerStats';
import { ErrorNotice, Loading, Notice, RosterFooter } from './shared';
import LoadingOverlay from '../LoadingOverlay';
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

export default function Home({
  data,
  loading,
  pending = false,
  error,
  snapshotDate,
  onSnapshotChange,
  onRetry,
}) {
  // Hooks come first: the loading and error paths below return early, and a
  // hook declared after them would run on some renders and not others.
  const [query, setQuery] = useState('');
  const [meritTypes, setMeritTypes] = useState([]);
  const [meritOrder, setMeritOrder] = useState('desc');
  const t = useT();

  const alliances = data?.alliances || [];
  const players = data?.players || [];
  const suggestions = useMemo(
    () => buildSuggestions(alliances, players, query),
    [alliances, players, query],
  );

  // Every stored date for the server, newest first. An older cached payload
  // without the full list degrades to the one date it does carry, which hides
  // the selector rather than misfiling it.
  const snapshotDates = useMemo(() => {
    const dates = data?.snapshot?.dates;
    if (Array.isArray(dates) && dates.length) return dates;
    return data?.snapshot?.date ? [data.snapshot.date] : [];
  }, [data]);

  // A pinned ?date= in the page URL is re-adopted whenever fresh data lands,
  // so a reload - or the way back from a detail page - keeps the pick and the
  // parent re-reads that snapshot's rows. Only a date still in the list is
  // adopted; a stale URL falls back to newest.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('date');
    if (wanted && /^\d{4}-\d{2}-\d{2}$/.test(wanted) && snapshotDates.includes(wanted)) {
      onSnapshotChange(wanted);
    }
  }, [snapshotDates, onSnapshotChange]);

  // Picking the newest date drops the pin again: default and explicitly-newest
  // are the same read and the row links stay clean when nothing was
  // overridden. Every pick is mirrored into ?date= so it outlives a reload,
  // and the parent re-reads the roster for the chosen snapshot.
  const latestDate = snapshotDates[0] || null;
  const pickSnapshot = (next) => {
    onSnapshotChange(next === latestDate ? '' : next);
    const url = new URL(window.location.href);
    if (next && next !== latestDate) url.searchParams.set('date', next);
    else url.searchParams.delete('date');
    window.history.replaceState(window.history.state, '', url);
  };

  // A merit selection reorders the players tab by the total of the chosen
  // troop types (All = all four); with nothing selected the stored power-rank
  // order stands.
  const sortedPlayers = useMemo(() => {
    if (!meritTypes.length) return players;
    // Comparator reads high-to-low, so ascending flips the sign.
    const sign = meritOrder === 'asc' ? -1 : 1;
    const total = (player) =>
      meritTypes.reduce((sum, key) => sum + (Number(player.merits?.[key]) || 0), 0);
    return players
      .slice()
      .sort((a, b) => sign * (total(b) - total(a)));
  }, [players, meritTypes, meritOrder]);

  if (loading) return <Loading />;
  if (error) return <ErrorNotice error={error} />;

  const status = data?.status;
  const copy = STATUS_COPY[status];
  const total = alliances.length + players.length;
  const stale = data.snapshot?.staleDays > 2;
  // The stale banner is about the NEWEST snapshot being behind. A pinned date
  // is a deliberate pick, so it gets the archived badge on the selector
  // instead of a warning that would mislabel its date as the latest one.
  const viewingLatest = !snapshotDates.length || data.snapshot?.date === snapshotDates[0];

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

      {/* A usable roster can still carry a caveat, such as a crawl that hit
          its alliance cap. Surface it without reading as a failure - but only
          while the newest snapshot is on screen: a pinned date is a deliberate
          pick, already labelled by the archived badge on the selector. */}
      {status === 'ok' && data.detail && viewingLatest && (
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

      {/* Reading another date: the card stands centered while the rows below
          wait it out at reduced opacity. */}
      {pending && <LoadingOverlay labelKey="home.loading" />}

      {status === 'ok' && total > 0 && (
        // While the pinned snapshot is still being read, the rows already on
        // screen stay up at reduced opacity under the card rather than
        // collapsing away: they are still true data, just about to be replaced.
        <div
          className={`space-y-2 transition-opacity ${pending ? 'opacity-60' : ''}`}
          aria-busy={pending}
        >
          {/* Search on the left; the snapshot selector and the merit filters
              share the right of the same row. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
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
            <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
              <SnapshotFilter
                dates={snapshotDates}
                value={snapshotDate}
                onChange={pickSnapshot}
                label={t('roster.snapshot')}
                ariaLabel={t('roster.snapshotDateAria')}
                latestLabel={(date) => t('roster.latest', { date })}
                archivedLabel={latestDate ? t('roster.archived', { latest: latestDate }) : null}
              />
              <MeritFilter
                value={meritTypes}
                onChange={setMeritTypes}
                order={meritOrder}
                onOrderChange={setMeritOrder}
                label={t('filter.merit')}
                allLabel={t('unit.all')}
                typeLabels={{
                  infantry: t('unit.infantry'),
                  cavalry: t('unit.cavalry'),
                  marksman: t('unit.marksman'),
                  mage: t('unit.mage'),
                }}
                descLabel={t('sort.desc')}
                ascLabel={t('sort.asc')}
              />
            </div>
          </div>

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
                    linkDate={snapshotDate || null}
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
                    // Keyed per filter combination too, so changing the merit
                    // filter starts the list back at its first page instead of
                    // keeping a page index meant for another ordering.
                    key={`players-${[...meritTypes].sort().join('-')}-${meritOrder}`}
                    items={sortedPlayers}
                    perPage={10}
                    emptyLabel={t('home.emptyPlayers')}
                    showHeader={false}
                    framed={false}
                    linkDate={snapshotDate || null}
                    meritLabels={{
                      infantry: t('unit.infantry'),
                      cavalry: t('unit.cavalry'),
                      marksman: t('unit.marksman'),
                      mage: t('unit.mage'),
                    }}
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
