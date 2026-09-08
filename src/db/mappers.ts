import { isEventType } from '@/logic/constants';
import { cleanDeckName } from '@/logic/decks';
import type { EventDraft, Round, RoundDraft, TournamentEvent } from '@/logic/types';

/**
 * Traduction lignes SQLite ↔ types de domaine.
 *
 * SQLite n'a pas de booléen : c'est **ici et nulle part ailleurs** que se fait
 * la conversion `0 | 1` ↔ `boolean`, pour que le reste du code n'ait jamais à
 * s'en soucier.
 */

export interface EventRow {
  id: number;
  name: string;
  type: string;
  date: string;
  player_count: number | null;
  final_result: string | null;
  final_standing: number | null;
  my_deck: string | null;
  paid_event: number;
  paid_accommodation: number;
  paid_transport: number;
  transport_name: string | null;
  notes: string | null;
}

export interface RoundRow {
  id: number;
  event_id: number;
  round_number: number;
  dice_won: number | null;
  my_wins: number;
  opp_wins: number;
  opponent_deck: string | null;
  comment: string | null;
}

const toBool = (value: number | null): boolean => value === 1;
const fromBool = (value: boolean): number => (value ? 1 : 0);

export function rowToEvent(row: EventRow): TournamentEvent {
  return {
    id: row.id,
    name: row.name,
    // Un type inconnu (base éditée à la main, ancienne version) devient « Autre »
    // plutôt que de casser l'affichage.
    type: isEventType(row.type) ? row.type : 'OTHER',
    date: row.date,
    playerCount: row.player_count,
    finalResult: row.final_result,
    finalStanding: row.final_standing,
    myDeck: row.my_deck,
    paidEvent: toBool(row.paid_event),
    paidAccommodation: toBool(row.paid_accommodation),
    paidTransport: toBool(row.paid_transport),
    transportName: row.transport_name,
    notes: row.notes,
  };
}

export function rowToRound(row: RoundRow): Round {
  return {
    id: row.id,
    eventId: row.event_id,
    roundNumber: row.round_number,
    diceWon: row.dice_won === null ? null : toBool(row.dice_won),
    myWins: row.my_wins,
    oppWins: row.opp_wins,
    opponentDeck: row.opponent_deck,
    comment: row.comment,
  };
}

function trimOrNull(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Paramètres nommés pour un `INSERT`/`UPDATE` d'event. */
export function eventToParams(draft: EventDraft) {
  return {
    $name: draft.name.trim(),
    $type: draft.type,
    $date: draft.date,
    $player_count: draft.playerCount,
    $final_result: trimOrNull(draft.finalResult),
    $final_standing: draft.finalStanding,
    // Les noms de decks sont normalisés à l'écriture (espaces doubles retirés)
    // pour limiter la fragmentation des groupes de stats.
    $my_deck: cleanDeckName(draft.myDeck),
    $paid_event: fromBool(draft.paidEvent),
    $paid_accommodation: fromBool(draft.paidAccommodation),
    $paid_transport: fromBool(draft.paidTransport),
    $transport_name: trimOrNull(draft.transportName),
    $notes: trimOrNull(draft.notes),
  };
}

/**
 * Paramètres nommés pour un `INSERT`/`UPDATE` de ronde. `event_id` n'y figure
 * pas : il n'est lié qu'à l'insertion, et un paramètre nommé inutilisé ferait
 * échouer la requête.
 */
export function roundToParams(draft: RoundDraft) {
  return {
    $round_number: draft.roundNumber,
    $dice_won: draft.diceWon === null ? null : fromBool(draft.diceWon),
    $my_wins: draft.myWins,
    $opp_wins: draft.oppWins,
    $opponent_deck: cleanDeckName(draft.opponentDeck),
    $comment: trimOrNull(draft.comment),
  };
}

/** Prépare un event existant pour être réédité dans le formulaire. */
export function eventToDraft(event: TournamentEvent): EventDraft {
  const { id: _id, ...draft } = event;
  return draft;
}

/** Prépare une ronde existante pour être rééditée dans le formulaire. */
export function roundToDraft(round: Round): RoundDraft {
  return {
    roundNumber: round.roundNumber,
    diceWon: round.diceWon,
    myWins: round.myWins,
    oppWins: round.oppWins,
    opponentDeck: round.opponentDeck,
    comment: round.comment,
  };
}
