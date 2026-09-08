import { MAX_GAME_WINS, isEventType } from './constants';
import type { EventDraft, RoundDraft } from './types';

/**
 * Validation des formulaires. Messages en français, prêts à être affichés sous
 * le champ concerné. Aucune dépendance : deux formulaires et une douzaine de
 * champs ne justifient pas une librairie de schémas.
 */
export interface ValidationResult<T extends string> {
  ok: boolean;
  errors: Partial<Record<T, string>>;
}

export type EventField = keyof EventDraft;
export type RoundField = keyof RoundDraft;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Vérifie le format **et** l'existence réelle de la date (pas de 31 février). */
export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= daysInMonth;
}

export function validateEventDraft(draft: EventDraft): ValidationResult<EventField> {
  const errors: Partial<Record<EventField, string>> = {};

  if (draft.name.trim() === '') {
    errors.name = "Le nom de l'event est obligatoire.";
  }

  if (!isEventType(draft.type)) {
    errors.type = "Type d'event inconnu.";
  }

  if (!isValidIsoDate(draft.date)) {
    errors.date = 'Date invalide (format attendu : AAAA-MM-JJ).';
  }

  if (draft.playerCount !== null) {
    if (!Number.isInteger(draft.playerCount) || draft.playerCount <= 0) {
      errors.playerCount = 'Le nombre de joueurs doit être un entier positif.';
    }
  }

  if (draft.finalStanding !== null) {
    if (!Number.isInteger(draft.finalStanding) || draft.finalStanding <= 0) {
      errors.finalStanding = 'Le classement doit être un entier positif.';
    } else if (draft.playerCount !== null && draft.finalStanding > draft.playerCount) {
      errors.finalStanding = 'Le classement dépasse le nombre de joueurs.';
    }
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateRoundDraft(draft: RoundDraft): ValidationResult<RoundField> {
  const errors: Partial<Record<RoundField, string>> = {};

  if (!Number.isInteger(draft.roundNumber) || draft.roundNumber <= 0) {
    errors.roundNumber = 'Le numéro de ronde doit être un entier positif.';
  }

  const scoreInRange = (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= MAX_GAME_WINS;

  if (!scoreInRange(draft.myWins) || !scoreInRange(draft.oppWins)) {
    errors.myWins = `Chaque score de manches doit être compris entre 0 et ${MAX_GAME_WINS}.`;
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
