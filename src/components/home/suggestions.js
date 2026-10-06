/**
 * What the search box offers, decided in one place.
 *
 * Both the home page and the detail pages' copy of the box build their
 * suggestions through here, so a term reads the same way wherever it is typed:
 * every word has to appear somewhere in the row, and a lord is reachable by
 * name, by the alliance they belong to, or by the account ID printed on their
 * own profile.
 */

/** How much one term may put forward: enough to choose from, short enough to scan. */
export const MAX_SUGGESTIONS = 6;

export function termsOf(query) {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function matchesAlliance(alliance, terms) {
  if (!terms.length) return true;
  const haystack = String(alliance.name || '').toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

/**
 * A lord matches on their own name, on the alliance they belong to, or on
 * their ID: the home payload carries the alliance's name on each row and the
 * source's numeric ID as `id`, so "25732950" opens straight onto that account.
 */
export function matchesPlayer(player, terms) {
  if (!terms.length) return true;
  const haystack = `${player.name || ''} ${player.allianceId || ''} ${player.id || ''}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

/**
 * What a term puts forward: alliances first, then lords, each carrying its
 * kind so the two are told apart at a glance. A lord also carries the
 * alliance it belongs to - the one detail that explains why its name matched.
 */
export function buildSuggestions(alliances, players, query) {
  const terms = termsOf(query);
  if (!terms.length) return [];

  return [
    ...alliances
      .filter((alliance) => matchesAlliance(alliance, terms))
      .slice(0, MAX_SUGGESTIONS)
      .map((alliance) => ({
        key: `alliance:${alliance.id}`,
        kind: 'alliance',
        name: alliance.name,
        href: `/roster/alliance/${encodeURIComponent(alliance.id)}`,
      })),
    ...players
      .filter((player) => matchesPlayer(player, terms))
      .slice(0, MAX_SUGGESTIONS)
      .map((player) => ({
        key: `lord:${player.id}`,
        kind: 'lord',
        name: player.name,
        href: `/roster/player/${encodeURIComponent(player.id)}`,
        meta: player.allianceId || null,
      })),
  ];
}
