import { describe, expect, it } from 'vitest';

import { NBSP } from '@/logic/format';
import { generateEventSummary, generateEventSummaryLines } from '@/logic/summary';
import { makeEvent, r, ycsLyon } from './fixtures';

/** Pourcentage avec l'espace insécable, sans avoir à écrire le caractère brut. */
const pct = (value: string) => `${value}${NBSP}%`;

describe('generateEventSummary — texte de référence', () => {
  it('produit exactement le descriptif attendu pour le YCS du plan', () => {
    const expected = [
      'YCS Lyon 2026 — dimanche 12 avril 2026',
      'Type : YCS · 987 joueurs',
      'Deck joué : Snake-Eye Fiendsmith',
      'Résultat final : Top 64 (37e / 987)',
      '',
      'BILAN',
      `Matchs : 5-2-1 en 8 rondes (dont 1 bye) — ${pct('62,5')}`,
      `Manches : 12-8 — ${pct('60,0')}`,
      "Meilleure série : 4 victoires d'affilée",
      '',
      'LANCER DE DÉ',
      `Dé gagné 4 fois sur 7 (${pct('57,1')})`,
      `• Quand je gagne le dé : 3-1 — ${pct('75,0')}`,
      `• Quand je perds le dé : 1-1-1 — ${pct('33,3')}`,
      '',
      'RONDES',
      'R1 — BYE (2-0)',
      'R2 — V 2-0 vs Ryzeal (dé gagné)',
      'R3 — V 2-1 vs Tenpai Dragon (dé perdu) · « top parfait en game 3 »',
      'R4 — V 2-1 vs Maliss (dé gagné)',
      'R5 — D 1-2 vs Snake-Eye Fiendsmith (dé gagné) · « miroir, side raté »',
      'R6 — N 1-1 vs Ryzeal (dé perdu) · « time out pendant la game 3 »',
      'R7 — D 0-2 vs Tenpai Dragon (dé perdu) · « Bystial + Droll, aucune chance »',
      'R8 — V 2-1 vs White Forest (dé gagné)',
      '',
      'MATCHUPS',
      'Ryzeal 1-0-1 · Tenpai Dragon 1-1 · Maliss 1-0 · White Forest 1-0 · Snake-Eye Fiendsmith 0-1',
      '',
      'FRAIS',
      'Événement payé · Hébergement payé · Transport payé',
      'Transport : SNCF TGV 8412',
    ];

    expect(generateEventSummaryLines(ycsLyon)).toEqual(expected);
    expect(generateEventSummary(ycsLyon)).toBe(expected.join('\n'));
  });

  it('est déterministe', () => {
    expect(generateEventSummary(ycsLyon)).toBe(generateEventSummary(ycsLyon));
  });
});

describe('generateEventSummary — mode compact', () => {
  it('tient en quatre lignes', () => {
    expect(generateEventSummaryLines(ycsLyon, { compact: true })).toEqual([
      'YCS Lyon 2026 (12/04/2026) · 987 joueurs · Snake-Eye Fiendsmith',
      `5-2-1 — ${pct('62,5')} · Manches 12-8 (${pct('60,0')})`,
      'Dé : 4/7 · sur dé gagné 3-1 · sur dé perdu 1-1-1',
      'Résultat : Top 64 (37e / 987)',
    ]);
  });
});

describe('generateEventSummary — sections omises', () => {
  it('n’affiche jamais « null » quand les champs optionnels sont vides', () => {
    const text = generateEventSummary({
      event: makeEvent({ name: 'Locale', type: 'LOCALS', date: '2026-02-07' }),
      rounds: [r(1, true, 2, 0, 'Ryzeal')],
    });

    expect(text).not.toContain('null');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('Deck joué');
    expect(text).not.toContain('Résultat final');
    expect(text).not.toContain('joueurs');
    expect(text).toContain('Type : Locale');
    expect(text).toContain('Événement non payé · Hébergement non payé · Transport non payé');
    expect(text).not.toContain('Transport :');
  });

  it('ne laisse aucune ligne vide en double ni en fin de texte', () => {
    const lines = generateEventSummaryLines(ycsLyon);

    expect(lines.at(0)).not.toBe('');
    expect(lines.at(-1)).not.toBe('');
    expect(lines.some((line, i) => line === '' && lines[i + 1] === '')).toBe(false);
  });

  it('respecte les options de contenu', () => {
    const text = generateEventSummary(ycsLyon, {
      includeRounds: false,
      includeMatchups: false,
      includeExpenses: false,
    });

    expect(text).not.toContain('RONDES');
    expect(text).not.toContain('MATCHUPS');
    expect(text).not.toContain('FRAIS');
    expect(text).toContain('BILAN');
  });

  it('masque les commentaires sur demande', () => {
    const text = generateEventSummary(ycsLyon, { includeComments: false });

    expect(text).toContain('R3 — V 2-1 vs Tenpai Dragon (dé perdu)');
    expect(text).not.toContain('top parfait en game 3');
  });

  it('ajoute les notes de l’event quand il y en a', () => {
    const text = generateEventSummary({
      ...ycsLyon,
      event: { ...ycsLyon.event, notes: 'Penser à side Droll la prochaine fois.' },
    });

    expect(text).toContain('NOTES');
    expect(text).toContain('Penser à side Droll la prochaine fois.');
  });
});

describe('generateEventSummary — cas dégénérés', () => {
  it('reste court et sans plantage pour un event sans ronde', () => {
    expect(
      generateEventSummaryLines({ event: makeEvent({ name: 'YCS à venir', type: 'YCS' }), rounds: [] })
    ).toEqual([
      'YCS à venir — jeudi 15 janvier 2026',
      'Type : YCS',
      '',
      'Aucune ronde saisie.',
      '',
      'FRAIS',
      'Événement non payé · Hébergement non payé · Transport non payé',
    ]);
  });

  it('affiche les rondes en cours sans les compter au bilan', () => {
    const text = generateEventSummary({
      event: makeEvent({ name: 'Tournoi en cours' }),
      rounds: [r(1, true, 2, 0, 'Ryzeal'), r(2, null, 0, 0)],
    });

    expect(text).toContain('Matchs : 1-0 en 1 ronde —');
    expect(text).toContain('R2 — en cours');
  });

  it('omet la section dé quand aucun lancer n’est renseigné', () => {
    const text = generateEventSummary({
      event: makeEvent(),
      rounds: [r(1, null, 2, 0)],
    });

    expect(text).not.toContain('LANCER DE DÉ');
    expect(text).toContain('(dont 1 bye)');
  });

  it('omet la meilleure série en dessous de deux victoires', () => {
    const text = generateEventSummary({
      event: makeEvent(),
      rounds: [r(1, true, 2, 0, 'Ryzeal'), r(2, false, 0, 2, 'Maliss')],
    });

    expect(text).not.toContain('Meilleure série');
  });
});
