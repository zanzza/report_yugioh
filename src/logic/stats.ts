import {
  UNKNOWN_DECK_LABEL,
  UNKNOWN_KEY,
  UNKNOWN_OPPONENT_DECK_LABEL,
  eventTypeLabel,
} from './constants';
import { compareLabels, displayNameFor, normalizeDeckKey } from './decks';
import {
  countByes,
  countUnplayed,
  gamesOf,
  isBye,
  isCounted,
  longestWinStreak,
  tallyOf,
} from './match';
import type {
  EventType,
  EventWithRounds,
  Games,
  Rate,
  Round,
  Tally,
  TournamentEvent,
} from './types';

/** Un taux vide : effectif nul, valeur indisponible. Jamais `NaN`, jamais `0`. */
function rate(numerator: number, denominator: number): Rate {
  return { n: denominator, value: denominator > 0 ? numerator / denominator : null };
}

/**
 * Taux de victoire en matchs : `victoires / matchs joués`.
 *
 * **Une nulle compte comme une défaite** — c'est la convention retenue pour ce
 * projet. Le bilan reste affiché `5-2-1` pour rester lisible, mais le taux ne
 * crédite que les victoires.
 */
export function matchWinRate(t: Tally): Rate {
  return rate(t.wins, t.played);
}

/** Taux de victoire en manches individuelles. */
export function gameWinRate(g: Games): Rate {
  return rate(g.won, g.total);
}

export interface ConditionalStats {
  tally: Tally;
  games: Games;
  matchWinRate: Rate;
  gameWinRate: Rate;
}

function conditionalStats(rounds: readonly Round[]): ConditionalStats {
  const tally = tallyOf(rounds);
  const games = gamesOf(rounds);
  return { tally, games, matchWinRate: matchWinRate(tally), gameWinRate: gameWinRate(games) };
}

export interface DiceStats {
  /** Rondes jouées **avec** un lancer de dé renseigné. */
  rollsWithDie: number;
  /** Dont celles où j'ai gagné le lancer. */
  dieWon: number;
  /** « Est-ce que je gagne le dé ? » — à ne pas confondre avec les deux suivants. */
  dieWinRate: Rate;
  /** « Quand je gagne le dé, est-ce que je gagne le match ? » */
  whenDieWon: ConditionalStats;
  /** « Quand je perds le dé, est-ce que je gagne le match ? » */
  whenDieLost: ConditionalStats;
  /** Rondes sans lancer (byes) : comptées au bilan, hors stats de dé. */
  noDie: Tally;
}

/**
 * Statistiques liées au lancer de dé.
 *
 * Les rondes sans lancer (`diceWon === null`, typiquement les byes) sont
 * **exclues des deux branches** : les compter gonflerait artificiellement le
 * côté « dé gagné ».
 */
export function diceStats(rounds: readonly Round[]): DiceStats {
  const played = rounds.filter(isCounted);
  const won = played.filter((r) => r.diceWon === true);
  const lost = played.filter((r) => r.diceWon === false);
  const none = played.filter((r) => r.diceWon === null);

  const rollsWithDie = won.length + lost.length;

  return {
    rollsWithDie,
    dieWon: won.length,
    dieWinRate: rate(won.length, rollsWithDie),
    whenDieWon: conditionalStats(won),
    whenDieLost: conditionalStats(lost),
    noDie: tallyOf(none),
  };
}

export interface GroupStat {
  /** Clé normalisée servant au regroupement. */
  key: string;
  /** Libellé d'affichage : la variante d'origine la plus fréquente. */
  label: string;
  tally: Tally;
  games: Games;
  matchWinRate: Rate;
  gameWinRate: Rate;
  /** Nombre d'events distincts qui alimentent ce groupe. */
  eventsCount: number;
}

interface Bucket {
  key: string;
  rawNames: (string | null)[];
  rounds: Round[];
  eventIds: Set<number>;
}

/** Extrait la clé de regroupement d'une ronde, ou `null` pour l'exclure. */
type KeyExtractor = (
  round: Round,
  event: TournamentEvent
) => { key: string; raw: string | null } | null;

function groupRounds(
  inputs: readonly EventWithRounds[],
  keyOf: KeyExtractor,
  labelOf: (key: string, rawNames: (string | null)[]) => string
): GroupStat[] {
  const buckets = new Map<string, Bucket>();

  for (const { event, rounds } of inputs) {
    for (const round of rounds) {
      if (!isCounted(round)) continue;

      const extracted = keyOf(round, event);
      if (extracted === null) continue;

      const bucket =
        buckets.get(extracted.key) ??
        { key: extracted.key, rawNames: [], rounds: [], eventIds: new Set<number>() };

      bucket.rawNames.push(extracted.raw);
      bucket.rounds.push(round);
      bucket.eventIds.add(event.id);
      buckets.set(extracted.key, bucket);
    }
  }

  const groups: GroupStat[] = [];
  for (const bucket of buckets.values()) {
    const tally = tallyOf(bucket.rounds);
    const games = gamesOf(bucket.rounds);
    groups.push({
      key: bucket.key,
      label: labelOf(bucket.key, bucket.rawNames),
      tally,
      games,
      matchWinRate: matchWinRate(tally),
      gameWinRate: gameWinRate(games),
      eventsCount: bucket.eventIds.size,
    });
  }

  return sortGroupsByRate(groups);
}

/** Un taux inconnu passe en dernier, sans jamais être assimilé à 0 %. */
function compareRateDesc(a: Rate, b: Rate): number {
  if (a.value === null && b.value === null) return 0;
  if (a.value === null) return 1;
  if (b.value === null) return -1;
  return b.value - a.value;
}

/** Tri par performance : taux décroissant, puis effectif, puis alphabétique. */
export function sortGroupsByRate(groups: GroupStat[]): GroupStat[] {
  return groups.sort(
    (a, b) =>
      compareRateDesc(a.matchWinRate, b.matchWinRate) ||
      b.tally.played - a.tally.played ||
      compareLabels(a.label, b.label)
  );
}

/** Tri par volume : effectif décroissant, puis taux, puis alphabétique. */
export function sortGroupsByVolume(groups: GroupStat[]): GroupStat[] {
  return groups.sort(
    (a, b) =>
      b.tally.played - a.tally.played ||
      compareRateDesc(a.matchWinRate, b.matchWinRate) ||
      compareLabels(a.label, b.label)
  );
}

function deckLabel(unknownLabel: string) {
  return (key: string, rawNames: (string | null)[]): string =>
    key === UNKNOWN_KEY ? unknownLabel : displayNameFor(rawNames) ?? key;
}

/**
 * Matchups. Les byes sont exclus (il n'y a pas d'adversaire) ; une ronde jouée
 * dont le deck adverse n'a pas été noté est regroupée sous « non renseigné ».
 */
export function groupByOpponentDeck(inputs: readonly EventWithRounds[]): GroupStat[] {
  return groupRounds(
    inputs,
    (round) =>
      isBye(round)
        ? null
        : { key: normalizeDeckKey(round.opponentDeck), raw: round.opponentDeck },
    deckLabel(UNKNOWN_OPPONENT_DECK_LABEL)
  );
}

/** Performance par deck que j'ai joué. */
export function groupByMyDeck(inputs: readonly EventWithRounds[]): GroupStat[] {
  return groupRounds(
    inputs,
    (_round, event) => ({ key: normalizeDeckKey(event.myDeck), raw: event.myDeck }),
    deckLabel(UNKNOWN_DECK_LABEL)
  );
}

/** Performance par type d'event (YCS, WCQ, OTS…). */
export function groupByEventType(inputs: readonly EventWithRounds[]): GroupStat[] {
  return groupRounds(
    inputs,
    (_round, event) => ({ key: event.type, raw: event.type }),
    (key) => eventTypeLabel(key as EventType)
  );
}

/** Matchups les plus pertinents : effectif suffisant, les plus joués d'abord. */
export function topMatchups(
  groups: readonly GroupStat[],
  options: { minN?: number; limit?: number } = {}
): GroupStat[] {
  const { minN = 1, limit = 10 } = options;
  return sortGroupsByVolume(groups.filter((g) => g.tally.played >= minN).slice()).slice(0, limit);
}

export interface EventStats {
  eventId: number;
  /** Rondes saisies, y compris les brouillons `0-0`. */
  roundsTotal: number;
  /** Rondes réellement jouées, seule base des calculs. */
  roundsCounted: number;
  roundsUnplayed: number;
  byes: number;
  tally: Tally;
  games: Games;
  matchWinRate: Rate;
  gameWinRate: Rate;
  longestWinStreak: number;
  dice: DiceStats;
  byOpponentDeck: GroupStat[];
}

/** Un event sans aucune ronde est valide : tout est à zéro, les taux à `null`. */
export function computeEventStats(input: EventWithRounds): EventStats {
  const { event, rounds } = input;
  const tally = tallyOf(rounds);
  const games = gamesOf(rounds);

  return {
    eventId: event.id,
    roundsTotal: rounds.length,
    roundsCounted: tally.played,
    roundsUnplayed: countUnplayed(rounds),
    byes: countByes(rounds),
    tally,
    games,
    matchWinRate: matchWinRate(tally),
    gameWinRate: gameWinRate(games),
    longestWinStreak: longestWinStreak(rounds),
    dice: diceStats(rounds),
    byOpponentDeck: groupByOpponentDeck([input]),
  };
}

export interface StatsFilter {
  eventTypes?: readonly EventType[];
  /** Noms de decks joués ; comparés sur la clé normalisée. */
  myDecks?: readonly string[];
  /** Bornes ISO `YYYY-MM-DD`, **incluses**. */
  from?: string;
  to?: string;
}

/**
 * Filtre les events. Les dates sont comparées comme des chaînes ISO : aucun
 * objet `Date`, donc aucun fuseau horaire et aucun bug de minuit.
 */
export function applyFilter(
  inputs: readonly EventWithRounds[],
  filter?: StatsFilter
): EventWithRounds[] {
  if (!filter) return [...inputs];

  const types = filter.eventTypes?.length ? new Set(filter.eventTypes) : null;
  const decks = filter.myDecks?.length
    ? new Set(filter.myDecks.map((d) => normalizeDeckKey(d)))
    : null;

  return inputs.filter(({ event }) => {
    if (types && !types.has(event.type)) return false;
    if (decks && !decks.has(normalizeDeckKey(event.myDeck))) return false;
    if (filter.from !== undefined && event.date < filter.from) return false;
    if (filter.to !== undefined && event.date > filter.to) return false;
    return true;
  });
}

export interface BestEvent {
  eventId: number;
  name: string;
  date: string;
  rate: number;
  tally: Tally;
}

export interface BestStanding {
  eventId: number;
  name: string;
  date: string;
  standing: number;
  playerCount: number | null;
}

export interface GlobalStats {
  eventsCount: number;
  /** Events ayant au moins une ronde jouée — seuls à peser sur les taux. */
  eventsWithRounds: number;
  roundsCounted: number;
  tally: Tally;
  games: Games;
  matchWinRate: Rate;
  gameWinRate: Rate;
  dice: DiceStats;
  byMyDeck: GroupStat[];
  byEventType: GroupStat[];
  byOpponentDeck: GroupStat[];
  bestEvent: BestEvent | null;
  bestStanding: BestStanding | null;
}

export function computeGlobalStats(
  inputs: readonly EventWithRounds[],
  options: { filter?: StatsFilter } = {}
): GlobalStats {
  const scoped = applyFilter(inputs, options.filter);
  const allRounds = scoped.flatMap(({ rounds }) => rounds);

  const tally = tallyOf(allRounds);
  const games = gamesOf(allRounds);

  let bestEvent: BestEvent | null = null;
  let bestStanding: BestStanding | null = null;
  let eventsWithRounds = 0;

  for (const { event, rounds } of scoped) {
    const eventTally = tallyOf(rounds);

    if (eventTally.played > 0) {
      eventsWithRounds++;
      const value = eventTally.wins / eventTally.played;
      if (
        bestEvent === null ||
        value > bestEvent.rate ||
        (value === bestEvent.rate && eventTally.played > bestEvent.tally.played) ||
        (value === bestEvent.rate &&
          eventTally.played === bestEvent.tally.played &&
          event.date > bestEvent.date)
      ) {
        bestEvent = { eventId: event.id, name: event.name, date: event.date, rate: value, tally: eventTally };
      }
    }

    if (event.finalStanding !== null) {
      if (bestStanding === null || event.finalStanding < bestStanding.standing) {
        bestStanding = {
          eventId: event.id,
          name: event.name,
          date: event.date,
          standing: event.finalStanding,
          playerCount: event.playerCount,
        };
      }
    }
  }

  return {
    eventsCount: scoped.length,
    eventsWithRounds,
    roundsCounted: tally.played,
    tally,
    games,
    matchWinRate: matchWinRate(tally),
    gameWinRate: gameWinRate(games),
    dice: diceStats(allRounds),
    byMyDeck: groupByMyDeck(scoped),
    byEventType: groupByEventType(scoped),
    byOpponentDeck: groupByOpponentDeck(scoped),
    bestEvent,
    bestStanding,
  };
}
