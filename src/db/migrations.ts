import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Migrations pilotées par `PRAGMA user_version`, sans librairie.
 *
 * Règle absolue : **une migration livrée est immuable**. Toute évolution du
 * schéma passe par une nouvelle entrée `{ to: 2, up: ... }`, jamais par la
 * modification d'une entrée existante — sinon les bases déjà migrées divergent
 * silencieusement.
 */
export interface Migration {
  to: number;
  up: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    to: 1,
    up: `
      CREATE TABLE events (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        name                TEXT    NOT NULL CHECK (length(trim(name)) > 0),
        type                TEXT    NOT NULL,
        -- GLOB suit la syntaxe glob, pas celle de LIKE : « _ » y est un
        -- underscore littéral, pas un joker. D'où les classes [0-9], qui ont
        -- l'avantage d'exiger vraiment des chiffres.
        date                TEXT    NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        player_count        INTEGER          CHECK (player_count IS NULL OR player_count > 0),
        final_result        TEXT,
        final_standing      INTEGER          CHECK (final_standing IS NULL OR final_standing > 0),
        my_deck             TEXT,
        paid_event          INTEGER NOT NULL DEFAULT 0 CHECK (paid_event         IN (0, 1)),
        paid_accommodation  INTEGER NOT NULL DEFAULT 0 CHECK (paid_accommodation IN (0, 1)),
        paid_transport      INTEGER NOT NULL DEFAULT 0 CHECK (paid_transport     IN (0, 1)),
        transport_name      TEXT,
        notes               TEXT,
        created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_events_date ON events(date DESC);

      CREATE TABLE rounds (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        round_number  INTEGER NOT NULL CHECK (round_number > 0),
        dice_won      INTEGER          CHECK (dice_won IS NULL OR dice_won IN (0, 1)),
        my_wins       INTEGER NOT NULL DEFAULT 0 CHECK (my_wins  BETWEEN 0 AND 3),
        opp_wins      INTEGER NOT NULL DEFAULT 0 CHECK (opp_wins BETWEEN 0 AND 3),
        opponent_deck TEXT,
        comment       TEXT,
        created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
        UNIQUE (event_id, round_number)
      );
    `,
  },
];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].to;

/**
 * Ouvre et met à niveau la base. Appelée par `onInit` du `SQLiteProvider`.
 *
 * `PRAGMA foreign_keys` se règle **par connexion** et vaut `OFF` par défaut :
 * sans cette ligne, le `ON DELETE CASCADE` des rondes est ignoré en silence et
 * la base accumule des rondes orphelines.
 */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.to <= version) continue;

    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.up);
    });
    // `PRAGMA` n'accepte pas de paramètre lié ; la valeur vient de nos constantes.
    await db.execAsync(`PRAGMA user_version = ${migration.to}`);
    version = migration.to;
  }
}

/** Version de schéma réellement présente dans le fichier de base. */
export async function readSchemaVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}
