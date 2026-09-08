import { describe, expect, it } from 'vitest';

import {
  countByes,
  countUnplayed,
  gamesOf,
  isBye,
  isCounted,
  longestWinStreak,
  matchOutcome,
  tallyOf,
} from '@/logic/match';
import { r } from './fixtures';

describe('matchOutcome', () => {
  it('dérive la victoire du score', () => {
    expect(matchOutcome({ myWins: 2, oppWins: 0 })).toBe('WIN');
    expect(matchOutcome({ myWins: 2, oppWins: 1 })).toBe('WIN');
  });

  it('dérive la défaite du score', () => {
    expect(matchOutcome({ myWins: 1, oppWins: 2 })).toBe('LOSS');
    expect(matchOutcome({ myWins: 0, oppWins: 2 })).toBe('LOSS');
  });

  it('traite 1-1 comme une nulle', () => {
    expect(matchOutcome({ myWins: 1, oppWins: 1 })).toBe('DRAW');
  });

  it('traite 0-0 comme une ronde pas encore jouée', () => {
    expect(matchOutcome({ myWins: 0, oppWins: 0 })).toBe('UNPLAYED');
    expect(isCounted({ myWins: 0, oppWins: 0 })).toBe(false);
  });
});

describe('tallyOf / gamesOf', () => {
  it('exclut les rondes 0-0 du bilan et des manches', () => {
    const rounds = [r(1, true, 2, 0), r(2, false, 1, 2), r(3, null, 0, 0)];

    expect(tallyOf(rounds)).toEqual({ wins: 1, losses: 1, draws: 0, played: 2 });
    expect(gamesOf(rounds)).toEqual({ won: 3, lost: 2, total: 5 });
    expect(countUnplayed(rounds)).toBe(1);
  });

  it('renvoie des compteurs à zéro sans ronde', () => {
    expect(tallyOf([])).toEqual({ wins: 0, losses: 0, draws: 0, played: 0 });
    expect(gamesOf([])).toEqual({ won: 0, lost: 0, total: 0 });
  });
});

describe('isBye', () => {
  it("reconnaît une victoire sans lancer de dé et sans adversaire", () => {
    expect(isBye(r(1, null, 2, 0))).toBe(true);
    expect(isBye(r(1, null, 2, 0, '   '))).toBe(true); // deck vide = pas d'adversaire
  });

  it('refuse tout ce qui ressemble à un vrai match', () => {
    expect(isBye(r(1, true, 2, 0))).toBe(false); // il y a eu un lancer
    expect(isBye(r(1, null, 1, 2))).toBe(false); // ce n'est pas une victoire
    expect(isBye(r(1, null, 2, 0, 'Ryzeal'))).toBe(false); // il y avait un adversaire
  });

  it('compte les byes', () => {
    expect(countByes([r(1, null, 2, 0), r(2, true, 2, 1, 'Maliss')])).toBe(1);
  });
});

describe('longestWinStreak', () => {
  it('brise la série sur une défaite comme sur une nulle', () => {
    const rounds = [
      r(1, true, 2, 0),
      r(2, true, 2, 1),
      r(3, false, 1, 1), // nulle : brise la série
      r(4, true, 2, 0),
    ];
    expect(longestWinStreak(rounds)).toBe(2);
  });

  it('ignore les rondes 0-0 sans briser la série', () => {
    const rounds = [r(1, true, 2, 0), r(2, null, 0, 0), r(3, true, 2, 1)];
    expect(longestWinStreak(rounds)).toBe(2);
  });

  it('se fonde sur le numéro de ronde, pas sur l’ordre du tableau', () => {
    const rounds = [r(3, true, 2, 0), r(1, true, 2, 0), r(2, false, 0, 2)];
    expect(longestWinStreak(rounds)).toBe(1);
  });

  it('vaut zéro sans victoire', () => {
    expect(longestWinStreak([])).toBe(0);
    expect(longestWinStreak([r(1, true, 0, 2)])).toBe(0);
  });
});
