import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { importAll, loadAll } from '@/db/backup.repo';
import {
  countEvents,
  deleteEvent,
  duplicateEvent,
  getEvent,
  insertEvent,
  listEvents,
  setPaymentFlag,
  updateEvent,
} from '@/db/events.repo';
import { readSchemaVersion, SCHEMA_VERSION } from '@/db/migrations';
import {
  countRounds,
  deleteRound,
  insertRound,
  listRounds,
  nextRoundNumber,
  updateRound,
} from '@/db/rounds.repo';
import { buildBackup, parseBackup } from '@/logic/backup';
import type { EventDraft, RoundDraft } from '@/logic/types';
import { createTestDatabase, type TestDatabase } from './sqlite-adapter';

function draft(overrides: Partial<EventDraft> = {}): EventDraft {
  return {
    name: 'YCS Lyon 2026',
    type: 'YCS',
    date: '2026-04-12',
    playerCount: 987,
    finalResult: 'Top 64',
    finalStanding: 37,
    myDeck: 'Snake-Eye Fiendsmith',
    paidEvent: false,
    paidAccommodation: false,
    paidTransport: false,
    transportName: 'SNCF TGV 8412',
    notes: null,
    ...overrides,
  };
}

function round(overrides: Partial<RoundDraft> = {}): RoundDraft {
  return {
    roundNumber: 1,
    diceWon: true,
    myWins: 2,
    oppWins: 1,
    opponentDeck: 'Ryzeal',
    comment: null,
    ...overrides,
  };
}

/** Compare des contenus d'events sans leurs identifiants, réattribués à l'import. */
function withoutIds(inputs: Awaited<ReturnType<typeof loadAll>>) {
  return inputs.map(({ event, rounds }) => {
    const { id: _eventId, ...eventContent } = event;
    return {
      event: eventContent,
      rounds: rounds.map(({ id: _id, eventId: _fk, ...roundContent }) => roundContent),
    };
  });
}

let harness: TestDatabase;

beforeEach(async () => {
  harness = await createTestDatabase();
});

afterEach(() => {
  harness.close();
});

describe('migrations', () => {
  it('crée le schéma et enregistre sa version', async () => {
    expect(await readSchemaVersion(harness.db)).toBe(SCHEMA_VERSION);
  });

  it('est idempotente : une seconde exécution ne change rien', async () => {
    const { migrate } = await import('@/db/migrations');
    await migrate(harness.db);

    expect(await readSchemaVersion(harness.db)).toBe(SCHEMA_VERSION);
    expect(await countEvents(harness.db)).toBe(0);
  });
});

describe('events', () => {
  it('crée, relit et modifie un event', async () => {
    const id = await insertEvent(harness.db, draft());
    const created = await getEvent(harness.db, id);

    expect(created).toMatchObject({
      name: 'YCS Lyon 2026',
      type: 'YCS',
      date: '2026-04-12',
      playerCount: 987,
      finalStanding: 37,
      myDeck: 'Snake-Eye Fiendsmith',
      paidEvent: false,
    });

    await updateEvent(harness.db, id, draft({ name: 'YCS Lyon 2026 — jour 2', paidEvent: true }));
    const updated = await getEvent(harness.db, id);

    expect(updated?.name).toBe('YCS Lyon 2026 — jour 2');
    expect(updated?.paidEvent).toBe(true);
  });

  it('convertit bien les booléens de paiement dans les deux sens', async () => {
    const id = await insertEvent(harness.db, draft());

    await setPaymentFlag(harness.db, id, 'paidTransport', true);
    expect((await getEvent(harness.db, id))?.paidTransport).toBe(true);

    await setPaymentFlag(harness.db, id, 'paidTransport', false);
    expect((await getEvent(harness.db, id))?.paidTransport).toBe(false);
  });

  it('normalise les noms de decks à l’écriture', async () => {
    const id = await insertEvent(harness.db, draft({ myDeck: '  Snake-Eye   Fiendsmith  ' }));
    expect((await getEvent(harness.db, id))?.myDeck).toBe('Snake-Eye Fiendsmith');
  });

  it('vide les champs texte laissés blancs plutôt que de stocker des espaces', async () => {
    const id = await insertEvent(harness.db, draft({ transportName: '   ', finalResult: '' }));
    const created = await getEvent(harness.db, id);

    expect(created?.transportName).toBeNull();
    expect(created?.finalResult).toBeNull();
  });

  it('trie les events du plus récent au plus ancien', async () => {
    await insertEvent(harness.db, draft({ name: 'Ancien', date: '2025-06-01' }));
    await insertEvent(harness.db, draft({ name: 'Récent', date: '2026-04-12' }));

    expect((await listEvents(harness.db)).map((e) => e.name)).toEqual(['Récent', 'Ancien']);
  });

  it('duplique un event sans ses rondes', async () => {
    const id = await insertEvent(harness.db, draft());
    await insertRound(harness.db, id, round());

    const copyId = await duplicateEvent(harness.db, id);

    expect(copyId).not.toBeNull();
    expect((await getEvent(harness.db, copyId!))?.name).toBe('YCS Lyon 2026 (copie)');
    expect(await listRounds(harness.db, copyId!)).toEqual([]);
  });

  it('refuse un nom vide (contrainte CHECK)', async () => {
    await expect(insertEvent(harness.db, draft({ name: '   ' }))).rejects.toThrow();
  });

  it('refuse une date qui n’est pas au format ISO (contrainte CHECK)', async () => {
    await expect(insertEvent(harness.db, draft({ date: '12/04/2026' }))).rejects.toThrow();
  });
});

describe('rounds', () => {
  it('propose le bon numéro de ronde suivant', async () => {
    const eventId = await insertEvent(harness.db, draft());

    expect(await nextRoundNumber(harness.db, eventId)).toBe(1);
    await insertRound(harness.db, eventId, round({ roundNumber: 1 }));
    expect(await nextRoundNumber(harness.db, eventId)).toBe(2);
  });

  it('stocke le score en deux entiers et le dé en booléen nullable', async () => {
    const eventId = await insertEvent(harness.db, draft());
    await insertRound(harness.db, eventId, round({ roundNumber: 1, diceWon: null, myWins: 2, oppWins: 0 }));
    await insertRound(harness.db, eventId, round({ roundNumber: 2, diceWon: false, myWins: 1, oppWins: 2 }));

    const rounds = await listRounds(harness.db, eventId);

    expect(rounds[0]).toMatchObject({ diceWon: null, myWins: 2, oppWins: 0 });
    expect(rounds[1]).toMatchObject({ diceWon: false, myWins: 1, oppWins: 2 });
  });

  it('refuse un score hors bornes (contrainte CHECK)', async () => {
    const eventId = await insertEvent(harness.db, draft());
    await expect(
      insertRound(harness.db, eventId, round({ myWins: 9 }))
    ).rejects.toThrow();
  });

  it('refuse deux rondes avec le même numéro sur un event (contrainte UNIQUE)', async () => {
    const eventId = await insertEvent(harness.db, draft());
    await insertRound(harness.db, eventId, round({ roundNumber: 1 }));

    await expect(insertRound(harness.db, eventId, round({ roundNumber: 1 }))).rejects.toThrow();
  });

  it('autorise le même numéro sur deux events différents', async () => {
    const first = await insertEvent(harness.db, draft({ name: 'A' }));
    const second = await insertEvent(harness.db, draft({ name: 'B' }));

    await insertRound(harness.db, first, round({ roundNumber: 1 }));
    await expect(insertRound(harness.db, second, round({ roundNumber: 1 }))).resolves.toBeTypeOf(
      'number'
    );
  });

  it('modifie une ronde existante', async () => {
    const eventId = await insertEvent(harness.db, draft());
    const roundId = await insertRound(harness.db, eventId, round());

    await updateRound(harness.db, roundId, round({ myWins: 0, oppWins: 2, comment: 'Bystial + Droll' }));
    const [updated] = await listRounds(harness.db, eventId);

    expect(updated).toMatchObject({ myWins: 0, oppWins: 2, comment: 'Bystial + Droll' });
  });

  it('renumérote sans trou après la suppression d’une ronde du milieu', async () => {
    const eventId = await insertEvent(harness.db, draft());
    for (let n = 1; n <= 5; n++) {
      await insertRound(harness.db, eventId, round({ roundNumber: n }));
    }

    const rounds = await listRounds(harness.db, eventId);
    await deleteRound(harness.db, rounds[2].id); // la ronde 3

    // C'est ici que la renumérotation naïve violerait UNIQUE(event_id, round_number).
    expect((await listRounds(harness.db, eventId)).map((r) => r.roundNumber)).toEqual([1, 2, 3, 4]);
  });

  it('supprime les rondes en cascade avec leur event', async () => {
    const eventId = await insertEvent(harness.db, draft());
    await insertRound(harness.db, eventId, round({ roundNumber: 1 }));
    await insertRound(harness.db, eventId, round({ roundNumber: 2 }));

    expect(await countRounds(harness.db)).toBe(2);

    await deleteEvent(harness.db, eventId);

    // Valide `ON DELETE CASCADE`, donc que `PRAGMA foreign_keys = ON` a bien
    // été posé sur la connexion par migrate().
    expect(await countRounds(harness.db)).toBe(0);
    expect(await countEvents(harness.db)).toBe(0);
  });
});

describe('export / import', () => {
  async function seed() {
    const first = await insertEvent(harness.db, draft({ name: 'YCS Lyon 2026', date: '2026-04-12' }));
    await insertRound(harness.db, first, round({ roundNumber: 1, diceWon: null, myWins: 2, oppWins: 0, opponentDeck: null }));
    await insertRound(harness.db, first, round({ roundNumber: 2, diceWon: true, myWins: 2, oppWins: 1 }));

    const second = await insertEvent(harness.db, draft({ name: 'Locale', type: 'LOCALS', date: '2026-01-10' }));
    await insertRound(harness.db, second, round({ roundNumber: 1, diceWon: false, myWins: 0, oppWins: 2 }));
  }

  it('recharge tout, events et rondes rattachées', async () => {
    await seed();
    const all = await loadAll(harness.db);

    expect(all).toHaveLength(2);
    expect(all[0].event.name).toBe('YCS Lyon 2026'); // le plus récent d'abord
    expect(all[0].rounds.map((r) => r.roundNumber)).toEqual([1, 2]);
    expect(all[1].rounds).toHaveLength(1);
  });

  it('restaure exactement les données après un aller-retour complet', async () => {
    await seed();
    const before = await loadAll(harness.db);
    const file = buildBackup(before, '2026-09-07T15:30:00.000Z');

    // Le scénario réel : app désinstallée puis réinstallée.
    await harness.db.runAsync('DELETE FROM rounds');
    await harness.db.runAsync('DELETE FROM events');

    const parsed = parseBackup(JSON.parse(JSON.stringify(file)));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    await importAll(harness.db, parsed.backup.data, 'replace');
    const after = await loadAll(harness.db);

    // Les identifiants sont volontairement réattribués à l'import ; c'est le
    // contenu qui doit être identique.
    expect(withoutIds(after)).toEqual(withoutIds(before));
  });

  it('ajoute sans conflit d’identifiant en réimportant le même fichier', async () => {
    await seed();
    const snapshot = await loadAll(harness.db);

    await importAll(harness.db, snapshot, 'append');

    expect(await countEvents(harness.db)).toBe(4);
    expect(await countRounds(harness.db)).toBe(6);

    // Les nouveaux events ont bien leurs propres identifiants.
    const ids = (await listEvents(harness.db)).map((e) => e.id);
    expect(new Set(ids).size).toBe(4);
  });

  it('remplace tout en une transaction', async () => {
    await seed();
    const imported = [
      {
        event: { ...draft({ name: 'Importé', type: 'OTS' as const }), id: 42 },
        rounds: [],
      },
    ];

    await importAll(harness.db, imported, 'replace');

    const all = await loadAll(harness.db);
    expect(all).toHaveLength(1);
    expect(all[0].event.name).toBe('Importé');
    expect(all[0].event.id).not.toBe(42); // identifiant réattribué
    expect(await countRounds(harness.db)).toBe(0);
  });
});
