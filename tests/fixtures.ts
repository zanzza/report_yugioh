import type { EventWithRounds, Round, TournamentEvent } from '@/logic/types';

let nextId = 1;

export function resetIds(): void {
  nextId = 1;
}

export function makeEvent(overrides: Partial<TournamentEvent> = {}): TournamentEvent {
  return {
    id: nextId++,
    name: 'Event de test',
    type: 'LOCALS',
    date: '2026-01-15',
    playerCount: null,
    finalResult: null,
    finalStanding: null,
    myDeck: null,
    paidEvent: false,
    paidAccommodation: false,
    paidTransport: false,
    transportName: null,
    notes: null,
    ...overrides,
  };
}

export function makeRound(overrides: Partial<Round> = {}): Round {
  return {
    id: nextId++,
    eventId: 1,
    roundNumber: 1,
    diceWon: true,
    myWins: 2,
    oppWins: 0,
    opponentDeck: null,
    comment: null,
    ...overrides,
  };
}

/** Raccourci de lecture : `r(1, null, 2, 0)` = ronde 1, bye 2-0. */
export function r(
  roundNumber: number,
  diceWon: boolean | null,
  myWins: number,
  oppWins: number,
  opponentDeck: string | null = null,
  comment: string | null = null,
  eventId = 1
): Round {
  return {
    id: 1000 + roundNumber + eventId * 100,
    eventId,
    roundNumber,
    diceWon,
    myWins,
    oppWins,
    opponentDeck,
    comment,
  };
}

/**
 * Jeu de données d'ancrage : le YCS à 8 rondes du plan, avec un bye en R1.
 *
 * Chiffres attendus, vérifiés à la main : bilan 5-2-1 (62,5 %), manches 12-8
 * (60,0 %), dé gagné 4 fois sur 7 (57,1 %), 3-1 sur dé gagné (75,0 %),
 * 1-1-1 sur dé perdu (33,3 %), meilleure série de 4 victoires.
 */
export const ycsLyon: EventWithRounds = {
  event: {
    id: 1,
    name: 'YCS Lyon 2026',
    type: 'YCS',
    date: '2026-04-12',
    playerCount: 987,
    finalResult: 'Top 64',
    finalStanding: 37,
    myDeck: 'Snake-Eye Fiendsmith',
    paidEvent: true,
    paidAccommodation: true,
    paidTransport: true,
    transportName: 'SNCF TGV 8412',
    notes: null,
  },
  rounds: [
    r(1, null, 2, 0), // bye
    r(2, true, 2, 0, 'Ryzeal'),
    r(3, false, 2, 1, 'Tenpai Dragon', 'top parfait en game 3'),
    r(4, true, 2, 1, 'Maliss'),
    r(5, true, 1, 2, 'Snake-Eye Fiendsmith', 'miroir, side raté'),
    r(6, false, 1, 1, 'Ryzeal', 'time out pendant la game 3'),
    r(7, false, 0, 2, 'Tenpai Dragon', 'Bystial + Droll, aucune chance'),
    r(8, true, 2, 1, 'White Forest'),
  ],
};

/** Une locale sans bye, tout renseigné, pour les stats globales. */
export const localeJanvier: EventWithRounds = {
  event: {
    id: 2,
    name: 'Locale du samedi',
    type: 'LOCALS',
    date: '2026-01-10',
    playerCount: 16,
    finalResult: 'Finaliste',
    finalStanding: 2,
    myDeck: 'Ryzeal',
    paidEvent: true,
    paidAccommodation: false,
    paidTransport: false,
    transportName: null,
    notes: null,
  },
  rounds: [
    r(1, true, 2, 0, 'Maliss', null, 2),
    r(2, false, 1, 2, 'Tenpai Dragon', null, 2),
    r(3, true, 2, 1, 'Ryzeal', null, 2),
  ],
};
