import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  formatDateShortFr,
  formatDice,
  formatOutcomeLetter,
  formatScore,
} from '@/logic/format';
import { isBye, matchOutcome, tallyOf } from '@/logic/match';
import { matchWinRate } from '@/logic/stats';
import type { Round, TournamentEvent } from '@/logic/types';
import { fontSize, outcomeColor, radius, spacing, TOUCH_TARGET, useTheme } from '../theme';
import { PaymentDots, recordSummary, TypeBadge } from './stats-views';

export function EventListItem({
  event,
  rounds,
  onPress,
  onLongPress,
}: {
  event: TournamentEvent;
  rounds: readonly Round[];
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const colors = useTheme();
  const tally = tallyOf(rounds);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.eventItem,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}>
      <View style={styles.eventTop}>
        <Text style={[styles.eventName, { color: colors.text }]} numberOfLines={1}>
          {event.name}
        </Text>
        <TypeBadge type={event.type} />
      </View>

      <View style={styles.eventBottom}>
        <Text style={[styles.eventMeta, { color: colors.textMuted }]} numberOfLines={1}>
          {formatDateShortFr(event.date)}
          {event.myDeck ? ` · ${event.myDeck}` : ''}
        </Text>
        <View style={styles.eventRight}>
          <Text style={[styles.eventRecord, { color: colors.text }]}>
            {recordSummary(tally, matchWinRate(tally))}
          </Text>
          <PaymentDots
            paidEvent={event.paidEvent}
            paidAccommodation={event.paidAccommodation}
            paidTransport={event.paidTransport}
          />
        </View>
      </View>
    </Pressable>
  );
}

/** `R3 · V 2-1 · Maliss · dé gagné`, avec un liseré de couleur du résultat. */
export function RoundListItem({
  round,
  onPress,
  onLongPress,
}: {
  round: Round;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const colors = useTheme();
  const outcome = matchOutcome(round);
  const color = outcomeColor(colors, outcome);
  const bye = isBye(round);

  const details = [
    round.opponentDeck ?? (bye ? 'bye' : 'deck non noté'),
    bye ? null : formatDice(round.diceWon),
  ].filter((part): part is string => part !== null);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.roundItem,
        { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}>
      <View style={[styles.roundStripe, { backgroundColor: color }]} />

      <Text style={[styles.roundNumber, { color: colors.textMuted }]}>R{round.roundNumber}</Text>

      <Text style={[styles.roundOutcome, { color }]}>
        {outcome === 'UNPLAYED' ? 'en cours' : `${formatOutcomeLetter(outcome)} ${formatScore(round)}`}
      </Text>

      <Text style={[styles.roundDetails, { color: colors.textMuted }]} numberOfLines={1}>
        {details.join(' · ')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eventItem: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  eventTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eventName: {
    fontSize: fontSize.subtitle,
    fontWeight: '600',
    flexShrink: 1,
  },
  eventBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eventMeta: {
    fontSize: fontSize.small,
    flexShrink: 1,
  },
  eventRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eventRecord: {
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  roundItem: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingRight: spacing.sm,
  },
  roundStripe: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginVertical: spacing.sm,
  },
  roundNumber: {
    fontSize: fontSize.small,
    fontWeight: '700',
    minWidth: 26,
  },
  roundOutcome: {
    fontSize: fontSize.body,
    fontWeight: '700',
    minWidth: 66,
  },
  roundDetails: {
    fontSize: fontSize.small,
    flexShrink: 1,
  },
});
