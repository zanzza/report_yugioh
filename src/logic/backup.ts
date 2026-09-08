import { MAX_GAME_WINS, isEventType } from './constants';
import { isValidIsoDate } from './validation';
import type { EventWithRounds, Round, TournamentEvent } from './types';

/**
 * Sérialisation de la sauvegarde JSON — la seule assurance contre la perte de
 * données, puisque la base vit dans le sandbox de l'app et disparaît avec elle.
 *
 * Module pur : `exportedAt` est **passé en paramètre** plutôt que lu depuis
 * l'horloge, pour que `buildBackup` reste déterministe et testable.
 */
export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_APP_ID = 'report_yugioh';

export interface BackupFile {
  app: string;
  schemaVersion: number;
  exportedAt: string;
  events: TournamentEvent[];
  rounds: Round[];
}

export interface ParsedBackup {
  schemaVersion: number;
  exportedAt: string | null;
  data: EventWithRounds[];
}

export type ParseResult =
  | { ok: true; backup: ParsedBackup }
  | { ok: false; error: string };

/**
 * Construit le contenu du fichier de sauvegarde. L'ordre est totalement
 * déterministe pour qu'un aller-retour export → import → export soit
 * idempotent.
 */
export function buildBackup(
  inputs: readonly EventWithRounds[],
  exportedAt: string
): BackupFile {
  const ordered = [...inputs].sort((a, b) => {
    if (a.event.date !== b.event.date) return a.event.date < b.event.date ? -1 : 1;
    return a.event.id - b.event.id;
  });

  const events = ordered.map(({ event }) => ({ ...event }));
  const rounds = ordered.flatMap(({ rounds: eventRounds }) =>
    [...eventRounds].sort((a, b) => a.roundNumber - b.roundNumber || a.id - b.id).map((r) => ({ ...r }))
  );

  return { app: BACKUP_APP_ID, schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt, events, rounds };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringOrNull(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function readIntOrNull(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isInteger(value)) return undefined;
  return value;
}

/** Tolère `true`/`false` comme `1`/`0` : SQLite stocke des entiers. */
function readBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;
  if (value === 0 || value === 1) return value === 1;
  return undefined;
}

function readDiceWon(value: unknown): boolean | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (value === 0 || value === 1) return value === 1;
  return undefined;
}

function parseEvent(raw: unknown, index: number): TournamentEvent | string {
  if (!isRecord(raw)) return `Event n°${index + 1} : objet attendu.`;

  const id = readIntOrNull(raw.id);
  if (id === undefined || id === null || id <= 0) return `Event n°${index + 1} : identifiant invalide.`;

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (name === '') return `Event n°${index + 1} : nom manquant.`;

  if (!isEventType(raw.type)) return `Event « ${name} » : type d'event inconnu.`;

  if (typeof raw.date !== 'string' || !isValidIsoDate(raw.date)) {
    return `Event « ${name} » : date invalide (AAAA-MM-JJ attendu).`;
  }

  const playerCount = readIntOrNull(raw.playerCount);
  if (playerCount === undefined || (playerCount !== null && playerCount <= 0)) {
    return `Event « ${name} » : nombre de joueurs invalide.`;
  }

  const finalStanding = readIntOrNull(raw.finalStanding);
  if (finalStanding === undefined || (finalStanding !== null && finalStanding <= 0)) {
    return `Event « ${name} » : classement invalide.`;
  }

  const finalResult = readStringOrNull(raw.finalResult);
  const myDeck = readStringOrNull(raw.myDeck);
  const transportName = readStringOrNull(raw.transportName);
  const notes = readStringOrNull(raw.notes);
  if (finalResult === undefined || myDeck === undefined || transportName === undefined || notes === undefined) {
    return `Event « ${name} » : champ texte invalide.`;
  }

  const paidEvent = readBool(raw.paidEvent);
  const paidAccommodation = readBool(raw.paidAccommodation);
  const paidTransport = readBool(raw.paidTransport);
  if (paidEvent === undefined || paidAccommodation === undefined || paidTransport === undefined) {
    return `Event « ${name} » : indicateur de paiement invalide.`;
  }

  return {
    id,
    name,
    type: raw.type,
    date: raw.date,
    playerCount,
    finalResult,
    finalStanding,
    myDeck,
    paidEvent,
    paidAccommodation,
    paidTransport,
    transportName,
    notes,
  };
}

function parseRound(raw: unknown, index: number, knownEventIds: Set<number>): Round | string {
  if (!isRecord(raw)) return `Ronde n°${index + 1} : objet attendu.`;

  const id = readIntOrNull(raw.id);
  if (id === undefined || id === null || id <= 0) return `Ronde n°${index + 1} : identifiant invalide.`;

  const eventId = readIntOrNull(raw.eventId);
  if (eventId === undefined || eventId === null) return `Ronde n°${index + 1} : event de rattachement manquant.`;
  if (!knownEventIds.has(eventId)) {
    return `Ronde n°${index + 1} : rattachée à l'event ${eventId}, absent du fichier.`;
  }

  const roundNumber = readIntOrNull(raw.roundNumber);
  if (roundNumber === undefined || roundNumber === null || roundNumber <= 0) {
    return `Ronde n°${index + 1} : numéro de ronde invalide.`;
  }

  const diceWon = readDiceWon(raw.diceWon);
  if (diceWon === undefined) return `Ronde ${roundNumber} : lancer de dé invalide.`;

  const myWins = readIntOrNull(raw.myWins) ?? 0;
  const oppWins = readIntOrNull(raw.oppWins) ?? 0;
  if (myWins < 0 || myWins > MAX_GAME_WINS || oppWins < 0 || oppWins > MAX_GAME_WINS) {
    return `Ronde ${roundNumber} : score hors bornes (0 à ${MAX_GAME_WINS}).`;
  }

  const opponentDeck = readStringOrNull(raw.opponentDeck);
  const comment = readStringOrNull(raw.comment);
  if (opponentDeck === undefined || comment === undefined) {
    return `Ronde ${roundNumber} : champ texte invalide.`;
  }

  return { id, eventId, roundNumber, diceWon, myWins, oppWins, opponentDeck, comment };
}

/**
 * Lit un fichier de sauvegarde. Refuse explicitement un schéma inconnu, un
 * schéma plus récent que l'app, et toute ronde orpheline — mieux vaut un
 * message clair qu'un import partiel silencieux.
 */
export function parseBackup(raw: unknown): ParseResult {
  if (typeof raw === 'string') {
    try {
      return parseBackup(JSON.parse(raw));
    } catch {
      return { ok: false, error: "Le fichier n'est pas du JSON valide." };
    }
  }

  if (!isRecord(raw)) return { ok: false, error: 'Fichier de sauvegarde illisible.' };

  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: "Ce fichier n'est pas une sauvegarde report_yugioh (version de schéma absente)." };
  }
  if (version > BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Sauvegarde en version ${version}, alors que l'app gère la version ${BACKUP_SCHEMA_VERSION}. Mets l'app à jour.`,
    };
  }

  if (!Array.isArray(raw.events)) return { ok: false, error: 'La liste des events est absente ou invalide.' };
  if (!Array.isArray(raw.rounds)) return { ok: false, error: 'La liste des rondes est absente ou invalide.' };

  const events: TournamentEvent[] = [];
  const seenIds = new Set<number>();
  for (let i = 0; i < raw.events.length; i++) {
    const parsed = parseEvent(raw.events[i], i);
    if (typeof parsed === 'string') return { ok: false, error: parsed };
    if (seenIds.has(parsed.id)) return { ok: false, error: `Identifiant d'event en double : ${parsed.id}.` };
    seenIds.add(parsed.id);
    events.push(parsed);
  }

  const roundsByEvent = new Map<number, Round[]>();
  const seenSlots = new Set<string>();
  for (let i = 0; i < raw.rounds.length; i++) {
    const parsed = parseRound(raw.rounds[i], i, seenIds);
    if (typeof parsed === 'string') return { ok: false, error: parsed };

    // La base impose UNIQUE (event_id, round_number) : mieux vaut refuser tout
    // de suite que faire échouer l'import au milieu de la transaction.
    const slot = `${parsed.eventId}#${parsed.roundNumber}`;
    if (seenSlots.has(slot)) {
      return { ok: false, error: `Deux rondes portent le numéro ${parsed.roundNumber} sur le même event.` };
    }
    seenSlots.add(slot);

    const list = roundsByEvent.get(parsed.eventId) ?? [];
    list.push(parsed);
    roundsByEvent.set(parsed.eventId, list);
  }

  const data: EventWithRounds[] = events.map((event) => ({
    event,
    rounds: (roundsByEvent.get(event.id) ?? []).sort(
      (a, b) => a.roundNumber - b.roundNumber || a.id - b.id
    ),
  }));

  const exportedAt = typeof raw.exportedAt === 'string' ? raw.exportedAt : null;

  return { ok: true, backup: { schemaVersion: version, exportedAt, data } };
}

/** Nom de fichier daté, pour retrouver une sauvegarde dans son Drive. */
export function backupFileName(isoDate: string): string {
  return `report_yugioh_${isoDate}.json`;
}

export function countBackup(backup: { events: unknown[]; rounds: unknown[] }): {
  events: number;
  rounds: number;
} {
  return { events: backup.events.length, rounds: backup.rounds.length };
}
