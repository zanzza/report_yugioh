import { UNKNOWN_KEY } from './constants';
import type { EventWithRounds } from './types';

/**
 * Les noms de decks sont saisis en texte libre (avec des chips de suggestion
 * pour éviter la fragmentation). La normalisation à la lecture fait fusionner
 * « Snake-Eye  Fiendsmith », « snake-eye fiendsmith » et « SNAKE-EYE FIENDSMITH ».
 */

/**
 * Table d'accents explicite plutôt que `String.normalize('NFD')` : le support
 * de la normalisation Unicode dépend d'ICU, absent de certaines builds Hermes.
 */
const ACCENTS: Record<string, string> = {
  à: 'a', á: 'a', â: 'a', ä: 'a', ã: 'a', å: 'a',
  ç: 'c',
  è: 'e', é: 'e', ê: 'e', ë: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i',
  ñ: 'n',
  ò: 'o', ó: 'o', ô: 'o', ö: 'o', õ: 'o', ø: 'o',
  ù: 'u', ú: 'u', û: 'u', ü: 'u',
  ý: 'y', ÿ: 'y',
  æ: 'ae', œ: 'oe', ß: 'ss',
};

function stripAccents(value: string): string {
  let out = '';
  for (const ch of value) out += ACCENTS[ch] ?? ch;
  return out;
}

/**
 * Clé de regroupement d'un nom de deck : trim, espaces collapsés, accents
 * retirés, minuscules. Un nom absent ou vide donne {@link UNKNOWN_KEY} — il
 * est regroupé sous « non renseigné », jamais ignoré en silence.
 */
export function normalizeDeckKey(name: string | null | undefined): string {
  if (name === null || name === undefined) return UNKNOWN_KEY;
  const cleaned = name.trim().replace(/\s+/g, ' ');
  if (cleaned === '') return UNKNOWN_KEY;
  return stripAccents(cleaned.toLowerCase());
}

/** Nettoie un nom pour l'affichage, sans le normaliser. `null` si vide. */
export function cleanDeckName(name: string | null | undefined): string | null {
  if (name === null || name === undefined) return null;
  const cleaned = name.trim().replace(/\s+/g, ' ');
  return cleaned === '' ? null : cleaned;
}

/**
 * Choisit le libellé d'affichage d'un groupe de decks : la variante d'origine
 * la plus fréquente. À égalité, l'ordre alphabétique tranche, pour rester
 * déterministe.
 */
export function displayNameFor(names: readonly (string | null | undefined)[]): string | null {
  const counts = new Map<string, number>();
  for (const raw of names) {
    const cleaned = cleanDeckName(raw);
    if (cleaned === null) continue;
    counts.set(cleaned, (counts.get(cleaned) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  let best: [string, number] | null = null;
  for (const entry of counts) {
    if (best === null || entry[1] > best[1] || (entry[1] === best[1] && entry[0] < best[0])) {
      best = entry;
    }
  }
  return best![0];
}

/**
 * Comparaison de libellés **déterministe partout** : elle passe par la clé
 * normalisée et de simples opérateurs relationnels. `localeCompare(x, 'fr')`
 * dépendrait d'ICU, absent de certaines builds Hermes, et donnerait alors un
 * ordre différent entre Node (tests) et le téléphone.
 */
export function compareLabels(a: string, b: string): number {
  const ka = normalizeDeckKey(a);
  const kb = normalizeDeckKey(b);
  if (ka !== kb) return ka < kb ? -1 : 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** Usage d'un nom de deck : de quoi trier des suggestions de saisie. */
export interface DeckUsage {
  key: string;
  label: string;
  count: number;
  /** Date ISO de la dernière apparition, ou `null`. */
  lastSeen: string | null;
}

function buildUsage(entries: readonly { name: string | null; date: string }[]): DeckUsage[] {
  const groups = new Map<string, { names: (string | null)[]; count: number; lastSeen: string | null }>();

  for (const entry of entries) {
    const key = normalizeDeckKey(entry.name);
    if (key === UNKNOWN_KEY) continue;

    const group = groups.get(key) ?? { names: [], count: 0, lastSeen: null };
    group.names.push(entry.name);
    group.count++;
    if (group.lastSeen === null || entry.date > group.lastSeen) group.lastSeen = entry.date;
    groups.set(key, group);
  }

  const usages: DeckUsage[] = [];
  for (const [key, group] of groups) {
    usages.push({ key, label: displayNameFor(group.names) ?? key, count: group.count, lastSeen: group.lastSeen });
  }
  return sortUsage(usages);
}

/** Tri des suggestions : fréquence, puis récence, puis alphabétique. */
function sortUsage(usages: DeckUsage[]): DeckUsage[] {
  return usages.sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    const la = a.lastSeen ?? '';
    const lb = b.lastSeen ?? '';
    if (la !== lb) return la < lb ? 1 : -1; // date la plus récente d'abord
    return compareLabels(a.label, b.label);
  });
}

/** Decks adverses déjà rencontrés, les plus fréquents d'abord. */
export function opponentDeckUsage(inputs: readonly EventWithRounds[]): DeckUsage[] {
  const entries: { name: string | null; date: string }[] = [];
  for (const { event, rounds } of inputs) {
    for (const round of rounds) entries.push({ name: round.opponentDeck, date: event.date });
  }
  return buildUsage(entries);
}

/** Decks que j'ai joués, les plus fréquents d'abord. */
export function myDeckUsage(inputs: readonly EventWithRounds[]): DeckUsage[] {
  return buildUsage(inputs.map(({ event }) => ({ name: event.myDeck, date: event.date })));
}

/**
 * Suggestions à afficher en chips. `query` filtre sur la clé normalisée, ce qui
 * rend la recherche insensible à la casse, aux accents et aux espaces doubles.
 */
export function suggestDecks(
  usage: readonly DeckUsage[],
  options: { limit?: number; query?: string | null } = {}
): DeckUsage[] {
  const { limit = 8, query = null } = options;

  const needle = normalizeDeckKey(query);
  const filtered =
    needle === UNKNOWN_KEY ? [...usage] : usage.filter((u) => u.key.includes(needle));

  return sortUsage(filtered).slice(0, limit);
}
