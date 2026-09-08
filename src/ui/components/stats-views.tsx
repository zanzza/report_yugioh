import { StyleSheet, Text, View } from 'react-native';

import { eventTypeLabel, MIN_SAMPLE } from '@/logic/constants';
import { DASH, formatPercentFr, formatRecord } from '@/logic/format';
import type { GroupStat } from '@/logic/stats';
import type { EventType, Rate, Tally } from '@/logic/types';
import { EVENT_TYPE_COLORS, fontSize, radius, spacing, useTheme } from '../theme';

/** Badge coloré du type d'event. */
export function TypeBadge({ type }: { type: EventType }) {
  const color = EVENT_TYPE_COLORS[type];
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{eventTypeLabel(type)}</Text>
    </View>
  );
}

/**
 * Trois pastilles pour les frais : pleine = payé, creuse = à payer. Lisible
 * d'un coup d'œil depuis la liste des events.
 */
export function PaymentDots({
  paidEvent,
  paidAccommodation,
  paidTransport,
}: {
  paidEvent: boolean;
  paidAccommodation: boolean;
  paidTransport: boolean;
}) {
  const colors = useTheme();
  const flags = [
    { paid: paidEvent, label: 'Événement' },
    { paid: paidAccommodation, label: 'Hébergement' },
    { paid: paidTransport, label: 'Transport' },
  ];

  return (
    <View
      accessibilityLabel={flags
        .map((f) => `${f.label} ${f.paid ? 'payé' : 'non payé'}`)
        .join(', ')}
      style={styles.dots}>
      {flags.map((flag) => (
        <View
          key={flag.label}
          style={[
            styles.dot,
            {
              backgroundColor: flag.paid ? colors.win : 'transparent',
              borderColor: flag.paid ? colors.win : colors.textFaint,
            },
          ]}
        />
      ))}
    </View>
  );
}

/** Grand chiffre avec son libellé et son effectif — le bloc des stats. */
export function StatTile({
  label,
  rate,
  detail,
  emphasis = false,
}: {
  label: string;
  rate: Rate;
  detail?: string;
  emphasis?: boolean;
}) {
  const colors = useTheme();

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: emphasis ? `${colors.primary}18` : colors.surface,
          borderColor: emphasis ? colors.primary : colors.border,
        },
      ]}>
      <Text style={[styles.tileLabel, { color: colors.textMuted }]} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[styles.tileValue, { color: colors.text }]}>
        {formatPercentFr(rate.value)}
      </Text>
      <Text style={[styles.tileDetail, { color: colors.textFaint }]} numberOfLines={1}>
        {detail ?? `n = ${rate.n}`}
      </Text>
    </View>
  );
}

/** Paire libellé / valeur brute, pour les bilans qui ne sont pas des taux. */
export function StatPair({ label, value }: { label: string; value: string }) {
  const colors = useTheme();
  return (
    <View style={[styles.pair, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.pairLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.pairValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

/**
 * Ligne de classement : libellé, barre proportionnelle, taux et effectif.
 *
 * Une barre en `View` plutôt qu'une librairie de graphiques : c'est plus
 * lisible qu'un donut pour comparer des taux, ça affiche l'effectif — décisif
 * quand `n` est petit — et ça évite Skia, absent d'Expo Go.
 */
export function StatBarRow({ group }: { group: GroupStat }) {
  const colors = useTheme();
  const value = group.matchWinRate.value;
  const lowSample = group.tally.played < MIN_SAMPLE;

  return (
    <View style={[styles.barRow, lowSample && styles.barRowFaded]}>
      <View style={styles.barHeader}>
        <Text style={[styles.barLabel, { color: colors.text }]} numberOfLines={1}>
          {group.label}
        </Text>
        <Text style={[styles.barValue, { color: colors.text }]}>{formatPercentFr(value)}</Text>
      </View>

      <View style={[styles.barTrack, { backgroundColor: colors.track }]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${(value ?? 0) * 100}%`,
              backgroundColor: value === null ? colors.unplayed : colors.primary,
            },
          ]}
        />
      </View>

      <Text style={[styles.barMeta, { color: colors.textFaint }]}>
        {formatRecord(group.tally)} · {group.tally.played}{' '}
        {group.tally.played === 1 ? 'match' : 'matchs'}
        {lowSample ? ' · échantillon faible' : ''}
      </Text>
    </View>
  );
}

/** `5-2-1 · 62,5 %`, ou juste un tiret quand rien n'a été joué. */
export function recordSummary(tally: Tally, rate: Rate): string {
  if (tally.played === 0) return DASH;
  return `${formatRecord(tally)} · ${formatPercentFr(rate.value)}`;
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 2,
  },
  tileLabel: {
    fontSize: fontSize.caption,
    fontWeight: '600',
  },
  tileValue: {
    fontSize: fontSize.display,
    fontWeight: '700',
  },
  tileDetail: {
    fontSize: fontSize.caption,
  },
  pair: {
    flexGrow: 1,
    flexBasis: '30%',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 2,
  },
  pairLabel: {
    fontSize: fontSize.caption,
    fontWeight: '600',
  },
  pairValue: {
    fontSize: fontSize.subtitle,
    fontWeight: '700',
  },
  barRow: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  barRowFaded: {
    opacity: 0.55,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  barLabel: {
    fontSize: fontSize.body,
    fontWeight: '600',
    flexShrink: 1,
  },
  barValue: {
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  barMeta: {
    fontSize: fontSize.caption,
  },
});
