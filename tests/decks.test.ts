import { describe, expect, it } from 'vitest';

import { UNKNOWN_KEY } from '@/logic/constants';
import {
  cleanDeckName,
  compareLabels,
  displayNameFor,
  myDeckUsage,
  normalizeDeckKey,
  opponentDeckUsage,
  suggestDecks,
} from '@/logic/decks';
import { localeJanvier, makeEvent, r, ycsLyon } from './fixtures';

describe('normalizeDeckKey', () => {
  it('fusionne casse, espaces doubles et espaces de bord', () => {
    const variants = ['Snake-Eye Fiendsmith', 'snake-eye  fiendsmith', ' SNAKE-EYE FIENDSMITH '];
    const keys = new Set(variants.map(normalizeDeckKey));

    expect(keys.size).toBe(1);
    expect([...keys][0]).toBe('snake-eye fiendsmith');
  });

  it('retire les accents sans dépendre d’ICU', () => {
    expect(normalizeDeckKey('Élémentaire HÉROS')).toBe('elementaire heros');
    expect(normalizeDeckKey('Cœur')).toBe('coeur');
  });

  it('renvoie la clé « non renseigné » pour un nom absent ou vide', () => {
    expect(normalizeDeckKey(null)).toBe(UNKNOWN_KEY);
    expect(normalizeDeckKey(undefined)).toBe(UNKNOWN_KEY);
    expect(normalizeDeckKey('   ')).toBe(UNKNOWN_KEY);
  });
});

describe('cleanDeckName', () => {
  it('nettoie sans normaliser', () => {
    expect(cleanDeckName('  Snake-Eye  Fiendsmith ')).toBe('Snake-Eye Fiendsmith');
    expect(cleanDeckName('   ')).toBeNull();
    expect(cleanDeckName(null)).toBeNull();
  });
});

describe('displayNameFor', () => {
  it('retient la variante la plus fréquente', () => {
    expect(displayNameFor(['Ryzeal', 'Ryzeal', 'ryzeal'])).toBe('Ryzeal');
  });

  it('tranche les égalités de façon déterministe', () => {
    expect(displayNameFor(['ryzeal', 'Ryzeal'])).toBe('Ryzeal');
    expect(displayNameFor(['Ryzeal', 'ryzeal'])).toBe('Ryzeal');
  });

  it('renvoie null quand rien n’est renseigné', () => {
    expect(displayNameFor([null, '  ', undefined])).toBeNull();
  });
});

describe('suggestions de saisie', () => {
  const inputs = [ycsLyon, localeJanvier];

  it('classe les decks adverses par fréquence, puis récence', () => {
    const usage = opponentDeckUsage(inputs);

    expect(usage.slice(0, 2).map((u) => u.label)).toEqual(['Ryzeal', 'Tenpai Dragon']);
    expect(usage.find((u) => u.label === 'Ryzeal')).toMatchObject({
      count: 3, // 2 fois au YCS, 1 fois en locale
      lastSeen: '2026-04-12',
    });
  });

  it('ignore les rondes sans deck adverse noté', () => {
    const usage = opponentDeckUsage([
      { event: makeEvent(), rounds: [r(1, null, 2, 0), r(2, true, 2, 0, 'Maliss')] },
    ]);

    expect(usage.map((u) => u.label)).toEqual(['Maliss']);
  });

  it('liste mes propres decks', () => {
    expect(myDeckUsage(inputs).map((u) => u.label).sort()).toEqual([
      'Ryzeal',
      'Snake-Eye Fiendsmith',
    ]);
  });

  it('filtre les suggestions sans se soucier de la casse ni des accents', () => {
    const usage = opponentDeckUsage(inputs);

    expect(suggestDecks(usage, { query: 'TENPAI' }).map((u) => u.label)).toEqual(['Tenpai Dragon']);
    expect(suggestDecks(usage, { query: 'dragon' }).map((u) => u.label)).toEqual(['Tenpai Dragon']);
    expect(suggestDecks(usage, { query: 'inexistant' })).toEqual([]);
  });

  it('rend toute la liste sans filtre, dans la limite demandée', () => {
    const usage = opponentDeckUsage(inputs);

    expect(suggestDecks(usage, { query: '  ' })).toHaveLength(usage.length);
    expect(suggestDecks(usage, { limit: 2 })).toHaveLength(2);
  });
});

describe('compareLabels', () => {
  it('ordonne de façon déterministe, indépendamment d’ICU', () => {
    expect(compareLabels('Maliss', 'Ryzeal')).toBeLessThan(0);
    expect(compareLabels('ryzeal', 'Maliss')).toBeGreaterThan(0);
    expect(compareLabels('Ryzeal', 'Ryzeal')).toBe(0);
  });
});
