import { describe, expect, it } from 'vitest';

import { isValidIsoDate, validateEventDraft, validateRoundDraft } from '@/logic/validation';
import type { EventDraft, RoundDraft } from '@/logic/types';

function eventDraft(overrides: Partial<EventDraft> = {}): EventDraft {
  return {
    name: 'YCS Lyon 2026',
    type: 'YCS',
    date: '2026-04-12',
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

function roundDraft(overrides: Partial<RoundDraft> = {}): RoundDraft {
  return {
    roundNumber: 1,
    diceWon: true,
    myWins: 2,
    oppWins: 1,
    opponentDeck: null,
    comment: null,
    ...overrides,
  };
}

describe('isValidIsoDate', () => {
  it('accepte une date réelle', () => {
    expect(isValidIsoDate('2026-04-12')).toBe(true);
    expect(isValidIsoDate('2024-02-29')).toBe(true); // année bissextile
  });

  it('refuse un format ou un jour impossible', () => {
    expect(isValidIsoDate('12/04/2026')).toBe(false);
    expect(isValidIsoDate('2026-4-12')).toBe(false);
    expect(isValidIsoDate('2026-02-31')).toBe(false);
    expect(isValidIsoDate('2025-02-29')).toBe(false); // année non bissextile
    expect(isValidIsoDate('2026-13-01')).toBe(false);
  });
});

describe('validateEventDraft', () => {
  it('accepte un event créé avec le minimum : nom, type, date', () => {
    expect(validateEventDraft(eventDraft())).toEqual({ ok: true, errors: {} });
  });

  it('refuse un nom vide', () => {
    const result = validateEventDraft(eventDraft({ name: '   ' }));

    expect(result.ok).toBe(false);
    expect(result.errors.name).toBe("Le nom de l'event est obligatoire.");
  });

  it('refuse une date mal formée', () => {
    const result = validateEventDraft(eventDraft({ date: '12-04-2026' }));

    expect(result.ok).toBe(false);
    expect(result.errors.date).toContain('AAAA-MM-JJ');
  });

  it('refuse un type inconnu', () => {
    const result = validateEventDraft(eventDraft({ type: 'YCS_LEGACY' as never }));

    expect(result.ok).toBe(false);
    expect(result.errors.type).toBeDefined();
  });

  it('refuse un nombre de joueurs nul ou négatif', () => {
    expect(validateEventDraft(eventDraft({ playerCount: 0 })).errors.playerCount).toBeDefined();
    expect(validateEventDraft(eventDraft({ playerCount: -3 })).errors.playerCount).toBeDefined();
    expect(validateEventDraft(eventDraft({ playerCount: 1.5 })).errors.playerCount).toBeDefined();
    expect(validateEventDraft(eventDraft({ playerCount: 987 })).ok).toBe(true);
  });

  it('refuse un classement incohérent avec le nombre de joueurs', () => {
    expect(validateEventDraft(eventDraft({ finalStanding: 0 })).errors.finalStanding).toBeDefined();
    expect(
      validateEventDraft(eventDraft({ finalStanding: 40, playerCount: 16 })).errors.finalStanding
    ).toBe('Le classement dépasse le nombre de joueurs.');
    expect(validateEventDraft(eventDraft({ finalStanding: 37, playerCount: 987 })).ok).toBe(true);
  });
});

describe('validateRoundDraft', () => {
  it('accepte une ronde normale, et même un brouillon 0-0', () => {
    expect(validateRoundDraft(roundDraft()).ok).toBe(true);
    expect(validateRoundDraft(roundDraft({ myWins: 0, oppWins: 0 })).ok).toBe(true);
    expect(validateRoundDraft(roundDraft({ diceWon: null })).ok).toBe(true);
  });

  it('refuse un score hors bornes', () => {
    expect(validateRoundDraft(roundDraft({ myWins: 4 })).errors.myWins).toBeDefined();
    expect(validateRoundDraft(roundDraft({ oppWins: -1 })).errors.myWins).toBeDefined();
    expect(validateRoundDraft(roundDraft({ myWins: 1.5 })).errors.myWins).toBeDefined();
  });

  it('refuse un numéro de ronde invalide', () => {
    expect(validateRoundDraft(roundDraft({ roundNumber: 0 })).errors.roundNumber).toBeDefined();
    expect(validateRoundDraft(roundDraft({ roundNumber: -1 })).errors.roundNumber).toBeDefined();
  });
});
