/**
 * Types de domaine.
 *
 * Ce module — comme tout `src/logic/**` — est du TypeScript pur : il n'importe
 * jamais `react`, `react-native`, `expo-*` ni `src/db`. C'est ce qui rend les
 * calculs et le générateur de résumé testables dans Node, sans téléphone.
 */

export type EventType = 'YCS' | 'WCQ' | 'OTS' | 'REGIONAL' | 'LOCALS' | 'OTHER';

/** Résultat d'un match, toujours **dérivé** du score, jamais stocké. */
export type MatchOutcome = 'WIN' | 'LOSS' | 'DRAW' | 'UNPLAYED';

/**
 * Une ronde. Strictement quatre informations saisies : le lancer de dé, le
 * score, le deck adverse et un commentaire.
 */
export interface Round {
  id: number;
  eventId: number;
  /** 1..n, unique par event. Ordre d'affichage et de calcul des séries. */
  roundNumber: number;
  /** `null` = pas de lancer de dé (bye, ou non renseigné). */
  diceWon: boolean | null;
  /** Manches gagnées par moi. Le score « 2-1 » vit ici, jamais en texte. */
  myWins: number;
  /** Manches gagnées par l'adversaire. */
  oppWins: number;
  opponentDeck: string | null;
  comment: string | null;
}

export interface TournamentEvent {
  id: number;
  name: string;
  type: EventType;
  /** ISO `YYYY-MM-DD` : tri lexicographique, aucun fuseau horaire impliqué. */
  date: string;
  playerCount: number | null;
  /** Texte libre : « Top 64 », « Day 2 », « Drop R6 ». */
  finalResult: string | null;
  /** Place exacte, optionnelle : permet de trier et de sortir un record. */
  finalStanding: number | null;
  /** Le deck que je jouais sur cet event. */
  myDeck: string | null;
  paidEvent: boolean;
  paidAccommodation: boolean;
  paidTransport: boolean;
  transportName: string | null;
  notes: string | null;
}

/** Un event et ses rondes : l'unité de calcul de tout le module de stats. */
export interface EventWithRounds {
  event: TournamentEvent;
  rounds: Round[];
}

/** Bilan de matchs. `played` = wins + losses + draws (les 0-0 sont exclues). */
export interface Tally {
  wins: number;
  losses: number;
  draws: number;
  played: number;
}

/** Bilan de manches individuelles. */
export interface Games {
  won: number;
  lost: number;
  total: number;
}

/**
 * Un taux et son effectif. `value` est dans [0,1], ou `null` quand `n === 0`.
 * Jamais `NaN`, jamais un `0` trompeur : l'UI affiche `—` pour `null`.
 */
export interface Rate {
  n: number;
  value: number | null;
}

/** Saisie de formulaire d'event, avant validation et insertion. */
export interface EventDraft {
  name: string;
  type: EventType;
  date: string;
  playerCount: number | null;
  finalResult: string | null;
  finalStanding: number | null;
  myDeck: string | null;
  paidEvent: boolean;
  paidAccommodation: boolean;
  paidTransport: boolean;
  transportName: string | null;
  notes: string | null;
}

/** Saisie de formulaire de ronde, avant validation et insertion. */
export interface RoundDraft {
  roundNumber: number;
  diceWon: boolean | null;
  myWins: number;
  oppWins: number;
  opponentDeck: string | null;
  comment: string | null;
}
