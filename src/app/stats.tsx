import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAllData } from '@/hooks/use-data';
import { EVENT_TYPES, eventTypeLabel } from '@/logic/constants';
import { DASH, formatGames, formatPointsFr, formatRecord } from '@/logic/format';
import {
  computeGlobalStats,
  sortGroupsByRate,
  sortGroupsByVolume,
  type GroupStat,
  type StatsFilter,
} from '@/logic/stats';
import type { EventType } from '@/logic/types';
import { todayIso } from '@/ui/components/date-field';
import { ChipGroup, SegmentedControl, ToggleRow } from '@/ui/components/form-controls';
import { Card, EmptyState, SectionTitle } from '@/ui/components/primitives';
import { StatBarRow, StatPair, StatTile } from '@/ui/components/stats-views';
import { fontSize, spacing, useTheme } from '@/ui/theme';

const PERIODS = [
  { value: 'all', label: 'Tout' },
  { value: '12m', label: '12 mois' },
  { value: 'year', label: 'Année' },
] as const;

type Period = (typeof PERIODS)[number]['value'];

const TABS = [
  { value: 'myDecks', label: 'Mes decks' },
  { value: 'types', label: "Types d'event" },
  { value: 'matchups', label: 'Matchups' },
] as const;

type Tab = (typeof TABS)[number]['value'];

const TYPE_OPTIONS = EVENT_TYPES.map((type) => ({ value: type, label: eventTypeLabel(type) }));

/** Borne basse du filtre de période, en ISO — comparée comme une chaîne. */
function periodStart(period: Period, today: string): string | undefined {
  if (period === 'all') return undefined;
  if (period === 'year') return `${today.slice(0, 4)}-01-01`;

  // Même jour, un an plus tôt. Un 29 février donnerait une date inexistante,
  // sans conséquence : cette valeur ne sert que de borne de comparaison ISO.
  const year = Number(today.slice(0, 4));
  return `${year - 1}${today.slice(4)}`;
}

export default function StatsScreen() {
  const colors = useTheme();
  const { data, loading } = useAllData();

  const [period, setPeriod] = useState<Period>('all');
  const [types, setTypes] = useState<EventType[]>([]);
  const [tab, setTab] = useState<Tab>('matchups');
  const [byVolume, setByVolume] = useState(true);

  const stats = useMemo(() => {
    const filter: StatsFilter = {
      eventTypes: types,
      from: periodStart(period, todayIso()),
    };
    return computeGlobalStats(data ?? [], { filter });
  }, [data, period, types]);

  const groups: GroupStat[] = useMemo(() => {
    const source =
      tab === 'myDecks' ? stats.byMyDeck : tab === 'types' ? stats.byEventType : stats.byOpponentDeck;
    const copy = source.slice();
    return byVolume ? sortGroupsByVolume(copy) : sortGroupsByRate(copy);
  }, [stats, tab, byVolume]);

  if (loading) return null;

  const { dice } = stats;
  const delta =
    dice.whenDieWon.matchWinRate.value !== null && dice.whenDieLost.matchWinRate.value !== null
      ? dice.whenDieWon.matchWinRate.value - dice.whenDieLost.matchWinRate.value
      : null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <SectionTitle>Période</SectionTitle>
        <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} />

        <SectionTitle>Types d'event</SectionTitle>
        <ChipGroup
          options={TYPE_OPTIONS}
          selected={types}
          onToggle={(type) =>
            setTypes((previous) =>
              previous.includes(type) ? previous.filter((t) => t !== type) : [...previous, type]
            )
          }
        />
        <Text style={[styles.hint, { color: colors.textFaint }]}>
          Aucun type sélectionné = tous les events.
        </Text>
      </Card>

      {stats.roundsCounted === 0 ? (
        <EmptyState
          title="Aucune ronde comptabilisée"
          message="Saisis des rondes jouées, ou élargis les filtres ci-dessus."
        />
      ) : (
        <>
          <Card>
            <SectionTitle>Global</SectionTitle>
            <View style={styles.tiles}>
              <StatTile label="Victoires (matchs)" rate={stats.matchWinRate} />
              <StatTile label="Victoires (manches)" rate={stats.gameWinRate} />
              <StatTile
                label="Quand je gagne le dé"
                rate={dice.whenDieWon.matchWinRate}
                emphasis
              />
              <StatTile
                label="Quand je perds le dé"
                rate={dice.whenDieLost.matchWinRate}
                emphasis
              />
            </View>

            <Text style={[styles.delta, { color: colors.text }]}>
              {delta === null
                ? `Écart dé gagné / dé perdu : ${DASH}`
                : `Gagner le dé me vaut ${formatPointsFr(Math.abs(delta))} de ${
                    delta >= 0 ? 'mieux' : 'moins bien'
                  }`}
            </Text>

            <View style={styles.pairs}>
              <StatPair label="Bilan" value={formatRecord(stats.tally)} />
              <StatPair label="Manches" value={formatGames(stats.games)} />
              <StatPair
                label="Je gagne le dé"
                value={
                  dice.rollsWithDie === 0
                    ? DASH
                    : `${dice.dieWon}/${dice.rollsWithDie}`
                }
              />
            </View>

            <Text style={[styles.hint, { color: colors.textFaint }]}>
              {stats.eventsWithRounds} event{stats.eventsWithRounds > 1 ? 's' : ''} joué
              {stats.eventsWithRounds > 1 ? 's' : ''} · {stats.roundsCounted} matchs · une nulle
              compte comme une défaite
            </Text>

            {stats.bestStanding ? (
              <Text style={[styles.hint, { color: colors.textFaint }]}>
                Meilleur classement : {stats.bestStanding.standing}e
                {stats.bestStanding.playerCount !== null
                  ? ` / ${stats.bestStanding.playerCount}`
                  : ''}{' '}
                à {stats.bestStanding.name}
              </Text>
            ) : null}
          </Card>

          <Card>
            <SegmentedControl options={TABS} value={tab} onChange={setTab} />
            <ToggleRow
              label="Trier par volume"
              value={byVolume}
              onValueChange={setByVolume}
              hint={byVolume ? 'Les plus joués d’abord' : 'Les meilleurs taux d’abord'}
            />

            {groups.length === 0 ? (
              <EmptyState title="Rien à afficher" />
            ) : (
              groups.map((group) => <StatBarRow key={group.key} group={group} />)
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pairs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  delta: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  hint: {
    fontSize: fontSize.caption,
    lineHeight: 17,
  },
});
