import { describe, expect, it } from 'vitest';

import { UNKNOWN_KEY } from '@/logic/constants';
import {
  applyFilter,
  computeEventStats,
  computeGlobalStats,
  diceStats,
  gameWinRate,
  groupByEventType,
  groupByMyDeck,
  groupByOpponentDeck,
  matchWinRate,
  sortGroupsByRate,
  sortGroupsByVolume,
  topMatchups,
} from '@/logic/stats';
import { gamesOf, tallyOf } from '@/logic/match';
import { localeJanvier, makeEvent, r, ycsLyon } from './fixtures';

describe('taux de victoire', () => {
  it('compte une nulle comme une défaite', () => {
    const tally = { wins: 5, losses: 2, draws: 1, played: 8 };
    expect(matchWinRate(tally)).toEqual({ n: 8, value: 0.625 });
  });

  it('ne renvoie jamais NaN ni un 0 trompeur quand l’effectif est nul', () => {
    expect(matchWinRate({ wins: 0, losses: 0, draws: 0, played: 0 })).toEqual({ n: 0, value: null });
    expect(gameWinRate({ won: 0, lost: 0, total: 0 })).toEqual({ n: 0, value: null });
  });
});

describe('computeEventStats — event dégénéré', () => {
  it('accepte un event sans aucune ronde', () => {
    const stats = computeEventStats({ event: makeEvent(), rounds: [] });

    expect(stats.roundsCounted).toBe(0);
    expect(stats.matchWinRate.value).toBeNull();
    expect(stats.gameWinRate.value).toBeNull();
    expect(stats.dice.dieWinRate.value).toBeNull();
    expect(stats.byOpponentDeck).toEqual([]);
  });

  it('accepte un event dont toutes les rondes sont des brouillons 0-0', () => {
    const stats = computeEventStats({
      event: makeEvent(),
      rounds: [r(1, null, 0, 0), r(2, true, 0, 0)],
    });

    expect(stats.roundsTotal).toBe(2);
    expect(stats.roundsCounted).toBe(0);
    expect(stats.roundsUnplayed).toBe(2);
    expect(stats.matchWinRate.value).toBeNull();
    expect(stats.dice.rollsWithDie).toBe(0);
  });
});

describe('diceStats', () => {
  it('exclut les byes des deux branches du dé mais les garde au bilan', () => {
    const rounds = [
      r(1, null, 2, 0), // bye
      r(2, true, 2, 0, 'Ryzeal'),
      r(3, false, 0, 2, 'Maliss'),
    ];
    const dice = diceStats(rounds);

    expect(dice.rollsWithDie).toBe(2);
    expect(dice.dieWon).toBe(1);
    expect(dice.whenDieWon.tally.played).toBe(1);
    expect(dice.whenDieLost.tally.played).toBe(1);
    expect(dice.noDie).toEqual({ wins: 1, losses: 0, draws: 0, played: 1 });

    // Le bye compte bien comme une victoire dans le bilan général.
    expect(tallyOf(rounds)).toEqual({ wins: 2, losses: 1, draws: 0, played: 3 });
  });

  it('laisse le taux de gain du dé indisponible si l’event n’est que des byes', () => {
    const dice = diceStats([r(1, null, 2, 0), r(2, null, 2, 0)]);

    expect(dice.rollsWithDie).toBe(0);
    expect(dice.dieWinRate).toEqual({ n: 0, value: null });
    expect(dice.whenDieWon.matchWinRate.value).toBeNull();
    expect(dice.whenDieLost.matchWinRate.value).toBeNull();
  });

  it('distingue « je gagne le dé » de « je gagne quand j’ai le dé »', () => {
    const dice = diceStats(ycsLyon.rounds);

    expect(dice.dieWon).toBe(4);
    expect(dice.rollsWithDie).toBe(7);
    expect(dice.dieWinRate.value).toBeCloseTo(4 / 7, 10);
    expect(dice.whenDieWon.matchWinRate.value).toBe(0.75);
    expect(dice.whenDieLost.matchWinRate.value).toBeCloseTo(1 / 3, 10);
  });
});

describe('regroupements', () => {
  it('regroupe les decks non renseignés sous une clé explicite', () => {
    const groups = groupByMyDeck([{ event: makeEvent({ myDeck: null }), rounds: [r(1, true, 2, 0)] }]);

    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe(UNKNOWN_KEY);
    expect(groups[0].label).toBe('Deck non renseigné');
  });

  it('exclut les byes des matchups mais garde les rondes sans deck noté', () => {
    const groups = groupByOpponentDeck([
      {
        event: makeEvent(),
        rounds: [
          r(1, null, 2, 0), // bye : pas d'adversaire du tout
          r(2, true, 0, 2, null), // vrai match, deck oublié
          r(3, true, 2, 0, 'Ryzeal'),
        ],
      },
    ]);

    const keys = groups.map((g) => g.key);
    expect(keys).toContain(UNKNOWN_KEY);
    expect(keys).toContain('ryzeal');
    expect(groups.find((g) => g.key === UNKNOWN_KEY)!.tally.played).toBe(1);
  });

  it('fusionne les variantes de casse et d’espaces, et garde la plus fréquente', () => {
    const groups = groupByOpponentDeck([
      {
        event: makeEvent(),
        rounds: [
          r(1, true, 2, 0, 'Snake-Eye Fiendsmith'),
          r(2, true, 2, 1, 'Snake-Eye Fiendsmith'),
          r(3, false, 0, 2, 'snake-eye  fiendsmith'),
        ],
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Snake-Eye Fiendsmith');
    expect(groups[0].tally.played).toBe(3);
  });

  it('compte les events distincts qui alimentent un groupe', () => {
    const groups = groupByEventType([ycsLyon, localeJanvier]);
    expect(groups.map((g) => g.key).sort()).toEqual(['LOCALS', 'YCS']);
    expect(groups.every((g) => g.eventsCount === 1)).toBe(true);
  });
});

describe('tris déterministes', () => {
  const groups = () =>
    groupByOpponentDeck([
      {
        event: makeEvent(),
        rounds: [
          r(1, true, 2, 0, 'Ryzeal'),
          r(2, false, 1, 1, 'Ryzeal'),
          r(3, true, 2, 0, 'Maliss'),
          r(4, false, 0, 2, 'Tenpai Dragon'),
        ],
      },
    ]);

  it('trie par performance : taux, puis effectif, puis alphabétique', () => {
    expect(sortGroupsByRate(groups()).map((g) => g.label)).toEqual([
      'Maliss', // 1-0  → 100 %
      'Ryzeal', // 1-0-1 → 50 %
      'Tenpai Dragon', // 0-1 → 0 %
    ]);
  });

  it('trie par volume : effectif, puis taux, puis alphabétique', () => {
    expect(sortGroupsByVolume(groups()).map((g) => g.label)).toEqual([
      'Ryzeal', // 2 rencontres
      'Maliss', // 1 rencontre, 100 %
      'Tenpai Dragon', // 1 rencontre, 0 %
    ]);
  });

  it('relègue un taux indisponible en fin de classement, sans l’assimiler à 0 %', () => {
    const withEmpty = [
      ...groups(),
      {
        key: 'jamais-joue',
        label: 'Jamais joué',
        tally: { wins: 0, losses: 0, draws: 0, played: 0 },
        games: { won: 0, lost: 0, total: 0 },
        matchWinRate: { n: 0, value: null },
        gameWinRate: { n: 0, value: null },
        eventsCount: 0,
      },
    ];

    expect(sortGroupsByRate(withEmpty).at(-1)!.label).toBe('Jamais joué');
  });

  it('limite les matchups à un effectif minimum', () => {
    expect(topMatchups(groups(), { minN: 2 }).map((g) => g.label)).toEqual(['Ryzeal']);
  });
});

describe('applyFilter', () => {
  const inputs = [ycsLyon, localeJanvier];

  it('filtre par type d’event', () => {
    expect(applyFilter(inputs, { eventTypes: ['YCS'] }).map((i) => i.event.id)).toEqual([1]);
  });

  it('filtre par deck joué, sans se soucier de la casse', () => {
    expect(applyFilter(inputs, { myDecks: ['ryzeal'] }).map((i) => i.event.id)).toEqual([2]);
  });

  it('inclut les bornes de dates exactes', () => {
    expect(applyFilter(inputs, { from: '2026-04-12' }).map((i) => i.event.id)).toEqual([1]);
    expect(applyFilter(inputs, { to: '2026-01-10' }).map((i) => i.event.id)).toEqual([2]);
    expect(applyFilter(inputs, { from: '2026-04-13' })).toEqual([]);
  });

  it('ne filtre rien sans critère', () => {
    expect(applyFilter(inputs)).toHaveLength(2);
    expect(applyFilter(inputs, { eventTypes: [] })).toHaveLength(2);
  });
});

describe('computeGlobalStats', () => {
  it('agrège les events et recoupe la somme des rondes', () => {
    const stats = computeGlobalStats([ycsLyon, localeJanvier]);

    expect(stats.eventsCount).toBe(2);
    expect(stats.eventsWithRounds).toBe(2);
    expect(stats.roundsCounted).toBe(11);
    expect(stats.tally).toEqual(tallyOf([...ycsLyon.rounds, ...localeJanvier.rounds]));
    expect(stats.games).toEqual(gamesOf([...ycsLyon.rounds, ...localeJanvier.rounds]));
  });

  it('ne compte pas un event sans ronde dans eventsWithRounds', () => {
    const stats = computeGlobalStats([ycsLyon, { event: makeEvent({ id: 99 }), rounds: [] }]);

    expect(stats.eventsCount).toBe(2);
    expect(stats.eventsWithRounds).toBe(1);
  });

  it('retient le meilleur event et le meilleur classement', () => {
    const stats = computeGlobalStats([ycsLyon, localeJanvier]);

    expect(stats.bestEvent?.eventId).toBe(2); // 2-1 = 66,7 % contre 62,5 %
    expect(stats.bestStanding?.standing).toBe(2);
  });

  it('laisse tout indisponible sans aucune donnée', () => {
    const stats = computeGlobalStats([]);

    expect(stats.eventsCount).toBe(0);
    expect(stats.matchWinRate.value).toBeNull();
    expect(stats.bestEvent).toBeNull();
    expect(stats.bestStanding).toBeNull();
  });

  it('applique le filtre avant tout calcul', () => {
    const stats = computeGlobalStats([ycsLyon, localeJanvier], { filter: { eventTypes: ['YCS'] } });

    expect(stats.eventsCount).toBe(1);
    expect(stats.roundsCounted).toBe(8);
  });
});

describe("test d'ancrage — le YCS du plan", () => {
  it('donne exactement les chiffres vérifiés à la main', () => {
    const stats = computeEventStats(ycsLyon);

    expect(stats.tally).toEqual({ wins: 5, losses: 2, draws: 1, played: 8 });
    expect(stats.matchWinRate.value).toBe(0.625);
    expect(stats.games).toEqual({ won: 12, lost: 8, total: 20 });
    expect(stats.gameWinRate.value).toBe(0.6);
    expect(stats.byes).toBe(1);
    expect(stats.longestWinStreak).toBe(4);
    expect(stats.dice.dieWon).toBe(4);
    expect(stats.dice.rollsWithDie).toBe(7);
    expect(stats.dice.whenDieWon.tally).toEqual({ wins: 3, losses: 1, draws: 0, played: 4 });
    expect(stats.dice.whenDieLost.tally).toEqual({ wins: 1, losses: 1, draws: 1, played: 3 });
  });
});
