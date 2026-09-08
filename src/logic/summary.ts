import { eventTypeLabel } from './constants';
import {
  formatDateFr,
  formatDateShortFr,
  formatFinalResult,
  formatGames,
  formatOutcomeLetter,
  formatPercentFr,
  formatRecord,
  formatScore,
  formatDice,
} from './format';
import { isBye, isCounted, matchOutcome } from './match';
import { computeEventStats, sortGroupsByVolume, type EventStats } from './stats';
import type { EventWithRounds, Round, Tally } from './types';

/**
 * Génère le descriptif textuel d'un event.
 *
 * Fonction **pure et déterministe** : aucun `Date.now()`, aucun `Intl`. Les
 * sections dont les données manquent sont omises — jamais de « null » affiché,
 * jamais de ligne vide orpheline. Le texte est brut (pas de Markdown) pour être
 * collable dans Discord, WhatsApp ou un SMS.
 */
export interface SummaryOptions {
  includeRounds?: boolean;
  includeComments?: boolean;
  includeMatchups?: boolean;
  includeExpenses?: boolean;
  includeNotes?: boolean;
  /** Version courte de 4 lignes, pour un partage rapide. */
  compact?: boolean;
}

const DEFAULTS: Required<SummaryOptions> = {
  includeRounds: true,
  includeComments: true,
  includeMatchups: true,
  includeExpenses: true,
  includeNotes: true,
  compact: false,
};

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

/** `5-2-1 en 8 rondes (dont 1 bye)`. */
function recordPhrase(tally: Tally, roundsCounted: number, byes: number): string {
  const base = `${formatRecord(tally)} en ${roundsCounted} ${plural(roundsCounted, 'ronde', 'rondes')}`;
  if (byes === 0) return base;
  return `${base} (dont ${byes} ${plural(byes, 'bye', 'byes')})`;
}

function roundLine(round: Round, includeComments: boolean): string {
  const prefix = `R${round.roundNumber} —`;

  if (!isCounted(round)) return `${prefix} en cours`;

  const parts: string[] = [];
  if (isBye(round)) {
    parts.push(`BYE (${formatScore(round)})`);
  } else {
    parts.push(`${formatOutcomeLetter(matchOutcome(round))} ${formatScore(round)}`);
    const deck = round.opponentDeck?.trim();
    if (deck) parts.push(`vs ${deck}`);
    parts.push(`(${formatDice(round.diceWon)})`);
  }

  let line = `${prefix} ${parts.join(' ')}`;

  const comment = round.comment?.trim();
  if (includeComments && comment) line += ` · « ${comment} »`;

  return line;
}

function headerLines(input: EventWithRounds): string[] {
  const { event } = input;
  const lines = [`${event.name} — ${formatDateFr(event.date)}`];

  const typePart = `Type : ${eventTypeLabel(event.type)}`;
  lines.push(
    event.playerCount !== null
      ? `${typePart} · ${event.playerCount} ${plural(event.playerCount, 'joueur', 'joueurs')}`
      : typePart
  );

  const deck = event.myDeck?.trim();
  if (deck) lines.push(`Deck joué : ${deck}`);

  const result = formatFinalResult(event.finalResult, event.finalStanding, event.playerCount);
  if (result) lines.push(`Résultat final : ${result}`);

  return lines;
}

function balanceLines(stats: EventStats): string[] {
  const lines = ['BILAN'];
  lines.push(
    `Matchs : ${recordPhrase(stats.tally, stats.roundsCounted, stats.byes)} — ${formatPercentFr(
      stats.matchWinRate.value
    )}`
  );
  lines.push(`Manches : ${formatGames(stats.games)} — ${formatPercentFr(stats.gameWinRate.value)}`);

  if (stats.longestWinStreak >= 2) {
    lines.push(`Meilleure série : ${stats.longestWinStreak} victoires d'affilée`);
  }
  return lines;
}

function diceLines(stats: EventStats): string[] {
  const { dice } = stats;
  if (dice.rollsWithDie === 0) return [];

  const lines = ['LANCER DE DÉ'];
  lines.push(
    `Dé gagné ${dice.dieWon} fois sur ${dice.rollsWithDie} (${formatPercentFr(dice.dieWinRate.value)})`
  );

  if (dice.whenDieWon.tally.played > 0) {
    lines.push(
      `• Quand je gagne le dé : ${formatRecord(dice.whenDieWon.tally)} — ${formatPercentFr(
        dice.whenDieWon.matchWinRate.value
      )}`
    );
  }
  if (dice.whenDieLost.tally.played > 0) {
    lines.push(
      `• Quand je perds le dé : ${formatRecord(dice.whenDieLost.tally)} — ${formatPercentFr(
        dice.whenDieLost.matchWinRate.value
      )}`
    );
  }
  return lines;
}

function matchupLines(stats: EventStats): string[] {
  if (stats.byOpponentDeck.length === 0) return [];

  // Dans un compte-rendu, l'intérêt est « qui j'ai affronté » : on trie donc
  // par volume de rencontres, là où l'écran de stats trie par performance.
  const groups = sortGroupsByVolume(stats.byOpponentDeck.slice());
  return ['MATCHUPS', groups.map((g) => `${g.label} ${formatRecord(g.tally)}`).join(' · ')];
}

function expenseLines(input: EventWithRounds): string[] {
  const { event } = input;
  const state = (paid: boolean, label: string) => `${label} ${paid ? 'payé' : 'non payé'}`;

  const lines = [
    'FRAIS',
    [
      state(event.paidEvent, 'Événement'),
      state(event.paidAccommodation, 'Hébergement'),
      state(event.paidTransport, 'Transport'),
    ].join(' · '),
  ];

  const transport = event.transportName?.trim();
  if (transport) lines.push(`Transport : ${transport}`);

  return lines;
}

function compactLines(input: EventWithRounds, stats: EventStats): string[] {
  const { event } = input;
  const lines: string[] = [];

  const head = [`${event.name} (${formatDateShortFr(event.date)})`];
  if (event.playerCount !== null) {
    head.push(`${event.playerCount} ${plural(event.playerCount, 'joueur', 'joueurs')}`);
  }
  const deck = event.myDeck?.trim();
  if (deck) head.push(deck);
  lines.push(head.join(' · '));

  if (stats.roundsCounted > 0) {
    lines.push(
      `${formatRecord(stats.tally)} — ${formatPercentFr(stats.matchWinRate.value)} · Manches ${formatGames(
        stats.games
      )} (${formatPercentFr(stats.gameWinRate.value)})`
    );
  }

  const { dice } = stats;
  if (dice.rollsWithDie > 0) {
    const parts = [`Dé : ${dice.dieWon}/${dice.rollsWithDie}`];
    if (dice.whenDieWon.tally.played > 0) {
      parts.push(`sur dé gagné ${formatRecord(dice.whenDieWon.tally)}`);
    }
    if (dice.whenDieLost.tally.played > 0) {
      parts.push(`sur dé perdu ${formatRecord(dice.whenDieLost.tally)}`);
    }
    lines.push(parts.join(' · '));
  }

  const result = formatFinalResult(event.finalResult, event.finalStanding, event.playerCount);
  if (result) lines.push(`Résultat : ${result}`);

  return lines;
}

/** Le résumé, ligne par ligne. Une chaîne vide représente une ligne de séparation. */
export function generateEventSummaryLines(
  input: EventWithRounds,
  options: SummaryOptions = {}
): string[] {
  const opts = { ...DEFAULTS, ...options };
  const stats = computeEventStats(input);

  if (opts.compact) return compactLines(input, stats);

  const sections: string[][] = [headerLines(input)];

  if (stats.roundsCounted > 0) {
    sections.push(balanceLines(stats));
    sections.push(diceLines(stats));
  } else if (input.rounds.length === 0) {
    sections.push(['Aucune ronde saisie.']);
  }

  if (opts.includeRounds && input.rounds.length > 0) {
    const ordered = input.rounds.slice().sort((a, b) => a.roundNumber - b.roundNumber);
    sections.push(['RONDES', ...ordered.map((r) => roundLine(r, opts.includeComments))]);
  }

  if (opts.includeMatchups) sections.push(matchupLines(stats));
  if (opts.includeExpenses) sections.push(expenseLines(input));

  const notes = input.event.notes?.trim();
  if (opts.includeNotes && notes) sections.push(['NOTES', notes]);

  // Une seule ligne vide entre sections, et aucune section vide conservée.
  return sections
    .filter((section) => section.length > 0)
    .reduce<string[]>((acc, section, index) => {
      if (index > 0) acc.push('');
      return acc.concat(section);
    }, []);
}

export function generateEventSummary(
  input: EventWithRounds,
  options: SummaryOptions = {}
): string {
  return generateEventSummaryLines(input, options).join('\n');
}
