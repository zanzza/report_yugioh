import type { Games, MatchOutcome, Round, Tally } from './types';

/**
 * Résultat d'un match, dérivé du score et **jamais stocké** : une colonne
 * `result` finirait désynchronisée du score.
 *
 * Un `0-0` est une ronde créée mais pas encore jouée (brouillon) : elle est
 * exclue de toutes les statistiques.
 */
export function matchOutcome(r: Pick<Round, 'myWins' | 'oppWins'>): MatchOutcome {
  if (r.myWins > r.oppWins) return 'WIN';
  if (r.oppWins > r.myWins) return 'LOSS';
  return r.myWins + r.oppWins > 0 ? 'DRAW' : 'UNPLAYED';
}

/** Une ronde compte dans les stats dès qu'elle a été jouée. */
export function isCounted(r: Pick<Round, 'myWins' | 'oppWins'>): boolean {
  return matchOutcome(r) !== 'UNPLAYED';
}

/**
 * Un bye n'a pas de colonne dédiée : c'est une victoire sans lancer de dé et
 * sans adversaire. Compté au bilan, exclu des stats de dé et des matchups.
 */
export function isBye(r: Round): boolean {
  return (
    r.diceWon === null &&
    matchOutcome(r) === 'WIN' &&
    (r.opponentDeck === null || r.opponentDeck.trim() === '')
  );
}

/** Rondes jouées, triées par numéro croissant. Ne modifie pas l'entrée. */
export function countedRounds(rounds: readonly Round[]): Round[] {
  return rounds.filter(isCounted).slice().sort((a, b) => a.roundNumber - b.roundNumber);
}

export function tallyOf(rounds: readonly Round[]): Tally {
  const t: Tally = { wins: 0, losses: 0, draws: 0, played: 0 };
  for (const r of rounds) {
    switch (matchOutcome(r)) {
      case 'WIN':
        t.wins++;
        t.played++;
        break;
      case 'LOSS':
        t.losses++;
        t.played++;
        break;
      case 'DRAW':
        t.draws++;
        t.played++;
        break;
      case 'UNPLAYED':
        break;
    }
  }
  return t;
}

export function gamesOf(rounds: readonly Round[]): Games {
  const g: Games = { won: 0, lost: 0, total: 0 };
  for (const r of rounds) {
    if (!isCounted(r)) continue;
    g.won += r.myWins;
    g.lost += r.oppWins;
  }
  g.total = g.won + g.lost;
  return g;
}

/**
 * Plus longue série de victoires consécutives, dans l'ordre des rondes.
 * Une défaite comme une nulle brise la série ; une ronde `0-0` est ignorée
 * (elle n'a pas eu lieu) et ne brise donc pas la série.
 */
export function longestWinStreak(rounds: readonly Round[]): number {
  let best = 0;
  let current = 0;
  for (const r of countedRounds(rounds)) {
    if (matchOutcome(r) === 'WIN') {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}

export function countByes(rounds: readonly Round[]): number {
  return rounds.reduce((n, r) => (isBye(r) ? n + 1 : n), 0);
}

export function countUnplayed(rounds: readonly Round[]): number {
  return rounds.reduce((n, r) => (isCounted(r) ? n : n + 1), 0);
}
