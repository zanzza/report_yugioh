import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { setPaymentFlag, type PaymentField } from '@/db/events.repo';
import { deleteRound } from '@/db/rounds.repo';
import { useEventWithRounds } from '@/hooks/use-data';
import {
  DASH,
  formatDateFr,
  formatFinalResult,
  formatGames,
  formatPercentFr,
  formatRecord,
} from '@/logic/format';
import { computeEventStats } from '@/logic/stats';
import { generateEventSummary } from '@/logic/summary';
import { RoundListItem } from '@/ui/components/list-items';
import { ToggleRow } from '@/ui/components/form-controls';
import { AppButton, Card, EmptyState, InfoRow, SectionTitle } from '@/ui/components/primitives';
import { StatPair, TypeBadge } from '@/ui/components/stats-views';
import { fontSize, radius, spacing, TOUCH_TARGET_LARGE, useTheme } from '@/ui/theme';

export default function EventDetailScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Number(id);

  const { data, loading } = useEventWithRounds(Number.isFinite(eventId) ? eventId : null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const stats = useMemo(() => (data ? computeEventStats(data) : null), [data]);
  const summary = useMemo(() => (data ? generateEventSummary(data) : ''), [data]);

  if (loading) return null;
  if (!data || !stats) return <EmptyState title="Event introuvable" />;

  const { event, rounds } = data;
  const nextRound = rounds.reduce((max, round) => Math.max(max, round.roundNumber), 0) + 1;

  const togglePayment = (field: PaymentField, value: boolean) => {
    // Écriture immédiate : pas de bouton « Enregistrer » pour les frais.
    void setPaymentFlag(db, event.id, field, value);
  };

  const confirmDeleteRound = (roundId: number, roundNumber: number) => {
    Alert.alert(`Supprimer la ronde ${roundNumber} ?`, 'Les rondes suivantes seront renumérotées.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => void deleteRound(db, roundId) },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* En-tête */}
      <Card>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>{event.name}</Text>
          <TypeBadge type={event.type} />
        </View>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {formatDateFr(event.date)}
          {event.playerCount !== null ? ` · ${event.playerCount} joueurs` : ''}
        </Text>

        <InfoRow label="Deck joué" value={event.myDeck ?? DASH} />
        <InfoRow
          label="Résultat final"
          value={formatFinalResult(event.finalResult, event.finalStanding, event.playerCount) ?? DASH}
        />

        <AppButton
          label="Modifier l'event"
          variant="secondary"
          onPress={() => router.push(`/events/${event.id}/edit`)}
        />
      </Card>

      {/* Frais */}
      <Card>
        <SectionTitle>Frais</SectionTitle>
        <ToggleRow
          label="Event payé"
          value={event.paidEvent}
          onValueChange={(value) => togglePayment('paidEvent', value)}
        />
        <ToggleRow
          label="Logement payé"
          value={event.paidAccommodation}
          onValueChange={(value) => togglePayment('paidAccommodation', value)}
        />
        <ToggleRow
          label="Transport payé"
          value={event.paidTransport}
          onValueChange={(value) => togglePayment('paidTransport', value)}
          hint={event.transportName ?? undefined}
        />
      </Card>

      {/* Rondes */}
      <Card>
        <SectionTitle>Rondes</SectionTitle>

        <View style={styles.pairs}>
          <StatPair
            label="Bilan"
            value={
              stats.roundsCounted === 0
                ? DASH
                : `${formatRecord(stats.tally)}${stats.byes > 0 ? ` (${stats.byes} bye)` : ''}`
            }
          />
          <StatPair label="Manches" value={stats.games.total === 0 ? DASH : formatGames(stats.games)} />
          <StatPair
            label="Dé"
            value={stats.dice.rollsWithDie === 0 ? DASH : `${stats.dice.dieWon}/${stats.dice.rollsWithDie}`}
          />
        </View>

        <Text style={[styles.rateLine, { color: colors.textMuted }]}>
          Taux de victoire : {formatPercentFr(stats.matchWinRate.value)}
          {stats.dice.whenDieWon.tally.played > 0 || stats.dice.whenDieLost.tally.played > 0
            ? `  ·  dé gagné ${formatPercentFr(stats.dice.whenDieWon.matchWinRate.value)} / dé perdu ${formatPercentFr(
                stats.dice.whenDieLost.matchWinRate.value
              )}`
            : ''}
        </Text>

        {rounds.length === 0 ? (
          <EmptyState title="Aucune ronde" message="Ajoute la ronde 1 dès la fin de ton premier match." />
        ) : (
          <View>
            {rounds.map((round) => (
              <RoundListItem
                key={round.id}
                round={round}
                onPress={() => router.push(`/events/${event.id}/rounds/${round.id}`)}
                onLongPress={() => confirmDeleteRound(round.id, round.roundNumber)}
              />
            ))}
          </View>
        )}

        {/* Le bouton le plus important de l'app : le numéro est pré-calculé. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/events/${event.id}/rounds/new`)}
          style={({ pressed }) => [
            styles.addRound,
            { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
          ]}>
          <Text style={[styles.addRoundLabel, { color: colors.primaryText }]}>
            + Ronde {nextRound}
          </Text>
        </Pressable>
      </Card>

      {/* Résumé */}
      <Card>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: summaryOpen }}
          onPress={() => setSummaryOpen((open) => !open)}>
          <Text style={[styles.summaryToggle, { color: colors.primary }]}>
            {summaryOpen ? '▾' : '▸'}  Résumé généré
          </Text>
        </Pressable>

        {summaryOpen ? (
          <>
            <Text style={[styles.summaryText, { color: colors.text }]}>{summary}</Text>
            <View style={styles.summaryActions}>
              <AppButton
                label="Partager"
                variant="secondary"
                style={styles.flex}
                onPress={() => void Share.share({ message: summary })}
              />
              <AppButton
                label="Plein écran"
                variant="secondary"
                style={styles.flex}
                onPress={() => router.push(`/events/${event.id}/summary`)}
              />
            </View>
          </>
        ) : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  flex: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    flexShrink: 1,
  },
  subtitle: {
    fontSize: fontSize.body,
    marginTop: -spacing.sm,
  },
  pairs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rateLine: {
    fontSize: fontSize.small,
  },
  addRound: {
    minHeight: TOUCH_TARGET_LARGE,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRoundLabel: {
    fontSize: fontSize.subtitle,
    fontWeight: '700',
  },
  summaryToggle: {
    fontSize: fontSize.body,
    fontWeight: '600',
    paddingVertical: spacing.xs,
  },
  summaryText: {
    fontSize: fontSize.small,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  summaryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
