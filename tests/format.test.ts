import { describe, expect, it } from 'vitest';

import {
  DASH,
  NBSP,
  formatDateFr,
  formatDateShortFr,
  formatDice,
  formatFinalResult,
  formatGames,
  formatOrdinalFr,
  formatPercentFr,
  formatRecord,
  formatScore,
  parseScore,
} from '@/logic/format';

describe('formatPercentFr', () => {
  it('utilise la virgule décimale et un espace insécable', () => {
    expect(formatPercentFr(0.625)).toBe(`62,5${NBSP}%`);
    // Épinglé par point de code : un espace normal passerait inaperçu.
    expect(NBSP).toHaveLength(1);
    expect(NBSP.charCodeAt(0)).toBe(0x00a0);
  });

  it('affiche un tiret pour une valeur indisponible', () => {
    expect(formatPercentFr(null)).toBe(DASH);
    expect(formatPercentFr(Number.NaN)).toBe(DASH);
  });

  it('garde toujours une décimale', () => {
    expect(formatPercentFr(1)).toBe(`100,0${NBSP}%`);
    expect(formatPercentFr(0)).toBe(`0,0${NBSP}%`);
    expect(formatPercentFr(1 / 3)).toBe(`33,3${NBSP}%`);
  });
});

describe('dates', () => {
  it('écrit la date en français, sans Intl', () => {
    expect(formatDateFr('2026-04-12')).toBe('dimanche 12 avril 2026');
    expect(formatDateFr('2026-01-01')).toBe('jeudi 1 janvier 2026');
  });

  it('formate la date courte', () => {
    expect(formatDateShortFr('2026-04-12')).toBe('12/04/2026');
  });

  it('rend la chaîne brute si elle n’est pas au format ISO', () => {
    expect(formatDateFr('12/04/2026')).toBe('12/04/2026');
  });
});

describe('bilans et scores', () => {
  it('omet les nulles quand il n’y en a pas', () => {
    expect(formatRecord({ wins: 5, losses: 2, draws: 1, played: 8 })).toBe('5-2-1');
    expect(formatRecord({ wins: 5, losses: 2, draws: 0, played: 7 })).toBe('5-2');
  });

  it('formate les manches et les scores', () => {
    expect(formatGames({ won: 12, lost: 8, total: 20 })).toBe('12-8');
    expect(formatScore({ myWins: 2, oppWins: 1 })).toBe('2-1');
  });

  it('relit un score saisi', () => {
    expect(parseScore('2-1')).toEqual({ myWins: 2, oppWins: 1 });
    expect(parseScore(' 0 - 2 ')).toEqual({ myWins: 0, oppWins: 2 });
    expect(parseScore('2:1')).toBeNull();
    expect(parseScore('')).toBeNull();
  });
});

describe('libellés', () => {
  it('nomme le lancer de dé', () => {
    expect(formatDice(true)).toBe('dé gagné');
    expect(formatDice(false)).toBe('dé perdu');
    expect(formatDice(null)).toBe('pas de lancer');
  });

  it('écrit les ordinaux français', () => {
    expect(formatOrdinalFr(1)).toBe('1er');
    expect(formatOrdinalFr(37)).toBe('37e');
  });
});

describe('formatFinalResult', () => {
  it('combine texte, classement et nombre de joueurs', () => {
    expect(formatFinalResult('Top 64', 37, 987)).toBe('Top 64 (37e / 987)');
  });

  it('se contente de ce qui est renseigné', () => {
    expect(formatFinalResult('Top 64', null, 987)).toBe('Top 64');
    expect(formatFinalResult(null, 37, 987)).toBe('37e / 987');
    expect(formatFinalResult(null, 37, null)).toBe('37e');
    expect(formatFinalResult(null, null, 987)).toBeNull();
    expect(formatFinalResult('   ', null, null)).toBeNull();
  });
});
