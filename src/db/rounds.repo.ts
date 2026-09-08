import type { SQLiteDatabase } from 'expo-sqlite';

import type { Round, RoundDraft } from '@/logic/types';
import { roundToParams, rowToRound, type RoundRow } from './mappers';
import { bumpRevision } from './revision';

const SELECT_COLUMNS = `
  id, event_id, round_number, dice_won, my_wins, opp_wins, opponent_deck, comment
`;

export async function listRounds(db: SQLiteDatabase, eventId: number): Promise<Round[]> {
  const rows = await db.getAllAsync<RoundRow>(
    `SELECT ${SELECT_COLUMNS} FROM rounds WHERE event_id = ? ORDER BY round_number ASC`,
    eventId
  );
  return rows.map(rowToRound);
}

/**
 * Toutes les rondes, pour les stats globales. Charger l'intégralité en mémoire
 * est assumé : à ~270 rondes par an, deux `SELECT` valent mieux qu'un jeu de
 * requêtes d'agrégation à maintenir.
 */
export async function listAllRounds(db: SQLiteDatabase): Promise<Round[]> {
  const rows = await db.getAllAsync<RoundRow>(
    `SELECT ${SELECT_COLUMNS} FROM rounds ORDER BY event_id ASC, round_number ASC`
  );
  return rows.map(rowToRound);
}

export async function getRound(db: SQLiteDatabase, id: number): Promise<Round | null> {
  const row = await db.getFirstAsync<RoundRow>(
    `SELECT ${SELECT_COLUMNS} FROM rounds WHERE id = ?`,
    id
  );
  return row ? rowToRound(row) : null;
}

/** Numéro à proposer pour la prochaine ronde — le bouton « + Ronde N ». */
export async function nextRoundNumber(db: SQLiteDatabase, eventId: number): Promise<number> {
  const row = await db.getFirstAsync<{ max: number | null }>(
    'SELECT MAX(round_number) AS max FROM rounds WHERE event_id = ?',
    eventId
  );
  return (row?.max ?? 0) + 1;
}

export async function insertRound(
  db: SQLiteDatabase,
  eventId: number,
  draft: RoundDraft
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO rounds (event_id, round_number, dice_won, my_wins, opp_wins, opponent_deck, comment)
     VALUES ($event_id, $round_number, $dice_won, $my_wins, $opp_wins, $opponent_deck, $comment)`,
    { ...roundToParams(draft), $event_id: eventId }
  );

  bumpRevision();
  return result.lastInsertRowId;
}

export async function updateRound(
  db: SQLiteDatabase,
  id: number,
  draft: RoundDraft
): Promise<void> {
  await db.runAsync(
    `UPDATE rounds SET
       round_number = $round_number, dice_won = $dice_won,
       my_wins = $my_wins, opp_wins = $opp_wins,
       opponent_deck = $opponent_deck, comment = $comment
     WHERE id = $id`,
    { ...roundToParams(draft), $id: id }
  );

  bumpRevision();
}

/**
 * Renumérote les rondes d'un event en 1..n, dans leur ordre actuel.
 *
 * En **deux passes**, via un décalage temporaire : une renumérotation directe
 * violerait `UNIQUE (event_id, round_number)` dès qu'une ronde prendrait le
 * numéro d'une autre pas encore déplacée.
 *
 * Le décalage est **positif** (au-dessus du plus grand numéro existant) et non
 * négatif : la table impose aussi `CHECK (round_number > 0)`.
 */
export async function renumberRounds(db: SQLiteDatabase, eventId: number): Promise<void> {
  const rows = await db.getAllAsync<{ id: number; round_number: number }>(
    'SELECT id, round_number FROM rounds WHERE event_id = ? ORDER BY round_number ASC, id ASC',
    eventId
  );

  if (rows.length === 0) return;

  const alreadyOrdered = rows.every((row, index) => row.round_number === index + 1);
  if (alreadyOrdered) return;

  const offset = rows.reduce((max, row) => Math.max(max, row.round_number), 0);

  await db.withTransactionAsync(async () => {
    // Passe 1 : au-dessus de tous les numéros existants, donc sans collision.
    for (let i = 0; i < rows.length; i++) {
      await db.runAsync(
        'UPDATE rounds SET round_number = ? WHERE id = ?',
        offset + i + 1,
        rows[i].id
      );
    }
    // Passe 2 : retour dans la plage 1..n.
    await db.runAsync(
      'UPDATE rounds SET round_number = round_number - ? WHERE event_id = ? AND round_number > ?',
      offset,
      eventId,
      offset
    );
  });

  bumpRevision();
}

/** Supprime une ronde puis referme le trou dans la numérotation. */
export async function deleteRound(db: SQLiteDatabase, id: number): Promise<void> {
  const round = await getRound(db, id);
  if (round === null) return;

  await db.runAsync('DELETE FROM rounds WHERE id = ?', id);
  await renumberRounds(db, round.eventId);
  bumpRevision();
}

export async function countRounds(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM rounds');
  return row?.n ?? 0;
}
