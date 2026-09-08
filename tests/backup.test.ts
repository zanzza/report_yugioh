import { describe, expect, it } from 'vitest';

import {
  BACKUP_SCHEMA_VERSION,
  backupFileName,
  buildBackup,
  parseBackup,
} from '@/logic/backup';
import { localeJanvier, ycsLyon } from './fixtures';

const EXPORTED_AT = '2026-09-07T15:30:00.000Z';

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(`Import refusé : ${(result as { error?: string }).error}`);
  return result as Extract<T, { ok: true }>;
}

describe('buildBackup', () => {
  it('est déterministe et trie les events par date', () => {
    const first = buildBackup([ycsLyon, localeJanvier], EXPORTED_AT);
    const second = buildBackup([localeJanvier, ycsLyon], EXPORTED_AT);

    expect(first).toEqual(second);
    expect(first.events.map((e) => e.id)).toEqual([2, 1]); // 2026-01-10 avant 2026-04-12
    expect(first.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(first.exportedAt).toBe(EXPORTED_AT);
    expect(first.rounds).toHaveLength(11);
  });

  it('nomme le fichier avec la date du jour', () => {
    expect(backupFileName('2026-09-07')).toBe('report_yugioh_2026-09-07.json');
  });
});

describe('parseBackup — aller-retour', () => {
  it('est idempotent', () => {
    const original = buildBackup([ycsLyon, localeJanvier], EXPORTED_AT);
    const reparsed = ok(parseBackup(original));
    const rebuilt = buildBackup(reparsed.backup.data, EXPORTED_AT);

    expect(rebuilt).toEqual(original);
  });

  it('restitue les events avec leurs rondes rattachées et ordonnées', () => {
    const parsed = ok(parseBackup(buildBackup([ycsLyon], EXPORTED_AT)));

    expect(parsed.backup.data).toHaveLength(1);
    expect(parsed.backup.data[0].event.name).toBe('YCS Lyon 2026');
    expect(parsed.backup.data[0].rounds.map((r) => r.roundNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(parsed.backup.exportedAt).toBe(EXPORTED_AT);
  });

  it('lit aussi directement une chaîne JSON', () => {
    const json = JSON.stringify(buildBackup([ycsLyon], EXPORTED_AT));

    expect(ok(parseBackup(json)).backup.data).toHaveLength(1);
  });
});

describe('parseBackup — refus explicites', () => {
  const base = () => JSON.parse(JSON.stringify(buildBackup([ycsLyon], EXPORTED_AT)));

  it('refuse un JSON invalide', () => {
    const result = parseBackup('{ pas du json');

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ error: expect.stringContaining('JSON') });
  });

  it('refuse un fichier sans version de schéma', () => {
    const raw = base();
    delete raw.schemaVersion;

    expect(parseBackup(raw)).toMatchObject({
      ok: false,
      error: expect.stringContaining('version de schéma absente'),
    });
  });

  it('refuse une version plus récente que l’app', () => {
    const raw = base();
    raw.schemaVersion = BACKUP_SCHEMA_VERSION + 1;

    expect(parseBackup(raw)).toMatchObject({
      ok: false,
      error: expect.stringContaining("Mets l'app à jour"),
    });
  });

  it('refuse une ronde orpheline', () => {
    const raw = base();
    raw.rounds.push({ ...raw.rounds[0], id: 9999, eventId: 4242 });

    expect(parseBackup(raw)).toMatchObject({
      ok: false,
      error: expect.stringContaining('absent du fichier'),
    });
  });

  it('refuse des identifiants d’event en double', () => {
    const raw = base();
    raw.events.push({ ...raw.events[0] });

    expect(parseBackup(raw)).toMatchObject({
      ok: false,
      error: expect.stringContaining('double'),
    });
  });

  it('refuse un type d’event inconnu et une date invalide', () => {
    const withBadType = base();
    withBadType.events[0].type = 'SUPER_YCS';
    expect(parseBackup(withBadType)).toMatchObject({ ok: false });

    const withBadDate = base();
    withBadDate.events[0].date = '12/04/2026';
    expect(parseBackup(withBadDate)).toMatchObject({ ok: false });
  });

  it('refuse un score hors bornes', () => {
    const raw = base();
    raw.rounds[0].myWins = 9;

    expect(parseBackup(raw)).toMatchObject({
      ok: false,
      error: expect.stringContaining('hors bornes'),
    });
  });

  it('refuse les listes absentes', () => {
    const withoutEvents = base();
    delete withoutEvents.events;
    expect(parseBackup(withoutEvents)).toMatchObject({ ok: false });

    const withoutRounds = base();
    delete withoutRounds.rounds;
    expect(parseBackup(withoutRounds)).toMatchObject({ ok: false });
  });
});

describe('parseBackup — tolérances', () => {
  it('accepte les champs optionnels absents', () => {
    const raw = {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      events: [{ id: 1, name: 'Locale', type: 'LOCALS', date: '2026-03-01' }],
      rounds: [{ id: 1, eventId: 1, roundNumber: 1 }],
    };

    const parsed = ok(parseBackup(raw));

    expect(parsed.backup.data[0].event).toMatchObject({
      playerCount: null,
      myDeck: null,
      paidEvent: false,
      paidTransport: false,
    });
    expect(parsed.backup.data[0].rounds[0]).toMatchObject({ diceWon: null, myWins: 0, oppWins: 0 });
  });

  it('accepte les booléens stockés en 0/1 par SQLite', () => {
    const raw = {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      events: [
        {
          id: 1,
          name: 'Locale',
          type: 'LOCALS',
          date: '2026-03-01',
          paidEvent: 1,
          paidAccommodation: 0,
          paidTransport: 1,
        },
      ],
      rounds: [{ id: 1, eventId: 1, roundNumber: 1, diceWon: 1, myWins: 2, oppWins: 0 }],
    };

    const parsed = ok(parseBackup(raw));

    expect(parsed.backup.data[0].event).toMatchObject({
      paidEvent: true,
      paidAccommodation: false,
      paidTransport: true,
    });
    expect(parsed.backup.data[0].rounds[0].diceWon).toBe(true);
  });

  it('accepte un event sans aucune ronde', () => {
    const parsed = ok(
      parseBackup({
        schemaVersion: BACKUP_SCHEMA_VERSION,
        events: [{ id: 7, name: 'YCS à venir', type: 'YCS', date: '2026-12-05' }],
        rounds: [],
      })
    );

    expect(parsed.backup.data[0].rounds).toEqual([]);
  });
});
