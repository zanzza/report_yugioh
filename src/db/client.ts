import type { SQLiteOpenOptions } from 'expo-sqlite';

/** Fichier de base, dans le sandbox de l'app. */
export const DB_NAME = 'report_yugioh.db';

/**
 * Pas de `enableChangeListener` : la réactivité passe par notre propre compteur
 * de révision ({@link file://./revision.ts}), qui se déclenche sur les
 * mutations applicatives et non sur chaque écriture SQLite.
 */
export const DB_OPTIONS: SQLiteOpenOptions = {};
