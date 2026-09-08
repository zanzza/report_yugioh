/**
 * Point d'entrée du module de logique pure.
 *
 * Tout `src/logic/**` est du TypeScript sans dépendance à React, React Native
 * ou SQLite : il tourne dans Node, donc les stats et le générateur de résumé
 * sont testables sans téléphone.
 */
export * from './types';
export * from './constants';
export * from './match';
export * from './format';
export * from './decks';
export * from './stats';
export * from './summary';
export * from './validation';
export * from './backup';
