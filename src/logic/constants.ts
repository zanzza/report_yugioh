import type { EventType } from './types';

/**
 * Liste des types d'event. Volontairement **côté TypeScript** et pas dans une
 * contrainte `CHECK` SQL : SQLite ne sait pas modifier un `CHECK` sans recréer
 * la table, donc ajouter un type ici ne demande aucune migration.
 */
export const EVENT_TYPES = ['YCS', 'WCQ', 'OTS', 'REGIONAL', 'LOCALS', 'OTHER'] as const;

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  YCS: 'YCS',
  WCQ: 'WCQ',
  OTS: 'OTS',
  REGIONAL: 'Régional',
  LOCALS: 'Locale',
  OTHER: 'Autre',
};

export function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && (EVENT_TYPES as readonly string[]).includes(value);
}

export function eventTypeLabel(type: EventType): string {
  return EVENT_TYPE_LABELS[type] ?? type;
}

/**
 * En dessous de cet effectif, un taux n'est pas significatif. La logique ne
 * masque rien : cette constante sert uniquement à l'UI, pour griser une ligne.
 */
export const MIN_SAMPLE = 5;

/** Clé de regroupement des decks non renseignés — jamais ignorés en silence. */
export const UNKNOWN_KEY = '__unknown__';
export const UNKNOWN_DECK_LABEL = 'Deck non renseigné';
export const UNKNOWN_OPPONENT_DECK_LABEL = 'Adversaire non renseigné';

/** Borne haute d'un score de manches : 3 tolère un Bo5 de finale sans migration. */
export const MAX_GAME_WINS = 3;

/** Scores proposés en gros boutons sur l'écran de saisie de ronde. */
export const PRIMARY_SCORES: readonly (readonly [number, number])[] = [
  [2, 0],
  [2, 1],
  [1, 2],
  [0, 2],
];

/** Scores secondaires, pour les rondes coupées par le temps. */
export const SECONDARY_SCORES: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [0, 0],
];
