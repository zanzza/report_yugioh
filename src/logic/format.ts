import type { Games, MatchOutcome, Rate, Round, Tally } from './types';
import { matchOutcome } from './match';

/**
 * Formatage français écrit à la main, **sans `Intl` ni `toLocaleString`** : le
 * support d'ICU dans Hermes varie selon la plateforme et la version, et un
 * formatage maison donne le même résultat dans Node (tests) et sur le
 * téléphone — indispensable pour des snapshots stables.
 */

/** Espace insécable, obligatoire avant `%` en typographie française. */
export const NBSP = ' ';

/** Valeur indisponible. Jamais `NaN`, jamais un `0` trompeur. */
export const DASH = '—';

const WEEKDAYS = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
] as const;

const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

/** `62,5 %` — virgule décimale, une décimale, espace insécable. `—` si `null`. */
export function formatPercentFr(value: number | null, decimals = 1): string {
  if (value === null || !Number.isFinite(value)) return DASH;
  const pct = value * 100;
  const fixed = pct.toFixed(decimals);
  return `${fixed.replace('.', ',')}${NBSP}%`;
}

export function formatRate(rate: Rate, decimals = 1): string {
  return formatPercentFr(rate.value, decimals);
}

/**
 * `25,0 points` — écart entre deux taux. On parle en *points* et non en
 * pourcents : « 25 % de mieux » et « 25 points de mieux » ne veulent pas dire
 * la même chose.
 */
export function formatPointsFr(value: number | null, decimals = 1): string {
  if (value === null || !Number.isFinite(value)) return DASH;
  const fixed = (value * 100).toFixed(decimals).replace('.', ',');
  return `${fixed}${NBSP}points`;
}

function parseIsoDate(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

/**
 * `dimanche 12 avril 2026`. Le jour de la semaine passe par `Date.UTC`, donc
 * sans fuseau horaire et sans bug de minuit.
 */
export function formatDateFr(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return iso;
  const weekday = WEEKDAYS[new Date(Date.UTC(parts.y, parts.m - 1, parts.d)).getUTCDay()];
  return `${weekday} ${parts.d} ${MONTHS[parts.m - 1]} ${parts.y}`;
}

/** `12/04/2026`. */
export function formatDateShortFr(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(parts.d)}/${pad(parts.m)}/${parts.y}`;
}

/** `avril 2026`. */
export function formatMonthYearFr(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return iso;
  return `${MONTHS[parts.m - 1]} ${parts.y}`;
}

/** `5-2-1`, ou `5-2` quand il n'y a aucune nulle. */
export function formatRecord(t: Tally): string {
  return t.draws > 0 ? `${t.wins}-${t.losses}-${t.draws}` : `${t.wins}-${t.losses}`;
}

/** `12-8`. */
export function formatGames(g: Games): string {
  return `${g.won}-${g.lost}`;
}

/** `2-1`. */
export function formatScore(r: Pick<Round, 'myWins' | 'oppWins'>): string {
  return `${r.myWins}-${r.oppWins}`;
}

/** Lit un score saisi ou importé sous forme `2-1`. */
export function parseScore(text: string): { myWins: number; oppWins: number } | null {
  const m = /^\s*(\d)\s*-\s*(\d)\s*$/.exec(text);
  if (!m) return null;
  return { myWins: Number(m[1]), oppWins: Number(m[2]) };
}

/** `V` / `D` / `N`, et `·` pour une ronde pas encore jouée. */
export function formatOutcomeLetter(outcome: MatchOutcome): string {
  switch (outcome) {
    case 'WIN':
      return 'V';
    case 'LOSS':
      return 'D';
    case 'DRAW':
      return 'N';
    case 'UNPLAYED':
      return '·';
  }
}

export function formatOutcomeLabel(outcome: MatchOutcome): string {
  switch (outcome) {
    case 'WIN':
      return 'Victoire';
    case 'LOSS':
      return 'Défaite';
    case 'DRAW':
      return 'Nulle';
    case 'UNPLAYED':
      return 'En cours';
  }
}

export function formatRoundOutcome(r: Round): string {
  return formatOutcomeLetter(matchOutcome(r));
}

/** `dé gagné` / `dé perdu` / `pas de lancer`. */
export function formatDice(diceWon: boolean | null): string {
  if (diceWon === null) return 'pas de lancer';
  return diceWon ? 'dé gagné' : 'dé perdu';
}

/** `37e`, `1er`. */
export function formatOrdinalFr(n: number): string {
  return n === 1 ? '1er' : `${n}e`;
}

/**
 * Résultat final lisible : combine le texte libre, la place exacte et le
 * nombre de joueurs quand ils sont renseignés — `Top 64 (37e / 987)`.
 */
export function formatFinalResult(
  finalResult: string | null,
  finalStanding: number | null,
  playerCount: number | null
): string | null {
  const label = finalResult?.trim() || null;
  if (finalStanding === null) return label;

  const standing =
    playerCount !== null
      ? `${formatOrdinalFr(finalStanding)} / ${playerCount}`
      : formatOrdinalFr(finalStanding);

  return label ? `${label} (${standing})` : standing;
}
