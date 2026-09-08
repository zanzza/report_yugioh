import type { SQLiteDatabase } from 'expo-sqlite';

import type { EventDraft, TournamentEvent } from '@/logic/types';
import { eventToParams, rowToEvent, type EventRow } from './mappers';
import { bumpRevision } from './revision';

/**
 * Accès aux events. C'est, avec `rounds.repo.ts`, la seule couche qui écrit du
 * SQL : isoler les requêtes ici garde le reste du code indépendant de SQLite.
 */

const SELECT_COLUMNS = `
  id, name, type, date, player_count, final_result, final_standing, my_deck,
  paid_event, paid_accommodation, paid_transport, transport_name, notes
`;

/** Les plus récents d'abord ; `id` tranche les ex æquo pour un ordre stable. */
export async function listEvents(db: SQLiteDatabase): Promise<TournamentEvent[]> {
  const rows = await db.getAllAsync<EventRow>(
    `SELECT ${SELECT_COLUMNS} FROM events ORDER BY date DESC, id DESC`
  );
  return rows.map(rowToEvent);
}

export async function getEvent(db: SQLiteDatabase, id: number): Promise<TournamentEvent | null> {
  const row = await db.getFirstAsync<EventRow>(
    `SELECT ${SELECT_COLUMNS} FROM events WHERE id = ?`,
    id
  );
  return row ? rowToEvent(row) : null;
}

export async function insertEvent(db: SQLiteDatabase, draft: EventDraft): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO events (
       name, type, date, player_count, final_result, final_standing, my_deck,
       paid_event, paid_accommodation, paid_transport, transport_name, notes
     ) VALUES (
       $name, $type, $date, $player_count, $final_result, $final_standing, $my_deck,
       $paid_event, $paid_accommodation, $paid_transport, $transport_name, $notes
     )`,
    eventToParams(draft)
  );

  bumpRevision();
  return result.lastInsertRowId;
}

export async function updateEvent(
  db: SQLiteDatabase,
  id: number,
  draft: EventDraft
): Promise<void> {
  await db.runAsync(
    `UPDATE events SET
       name = $name, type = $type, date = $date, player_count = $player_count,
       final_result = $final_result, final_standing = $final_standing, my_deck = $my_deck,
       paid_event = $paid_event, paid_accommodation = $paid_accommodation,
       paid_transport = $paid_transport, transport_name = $transport_name, notes = $notes,
       updated_at = datetime('now')
     WHERE id = $id`,
    { ...eventToParams(draft), $id: id }
  );

  bumpRevision();
}

/** Les trois cases de frais suivies par l'app. */
export type PaymentField = 'paidEvent' | 'paidAccommodation' | 'paidTransport';

const PAYMENT_COLUMNS: Record<PaymentField, string> = {
  paidEvent: 'paid_event',
  paidAccommodation: 'paid_accommodation',
  paidTransport: 'paid_transport',
};

/**
 * Bascule une case de frais. Écriture immédiate : sur l'écran de détail, ces
 * interrupteurs n'ont pas de bouton « Enregistrer ».
 */
export async function setPaymentFlag(
  db: SQLiteDatabase,
  id: number,
  field: PaymentField,
  value: boolean
): Promise<void> {
  // Le nom de colonne vient d'une table constante, jamais de l'extérieur.
  await db.runAsync(
    `UPDATE events SET ${PAYMENT_COLUMNS[field]} = ?, updated_at = datetime('now') WHERE id = ?`,
    value ? 1 : 0,
    id
  );

  bumpRevision();
}

/** Supprime l'event **et ses rondes** (via `ON DELETE CASCADE`). */
export async function deleteEvent(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM events WHERE id = ?', id);
  bumpRevision();
}

/**
 * Duplique un event sans ses rondes : pratique pour une locale hebdomadaire ou
 * un YCS de la même série, où seuls le nom et la date changent.
 */
export async function duplicateEvent(db: SQLiteDatabase, id: number): Promise<number | null> {
  const source = await getEvent(db, id);
  if (source === null) return null;

  const { id: _id, ...draft } = source;
  return insertEvent(db, { ...draft, name: `${source.name} (copie)` });
}

export async function countEvents(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM events');
  return row?.n ?? 0;
}
