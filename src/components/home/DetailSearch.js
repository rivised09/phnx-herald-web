'use client';

import { useEffect, useState } from 'react';
import RosterSearch from './RosterSearch';
import { buildSuggestions } from './suggestions';
import { useT } from '../i18n/LocaleProvider';

/**
 * The home page's lookup box, offered on the roster detail pages as well.
 *
 * Those pages render one account or one alliance, so they carry no roster to
 * match against: the cached home endpoint supplies it once on mount and the
 * list is then filtered in the browser exactly as it is at home. Until that
 * read lands the box simply has nothing to suggest rather than a wrong answer.
 */
export default function DetailSearch() {
  const t = useT();
  const [query, setQuery] = useState('');
  const [roster, setRoster] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/home/players')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('roster'))))
      .then((data) => {
        if (cancelled) return;
        setRoster({ alliances: data.alliances || [], players: data.players || [] });
      })
      .catch(() => {
        if (!cancelled) setRoster({ alliances: [], players: [] });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = roster ? buildSuggestions(roster.alliances, roster.players, query) : [];

  return (
    <RosterSearch
      value={query}
      onChange={setQuery}
      suggestions={suggestions}
      loading={roster === null}
      label={t('search.label')}
      placeholder={t('search.placeholder')}
      clearLabel={t('search.clear')}
      listLabel={t('search.list')}
      loadingLabel={t('search.loading')}
      noMatchesLabel={t('search.noMatches', { q: query.trim() })}
      kindLabels={{ alliance: t('search.kindAlliance'), lord: t('search.kindLord') }}
    />
  );
}
