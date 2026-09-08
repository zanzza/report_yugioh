import type { SQLiteDatabase } from 'expo-sqlite';

import type { EventWithRounds } from '@/logic/types';
import { listEvents } from './events.repo';
import { eventToParams, roundToParams } from './mappers';
import { bumpRevision } from './revision';
import { listAllRounds } from './rounds.repo';

/**
 * Export / import de la totalité de la base.
 *
 * C'est la seule assurance contre la perte de données : la base vit dans le
 * sandbox de l'app et disparaît avec une désinstallation.
 */

/** Charge tout, events et rondes rattachées — la source des stats globales. */
export async function loadAll(db: SQLiteDatabase): Promise<EventWithRounds[]> {
  const [events, rounds] = await Promise.all([listEvents(db), listAllRounds(db)]);

  const byEvent = new Map<number, EventWithRounds>();
  for (const event of events) byEvent.set(event.id, { event, rounds: [] });

  for (const round of rounds) byEvent.get(round.eventId)?.rounds.push(round);

  return [...byEvent.values()];
}

export type ImportMode = 'replace' | 'append';

export interface ImportSummary {
  events: number;
  rounds: number;
}

/**
 * Importe une sauvegarde en une seule transaction.
 *
 * Les identifiants du fichier ne sont **jamais réutilisés** : chaque event est
 * inséré en auto-increment, et une table de correspondance `ancien id → nouvel
 * id` sert à rattacher ses rondes. C'est ce qui rend le mode « Ajouter »
 * sûr même en réimportant un fichier déjà importé.
 */
export async function importAll(
  db: SQLiteDatabase,
  data: readonly EventWithRounds[],
  mode: ImportMode
): Promise<ImportSummary> {
  const summary: ImportSummary = { events: 0, rounds: 0 };

  await db.withTransactionAsync(async () => {
    if (mode === 'replace') {
      // `rounds` d'abord : explicite, et indépendant de l'état du pragma
      // `foreign_keys` sur la connexion courante.
      await db.runAsync('DELETE FROM rounds');
      await db.runAsync('DELETE FROM events');
    }

    for (const { event, rounds } of data) {
      const { id: _id, ...draft } = event;

      const inserted = await db.runAsync(
        `INSERT INTO events (
           name, type, date, player_count, final_result, final_standing, my_deck,
           paid_event, paid_accommodation, paid_transport, transport_name, notes
         ) VALUES (
           $name, $type, $date, $player_count, $final_result, $final_standing, $my_deck,
           $paid_event, $paid_accommodation, $paid_transport, $transport_name, $notes
         )`,
        eventToParams(draft)
      );
      const newEventId = inserted.lastInsertRowId;
      summary.events++;

      for (const round of rounds) {
        await db.runAsync(
          `INSERT INTO rounds (event_id, round_number, dice_won, my_wins, opp_wins, opponent_deck, comment)
           VALUES ($event_id, $round_number, $dice_won, $my_wins, $opp_wins, $opponent_deck, $comment)`,
          { ...roundToParams(round), $event_id: newEventId }
        );
        summary.rounds++;
      }
    }
  });

  bumpRevision();
  return summary;
}
