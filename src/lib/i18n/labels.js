/**
 * Maps the English labels the bot ships (scraped verbatim from the source
 * site, or composed in its insights layer) to message keys. Anything missing
 * from these maps simply renders the raw English label, so a label the site
 * renames never breaks the page - it just stays untranslated.
 */

/** Source-printed section headings, in the bot's own spelling. */
export const SECTION_KEYS = {
  'War Stats': 'sec.warStats',
  'Advanced War Stats': 'sec.advancedWarStats',
  'Extra War Stats': 'sec.extraWarStats',
  'Historical Season Stats': 'sec.historicalSeasonStats',
  'Tournament of Champion Stats': 'sec.tournamentOfChampionStats',
  'Roots of War Stats': 'sec.rootsOfWarStats',
  'Root of War League Stats': 'sec.rootOfWarLeagueStats',
  'Historic Tiered Kills': 'sec.historicTieredKills',
  'Gathered Resources': 'sec.gatheredResources',
  'Extra Resource Stats': 'sec.extraResourceStats',
  'Historic Resources Spent': 'sec.historicResourcesSpent',
  'Power Spread': 'sec.powerSpread',
  'Alliance Activity': 'sec.allianceActivity',
  Playstyle: 'sec.playstyle',
};

/** Scraped row labels (identity card + every stat section). */
export const ROW_KEYS = {
  // Identity card (Profile block).
  'Current Power': 'prof.currentPower',
  'Currently King': 'prof.currentlyKing',
  'Days as King': 'prof.daysAsKing',
  Division: 'prof.division',
  Faction: 'prof.faction',
  'Highest Power': 'prof.highestPower',
  ID: 'prof.id',
  'Leadership Time': 'prof.leadershipTime',
  'Migration Score': 'prof.migrationScore',
  Server: 'prof.server',
  'Town Hall': 'prof.townHall',
  Alliance: 'prof.alliance',
  Rank: 'metric.rank',
  Power: 'metric.power',
  // Power spread / building.
  'Building Power': 'src.buildingPower',
  'Hero Power': 'src.heroPower',
  'Legion Power': 'src.legionPower',
  'Tech Power': 'src.techPower',
  // War stats tiles and rows.
  'Kill to Heal Ratio': 'war.killToHealRatio',
  'Merit to Power Ratio': 'war.meritToPowerRatio',
  Merits: 'metric.merits',
  'Units Dead': 'war.unitsDead',
  'Units Healed': 'metric.healed',
  'Units Killed': 'metric.kills',
  'Other Merits': 'src.otherMerits',
  'T4/T5 Units Dead': 'src.t45UnitsDead',
  'T4/T5 Units Rss Healed': 'src.t45UnitsRssHealed',
  'Cavalry Merits': 'war.cavalryMerits',
  'Infantry Merits': 'war.infantryMerits',
  'Mage Merits': 'war.mageMerits',
  'Marksman Merits': 'war.marksmanMerits',
  'City Sieges': 'src.citySieges',
  Defeats: 'metric.defeats',
  'Times Scouted': 'src.timesScouted',
  Victories: 'metric.victories',
  'Victory to Defeat Ratio': 'src.victoryToDefeatRatio',
  // Historical / season.
  'Historical Highest Merits': 'src.historicalHighestMerits',
  'Historical Most Resource Healing': 'src.historicalMostResourceHealing',
  'Season Defeats': 'src.seasonDefeats',
  'Season Victories': 'src.seasonVictories',
  'Season Winrate': 'src.seasonWinrate',
  'Seasons Played': 'src.seasonsPlayed',
  // Tournament of Champions.
  'ToC Battles': 'src.tocBattles',
  'ToC Current Bracket': 'src.tocCurrentBracket',
  'ToC Current Placement': 'src.tocCurrentPlacement',
  'ToC Highest Bracket': 'src.tocHighestBracket',
  'ToC Highest Placement': 'src.tocHighestPlacement',
  'ToC Losses': 'src.tocLosses',
  'ToC Winrate': 'src.tocWinrate',
  'ToC Wins': 'src.tocWins',
  // Roots of War.
  'Highest RoW Score': 'src.rowHighestScore',
  'RoW Losses': 'src.rowLosses',
  'RoW Matches Played': 'src.rowMatchesPlayed',
  'RoW Winrate': 'src.rowWinrate',
  'RoW Wins': 'src.rowWins',
  'RoW League Winrate': 'src.rowLeagueWinrate',
  'RoW Leagues Lost': 'src.rowLeaguesLost',
  'RoW Leagues Played': 'src.rowLeaguesPlayed',
  'RoW Leagues Won': 'src.rowLeaguesWon',
  // Tiered kills.
  'T1 Kills': 'src.t1Kills',
  'T2 Kills': 'src.t2Kills',
  'T3 Kills': 'src.t3Kills',
  'T4 Kills': 'src.t4Kills',
  'T5 Kills': 'src.t5Kills',
  // Gathered resources.
  'Gems Gathered': 'src.gemsGathered',
  'Gold Gathered': 'src.goldGathered',
  'Mana Gathered': 'src.manaGathered',
  'Ore Gathered': 'src.oreGathered',
  'Wood Gathered': 'src.woodGathered',
  'Total Resources Gathered': 'metric.gathered',
  // Extra resource stats / alliance activity.
  'Times Alliance Helps Given': 'src.timesAllianceHelpsGiven',
  'Times Resource Assistance Given': 'src.timesResourceAssistanceGiven',
  'Total Resource Assistance Given': 'src.totalResourceAssistanceGiven',
  'Alliance Donations': 'metric.donations',
  'Behemoth Raid Wins': 'src.behemothRaidWins',
  'Build Time': 'src.buildTime',
  'Destruction Time': 'src.destructionTime',
  // Historic resources spent.
  'Gems Spent': 'src.gemsSpent',
  'Gold Spent': 'src.goldSpent',
  'Mana Spent': 'src.manaSpent',
  'Ore Spent': 'src.oreSpent',
  'Wood Spent': 'src.woodSpent',
};

/** The source site's own achievement grid (scraped names, no keys). */
export const ACH_KEYS = {
  'Alliance Blessing Chests': 'ach.allianceBlessingChests',
  'Conquest Chest': 'ach.conquestChest',
  'Development Chest': 'ach.developmentChest',
  'Exchange Coins Spent': 'ach.exchangeCoinsSpent',
  'Exemplar Unlocked': 'ach.exemplarUnlocked',
  'Exploration Chest': 'ach.explorationChest',
  'Full T5': 'ach.fullT5',
  'Golden Alliance Chests': 'ach.goldenAllianceChests',
  'Legendary Artifacts Acquired': 'ach.legendaryArtifactsAcquired',
  'Legendary City Themes': 'ach.legendaryCityThemes',
  'Legendary Heroes Awakened': 'ach.legendaryHeroesAwakened',
  'Max Decorations': 'ach.maxDecorations',
  'Max Pets': 'ach.maxPets',
  'Paramount Champion Wins': 'ach.paramountChampionWins',
  'Peacekeeping Chest': 'ach.peacekeepingChest',
  'Pets Released': 'ach.petsReleased',
  'Season Anointed Rewards': 'ach.seasonAnointedRewards',
  'Season Conqueror+ Rewards': 'ach.seasonConquerorRewards',
  'Sociability Chest': 'ach.sociabilityChest',
  'Tiered Units': 'ach.tieredUnits',
  'Total Merits': 'ach.totalMerits',
  'Power Pursuit': 'ach.powerPursuit',
};

/** Playstyle strength / growth items (fixed strings from the bot). */
export const ITEM_KEYS = {
  'Front-line pressure': 'str.frontline',
  'Battle volume': 'str.battleVolume',
  'Sustain and recovery': 'str.sustainRecovery',
  'Low net attrition': 'str.lowAttrition',
  'Buildings and technology': 'str.buildingsTech',
  'Efficient power base': 'str.efficientPowerBase',
  'Alliance contributions': 'str.allianceContributions',
  'Team events': 'str.teamEvents',
  'Resource income': 'str.resourceIncome',
  'Sustainable growth': 'str.sustainableGrowth',
  'Fast power growth': 'str.fastPowerGrowth',
  Momentum: 'str.momentum',
  'Even development': 'str.evenDevelopment',
  Flexibility: 'str.flexibility',
  'Recovery between fights': 'grow.recoveryBetweenFights',
  'City upkeep': 'grow.cityUpkeep',
  'Damage output': 'grow.damageOutput',
  'Finishing fights': 'grow.finishingFights',
  'Troop depth': 'grow.troopDepth',
  'Field presence': 'grow.fieldPresence',
  'Personal combat record': 'grow.personalCombatRecord',
  'Independent gains': 'grow.independentGains',
  'Combat statistics': 'grow.combatStatistics',
  'War participation': 'grow.warParticipation',
  'Combat record': 'grow.combatRecord',
  'Efficiency ratios': 'grow.efficiencyRatios',
  'A standout specialty': 'grow.standoutSpecialty',
};

/** Signal labels (profile rings), keyed by the bot's signal key. */
export const SIGNAL_KEYS = {
  overall: 'sig.overall',
  combatActivity: 'sig.combatActivity',
  growth: 'sig.growth',
  warContribution: 'sig.warContribution',
  accountProgression: 'sig.accountProgression',
};

/** Badge groups, keyed by the bot's group string. */
export const GROUP_KEYS = {
  Power: 'grp.power',
  Combat: 'grp.combat',
  Sustain: 'grp.sustain',
  Honours: 'grp.honours',
  Journey: 'grp.journey',
  Other: 'grp.other',
};

/** Translate a scraped row label, or null when the label is unknown. */
export function rowKeyFor(label) {
  return ROW_KEYS[label] || null;
}

/** Translate a scraped achievement name, or null when unknown. */
export function achievementKeyFor(name) {
  return ACH_KEYS[name] || null;
}

/** Translate a playstyle strength/growth item, or null when unknown. */
export function itemKeyFor(item) {
  if (ITEM_KEYS[item]) return ITEM_KEYS[item];
  if (SIGNAL_KEYS_LABEL[item]) return SIGNAL_KEYS_LABEL[item];
  return null;
}

/** Reverse map: signal label → message key. */
export const SIGNAL_KEYS_LABEL = {
  Overall: 'sig.overall',
  'Combat activity': 'sig.combatActivity',
  Growth: 'sig.growth',
  'War contribution': 'sig.warContribution',
  'Account progression': 'sig.accountProgression',
};
