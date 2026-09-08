import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

import { migrate } from '@/db/migrations';

/**
 * Adaptateur `node:sqlite` → surface `SQLiteDatabase` d'expo-sqlite.
 *
 * Il n'existe que pour les tests. `src/db/*.repo.ts` n'importe d'expo-sqlite
 * qu'un **type**, donc le vrai code des repos — le SQL, les contraintes, la
 * renumérotation en deux passes — s'exécute ici tel quel dans Node, sur le
 * SQLite embarqué. Le schéma est ainsi validé avant d'atteindre le téléphone.
 */
export interface TestDatabase {
  db: SQLiteDatabase;
  close: () => void;
}

type NamedParams = Record<string, SQLInputValue>;

/**
 * Les repos appellent expo-sqlite soit avec un objet de paramètres nommés,
 * soit en variadique. On distingue les deux comme le fait expo-sqlite.
 */
function splitParams(params: unknown[]): { named?: NamedParams; positional: SQLInputValue[] } {
  if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null) {
    const only = params[0];
    if (Array.isArray(only)) return { positional: only as SQLInputValue[] };
    return { named: only as NamedParams, positional: [] };
  }
  return { positional: params as SQLInputValue[] };
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const raw = new DatabaseSync(':memory:');

  const db = {
    async execAsync(source: string) {
      // `PRAGMA journal_mode = WAL` n'a pas de sens sur une base en mémoire.
      raw.exec(source.replace(/PRAGMA journal_mode\s*=\s*WAL;?/i, ''));
    },

    async runAsync(source: string, ...params: unknown[]) {
      const statement = raw.prepare(source);
      const { named, positional } = splitParams(params);
      const result = named ? statement.run(named) : statement.run(...positional);
      return {
        lastInsertRowId: Number(result.lastInsertRowid),
        changes: Number(result.changes),
      };
    },

    async getFirstAsync<T>(source: string, ...params: unknown[]) {
      const statement = raw.prepare(source);
      const { named, positional } = splitParams(params);
      const row = named ? statement.get(named) : statement.get(...positional);
      return (row ?? null) as T | null;
    },

    async getAllAsync<T>(source: string, ...params: unknown[]) {
      const statement = raw.prepare(source);
      const { named, positional } = splitParams(params);
      const rows = named ? statement.all(named) : statement.all(...positional);
      return rows as T[];
    },

    async withTransactionAsync(task: () => Promise<void>) {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (cause) {
        raw.exec('ROLLBACK');
        throw cause;
      }
    },
  } as unknown as SQLiteDatabase;

  await migrate(db);

  return { db, close: () => raw.close() };
}
